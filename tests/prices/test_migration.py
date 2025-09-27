"""
Tests für Schema-Migration der Preis-Spalten (Item: migration_test).

Szenarien:
1. Fresh DB: initialize_database_schema erzeugt securities Tabelle inklusive
   last_price_source, last_price_fetched_at.
2. Legacy DB (ohne neue Spalten): Nach initialize_database_schema werden
   die fehlenden Spalten ergänzt (best-effort ALTER). Existierende Daten bleiben erhalten.

Keine Änderungen am Produktionscode.
"""

import sqlite3
from pathlib import Path

from custom_components.pp_reader.data.db_init import initialize_database_schema


def _get_columns(db_path: Path, table: str) -> dict[str, dict]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA table_info('{table}')").fetchall()
        # PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
        return {r[1]: {"type": r[2], "notnull": r[3], "pk": r[5]} for r in rows}
    finally:
        conn.close()


def test_fresh_schema_contains_price_columns(tmp_path):
    db_path = tmp_path / "fresh.db"
    initialize_database_schema(db_path)

    cols = _get_columns(db_path, "securities")
    assert "last_price_source" in cols, "Spalte last_price_source fehlt in frischer DB"
    assert "last_price_fetched_at" in cols, (
        "Spalte last_price_fetched_at fehlt in frischer DB"
    )
    assert cols["last_price_source"]["type"].upper() == "TEXT"
    assert cols["last_price_fetched_at"]["type"].upper() == "TEXT"


def test_legacy_schema_migrated(tmp_path):
    db_path = tmp_path / "legacy.db"
    # Erzeuge Legacy Tabelle ohne die neuen Spalten
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            CREATE TABLE securities (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                isin TEXT,
                wkn TEXT,
                ticker_symbol TEXT,
                feed TEXT,
                currency_code TEXT,
                retired INTEGER,
                updated_at TEXT,
                last_price INTEGER,
                last_price_date INTEGER
            );
            """
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price, last_price_date) "
            "VALUES (?,?,?,?,?,?,?)",
            ("u1", "TestSec", "ABC", "EUR", 0, 123456789, 20240101),
        )
        conn.commit()
    finally:
        conn.close()

    # Aufruf Migration
    initialize_database_schema(db_path)

    cols = _get_columns(db_path, "securities")
    assert "last_price_source" in cols, "Migration hat last_price_source nicht ergänzt"
    assert "last_price_fetched_at" in cols, (
        "Migration hat last_price_fetched_at nicht ergänzt"
    )

    # Datenintegrität prüfen
    conn2 = sqlite3.connect(str(db_path))
    try:
        row = conn2.execute(
            "SELECT uuid, last_price FROM securities WHERE uuid='u1'"
        ).fetchone()
        assert row is not None, "Bestandsdatensatz fehlt nach Migration"
        assert row[1] == 123456789, "last_price Wert geändert durch Migration"
    finally:
        conn2.close()
