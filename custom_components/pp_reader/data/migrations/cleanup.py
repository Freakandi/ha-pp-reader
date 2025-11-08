"""Cleanup helpers that drop legacy columns once canonical storage exists."""

from __future__ import annotations

import logging
import sqlite3

from custom_components.pp_reader.data.db_schema import (
    PORTFOLIO_SECURITIES_SCHEMA,
    SCHEMA_LIVE_AGGREGATION_INDEX,
)

_LOGGER = logging.getLogger(__name__)
_LEGACY_PORTFOLIO_COLUMNS = ("avg_price_security", "avg_price_account")

def _table_columns(conn: sqlite3.Connection, table: str) -> dict[str, tuple[int, str]]:
    """Return the column metadata for a given table."""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    return {row[1]: row for row in cursor.fetchall()}


def _needs_portfolio_cleanup(conn: sqlite3.Connection) -> bool:
    """Return True when legacy avg_price columns are still present."""
    columns = _table_columns(conn, "portfolio_securities")
    return any(col in columns for col in _LEGACY_PORTFOLIO_COLUMNS)


def _recreate_portfolio_table(conn: sqlite3.Connection) -> None:
    """Recreate portfolio_securities without the legacy columns."""
    _LOGGER.info(
        "Dropping legacy columns on portfolio_securities: removing %s",
        ", ".join(_LEGACY_PORTFOLIO_COLUMNS),
    )
    conn.execute("ALTER TABLE portfolio_securities RENAME TO portfolio_securities_tmp")
    conn.execute(PORTFOLIO_SECURITIES_SCHEMA[0])
    conn.execute(
        """
        INSERT INTO portfolio_securities (
            portfolio_uuid,
            security_uuid,
            current_holdings,
            purchase_value,
            avg_price_native,
            security_currency_total,
            account_currency_total,
            current_value
        )
        SELECT
            portfolio_uuid,
            security_uuid,
            current_holdings,
            purchase_value,
            avg_price_native,
            security_currency_total,
            account_currency_total,
            current_value
        FROM portfolio_securities_tmp
        """
    )
    conn.execute("DROP TABLE portfolio_securities_tmp")
    conn.execute(SCHEMA_LIVE_AGGREGATION_INDEX)
    _LOGGER.info("Legacy portfolio_securities columns removed successfully")


def cleanup_portfolio_security_legacy_columns(conn: sqlite3.Connection) -> None:
    """
    Remove deprecated portfolio security columns used before normalization.

    Older installations still carried per-share mirrors (avg_price_security,
    avg_price_account) that are now obsolete because structured average_cost
    payloads are persisted alongside canonical snapshots. This helper rebuilds
    the table without those columns when necessary.
    """
    try:
        if not _needs_portfolio_cleanup(conn):
            _LOGGER.debug(
                "No legacy portfolio_securities columns detected - skipping cleanup"
            )
            return
        _recreate_portfolio_table(conn)
    except sqlite3.Error:
        _LOGGER.exception("Failed to clean up legacy portfolio_securities columns")
        raise
