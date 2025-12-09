"""Backdating orchestration helper tests."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.backdating.pipeline import (
    BackdatingPlan,
    BackdatingResult,
    async_run_backdating_rebuild,
)
from custom_components.pp_reader.data.db_access import fetch_daily_wealth
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_backdating_skips_without_transactions(hass, tmp_path):
    """Planner should skip when no transactions exist."""
    db_path = tmp_path / "backdating_empty.db"
    initialize_database_schema(db_path)

    result = await async_run_backdating_rebuild(
        hass,
        db_path,
        trigger="test-empty",
        ingestion_run_uuid="ing-1",
        today=date(2024, 1, 2),
    )

    assert isinstance(result, BackdatingResult)
    assert result.status == "skipped"
    assert result.reason == "no_transactions"
    assert result.plan is None


@pytest.mark.asyncio
async def test_backdating_computes_and_persists_daily_wealth(hass, tmp_path):
    """Planner should derive window, compute aggregates, and persist daily wealth."""
    db_path = tmp_path / "backdating_plan.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            [("p1", "Main")],
        )
        conn.executemany(
            "INSERT INTO securities (uuid, name, currency_code, retired) VALUES (?, ?, ?, ?)",
            [("s1", "Equity", "USD", 0)],
        )
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, portfolio, security, date, shares, currency_code, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "txn-1",
                    0,
                    "p1",
                    "s1",
                    "2024-01-10",
                    int(1 * 1e8),
                    "USD",
                    0,
                ),
            ],
        )
        conn.executemany(
            """
            INSERT INTO historical_prices (security_uuid, date, close)
            VALUES (?, ?, ?)
            """,
            [
                ("s1", 20240110, int(100 * 1e8)),
            ],
        )
        conn.executemany(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            [
                ("2024-01-10", "USD", 2.0),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    result = await async_run_backdating_rebuild(
        hass,
        db_path,
        trigger="test-plan",
        ingestion_run_uuid="ing-2",
        today=date(2024, 1, 12),
    )

    assert isinstance(result.plan, BackdatingPlan)
    assert result.plan.start_date == date(2024, 1, 10)
    assert result.plan.end_date == date(2024, 1, 12)
    assert result.status == "completed"
    assert result.reason is None

    totals = fetch_daily_wealth(db_path)
    assert any(
        row.date == "2024-01-10" and row.total_wealth_eur == 50.0 for row in totals
    )
