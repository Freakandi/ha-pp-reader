"""
Run parser, enrichment, and metrics smoke test for the pp_reader integration.

This helper imports a sample Portfolio Performance archive into the staging
database, refreshes FX rates and price history data, and prints a concise
diagnostics summary. It is intended for quick manual verification outside of
Home Assistant.
"""

from __future__ import annotations

import argparse
import asyncio
import functools
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.currencies import fx
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.ingestion_writer import (
    IngestionMetadata,
    async_ingestion_session,
)
from custom_components.pp_reader.data.normalization_pipeline import (
    async_normalize_snapshot,
    serialize_normalization_result,
)
from custom_components.pp_reader.data.normalized_store import (
    async_load_latest_snapshot_bundle,
)
from custom_components.pp_reader.metrics import pipeline as metrics_pipeline
from custom_components.pp_reader.prices.history_queue import (
    HistoryQueueManager,
    build_history_targets_from_parsed,
)
from custom_components.pp_reader.services import parser_pipeline
from custom_components.pp_reader.util import diagnostics

if TYPE_CHECKING:
    from custom_components.pp_reader.models.parsed import ParsedClient
else:  # pragma: no cover - runtime fallback for typing
    ParsedClient = Any

LOGGER = logging.getLogger("custom_components.pp_reader.scripts.enrichment_smoketest")

DEFAULT_PORTFOLIO = Path("config/pp_reader_data/S-Depot.portfolio")
DEFAULT_DB_PATH = Path("config/enrichment_smoketest.db")
DEFAULT_LOG_PATH = Path("config/enrichment_smoketest.log")
DEFAULT_HISTORY_JOB_LIMIT = 10
MAX_HISTORY_ITERATIONS = 5


class _SmoketestEventBus:
    """Minimal event bus mimicking Home Assistant behaviour."""

    def async_fire(self, event_type: str, data: dict[str, Any]) -> None:
        LOGGER.debug("event fired: %s %s", event_type, data)


class _SmoketestHass:
    """Stub Home Assistant instance for parser pipeline compatibility."""

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop
        self.bus = _SmoketestEventBus()
        self.data: dict[str, Any] = {DOMAIN: {}}

    async def async_add_executor_job(
        self,
        func: Any,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        bound = functools.partial(func, *args, **kwargs)
        return await self.loop.run_in_executor(None, bound)

    def async_create_task(self, coro: Any) -> asyncio.Task[Any]:
        return self.loop.create_task(coro)


class _ProgressPrinter:
    """Track latest progress events and mirror them to the log."""

    def __init__(self) -> None:
        self.stages: dict[str, tuple[int, int]] = {}

    def update(self, progress: parser_pipeline.ParseProgress) -> None:
        """Record progress for a parsing stage."""
        self.stages[progress.stage] = (progress.processed, progress.total)
        LOGGER.info(
            "parser stage %-13s %d/%d",
            progress.stage,
            progress.processed,
            progress.total,
        )


def _configure_logging(*, verbose: bool, logfile: Path | None) -> None:
    """Configure logging handlers for console and optional file output."""
    level = logging.DEBUG if verbose else logging.INFO
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if logfile:
        logfile.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(logfile, encoding="utf-8"))
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=handlers,
    )


async def _run_parser(
    hass: _SmoketestHass,
    portfolio_path: Path,
    db_path: Path,
    *,
    keep_staging: bool,
) -> tuple[str, ParsedClient]:
    """Parse the portfolio file and persist ingestion data."""
    printer = _ProgressPrinter()
    async with async_ingestion_session(
        db_path,
        reset_stage=not keep_staging,
    ) as writer:
        parsed_client = await parser_pipeline.async_parse_portfolio(
            hass=hass,
            path=str(portfolio_path),
            writer=writer,
            progress_cb=printer.update,
        )
        run_id = writer.finalize_ingestion(
            IngestionMetadata(
                file_path=str(portfolio_path),
                parsed_at=datetime.now(UTC),
                pp_version=parsed_client.version,
                base_currency=parsed_client.base_currency,
                properties=dict(parsed_client.properties),
                parsed_client=parsed_client,
            )
        )
    return run_id, parsed_client


