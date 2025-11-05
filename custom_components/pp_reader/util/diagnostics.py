"""Diagnostics helpers exposing ingestion and enrichment metadata."""

from __future__ import annotations

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

    return {
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

    flag_snapshot: dict[str, bool] = {}
    if entry_id:
        flag_snapshot = feature_flag_snapshot(hass, entry_id=entry_id)

    if not path.exists():
        return {
            "ingestion": {
                "available": False,
                "reason": f"database not found at {path}",
            },
            "enrichment": {
                "available": False,
                "reason": "database not accessible",
                "feature_flags": flag_snapshot,
                "fx": {
                    "last_refresh": fx_last_refresh,
                },
            },
        }

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

        finally:
            conn.close()

        return {
            "ingestion": ingestion_payload,
            "enrichment": enrichment_payload,
        }

    return await hass.async_add_executor_job(_collect)
