"""
Inspect canonical pp_reader tables and dump snapshot/metric diagnostics.

This helper is intended for developers who need to verify that the persisted
`account_snapshots`, `portfolio_snapshots`, and metric tables contain the same
payloads that Home Assistant sensors/websockets emit. It loads the latest
snapshot bundle, compares it with the raw SQLite rows, and prints an overview
of the canonical data for manual inspection.
"""

from __future__ import annotations

import argparse
import asyncio
import functools
import json
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.normalized_store import (
    SnapshotBundle,
    async_load_latest_snapshot_bundle,
    async_load_metric_summary,
)

LOGGER = logging.getLogger("custom_components.pp_reader.scripts.diagnostics_dump")
DEFAULT_DB_PATH = Path("config/pp_reader_data/pp_reader.db")


class _DiagnosticsHass:
    """Minimal hass substitute so normalized_store helpers can run in tests/CLI."""

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    async def async_add_executor_job(self, func: Any, *args: Any, **kwargs: Any) -> Any:
        bound = functools.partial(func, *args, **kwargs)
        return await self.loop.run_in_executor(None, bound)


async def async_collect_canonical_diagnostics(
    db_path: Path | str,
    *,
    preview_limit: int = 3,
) -> dict[str, Any]:
    """Collect canonical snapshot + metric summaries for CLI/tests."""
    resolved = Path(db_path)
    if not resolved.exists():
        reason = f"database not found at {resolved}"
        return {
            "snapshots": {"status": "missing", "reason": reason},
            "metrics": {"status": "missing", "reason": reason},
        }

    loop = asyncio.get_running_loop()
    hass = _DiagnosticsHass(loop)
    snapshots = await _gather_snapshot_summary(
        hass,
        resolved,
        preview_limit=preview_limit,
    )
    metrics = await _gather_metric_summary(
        hass,
        resolved,
        preview_limit=preview_limit,
    )
    return {"snapshots": snapshots, "metrics": metrics}


async def _gather_snapshot_summary(
    hass: _DiagnosticsHass,
    db_path: Path,
    *,
    preview_limit: int,
) -> dict[str, Any]:
    """Load normalized snapshots and correlate them with raw table rows."""
    try:
        bundle = await async_load_latest_snapshot_bundle(hass, db_path)
    except FileNotFoundError:
        return {"status": "missing", "reason": f"database not found at {db_path}"}
    except Exception:
        LOGGER.exception("Failed to load canonical snapshot bundle")
        return {"status": "failed", "reason": "snapshot_bundle_failed"}

    table_stats = _inspect_snapshot_tables(db_path, preview_limit)
    status = "ok" if bundle.metric_run_uuid else "pending"
    return {
        "status": status,
        "metric_run_uuid": bundle.metric_run_uuid,
        "snapshot_at": bundle.snapshot_at,
        "table_stats": table_stats,
        "payload_preview": _build_payload_preview(bundle, preview_limit),
    }


async def _gather_metric_summary(
    hass: _DiagnosticsHass,
    db_path: Path,
    *,
    preview_limit: int,
) -> dict[str, Any]:
    """Return the latest metric run metadata and trimmed records."""
    try:
        summary = await async_load_metric_summary(hass, db_path)
    except FileNotFoundError:
        return {"status": "missing", "reason": f"database not found at {db_path}"}
    except Exception:
        LOGGER.exception("Failed to load metric summary")
        return {"status": "failed", "reason": "metric_summary_failed"}

    status = "ok" if summary.run else "pending"
    run_payload = _serialize_metric_run(summary.run)
    return {
        "status": status,
        "run": run_payload,
        "preview": _serialize_metric_batch(summary.batch, limit=preview_limit),
    }


def _build_payload_preview(
    bundle: SnapshotBundle,
    limit: int,
) -> dict[str, list[dict[str, Any]]]:
    """Return the first N snapshot payloads from the normalized store."""
    def _trim(entries: tuple[dict[str, Any], ...]) -> list[dict[str, Any]]:
        return [dict(payload) for payload in entries[:limit]]

    return {
        "accounts": _trim(bundle.accounts),
        "portfolios": _trim(bundle.portfolios),
    }


