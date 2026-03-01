"""Migration helpers for ingestion staging tables."""

from __future__ import annotations

import logging
import sqlite3

_LOGGER = logging.getLogger(
    "custom_components.pp_reader.data.migrations.ingestion_schema"
)


def _table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    """Return column names for the given table."""
    try:
        cursor = conn.execute(f"PRAGMA table_info('{table}')")
    except sqlite3.Error:  # pragma: no cover - defensive guard
        _LOGGER.exception("Unable to inspect columns for %s", table)
        return set()
    return {row[1] for row in cursor.fetchall() if len(row) > 1}


def ensure_ingestion_transaction_eur_column(conn: sqlite3.Connection) -> None:
    """Add amount_eur_cents to ingestion_transactions when missing."""
    table = "ingestion_transactions"
    column = "amount_eur_cents"

    columns = _table_columns(conn, table)
    if column in columns:
        return

    try:
        conn.execute(
            """
            ALTER TABLE ingestion_transactions
            ADD COLUMN amount_eur_cents INTEGER
            """
        )
        _LOGGER.info(
            "Added %s column to %s for EUR-denominated transaction values",
            column,
            table,
        )
    except sqlite3.OperationalError as err:
        if "duplicate column name" in str(err).lower():
            return
        _LOGGER.exception("Failed to add %s to %s", column, table)
    except sqlite3.Error:  # pragma: no cover - defensive guard
        _LOGGER.exception("Failed to add %s to %s", column, table)
