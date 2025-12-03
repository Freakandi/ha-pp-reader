"""Database initialization helpers for the Portfolio Performance Reader."""

import logging
import sqlite3
from collections.abc import Iterable
from pathlib import Path

from .db_schema import (
    ACCOUNT_METRICS_SCHEMA,
    ALL_SCHEMAS,
    INGESTION_SCHEMA,
    METRIC_RUNS_SCHEMA,
    PORTFOLIO_METRICS_SCHEMA,
    SECURITY_METRICS_SCHEMA,
)
from .migrations import (
    ensure_ingestion_transaction_eur_column,
    ensure_snapshot_tables,
)

_LOGGER = logging.getLogger(__name__)
_METRIC_SCHEMA_BUNDLES = (
    METRIC_RUNS_SCHEMA,
    PORTFOLIO_METRICS_SCHEMA,
    ACCOUNT_METRICS_SCHEMA,
    SECURITY_METRICS_SCHEMA,
)


def _iter_metric_ddl() -> Iterable[str]:
    """Yield DDL statements for metric-related tables and indexes."""
    for schema in _METRIC_SCHEMA_BUNDLES:
        for ddl in schema:
            if isinstance(ddl, str):
                yield ddl
            else:
                yield from ddl


def ensure_metric_tables(conn: sqlite3.Connection) -> None:
    """Create metric tables when missing to support persisted calculations."""
    for ddl in _iter_metric_ddl():
        conn.execute(ddl)


def ensure_fx_enrichment_columns(conn: sqlite3.Connection) -> None:
    """Add enrichment metadata columns to fx_rates when missing."""
    try:
        cursor = conn.execute("PRAGMA table_info('fx_rates')")
        columns = {row[1] for row in cursor.fetchall()}
    except sqlite3.Error:
        _LOGGER.exception("Konnte Spalteninformationen für fx_rates nicht laden")
        return

    required = {
        "fetched_at": "TEXT",
        "data_source": "TEXT",
        "provider": "TEXT",
        "provenance": "TEXT",
    }
    for name, col_type in required.items():
        if name in columns:
            continue
        try:
            conn.execute(f"ALTER TABLE fx_rates ADD COLUMN {name} {col_type}")
        except sqlite3.Error:
            _LOGGER.exception(
                (
                    "Migration fehlgeschlagen: fx_rates Spalte %s konnte nicht "
                    "ergänzt werden"
                ),
                name,
            )
            raise


def ensure_price_history_enrichment_columns(conn: sqlite3.Connection) -> None:
    """Add enrichment metadata to historical price tables when missing."""
    targets = ("historical_prices", "ingestion_historical_prices")
    required = {
        "fetched_at": "TEXT",
        "data_source": "TEXT",
        "provider": "TEXT",
        "provenance": "TEXT",
    }

    for table in targets:
        try:
            cursor = conn.execute(f"PRAGMA table_info('{table}')")
            columns = {row[1] for row in cursor.fetchall()}
        except sqlite3.Error:
            _LOGGER.exception("Konnte Spalteninformationen für %s nicht laden", table)
            continue

        for name, col_type in required.items():
            if name in columns:
                continue
            try:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}")
            except sqlite3.Error:
                _LOGGER.exception(
                    (
                        "Migration fehlgeschlagen: %s Spalte %s konnte nicht "
                        "ergänzt werden"
                    ),
                    table,
                    name,
                )
                raise


def initialize_database_schema(db_path: Path) -> None:
    """Initialisiert die SQLite Datenbank mit dem definierten Schema."""
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)

        if not db_path.exists():
            _LOGGER.info("Erzeuge neue Datenbankdatei: %s", db_path)

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

            ensure_ingestion_tables(conn)
            ensure_metric_tables(conn)
            ensure_snapshot_tables(conn)
            ensure_fx_enrichment_columns(conn)
            ensure_price_history_enrichment_columns(conn)

            conn.commit()

        except Exception as err:
            conn.rollback()
            error_message = f"Fehler beim Erstellen der Tabellen: {err}"
            _LOGGER.exception(error_message)
            raise

        finally:
            conn.close()
            _LOGGER.info("Datenbank erfolgreich initialisiert: %s", db_path)

    except Exception:
        _LOGGER.exception("Kritischer Fehler bei DB-Initialisierung")
        raise


INGESTION_TABLES: tuple[str, ...] = (
    "ingestion_historical_prices",
    "ingestion_transaction_units",
    "ingestion_transactions",
    "ingestion_securities",
    "ingestion_portfolios",
    "ingestion_accounts",
    "ingestion_metadata",
)


def ensure_ingestion_tables(conn: sqlite3.Connection) -> None:
    """Create ingestion staging tables if they are missing."""
    for stmt in _iter_ingestion_ddl():
        conn.execute(stmt)
    ensure_ingestion_transaction_eur_column(conn)


def clear_ingestion_stage(conn: sqlite3.Connection) -> None:
    """Remove all rows from ingestion staging tables respecting FK order."""
    for table in INGESTION_TABLES:
        conn.execute(f'DELETE FROM "{table}"')  # noqa: S608 - table names are trusted


def reset_ingestion_stage(conn: sqlite3.Connection) -> None:
    """Ensure staging tables exist and wipe their content."""
    ensure_ingestion_tables(conn)
    clear_ingestion_stage(conn)


def _iter_ingestion_ddl() -> Iterable[str]:
    """Yield individual DDL statements from the ingestion schema bundle."""
    for ddl in INGESTION_SCHEMA:
        if isinstance(ddl, str):
            yield ddl
        else:
            # Defensive: handle nested lists in case of future expansions.
            yield from ddl
