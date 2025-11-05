"""
Run parser and enrichment smoke test for the pp_reader integration.

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
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.currencies import fx
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.ingestion_writer import async_ingestion_session
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
            file_path=str(portfolio_path),
            parsed_at=datetime.now(UTC),
            pp_version=parsed_client.version,
            base_currency=parsed_client.base_currency,
            properties=dict(parsed_client.properties),
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


def _collect_diagnostics(db_path: Path) -> dict[str, Any]:
    """Gather counts and timestamps for ingestion/enrichment artifacts."""
    payload: dict[str, Any] = {"ingestion": {}, "enrichment": {}}
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        for table in diagnostics.INGESTION_TABLES:
            try:
                cursor = conn.execute(
                    f'SELECT COUNT(*) FROM "{table}"'  # noqa: S608 - tables are static
                )
                payload["ingestion"][table] = int(cursor.fetchone()[0])
            except sqlite3.Error as exc:  # pragma: no cover - defensive logging
                LOGGER.debug("Unable to count table %s: %s", table, exc)
                payload["ingestion"][table] = None

        fx_row = conn.execute(
            """
            SELECT COUNT(*) AS total, MAX(fetched_at) AS latest
            FROM fx_rates
            """
        ).fetchone()
        payload["enrichment"]["fx_rates"] = {
            "rows": int(fx_row["total"]) if fx_row else 0,
            "latest_fetch": fx_row["latest"] if fx_row else None,
        }

        history_row = conn.execute(
            """
            SELECT COUNT(*) AS total, MAX(fetched_at) AS latest
            FROM ingestion_historical_prices
            """
        ).fetchone()
        payload["enrichment"]["historical_prices"] = {
            "rows": int(history_row["total"]) if history_row else 0,
            "latest_fetch": history_row["latest"] if history_row else None,
        }

        queue_rows = conn.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM price_history_queue
            GROUP BY status
            """
        ).fetchall()
        payload["enrichment"]["price_history_queue"] = {
            row["status"]: row["count"] for row in queue_rows
        }
    finally:
        conn.close()

    return payload


def _build_argument_parser() -> argparse.ArgumentParser:
    """Construct argument parser for the smoke test script."""
    parser = argparse.ArgumentParser(
        description="Run parser and enrichment smoke test.",
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
    return parser


async def _async_main(args: argparse.Namespace) -> int:
    """Run the async portion of the smoke test."""
    portfolio_path: Path = args.portfolio
    db_path: Path = args.db_path
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

    diag = _collect_diagnostics(db_path)
    summary = {
        "run_id": run_id,
        "database": str(db_path),
        "fx": fx_summary,
        "history": history_summary,
        "diagnostics": diag,
    }
    LOGGER.info(
        "Smoke test summary:\n%s",
        json.dumps(summary, indent=2, sort_keys=True),
    )

    # Return non-zero exit code when critical steps failed.
    if fx_summary.get("status") in {"failed", "error"}:
        return 2
    if history_summary.get("status") in {"failed", "error"}:
        return 3
    return 0


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
