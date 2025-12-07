"""Backdating holdings valuation tests."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.backdating.holdings import (
    _compute_daily_holdings_snapshots_sync,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_holdings_rollup_with_price_fallback_and_fx(tmp_path):
    """Holdings should roll forward daily with price fallback and FX conversion."""
    db_path = tmp_path / "holdings.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            "INSERT INTO portfolios (uuid, name, is_retired) VALUES (?, ?, ?)",
            [("p1", "Main", 0)],
        )
        conn.executemany(
            "INSERT INTO securities (uuid, name, currency_code, retired) VALUES (?, ?, ?, ?)",
            [
                ("s-usd", "USD Equity", "USD", 0),
                ("s-eur", "EUR Equity", "EUR", 0),
            ],
        )
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, portfolio, security, date, shares)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("tx-1", 0, "p1", "s-usd", "2024-01-02", int(1 * 1e8)),
                ("tx-2", 0, "p1", "s-eur", "2024-01-03", int(2 * 1e8)),
            ],
        )
        conn.executemany(
            """
            INSERT INTO historical_prices (security_uuid, date, close)
            VALUES (?, ?, ?)
            """,
            [
                ("s-usd", 20240102, int(100 * 1e8)),
                ("s-eur", 20240103, int(10 * 1e8)),
            ],
        )
        conn.executemany(
            """
            INSERT INTO fx_rates (date, currency, rate)
            VALUES (?, ?, ?)
            """,
            [
                ("2024-01-02", "USD", 2.0),
                ("2024-01-03", "USD", 2.0),
                ("2024-01-04", "USD", 2.0),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    snapshots = _compute_daily_holdings_snapshots_sync(
        db_path,
        date(2024, 1, 2),
        date(2024, 1, 4),
    )

    # Day 1: only USD position, same-day price and FX
    day1 = snapshots[0]
    assert day1.date == "2024-01-02"
    assert day1.price_coverage_ratio == 1.0
    assert not day1.stale_price
    assert day1.total_wealth_eur == 50.0
    usd_day1 = next(val for val in day1.holdings if val.security_uuid == "s-usd")
    assert usd_day1.price_native == 100.0
    assert usd_day1.fx_rate == 2.0
    assert usd_day1.value_eur == 50.0
    assert not usd_day1.stale_price

    # Day 2: EUR position added, USD uses previous close (stale)
    day2 = snapshots[1]
    assert day2.date == "2024-01-03"
    assert day2.price_coverage_ratio == 1.0
    assert day2.stale_price
    assert day2.total_wealth_eur == 70.0
    usd_day2 = next(val for val in day2.holdings if val.security_uuid == "s-usd")
    eur_day2 = next(val for val in day2.holdings if val.security_uuid == "s-eur")
    assert usd_day2.stale_price
    assert usd_day2.value_eur == 50.0
    assert not eur_day2.stale_price
    assert eur_day2.value_eur == 20.0

    # Day 3: holdings unchanged; EUR price falls back to prior day as well
    day3 = snapshots[2]
    assert day3.date == "2024-01-04"
    assert day3.price_coverage_ratio == 1.0
    assert day3.stale_price
    assert day3.total_wealth_eur == 70.0
    eur_day3 = next(val for val in day3.holdings if val.security_uuid == "s-eur")
    assert eur_day3.stale_price
    assert eur_day3.value_eur == 20.0
