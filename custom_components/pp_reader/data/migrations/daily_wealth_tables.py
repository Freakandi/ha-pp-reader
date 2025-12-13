"""WAL-safe helpers to provision daily wealth tables."""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

from custom_components.pp_reader.data.db_schema import (
    DAILY_WEALTH_SCHEMA,
    DAILY_WEALTH_SCOPES_SCHEMA,
)

if TYPE_CHECKING:
    from collections.abc import Iterable

_LOGGER = logging.getLogger(__name__)


def _iter_daily_wealth_ddls() -> Iterable[str]:
    """Yield DDL statements for daily wealth tables and indexes."""
    yield from (*DAILY_WEALTH_SCHEMA, *DAILY_WEALTH_SCOPES_SCHEMA)


def _ensure_performance_neutral_column(
    conn: sqlite3.Connection,
    table: str,
) -> None:
    """Add performance_neutral_movements column when missing."""
    try:
        cursor = conn.execute(f"PRAGMA table_info('{table}')")
    except sqlite3.Error:  # pragma: no cover - defensive guard
        _LOGGER.exception("Unable to inspect columns for %s", table)
        return

    columns = {row[1] for row in cursor.fetchall()}
    if "performance_neutral_movements" in columns:
        return

    try:
        conn.execute(
            f"""
            ALTER TABLE {table}
            ADD COLUMN performance_neutral_movements REAL NOT NULL DEFAULT 0.0
            """
        )
    except sqlite3.OperationalError as err:
        if "duplicate column name" in str(err).lower():
            return
        _LOGGER.exception("Failed to add performance_neutral_movements to %s", table)
        raise
    except sqlite3.Error:  # pragma: no cover - defensive guard
        _LOGGER.exception("Failed to add performance_neutral_movements to %s", table)
        raise


def ensure_daily_wealth_tables(conn: sqlite3.Connection) -> None:
    """Create daily wealth tables and indexes when missing."""
    for ddl in _iter_daily_wealth_ddls():
        try:
            conn.execute(ddl)
        except sqlite3.Error:
            _LOGGER.exception(
                "Daily wealth schema migration failed for statement:\n%s",
                ddl,
            )
            raise
    _ensure_performance_neutral_column(conn, "daily_wealth")
    _ensure_performance_neutral_column(conn, "daily_wealth_scopes")
    _ensure_column(conn, "daily_wealth", "realized_gains_eur")
    _ensure_column(conn, "daily_wealth_scopes", "realized_gains_eur")
    _ensure_column(conn, "daily_wealth", "unrealized_gains_eur")
    _ensure_column(conn, "daily_wealth_scopes", "unrealized_gains_eur")
    _ensure_column(conn, "daily_wealth", "invested_capital_eur")
    _ensure_column(conn, "daily_wealth_scopes", "invested_capital_eur")


def _ensure_column(
    conn: sqlite3.Connection,
    table: str,
    column_name: str,
) -> None:
    """Add a float column when missing."""
    try:
        cursor = conn.execute(f"PRAGMA table_info('{table}')")
    except sqlite3.Error:  # pragma: no cover
        _LOGGER.exception("Unable to inspect columns for %s", table)
        return

    columns = {row[1] for row in cursor.fetchall()}
    if column_name in columns:
        return

    try:
        conn.execute(
            f"ALTER TABLE {table} ADD COLUMN {column_name} REAL NOT NULL DEFAULT 0.0"
        )
    except sqlite3.OperationalError as err:
        if "duplicate column name" in str(err).lower():
            return
        _LOGGER.exception("Failed to add %s to %s", column_name, table)
        raise
    except sqlite3.Error:
        _LOGGER.exception("Failed to add %s to %s", column_name, table)
        raise
