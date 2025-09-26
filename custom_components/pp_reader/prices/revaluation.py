"""
Partielle Revaluation nach Preis-Updates.

Berechnet aggregierte Portfolio-Werte nur für Portfolios, deren Wertpapiere
im aktuellen Zyklus eine Preisänderung hatten.

Rückgabeformat:
{
  "portfolio_values": { portfolio_uuid: { name, value, count, purchase_sum }, ... } | None,
  "portfolio_positions": None  # (wird in späterem Schritt ergänzt)
}

Hinweise:
- Positionsdetails werden bewusst in einem separaten Item ergänzt (Events-Phase).
- Aggregation erfolgt primär via fetch_live_portfolios (Single Source of Truth) mit Fallback auf calculate_portfolio_value / calculate_purchase_sum.
- Fehler dürfen den Preiszyklus nicht unterbrechen (fehlertolerant).
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Set

from ..logic.portfolio import (
    calculate_portfolio_value,
    calculate_purchase_sum,
)
from ..data.db_access import fetch_live_portfolios  # Einheitliche Aggregationsquelle
from ..data.sync_from_pclient import fetch_positions_for_portfolios  # NEU: Reuse bestehender Positions-Loader

# HINWEIS (Item portfolio_aggregation_reuse):
# Die Revaluation nutzt primär fetch_live_portfolios als Single Source of Truth.
# Für Resilienz bleibt ein Fallback auf calculate_portfolio_value /
# calculate_purchase_sum erhalten, damit Events trotz temporärer Fehler
# zuverlässig bleiben.

_LOGGER = logging.getLogger(__name__)
__all__ = ["revalue_after_price_updates"]


async def revalue_after_price_updates(
    hass,
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
    updated_set: Set[str] = set(updated_security_uuids)
    if not updated_set:
        return {"portfolio_values": None, "portfolio_positions": None}

    # Betroffene Portfolios via UNION (portfolio_securities + transactions)
    try:
        placeholders = ",".join("?" for _ in updated_set)
        affected: Set[str] = set()

        if placeholders:  # defensiv
            cur = conn.execute(
                f"""
                SELECT DISTINCT portfolio_uuid
                FROM portfolio_securities
                WHERE security_uuid IN ({placeholders})
                """,
                tuple(updated_set),
            )
            affected.update(r for (r,) in cur.fetchall())

            cur = conn.execute(
                f"""
                SELECT DISTINCT portfolio
                FROM transactions
                WHERE security IN ({placeholders})
                  AND portfolio IS NOT NULL
                """,
                tuple(updated_set),
            )
            affected.update(r for (r,) in cur.fetchall())

        if not affected:
            return {"portfolio_values": None, "portfolio_positions": None}

        # Portfolio Namen laden
        cur = conn.execute(
            f"""
            SELECT uuid, name
            FROM portfolios
            WHERE uuid IN ({",".join("?" for _ in affected)})
            """,
            tuple(affected),
        )
        names = {uuid: name for uuid, name in cur.fetchall()}

    except sqlite3.Error:
        _LOGGER.warning(
            "revaluation: SQL Fehler bei Ermittlung betroffener Portfolios",
            exc_info=True,
        )
        return {"portfolio_values": None, "portfolio_positions": None}

    # DB-Dateipfad ermitteln (benötigt für Aggregations-Helper)
    try:
        db_list = conn.execute("PRAGMA database_list").fetchall()
        main_row = next((r for r in db_list if r[1] == "main"), None)
        db_path = Path(main_row[2]) if main_row and main_row[2] else None
    except Exception:
        db_path = None

    if db_path is None:
        _LOGGER.warning(
            "revaluation: Konnte DB-Pfad über PRAGMA database_list nicht ermitteln"
        )
        return {"portfolio_values": None, "portfolio_positions": None}

    portfolio_values: dict[str, dict] = {}
    live_entries: dict[str, dict[str, Any]] = {}
    try:
        live_rows = await hass.async_add_executor_job(fetch_live_portfolios, db_path)
        for row in live_rows or []:
            if not isinstance(row, dict):
                continue
            p_uuid = row.get("uuid")
            if not p_uuid:
                continue
            live_entries[p_uuid] = row
    except Exception:
        _LOGGER.warning(
            "revaluation: fetch_live_portfolios fehlgeschlagen – fallback auf Einzelaggregation",
            exc_info=True,
        )

    missing_portfolios: Set[str] = set(affected)

    for p_uuid in list(missing_portfolios):
        data = live_entries.get(p_uuid)
        if not data:
            continue

        raw_value = data.get("current_value", data.get("value"))
        raw_purchase_sum = data.get("purchase_sum")
        raw_count = data.get("position_count", data.get("count"))

        try:
            value = round(float(raw_value) / 100, 2)
        except (TypeError, ValueError):
            value = 0.0

        try:
            purchase_sum = round(float(raw_purchase_sum) / 100, 2)
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
        missing_portfolios.discard(p_uuid)

    if missing_portfolios:
        reference_date = datetime.utcnow()

        for p_uuid in list(missing_portfolios):
            try:
                value, count = await calculate_portfolio_value(
                    p_uuid, reference_date, db_path
                )
                purchase_sum = await calculate_purchase_sum(p_uuid, db_path)
                portfolio_values[p_uuid] = {
                    "name": names.get(p_uuid, p_uuid),
                    "value": value,
                    "count": count,
                    "purchase_sum": purchase_sum,
                }
            except Exception:
                _LOGGER.warning(
                    "revaluation: Fehler bei Aggregation für Portfolio %s",
                    p_uuid,
                    exc_info=True,
                )
            finally:
                missing_portfolios.discard(p_uuid)

    if not portfolio_values:
        return {"portfolio_values": None, "portfolio_positions": None}

    # NEU: Positionsdaten für betroffene Portfolios laden (Reuse Helper)
    portfolio_positions = None
    try:
        # fetch_positions_for_portfolios öffnet eigene DB-Verbindung → Executor
        raw_positions = await hass.async_add_executor_job(
            fetch_positions_for_portfolios, db_path, affected
        )
        # Nur setzen, wenn nicht leer
        if raw_positions:
            portfolio_positions = raw_positions
    except Exception:
        _LOGGER.warning(
            "revaluation: Fehler beim Laden der Positionsdaten",
            exc_info=True,
        )
        portfolio_positions = None

    return {
        "portfolio_values": portfolio_values,
        "portfolio_positions": portfolio_positions,
    }