async def _run_fx_refresh(db_path: Path) -> dict[str, Any]:
    """Ensure FX rates are available for the active currencies."""
    try:
        currencies = await asyncio.to_thread(fx.discover_active_currencies, db_path)
    except Exception as exc:
        LOGGER.exception("FX discovery failed")
        return {"status": "failed", "error": str(exc)}

    if not currencies:
        LOGGER.info("FX refresh skipped: no non-EUR currencies detected.")
        return {"status": "skipped", "currencies": []}

    reference = datetime.now(UTC)
    try:
        await fx.ensure_exchange_rates_for_dates([reference], currencies, db_path)
    except Exception as exc:
        LOGGER.exception("FX refresh failed")
        return {
            "status": "error",
            "currencies": sorted(currencies),
            "reference": reference.isoformat(),
            "error": str(exc),
        }

    LOGGER.info(
        "FX refresh completed for %s (reference=%s)",
        sorted(currencies),
        reference.date(),
    )
    return {
        "status": "ok",
        "currencies": sorted(currencies),
        "reference": reference.isoformat(),
    }


async def _run_price_history_jobs(
    parsed_client: ParsedClient,
    db_path: Path,
    *,
    limit: int,
) -> dict[str, Any]:
    """Plan and process Yahoo history jobs."""
    targets = build_history_targets_from_parsed(parsed_client.securities)
    if not targets:
        LOGGER.info("Price history skipped: no Yahoo-compatible securities.")
        return {"status": "skipped", "targets": 0, "enqueued": 0, "candles": 0}

    manager = HistoryQueueManager(db_path)
    try:
        enqueued = await manager.plan_jobs(targets)
    except Exception as exc:
        LOGGER.exception("Failed to plan price history jobs")
        return {"status": "failed", "targets": len(targets), "error": str(exc)}

    if not enqueued:
        LOGGER.info("Price history up-to-date: no new jobs required.")
        return {
            "status": "up_to_date",
            "targets": len(targets),
            "enqueued": 0,
            "candles": 0,
        }

    LOGGER.info(
        "Enqueued %d price history jobs for %d targets.",
        enqueued,
        len(targets),
    )

    total_candles = 0
    iterations = 0
    while True:
        iterations += 1
        try:
            batch = await manager.process_pending_jobs(limit=limit)
        except Exception as exc:
            LOGGER.exception("Processing price history jobs failed")
            return {
                "status": "error",
                "targets": len(targets),
                "enqueued": enqueued,
                "candles": total_candles,
                "error": str(exc),
            }

        if not batch:
            break

        batch_candles = sum(len(candles) for candles in batch.values())
        total_candles += batch_candles
        LOGGER.info(
            "Processed %d jobs (iteration=%d, candles=%d).",
            len(batch),
            iterations,
            batch_candles,
        )

        # Continue looping in case additional jobs remain beyond the batch limit.
        if iterations >= MAX_HISTORY_ITERATIONS:
            LOGGER.warning("Stopping job processing after %d iterations.", iterations)
            break

    return {
        "status": "completed",
        "targets": len(targets),
        "enqueued": enqueued,
        "candles": total_candles,
        "iterations": iterations,
    }


