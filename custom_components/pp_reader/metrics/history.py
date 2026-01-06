"""Module for rebuilding the daily_wealth table via the PerformanceEngine."""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

import pandas as pd

from custom_components.pp_reader.metrics.calculator import PerformanceEngine

if TYPE_CHECKING:
    from datetime import date

    from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


_LOGGER = logging.getLogger(__name__)


def rebuild_daily_wealth(
    conn: sqlite3.Connection,
    market_resolver: MarketResolver,
    start_date: date,
    end_date: date,
) -> None:
    """
    Rebuild the daily_wealth table by delegating to the PerformanceEngine.

    This function calculates daily wealth snapshots for a given date range
    by calling `engine.get_snapshot()` for each day and persists them to the
    `daily_wealth` table for later use.
    """
    _LOGGER.info(
        "Rebuilding daily wealth from %s to %s",
        start_date.isoformat(),
        end_date.isoformat(),
    )

    # Instantiate the engine and load its data once.
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()

    date_range = pd.date_range(start=start_date, end=end_date, freq="D")
    records_to_insert = []

    for d in date_range:
        snapshot_date = d.date()
        snapshot = engine.get_snapshot(snapshot_date)

        records_to_insert.append(
            (
                snapshot_date.isoformat(),
                "all",  # scope_uuid, assuming "all" for now
                "all",  # scope_type, assuming "all" for now
                int(snapshot.get("total_wealth", 0) * 100),
                int(snapshot.get("invested_capital", 0) * 100),
            )
        )

    if not records_to_insert:
        _LOGGER.info("No data to insert for the given date range.")
        return

    cursor = conn.cursor()
    try:
        # Clear old data for the date range
        cursor.execute(
            "DELETE FROM daily_wealth WHERE date BETWEEN ? AND ?",
            (start_date.isoformat(), end_date.isoformat()),
        )
        # Insert new data
        cursor.executemany(
            "INSERT INTO daily_wealth "
            "(date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents) "
            "VALUES (?, ?, ?, ?, ?)",
            records_to_insert,
        )
        conn.commit()
        _LOGGER.info(
            "Successfully rebuilt daily_wealth for %d days.", len(records_to_insert)
        )
    except sqlite3.Error:
        _LOGGER.exception("Database error during daily_wealth rebuild")
        conn.rollback()
    finally:
        cursor.close()
