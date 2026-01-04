"""Core stateless FX rate lookup utilities."""

from __future__ import annotations

import logging
import sqlite3

_LOGGER = logging.getLogger(__name__)


def get_best_available_fx_rate(
    conn: sqlite3.Connection, currency: str, tx_date: str
) -> float | None:
    """Return the latest FX rate on or before the transaction date."""
    normalized = (currency or "").strip().upper()
    if not normalized:
        return None
    if normalized == "EUR":
        return 1.0
    try:
        cur = conn.execute(
            """
            SELECT rate, date
            FROM fx_rates
            WHERE currency = ?
              AND date <= ?
            ORDER BY date DESC
            LIMIT 1
            """,
            (normalized, tx_date),
        )
        row = cur.fetchone()
        if row is None:
            cur = conn.execute(
                """
                SELECT rate, date
                FROM fx_rates
                WHERE currency = ?
                ORDER BY date ASC
                LIMIT 1
                """,
                (normalized,),
            )
            row = cur.fetchone()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden des FX-Kurses für %s (%s)", normalized, tx_date
        )
        return None

    if row and row[0] not in (None, ""):
        try:
            rate_value = float(row[0])
        except (TypeError, ValueError):
            return None
        if row[1] and row[1] > tx_date:
            _LOGGER.warning(
                "Kein FX-Kurs <= %s für %s gefunden; nutze ersten Wert vom %s",
                tx_date,
                normalized,
                row[1],
            )
        return rate_value

    _LOGGER.warning("Kein FX-Kurs gefunden für %s zum %s", normalized, tx_date)
    return None
