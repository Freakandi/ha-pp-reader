"""Database initialization helpers for the Portfolio Performance Reader."""

import logging
import sqlite3
from pathlib import Path

from .db_schema import ALL_SCHEMAS

_LOGGER = logging.getLogger(__name__)


def _ensure_runtime_price_columns(conn: sqlite3.Connection) -> None:
    """
    Best-effort Runtime-Migration für neue Preis-bezogene Spalten in
    `securities`.

    Falls eine bestehende DB vor der Schema-Erweiterung existiert, werden die
    Spalten `type`, `last_price_source` und `last_price_fetched_at`
    nachträglich per ALTER TABLE hinzugefügt. Fehler (z.B. weil Spalte bereits
    existiert) werden geloggt aber nicht eskaliert.
    """
    try:
        cur = conn.execute("PRAGMA table_info(securities)")
        existing_cols = {row[1] for row in cur.fetchall()}
    except sqlite3.Error:
        _LOGGER.warning(
            (
                "Konnte PRAGMA table_info(securities) nicht ausführen - "
                "Migration übersprungen"
            ),
            exc_info=True,
        )
        return

    migrations: list[tuple[str, str]] = []
    if "type" not in existing_cols:
        migrations.append(
            (
                "type",
                "ALTER TABLE securities ADD COLUMN type TEXT",
            )
        )
    if "last_price_source" not in existing_cols:
        migrations.append(
            (
                "last_price_source",
                "ALTER TABLE securities ADD COLUMN last_price_source TEXT",
            )
        )
    if "last_price_fetched_at" not in existing_cols:
        migrations.append(
            (
                "last_price_fetched_at",
                "ALTER TABLE securities ADD COLUMN last_price_fetched_at TEXT",
            )
        )

    for col, ddl in migrations:
        try:
            conn.execute(ddl)
            _LOGGER.info("Runtime-Migration: Spalte '%s' hinzugefügt", col)
        except sqlite3.Error:
            # Ignorieren, falls parallel erstellt oder anderer harmloser Fehler
            _LOGGER.warning(
                "Runtime-Migration: Konnte Spalte '%s' nicht hinzufügen",
                col,
                exc_info=True,
            )

    if not migrations:
        _LOGGER.debug(
            "Runtime-Migration: Preis-Spalten bereits vorhanden - nichts zu tun"
        )


def _ensure_historical_price_index(conn: sqlite3.Connection) -> None:
    """Create the historical price index if it does not yet exist."""

    try:
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_historical_prices_security_date
            ON historical_prices(security_uuid, date)
            """
        )
    except sqlite3.Error:
        _LOGGER.warning(
            "Konnte Index 'idx_historical_prices_security_date' nicht erzeugen",
            exc_info=True,
        )


def initialize_database_schema(db_path: Path) -> None:
    """Initialisiert die SQLite Datenbank mit dem definierten Schema."""
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)

        if not db_path.exists():
            _LOGGER.info("📁 Erzeuge neue Datenbankdatei: %s", db_path)

        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN TRANSACTION")

        try:
            # Ausführen aller DDL-Statements aus allen Schema-Arrays
            for schema_group in ALL_SCHEMAS:
                # Jedes Schema ist ein Array von SQL-Statements
                if isinstance(schema_group, list):
                    for ddl in schema_group:
                        conn.execute(ddl)
                else:
                    # Falls einzelnes Statement
                    conn.execute(schema_group)

            # Initialen Eintrag für das Änderungsdatum hinzufügen
            conn.execute(
                """
                INSERT OR IGNORE INTO metadata (key, date)
                VALUES ('last_file_update', NULL)
                """
            )

            # --- NEU: Best-effort Runtime-Migration für Preis-Spalten ---
            _ensure_runtime_price_columns(conn)
            _ensure_historical_price_index(conn)

            conn.commit()

        except Exception as err:
            conn.rollback()
            error_message = f"❌ Fehler beim Erstellen der Tabellen: {err}"
            _LOGGER.exception(error_message)
            raise

        finally:
            conn.close()
            _LOGGER.info("📦 Datenbank erfolgreich initialisiert: %s", db_path)

    except Exception:
        _LOGGER.exception("❌ Kritischer Fehler bei DB-Initialisierung")
        raise
