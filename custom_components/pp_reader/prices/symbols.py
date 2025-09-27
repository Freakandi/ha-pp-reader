"""
Symbol Autodiscovery (Schritt 1: SQL Query).

Stellt die Basis-Funktion zum Laden aller aktiven (nicht 'retired') Wertpapier-
Symbole bereit, die ein nicht-leeres `ticker_symbol` besitzen.

Folgt Spezifikation (.docs/nextGoals.md §6):
SQL:
    SELECT uuid, ticker_symbol FROM securities
    WHERE retired=0
      AND ticker_symbol IS NOT NULL
      AND ticker_symbol != ''

Weitere Schritte (separate Items):
- Deduplikation & Mapping symbol -> [uuids]
- Einmaliges INFO-Log bei vollständig leerer Liste

Rückgabe:
    Liste von (uuid, ticker_symbol) Tupeln in stabiler Reihenfolge
    (sortiert nach ticker_symbol, uuid).
"""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

_LOGGER = logging.getLogger(__name__)
__all__ = ["load_active_security_symbols"]


def load_active_security_symbols(db_path: Path) -> list[tuple[str, str]]:
    """
    Lädt aktive Security-Symbole aus der DB.

    Args:
        db_path: Pfad zur SQLite-Datenbank.

    Returns:
        Liste von (uuid, ticker_symbol)

    """
    try:
        conn = sqlite3.connect(str(db_path))
    except Exception:
        _LOGGER.exception(
            "Symbol-Autoload: Verbindung zur DB fehlgeschlagen: %s", db_path
        )
        return []

    try:
        cur = conn.execute(
            """
            SELECT uuid, ticker_symbol
            FROM securities
            WHERE retired = 0
              AND ticker_symbol IS NOT NULL
              AND ticker_symbol != ''
            ORDER BY ticker_symbol, uuid
            """
        )
        rows = [(r[0], r[1]) for r in cur.fetchall()]
    except sqlite3.Error:
        _LOGGER.exception("Symbol-Autoload: Fehler beim Ausführen der Symbol-Query")
        return []
    else:
        _LOGGER.debug("Symbol-Autoload: %d aktive Symbole geladen", len(rows))
        return rows
    finally:
        conn.close()
