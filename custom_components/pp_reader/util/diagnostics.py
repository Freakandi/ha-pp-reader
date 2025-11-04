"""Diagnostics helpers exposing ingestion metadata for support panels."""

from __future__ import annotations

import sqlite3
from collections.abc import Mapping
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data import ingestion_reader

if TYPE_CHECKING:
    from datetime import datetime

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


async def async_get_parser_diagnostics(
    hass: HomeAssistant,
    db_path: Path | str,
) -> dict[str, Any]:
    """
    Return parser ingestion diagnostics for Home Assistant support panels.

    The result mirrors the latest staging metadata and entity counters so
    support engineers can verify recent parser runs without accessing the DB
    directly.
    """
    path = Path(db_path)

    if not path.exists():
        return {
            "ingestion": {
                "available": False,
                "reason": f"database not found at {path}",
            }
        }

    def _collect() -> dict[str, Any]:
        conn = sqlite3.connect(str(path))
        conn.row_factory = sqlite3.Row
        try:
            metadata = ingestion_reader.load_metadata(conn)
            counts: dict[str, int | None] = {}
            missing_tables: list[str] = []
            for table in INGESTION_TABLES:
                try:
                    cursor = conn.execute(
                        f'SELECT COUNT(*) FROM "{table}"'  # noqa: S608 - table names are static
                    )
                except sqlite3.Error:
                    counts[table] = None
                    missing_tables.append(table)
                else:
                    counts[table] = int(cursor.fetchone()[0])

            snapshot = ingestion_reader.load_ingestion_snapshot(conn)
            parsed_client = snapshot.client if snapshot else None

        finally:
            conn.close()

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

    return {
        "ingestion": await hass.async_add_executor_job(_collect),
    }
