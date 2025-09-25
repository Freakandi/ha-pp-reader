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
- Reuse vorhandener Aggregationsfunktionen (calculate_portfolio_value, calculate_purchase_sum).
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

# HINWEIS (Item portfolio_aggregation_reuse):
# Die Revaluation nutzt bewusst die bestehenden Aggregationsfunktionen
# calculate_portfolio_value und calculate_purchase_sum (kein eigener
# Berechnungsweg), womit das ToDo "Vorhandene Aggregationsfunktionen
# wiederverwenden" erfüllt ist. Diese Kommentarergänzung dient der
# transparenten Nachvollziehbarkeit ohne funktionale Änderung.

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

    # DB-Dateipfad für Reuse der bestehenden Aggregationsfunktionen ermitteln
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
    reference_date = datetime.utcnow()

    # Sequenziell (Anzahl Portfolios typischerweise klein). Optimierung optional später.
    for p_uuid in affected:
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

    if not portfolio_values:
        return {"portfolio_values": None, "portfolio_positions": None}

    # Positionsdaten aktuell nicht berechnet (Folge-Item ergänzt)
    return {
        "portfolio_values": portfolio_values,
        "portfolio_positions": None,  # TODO (portfolio_aggregation_reuse / events): Positionsdetails ergänzen
    }