def _inspect_snapshot_tables(
    db_path: Path,
    limit: int,
) -> dict[str, Any]:
    """Return counts and previews from the canonical snapshot tables."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        return {
            "accounts": _snapshot_table_stats(conn, "account_snapshots", limit),
            "portfolios": _snapshot_table_stats(conn, "portfolio_snapshots", limit),
        }
    except sqlite3.Error:
        LOGGER.exception("Failed to inspect snapshot tables")
        return {
            "accounts": {"total": None, "latest_snapshot_at": None, "preview": []},
            "portfolios": {"total": None, "latest_snapshot_at": None, "preview": []},
        }
    finally:
        conn.close()


def _snapshot_table_stats(
    conn: sqlite3.Connection,
    table: str,
    limit: int,
) -> dict[str, Any]:
    """Return total rows, latest snapshot timestamp, and a preview list."""
    count_queries = {
        "account_snapshots": (
            "SELECT COUNT(*), MAX(snapshot_at) FROM account_snapshots"
        ),
        "portfolio_snapshots": (
            "SELECT COUNT(*), MAX(snapshot_at) FROM portfolio_snapshots"
        ),
    }
    query_map = {
        "account_snapshots": """
            SELECT
                account_uuid as uuid,
                name,
                currency_code,
                orig_balance,
                balance,
                snapshot_at
            FROM account_snapshots
            ORDER BY snapshot_at DESC, id DESC
            LIMIT ?
        """,
        "portfolio_snapshots": """
            SELECT
                portfolio_uuid as uuid,
                name,
                currency_code,
                current_value,
                purchase_sum,
                position_count,
                snapshot_at
            FROM portfolio_snapshots
            ORDER BY snapshot_at DESC, id DESC
            LIMIT ?
        """,
    }
    count_query = count_queries.get(table)
    preview_query = query_map.get(table)
    if not count_query or not preview_query:
        LOGGER.error("Unsupported snapshot table %s", table)
        return {"total": None, "latest_snapshot_at": None, "preview": []}

    try:
        total, latest = conn.execute(count_query).fetchone()
    except sqlite3.Error:
        return {"total": None, "latest_snapshot_at": None, "preview": []}

    preview_rows: list[dict[str, Any]] = []
    try:
        cursor = conn.execute(preview_query, (limit,))
        preview_rows.extend(dict(row) for row in cursor.fetchall())
    except sqlite3.Error:
        LOGGER.exception("Failed to load preview from %s", table)

    return {
        "total": int(total or 0),
        "latest_snapshot_at": latest,
        "preview": preview_rows,
    }


def _serialize_metric_run(run: Any | None) -> dict[str, Any] | None:
    """Return a serializable dict for MetricRunMetadata."""
    if run is None:
        return None
    return {
        "run_uuid": run.run_uuid,
        "status": run.status,
        "trigger": run.trigger,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "processed_portfolios": run.processed_portfolios,
        "processed_accounts": run.processed_accounts,
        "processed_securities": run.processed_securities,
        "error_message": run.error_message,
        "provenance": run.provenance,
    }


def _serialize_metric_batch(
    batch: Any,
    *,
    limit: int,
) -> dict[str, list[dict[str, Any]]]:
    """Return trimmed previews for each metric scope."""
    def _serialize_portfolio(record: Any) -> dict[str, Any]:
        return {
            "portfolio_uuid": record.portfolio_uuid,
            "current_value_cents": record.current_value_cents,
            "purchase_value_cents": record.purchase_value_cents,
            "gain_abs_cents": record.gain_abs_cents,
            "gain_pct": record.gain_pct,
            "coverage_ratio": record.coverage_ratio,
            "position_count": record.position_count,
        }

    def _serialize_account(record: Any) -> dict[str, Any]:
        return {
            "account_uuid": record.account_uuid,
            "currency_code": record.currency_code,
            "balance_native_cents": record.balance_native_cents,
            "balance_eur_cents": record.balance_eur_cents,
            "fx_rate": record.fx_rate,
            "coverage_ratio": record.coverage_ratio,
        }

    def _serialize_security(record: Any) -> dict[str, Any]:
        return {
            "portfolio_uuid": record.portfolio_uuid,
            "security_uuid": record.security_uuid,
            "current_value_cents": record.current_value_cents,
            "purchase_value_cents": record.purchase_value_cents,
            "gain_abs_cents": record.gain_abs_cents,
            "gain_pct": record.gain_pct,
        }

    portfolios = [
        _serialize_portfolio(record) for record in (batch.portfolios or ())[:limit]
    ]
    accounts = [
        _serialize_account(record) for record in (batch.accounts or ())[:limit]
    ]
    securities = [
        _serialize_security(record) for record in (batch.securities or ())[:limit]
    ]
    return {
        "portfolios": portfolios,
        "accounts": accounts,
        "securities": securities,
    }


def _configure_logging(*, verbose: bool) -> None:
    """Configure root logging for CLI usage."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def _build_argument_parser() -> argparse.ArgumentParser:
    """Return the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Dump canonical snapshot/metric diagnostics from SQLite.",
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="SQLite database path (default: %(default)s)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=3,
        help="Number of preview rows per section (default: %(default)s)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of pretty text.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Script entrypoint."""
    parser = _build_argument_parser()
    args = parser.parse_args(argv)
    _configure_logging(verbose=args.verbose)

    try:
        summary = asyncio.run(
            async_collect_canonical_diagnostics(
                args.db_path,
                preview_limit=max(1, int(args.limit)),
            ),
        )
    except KeyboardInterrupt:
        LOGGER.warning("Diagnostics dump aborted by user")
        return 1

    payload = (
        json.dumps(summary, indent=2, sort_keys=True)
        if args.json
        else json.dumps(summary, indent=2)
    )
    sys.stdout.write(f"{payload}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
