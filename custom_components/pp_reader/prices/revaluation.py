"""
Partielle Revaluation nach Preis-Updates.

Berechnet aggregierte Portfolio-Werte nur für Portfolios, deren Wertpapiere
im aktuellen Zyklus eine Preisänderung hatten.

Rückgabeformat:
{
  "portfolio_values": {
      portfolio_uuid: { name, value, count, purchase_sum },
      ...
  } | None,
  "portfolio_positions": None  # (wird in späterem Schritt ergänzt)
}

Hinweise:
- Positionsdetails werden bewusst in einem separaten Item ergänzt
  (Events-Phase).
- Aggregation erfolgt primär via fetch_live_portfolios (Single Source of
  Truth) mit Fallback auf calculate_portfolio_value / calculate_purchase_sum.
- Fehler dürfen den Preiszyklus nicht unterbrechen (fehlertolerant).
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import fetch_live_portfolios
from custom_components.pp_reader.data.sync_from_pclient import (
    fetch_positions_for_portfolios,
)
from custom_components.pp_reader.logic.portfolio import (
    calculate_portfolio_value,
    calculate_purchase_sum,
)
from custom_components.pp_reader.util import async_run_executor_job

# HINWEIS (Item portfolio_aggregation_reuse):
# Die Revaluation nutzt primär fetch_live_portfolios als Single Source of Truth.
# Für Resilienz bleibt ein Fallback auf calculate_portfolio_value /
# calculate_purchase_sum erhalten, damit Events trotz temporärer Fehler
# zuverlässig bleiben.

_LOGGER = logging.getLogger(__name__)
__all__ = ["revalue_after_price_updates"]


if TYPE_CHECKING:
    from collections.abc import Iterable

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime alias for type checking compatibility
    import collections.abc as _collections_abc

    HomeAssistant = Any
    Iterable = _collections_abc.Iterable


async def revalue_after_price_updates(
    hass: HomeAssistant,
    conn: sqlite3.Connection,
    updated_security_uuids: Iterable[str],
) -> dict[str, Any]:
    """
    Führt eine partielle Revaluation für betroffene Portfolios durch.

    Parameters
    ----------
    hass : HomeAssistant
        HA Instanz (für async Aufrufe der Aggregationsfunktionen).
    conn : sqlite3.Connection
        Bereits geöffnete DB-Verbindung (read-only Nutzung hier).
    updated_security_uuids : Iterable[str]
        Securities mit geänderten Preisen.

    Returns
    -------
    dict[str, Any]
        Struktur mit (portfolio_values | None, portfolio_positions | None)

    """
    updated_set = set(updated_security_uuids)
    if not updated_set:
        return {"portfolio_values": None, "portfolio_positions": None}

    affected, names = _collect_affected_portfolios(conn, updated_set)
    if not affected:
        return {"portfolio_values": None, "portfolio_positions": None}

    db_path = _resolve_main_db_path(conn)
    if db_path is None:
        _LOGGER.warning(
            "revaluation: Konnte DB-Pfad über PRAGMA database_list nicht ermitteln"
        )
        return {"portfolio_values": None, "portfolio_positions": None}

    live_entries = await _load_live_entries(hass, db_path)
    portfolio_values = _build_portfolio_values_from_live_entries(live_entries, names)

    missing_portfolios = set(affected) - set(portfolio_values)
    if missing_portfolios:
        fallback_values = await _fallback_aggregate_missing(
            missing_portfolios, names, db_path
        )
        portfolio_values.update(fallback_values)

    if not portfolio_values:
        return {"portfolio_values": None, "portfolio_positions": None}

    portfolio_positions = await _load_portfolio_positions(hass, db_path, affected)

    return {
        "portfolio_values": portfolio_values,
        "portfolio_positions": portfolio_positions,
    }


def _collect_affected_portfolios(
    conn: sqlite3.Connection, updated_set: set[str]
) -> tuple[set[str], dict[str, str]]:
    placeholders = ",".join("?" for _ in updated_set)
    affected: set[str] = set()

    if not placeholders:
        return affected, {}

    try:
        security_query = (
            "SELECT DISTINCT portfolio_uuid "
            "FROM portfolio_securities "
            "WHERE security_uuid IN (" + placeholders + ")"
        )
        cur = conn.execute(security_query, tuple(updated_set))
        affected.update(r for (r,) in cur.fetchall())

        transaction_query = (
            "SELECT DISTINCT portfolio "
            "FROM transactions "
            "WHERE security IN (" + placeholders + ") AND portfolio IS NOT NULL"
        )
        cur = conn.execute(transaction_query, tuple(updated_set))
        affected.update(r for (r,) in cur.fetchall())

        if not affected:
            return affected, {}

        name_placeholders = ",".join("?" for _ in affected)
        name_query = (
            "SELECT uuid, name "
            "FROM portfolios "
            "WHERE uuid IN (" + name_placeholders + ")"
        )
        cur = conn.execute(name_query, tuple(affected))
        names = dict(cur.fetchall())
    except sqlite3.Error:
        _LOGGER.warning(
            "revaluation: SQL Fehler bei Ermittlung betroffener Portfolios",
            exc_info=True,
        )
        return set(), {}

    return affected, names


def _resolve_main_db_path(conn: sqlite3.Connection) -> Path | None:
    try:
        db_list = conn.execute("PRAGMA database_list").fetchall()
    except sqlite3.Error:
        return None

    main_row = next((r for r in db_list if r[1] == "main"), None)
    if not main_row or not main_row[2]:
        return None

    try:
        return Path(main_row[2])
    except (TypeError, ValueError):
        return None


async def _load_live_entries(
    hass: HomeAssistant, db_path: Path
) -> dict[str, dict[str, Any]]:
    live_entries: dict[str, dict[str, Any]] = {}
    try:
        live_rows = await async_run_executor_job(
            hass, fetch_live_portfolios, db_path
        )
    except RuntimeError:
        _LOGGER.warning(
            (
                "revaluation: fetch_live_portfolios fehlgeschlagen - "
                "fallback auf Einzelaggregation"
            ),
            exc_info=True,
        )
        return live_entries

    for row in live_rows or []:
        if not isinstance(row, dict):
            continue
        p_uuid = row.get("uuid")
        if not p_uuid:
            continue
        live_entries[p_uuid] = row

    return live_entries


def _build_portfolio_values_from_live_entries(
    live_entries: dict[str, dict[str, Any]], names: dict[str, str]
) -> dict[str, dict[str, Any]]:
    portfolio_values: dict[str, dict[str, Any]] = {}

    for p_uuid, data in live_entries.items():
        raw_value = data.get("current_value", data.get("value"))
        raw_purchase_sum = data.get("purchase_sum")
        raw_count = data.get("position_count", data.get("count"))

        try:
            value = round(float(raw_value), 2)
        except (TypeError, ValueError):
            value = 0.0

        try:
            purchase_sum = round(float(raw_purchase_sum), 2)
        except (TypeError, ValueError):
            purchase_sum = 0.0

        try:
            count = int(raw_count) if raw_count is not None else 0
        except (TypeError, ValueError):
            count = 0

        portfolio_values[p_uuid] = {
            "name": data.get("name") or names.get(p_uuid, p_uuid),
            "value": value,
            "count": count,
            "purchase_sum": purchase_sum,
        }

    return portfolio_values


async def _fallback_aggregate_missing(
    missing_portfolios: set[str], names: dict[str, str], db_path: Path
) -> dict[str, dict[str, Any]]:
    if not missing_portfolios:
        return {}

    reference_date = datetime.now(tz=UTC)
    aggregated: dict[str, dict[str, Any]] = {}

    for p_uuid in list(missing_portfolios):
        try:
            value, count = await calculate_portfolio_value(
                p_uuid, reference_date, db_path
            )
            purchase_sum = await calculate_purchase_sum(p_uuid, db_path)
        except (RuntimeError, sqlite3.Error, ValueError):
            _LOGGER.warning(
                "revaluation: Fehler bei Aggregation für Portfolio %s",
                p_uuid,
                exc_info=True,
            )
            continue

        aggregated[p_uuid] = {
            "name": names.get(p_uuid, p_uuid),
            "value": value,
            "count": count,
            "purchase_sum": purchase_sum,
        }

    return aggregated


async def _load_portfolio_positions(
    hass: HomeAssistant, db_path: Path, affected: set[str]
) -> dict[str, list[dict]] | None:
    if not affected:
        return None

    try:
        raw_positions = await async_run_executor_job(
            hass, fetch_positions_for_portfolios, db_path, affected
        )
    except RuntimeError:
        _LOGGER.warning(
            "revaluation: Fehler beim Laden der Positionsdaten",
            exc_info=True,
        )
        return None

    if not raw_positions:
        return None

    return raw_positions
