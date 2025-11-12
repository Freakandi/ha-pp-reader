"""Diagnostics helpers exposing ingestion, enrichment, metrics, & normalization."""

from __future__ import annotations

import importlib
import logging
import sqlite3
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data import ingestion_reader
from custom_components.pp_reader.feature_flags import snapshot as feature_flag_snapshot

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

INGESTION_TABLES = (
    "ingestion_accounts",
    "ingestion_portfolios",
    "ingestion_securities",
    "ingestion_transactions",
    "ingestion_transaction_units",
    "ingestion_historical_prices",
)

__all__ = ["async_get_parser_diagnostics"]
_LOGGER = logging.getLogger("custom_components.pp_reader.util.diagnostics")


def _get_normalization_module() -> Any:
    """Import the normalization pipeline lazily to avoid circular imports."""
    return importlib.import_module(
        "custom_components.pp_reader.data.normalization_pipeline"
    )


def _normalized_unavailable(reason: str, **extra: Any) -> dict[str, Any]:
    """Return a standard unavailable payload for normalized diagnostics."""
    payload = {
        "available": False,
        "reason": reason,
        "generated_at": None,
        "metric_run_uuid": None,
    }
    if extra:
        payload.update(extra)
    return payload


async def _collect_normalized_payload(
    hass: HomeAssistant,
    db_path: Path,
    *,
    entry_id: str | None,
    flag_snapshot: Mapping[str, bool],
) -> dict[str, Any]:
    """Resolve the serialized normalization result for diagnostics."""
    if entry_id and not flag_snapshot.get("normalized_pipeline", False):
        return _normalized_unavailable("feature_flag_disabled")

    try:
        pipeline = _get_normalization_module()
        snapshot = await pipeline.async_normalize_snapshot(
            hass,
            db_path,
            include_positions=False,
        )
    except FileNotFoundError:
        return _normalized_unavailable("database_not_found")
    except Exception:
        _LOGGER.exception(
            "Diagnostics: normalization snapshot failed (entry_id=%s)",
            entry_id,
        )
        return _normalized_unavailable("normalization_failed")

    if snapshot.metric_run_uuid is None:
        return _normalized_unavailable(
            "metric_run_missing",
            generated_at=snapshot.generated_at,
        )

    serialized = pipeline.serialize_normalization_result(snapshot)
    accounts = serialized.get("accounts", [])
    portfolios = serialized.get("portfolios", [])
    return {
        "available": True,
        "generated_at": snapshot.generated_at,
        "metric_run_uuid": snapshot.metric_run_uuid,
        "accounts": accounts,
        "portfolios": portfolios,
        "account_count": len(accounts),
        "portfolio_count": len(portfolios),
        "diagnostics": serialized.get("diagnostics"),
    }


def _serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.isoformat()
    return value.astimezone().isoformat()


def _collect_ingestion_payload(conn: sqlite3.Connection) -> dict[str, Any]:
    metadata = ingestion_reader.load_metadata(conn)
    counts: dict[str, int | None] = {}
    missing_tables: list[str] = []
    for table in INGESTION_TABLES:
        try:
            cursor = conn.execute(
                f'SELECT COUNT(*) FROM "{table}"'  # noqa: S608 - static table names
            )
        except sqlite3.Error:
            counts[table] = None
            missing_tables.append(table)
        else:
            counts[table] = int(cursor.fetchone()[0])

    snapshot = ingestion_reader.load_ingestion_snapshot(conn)
    parsed_client = snapshot.client if snapshot else None

    parsed_at = metadata.get("parsed_at") if metadata else None
    properties = metadata.get("properties") if metadata else {}
    if not isinstance(properties, Mapping):
        properties = dict(properties or {})

    payload: dict[str, Any] = {
        "available": bool(metadata),
        "run_id": metadata.get("run_id") if metadata else None,
        "file_path": metadata.get("file_path") if metadata else None,
        "parsed_at": _serialize_datetime(parsed_at),
        "pp_version": metadata.get("pp_version") if metadata else None,
        "base_currency": metadata.get("base_currency") if metadata else None,
        "properties": properties,
        "processed_entities": {
            "accounts": counts.get("ingestion_accounts"),
            "portfolios": counts.get("ingestion_portfolios"),
            "securities": counts.get("ingestion_securities"),
            "transactions": counts.get("ingestion_transactions"),
            "transaction_units": counts.get("ingestion_transaction_units"),
            "historical_prices": counts.get("ingestion_historical_prices"),
        },
    }

    if missing_tables:
        payload["warnings"] = {
            "missing_tables": missing_tables,
        }

    if parsed_client is not None:
        payload["ingestion_summary"] = {
            "accounts": len(parsed_client.accounts),
            "portfolios": len(parsed_client.portfolios),
            "securities": len(parsed_client.securities),
            "transactions": len(parsed_client.transactions),
        }

    return payload