async def _run_metrics(
    hass: _SmoketestHass,
    db_path: Path,
) -> dict[str, Any]:
    """Execute the metrics pipeline and capture progress output."""
    progress_events: list[dict[str, Any]] = []

    def _emit(stage: str, payload: dict[str, Any]) -> None:
        LOGGER.info("metrics stage %-22s %s", stage, payload)
        progress_events.append({"stage": stage, **payload})

    try:
        run = await metrics_pipeline.async_refresh_all(
            hass,
            db_path,
            trigger="smoketest",
            provenance="cli",
            emit_progress=_emit,
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        LOGGER.exception("Metrics pipeline failed")
        return {
            "status": "failed",
            "error": str(exc),
            "progress": progress_events,
        }

    return {
        "status": run.status,
        "run_uuid": run.run_uuid,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "duration_ms": run.duration_ms,
        "total_entities": run.total_entities,
        "processed": {
            "portfolios": run.processed_portfolios or 0,
            "accounts": run.processed_accounts or 0,
            "securities": run.processed_securities or 0,
        },
        "error": run.error_message,
        "progress": progress_events,
    }


async def _run_normalization_snapshot(
    hass: _SmoketestHass,
    db_path: Path,
    *,
    include_positions: bool,
) -> dict[str, Any]:
    """Generate a normalization snapshot via the new pipeline."""
    LOGGER.info(
        "Generating normalization snapshot (include_positions=%s)...",
        include_positions,
    )
    try:
        snapshot = await async_normalize_snapshot(
            hass,
            db_path,
            include_positions=include_positions,
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        LOGGER.exception("Normalization snapshot failed")
        return {
            "status": "failed",
            "error": str(exc),
            "include_positions": include_positions,
        }

    serialized = serialize_normalization_result(snapshot)
    accounts = serialized.get("accounts") or []
    portfolios = serialized.get("portfolios") or []

    return {
        "status": "ok",
        "include_positions": include_positions,
        "counts": {
            "accounts": len(accounts),
            "portfolios": len(portfolios),
        },
        "metric_run_uuid": serialized.get("metric_run_uuid"),
        "generated_at": serialized.get("generated_at"),
        "payload": serialized,
    }


async def _load_canonical_snapshots(
    hass: _SmoketestHass,
    db_path: Path,
) -> dict[str, Any]:
    """Load the persisted snapshot bundle from SQLite for diagnostics."""
    LOGGER.info("Loading canonical snapshot bundle from %s", db_path)
    try:
        bundle = await async_load_latest_snapshot_bundle(hass, db_path)
    except FileNotFoundError:
        return {
            "status": "missing",
            "reason": f"database not found at {db_path}",
        }
    except Exception as exc:
        LOGGER.exception("Failed to load canonical snapshot bundle")
        return {
            "status": "failed",
            "error": str(exc),
        }

    if not bundle.metric_run_uuid:
        return {
            "status": "pending",
            "reason": "no canonical snapshot recorded yet",
        }

    def _clone(entries: tuple[dict[str, Any], ...]) -> list[dict[str, Any]]:
        return [dict(entry) for entry in entries]

    accounts = _clone(bundle.accounts)
    portfolios = _clone(bundle.portfolios)
    account_count = len(accounts)
    portfolio_count = len(portfolios)
    status = "ok"
    if account_count == 0 and portfolio_count == 0:
        LOGGER.error(
            "Canonical snapshot bundle is empty (metric_run_uuid=%s).",
            bundle.metric_run_uuid,
        )
        status = "empty"
    return {
        "status": status,
        "metric_run_uuid": bundle.metric_run_uuid,
        "snapshot_at": bundle.snapshot_at,
        "counts": {
            "accounts": account_count,
            "portfolios": portfolio_count,
        },
        "accounts": accounts,
        "portfolios": portfolios,
    }


def _snapshot_status_to_exit_code(status: str | None) -> int:
    """Map canonical snapshot status values to dedicated exit codes."""
    if status == "ok":
        return 0
    if status in {"pending", "missing"}:
        return 6
    return 7


def _build_argument_parser() -> argparse.ArgumentParser:
    """Construct argument parser for the smoke test script."""
    parser = argparse.ArgumentParser(
        description="Run parser, enrichment, and metrics smoke test.",
    )
    parser.add_argument(
        "--portfolio",
        type=Path,
        default=DEFAULT_PORTFOLIO,
        help="Path to the Portfolio Performance archive (default: %(default)s)",
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="SQLite database used for staging/enrichment (default: %(default)s)",
    )
    parser.add_argument(
        "--logfile",
        type=Path,
        default=DEFAULT_LOG_PATH,
        help="Optional logfile for detailed diagnostics (default: %(default)s)",
    )
    parser.add_argument(
        "--keep-staging",
        action="store_true",
        help="Do not clear existing ingestion staging tables before parsing.",
    )
    parser.add_argument(
        "--history-limit",
        type=int,
        default=DEFAULT_HISTORY_JOB_LIMIT,
        help=(
            "Maximum number of price history jobs processed per iteration "
            "(default: %(default)s)"
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging output.",
    )
    parser.add_argument(
        "--include-positions",
        action="store_true",
        help="Include per-position payloads when generating normalization snapshots.",
    )
    return parser


async def _async_main(args: argparse.Namespace) -> int:
    """Run the async portion of the smoke test."""
    portfolio_path: Path = args.portfolio
    db_path: Path = args.db_path
    include_positions: bool = bool(args.include_positions)
    history_limit: int = max(1, args.history_limit)

    if not portfolio_path.exists():
        LOGGER.error("Portfolio file does not exist: %s", portfolio_path)
        return 1

    try:
        initialize_database_schema(db_path)
    except Exception:
        LOGGER.exception("Failed to initialize database schema at %s", db_path)
        return 1

    loop = asyncio.get_running_loop()
    hass = _SmoketestHass(loop)

    LOGGER.info("Running parser pipeline for %s", portfolio_path)
    run_id, parsed_client = await _run_parser(
        hass,
        portfolio_path,
        db_path,
        keep_staging=args.keep_staging,
    )
    LOGGER.info("Parser completed (run_id=%s)", run_id)

    LOGGER.info("Running FX refresh cycle...")
    fx_summary = await _run_fx_refresh(db_path)

    LOGGER.info("Running price history ingestion...")
    history_summary = await _run_price_history_jobs(
        parsed_client,
        db_path,
        limit=history_limit,
    )

    LOGGER.info("Running metrics pipeline...")
    metrics_summary = await _run_metrics(hass, db_path)

    normalization_summary = await _run_normalization_snapshot(
        hass,
        db_path,
        include_positions=include_positions,
    )

    canonical_snapshots = await _load_canonical_snapshots(hass, db_path)
    diag = await diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
        entry_id=None,
    )
    summary = {
        "run_id": run_id,
        "database": str(db_path),
        "fx": fx_summary,
        "history": history_summary,
        "metrics": metrics_summary,
        "normalization": normalization_summary,
        "snapshots": canonical_snapshots,
        "diagnostics": diag,
    }
    LOGGER.info(
        "Smoke test summary:\n%s",
        json.dumps(summary, indent=2, sort_keys=True),
    )

    exit_code = 0
    if fx_summary.get("status") in {"failed", "error"}:
        exit_code = 2
    elif history_summary.get("status") in {"failed", "error"}:
        exit_code = 3
    elif metrics_summary.get("status") not in {"completed"}:
        exit_code = 4
    elif normalization_summary.get("status") not in {"ok"}:
        exit_code = 5

    if exit_code == 0:
        snapshot_status = canonical_snapshots.get("status")
        exit_code = _snapshot_status_to_exit_code(snapshot_status)

    return exit_code


def main(argv: list[str] | None = None) -> int:
    """Entrypoint for CLI execution."""
    parser = _build_argument_parser()
    args = parser.parse_args(argv)

    logfile: Path | None = args.logfile
    _configure_logging(verbose=args.verbose, logfile=logfile)

    try:
        return asyncio.run(_async_main(args))
    except KeyboardInterrupt:
        LOGGER.warning("Smoke test aborted by user.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
