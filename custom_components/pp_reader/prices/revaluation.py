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
  Truth).
- Fehler dürfen den Preiszyklus nicht unterbrechen (fehlertolerant).
"""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import fetch_live_portfolios
from custom_components.pp_reader.data.normalization_pipeline import (
    load_portfolio_position_snapshots,
    serialize_position_snapshot,
)
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

# HINWEIS (Item portfolio_aggregation_reuse):
# Die Revaluation nutzt fetch_live_portfolios als Single Source of Truth und
# verzichtet auf die früheren manuellen Aggregationspfade.

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
        _LOGGER.debug(
            "revaluation: missing live aggregates for %s", sorted(missing_portfolios)
        )

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
        live_rows = await async_run_executor_job(hass, fetch_live_portfolios, db_path)
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
        if not isinstance(data, dict):
            continue

        entry = dict(data)
        entry["uuid"] = entry.get("uuid", p_uuid)

        if not entry.get("name"):
            entry["name"] = names.get(p_uuid, p_uuid)

        if "position_count" not in entry and "count" in entry:
            entry["position_count"] = entry.get("count")
        entry.pop("count", None)

        portfolio_values[p_uuid] = entry

    return portfolio_values


async def _load_portfolio_positions(
    hass: HomeAssistant, db_path: Path, affected: set[str]
) -> dict[str, list[dict]] | None:
    if not affected:
        return None

    try:
        raw_positions = await async_run_executor_job(
            hass,
            load_portfolio_position_snapshots,
            db_path,
            affected,
        )
    except RuntimeError:
        _LOGGER.warning(
            "revaluation: Fehler beim Laden der Positionsdaten",
            exc_info=True,
        )
        return None

    if not raw_positions:
        return None

    serialized: dict[str, list[dict[str, Any]]] = {}
    for pid, entries in raw_positions.items():
        payload = [serialize_position_snapshot(position) for position in entries or ()]
        if payload:
            serialized[pid] = payload

    if serialized:
        return serialized

    return _fallback_portfolio_positions(db_path, affected)


def _fallback_portfolio_positions(
    db_path: Path, affected: set[str]
) -> dict[str, list[dict[str, Any]]] | None:
    """Build minimal live positions directly from portfolio_securities."""
    if not affected:
        return None

    placeholders = ",".join("?" for _ in affected)
    query_parts = (
        "SELECT "
        "ps.portfolio_uuid, "
        "ps.security_uuid, "
        "ps.current_holdings, "
        "ps.purchase_value, "
        "ps.current_value, "
        "s.name, "
        "s.currency_code "
        "FROM portfolio_securities ps "
        "LEFT JOIN securities s ON s.uuid = ps.security_uuid "
        "WHERE ps.portfolio_uuid IN ("
    )
    query = query_parts + placeholders + ")"

    try:
        with sqlite3.connect(str(db_path)) as conn:
            cur = conn.execute(query, tuple(affected))
            rows = cur.fetchall()
    except sqlite3.Error:
        _LOGGER.warning(
            "revaluation: Fehler beim Laden fallback-Positionsdaten",
            exc_info=True,
        )
        return None

    if not rows:
        return None

    positions: dict[str, list[dict[str, Any]]] = {}
    for (
        portfolio_uuid,
        security_uuid,
        current_holdings,
        purchase_value_cents,
        current_value_cents,
        name,
        currency_code,
    ) in rows:
        entry: dict[str, Any] = {
            "security_uuid": security_uuid,
            "name": name,
            "currency_code": currency_code,
        }
        if current_holdings is not None:
            entry["current_holdings"] = float(current_holdings)
        purchase_value = cent_to_eur(purchase_value_cents, default=None)
        if purchase_value is not None:
            entry["purchase_value"] = purchase_value
        current_value = cent_to_eur(current_value_cents, default=None)
        if current_value is not None:
            entry["current_value"] = current_value

        positions.setdefault(portfolio_uuid, []).append(entry)

    return positions or None