def _collect_enrichment_payload(
    conn: sqlite3.Connection,
    *,
    flag_snapshot: Mapping[str, bool],
    fx_last_refresh: str | None,
) -> dict[str, Any]:
    fx_db_latest = None
    try:
        cursor = conn.execute(
            """
            SELECT MAX(fetched_at)
            FROM fx_rates
            """
        )
        row = cursor.fetchone()
        fx_db_latest = row[0] if row else None
    except sqlite3.Error:
        fx_db_latest = None

    queue_summary: dict[str, Any] = {}
    recent_failures: list[dict[str, Any]] = []
    queue_available = True
    try:
        cursor = conn.execute(
            """
            SELECT
                status,
                COUNT(*) AS total,
                MIN(scheduled_at) AS earliest_scheduled,
                MAX(updated_at) AS latest_update
            FROM price_history_queue
            GROUP BY status
            """
        )
        for row in cursor.fetchall():
            status = row["status"] or "unknown"
            queue_summary[status] = {
                "count": row["total"],
                "earliest_scheduled_at": row["earliest_scheduled"],
                "latest_update": row["latest_update"],
            }

        cursor = conn.execute(
            """
            SELECT
                id,
                security_uuid,
                last_error,
                updated_at
            FROM price_history_queue
            WHERE status = 'failed'
              AND last_error IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 5
            """
        )
        rows = cursor.fetchall()
        if rows:
            recent_failures = [
                {
                    "id": row["id"],
                    "security_uuid": row["security_uuid"],
                    "last_error": row["last_error"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]
    except sqlite3.Error:
        queue_available = False

    payload = {
        "available": queue_available,
        "feature_flags": dict(flag_snapshot),
        "fx": {
            "last_refresh": fx_last_refresh,
            "latest_rate_fetch": fx_db_latest,
        },
        "price_history_queue": {
            "summary": queue_summary if queue_summary else None,
            "recent_failures": recent_failures if recent_failures else None,
        },
    }

    if not queue_available:
        payload["reason"] = "price_history_queue table not accessible"

    return payload


def _coverage_for_table(
    conn: sqlite3.Connection,
    table: str,
) -> dict[str, Any]:
    coverage_query = {
        "portfolio_metrics": """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN coverage_ratio IS NOT NULL THEN 1 ELSE 0 END)
                    AS with_coverage,
                AVG(coverage_ratio) AS avg_coverage
            FROM portfolio_metrics
        """,
        "account_metrics": """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN coverage_ratio IS NOT NULL THEN 1 ELSE 0 END)
                    AS with_coverage,
                AVG(coverage_ratio) AS avg_coverage
            FROM account_metrics
        """,
        "security_metrics": """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN coverage_ratio IS NOT NULL THEN 1 ELSE 0 END)
                    AS with_coverage,
                AVG(coverage_ratio) AS avg_coverage
            FROM security_metrics
        """,
    }.get(table)

    if coverage_query is None:
        return {
            "available": False,
            "total": None,
            "with_coverage": None,
            "avg_coverage": None,
        }

    try:
        cursor = conn.execute(coverage_query)
        row = cursor.fetchone()
    except sqlite3.Error:
        return {
            "available": False,
            "total": None,
            "with_coverage": None,
            "avg_coverage": None,
        }

    if row is None:
        return {
            "available": True,
            "total": 0,
            "with_coverage": 0,
            "avg_coverage": None,
        }

    avg_coverage = row["avg_coverage"]
    normalized_avg = (
        round(float(avg_coverage), 4) if avg_coverage not in (None, "") else None
    )

    return {
        "available": True,
        "total": int(row["total"] or 0),
        "with_coverage": int(row["with_coverage"] or 0),
        "avg_coverage": normalized_avg,
    }


def _serialize_metric_run(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "run_uuid": row["run_uuid"],
        "status": row["status"],
        "trigger": row["trigger"],
        "started_at": row["started_at"],
        "finished_at": row["finished_at"],
        "duration_ms": row["duration_ms"],
        "total_entities": row["total_entities"],
        "processed_portfolios": row["processed_portfolios"],
        "processed_accounts": row["processed_accounts"],
        "processed_securities": row["processed_securities"],
        "error_message": row["error_message"],
        "provenance": row["provenance"],
    }


def _collect_metrics_payload(conn: sqlite3.Connection) -> dict[str, Any]:
    try:
        cursor = conn.execute(
            """
            SELECT
                run_uuid,
                status,
                trigger,
                started_at,
                finished_at,
                duration_ms,
                total_entities,
                processed_portfolios,
                processed_accounts,
                processed_securities,
                error_message,
                provenance
            FROM metric_runs
            ORDER BY started_at DESC
            LIMIT 10
            """
        )
        run_rows = cursor.fetchall()
    except sqlite3.Error:
        return {
            "available": False,
            "reason": "metric_runs table not accessible",
            "latest_run": None,
            "recent_runs": [],
            "coverage": None,
        }

    recent_runs = [_serialize_metric_run(row) for row in run_rows]
    latest_run = recent_runs[0] if recent_runs else None

    coverage_summary = {
        "portfolios": _coverage_for_table(conn, "portfolio_metrics"),
        "accounts": _coverage_for_table(conn, "account_metrics"),
        "securities": _coverage_for_table(conn, "security_metrics"),
    }

    payload: dict[str, Any] = {
        "available": bool(latest_run),
        "latest_run": latest_run,
        "recent_runs": recent_runs,
        "coverage": coverage_summary,
    }

    if latest_run is None:
        payload["reason"] = "no metric runs recorded"

    return payload


async def async_get_parser_diagnostics(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    entry_id: str | None = None,
) -> dict[str, Any]:
    """
    Return parser ingestion diagnostics for Home Assistant support panels.

    The result mirrors the latest staging metadata and entity counters so
    support engineers can verify recent parser runs without accessing the DB
    directly.
    """
    path = Path(db_path)

    entry_store: Mapping[str, Any] | None = None
    if entry_id:
        domain_store = hass.data.get(DOMAIN)
        if isinstance(domain_store, Mapping):
            candidate = domain_store.get(entry_id)
            if isinstance(candidate, Mapping):
                entry_store = candidate

    fx_last_refresh = None
    if entry_store:
        candidate = entry_store.get("fx_last_refresh")
        if isinstance(candidate, datetime):
            fx_last_refresh = _serialize_datetime(candidate)

    if not path.exists():
        base_payload = {
            "ingestion": {
                "available": False,
                "reason": f"database not found at {path}",
            },
            "enrichment": {
                "available": False,
                "reason": "database not accessible",
                "feature_flags": {},
                "fx": {
                    "last_refresh": fx_last_refresh,
                },
            },
        }
        base_payload["metrics"] = {
            "available": False,
            "reason": "database not accessible",
            "latest_run": None,
            "recent_runs": [],
            "coverage": None,
        }
        base_payload["normalized_payload"] = _normalized_unavailable(
            "database_not_found"
        )

        return base_payload

    flag_snapshot: dict[str, bool] = {}
    if entry_id:
        flag_snapshot = feature_flag_snapshot(hass, entry_id=entry_id)

    def _collect() -> dict[str, Any]:
        conn = sqlite3.connect(str(path))
        conn.row_factory = sqlite3.Row
        try:
            ingestion_payload = _collect_ingestion_payload(conn)
            enrichment_payload = _collect_enrichment_payload(
                conn,
                flag_snapshot=flag_snapshot,
                fx_last_refresh=fx_last_refresh,
            )
            metrics_payload = _collect_metrics_payload(conn)

        finally:
            conn.close()

        return {
            "ingestion": ingestion_payload,
            "enrichment": enrichment_payload,
            "metrics": metrics_payload,
        }

    payload = await hass.async_add_executor_job(_collect)
    normalized_payload = await _collect_normalized_payload(
        hass,
        path,
        entry_id=entry_id,
        flag_snapshot=flag_snapshot,
    )
    payload["normalized_payload"] = normalized_payload
    return payload
