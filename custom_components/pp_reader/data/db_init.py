"""Database initialization helpers for the Portfolio Performance Reader."""

import logging
import sqlite3
from pathlib import Path

from .db_schema import ALL_SCHEMAS

_LOGGER = logging.getLogger(__name__)


def _ensure_runtime_price_columns(conn: sqlite3.Connection) -> None:
    """
    Best-effort Runtime-Migration für neue Spalten in 'securities'.

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


def _ensure_portfolio_securities_native_column(conn: sqlite3.Connection) -> None:
    """Ensure `avg_price_native` exists on portfolio securities tables."""
    try:
        cur = conn.execute("PRAGMA table_info(portfolio_securities)")
        existing_cols = {row[1] for row in cur.fetchall()}
    except sqlite3.Error:
        _LOGGER.warning(
            (
                "Konnte PRAGMA table_info(portfolio_securities) nicht ausführen "
                "- Migration für avg_price_native übersprungen"
            ),
            exc_info=True,
        )
        return

    if "avg_price_native" in existing_cols:
        _LOGGER.debug(
            "Runtime-Migration: Spalte 'avg_price_native' bereits vorhanden - nichts zu tun"
        )
        return

    try:
        conn.execute(
            "ALTER TABLE portfolio_securities ADD COLUMN avg_price_native REAL"
        )
        _LOGGER.info(
            "Runtime-Migration: Spalte 'avg_price_native' zu portfolio_securities hinzugefügt"
        )
    except sqlite3.Error:
        _LOGGER.warning(
            "Runtime-Migration: Konnte Spalte 'avg_price_native' nicht hinzufügen",
            exc_info=True,
        )


def _ensure_portfolio_purchase_extensions(conn: sqlite3.Connection) -> None:
    """Ensure purchase summary columns on portfolio securities exist."""
    try:
        cur = conn.execute("PRAGMA table_info(portfolio_securities)")
        existing_cols = {row[1] for row in cur.fetchall()}
    except sqlite3.Error:
        _LOGGER.warning(
            (
                "Konnte PRAGMA table_info(portfolio_securities) nicht ausführen "
                "- Migration für Kaufpreis-Erweiterung übersprungen"
            ),
            exc_info=True,
        )
        return

    migrations: list[tuple[str, str]] = []
    if "security_currency_total" not in existing_cols:
        migrations.append(
            (
                "security_currency_total",
                (
                    "ALTER TABLE portfolio_securities "
                    "ADD COLUMN security_currency_total REAL DEFAULT 0"
                ),
            )
        )
    if "account_currency_total" not in existing_cols:
        migrations.append(
            (
                "account_currency_total",
                (
                    "ALTER TABLE portfolio_securities "
                    "ADD COLUMN account_currency_total REAL DEFAULT 0"
                ),
            )
        )
    if "avg_price_security" not in existing_cols:
        migrations.append(
            (
                "avg_price_security",
                ("ALTER TABLE portfolio_securities ADD COLUMN avg_price_security REAL"),
            )
        )
    if "avg_price_account" not in existing_cols:
        migrations.append(
            (
                "avg_price_account",
                ("ALTER TABLE portfolio_securities ADD COLUMN avg_price_account REAL"),
            )
        )

    if not migrations:
        _LOGGER.debug(
            "Runtime-Migration: Kaufpreis-Erweiterungsspalten bereits vorhanden - "
            "nichts zu tun"
        )
    else:
        for col, ddl in migrations:
            try:
                conn.execute(ddl)
                _LOGGER.info(
                    "Runtime-Migration: Spalte '%s' zu portfolio_securities hinzugefügt",
                    col,
                )
            except sqlite3.Error:
                _LOGGER.warning(
                    "Runtime-Migration: Konnte Spalte '%s' nicht hinzufügen",
                    col,
                    exc_info=True,
                )

    _backfill_portfolio_purchase_extension_defaults(conn)


def _backfill_portfolio_purchase_extension_defaults(
    conn: sqlite3.Connection,
) -> None:
    """Populate default values for purchase extension columns."""
    updates: list[tuple[str, str]] = [
        (
            "security_currency_total",
            (
                "UPDATE portfolio_securities "
                "SET security_currency_total = 0.0 "
                "WHERE security_currency_total IS NULL"
            ),
        ),
        (
            "account_currency_total",
            (
                "UPDATE portfolio_securities "
                "SET account_currency_total = 0.0 "
                "WHERE account_currency_total IS NULL"
            ),
        ),
        (
            "avg_price_security",
            (
                "UPDATE portfolio_securities "
                "SET avg_price_security = NULL "
                "WHERE avg_price_security = 0"
            ),
        ),
        (
            "avg_price_account",
            (
                "UPDATE portfolio_securities "
                "SET avg_price_account = NULL "
                "WHERE avg_price_account = 0"
            ),
        ),
    ]

    for column, statement in updates:
        try:
            cursor = conn.execute(statement)
        except sqlite3.Error:
            _LOGGER.warning(
                "Runtime-Migration: Konnte Standardwerte für '%s' nicht setzen",
                column,
                exc_info=True,
            )
            continue

        if cursor.rowcount > 0:
            _LOGGER.info(
                "Runtime-Migration: Standardwerte für '%s' in %d Datensätzen gesetzt",
                column,
                cursor.rowcount,
            )
        else:
            _LOGGER.debug(
                "Runtime-Migration: Keine Aktualisierung für '%s' erforderlich",
                column,
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
            _ensure_portfolio_securities_native_column(conn)
            _ensure_portfolio_purchase_extensions(conn)
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
