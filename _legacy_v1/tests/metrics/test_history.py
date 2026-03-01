"""Tests for the vectorized rebuild_daily_wealth function."""

from __future__ import annotations

import sqlite3
from datetime import date

import pandas as pd
import pytest

from custom_components.pp_reader.const import TransactionType
from custom_components.pp_reader.data.db_schema import ALL_SCHEMAS
from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver
from custom_components.pp_reader.metrics.history import rebuild_daily_wealth


@pytest.fixture
def memory_db() -> sqlite3.Connection:
    """Fixture to create an in-memory SQLite database and schema."""
    conn = sqlite3.connect(":memory:")
    for schema in ALL_SCHEMAS:
        conn.execute(schema)
    conn.commit()
    return conn


def _to_epoch_day(d_str: str) -> int:
    d = date.fromisoformat(d_str)
    return (d - date(1970, 1, 1)).days


def test_rebuild_daily_wealth_vectorized(memory_db: sqlite3.Connection) -> None:
    """Test the vectorized rebuild_daily_wealth function with a simple scenario."""
    # Arrange: Populate the database with sample data
    # Securities
    memory_db.execute(
        "INSERT INTO securities (uuid, name, currency_code) VALUES ('sec1', 'Test Security 1', 'USD')"
    )
    memory_db.execute(
        "INSERT INTO securities (uuid, name, currency_code) VALUES ('sec2', 'Test Security 2', 'EUR')"
    )

    # Accounts
    memory_db.execute(
        "INSERT INTO accounts (uuid, name, currency_code) VALUES ('acc1', 'Test Account 1', 'USD')"
    )
    memory_db.execute(
        "INSERT INTO accounts (uuid, name, currency_code) VALUES ('acc2', 'Test Account 2', 'EUR')"
    )

    # Transactions
    transactions = [
        (
            "tx1",
            TransactionType.DEPOSIT,
            "2023-01-01T10:00:00Z",
            "acc2",
            None,
            "port1",
            None,
            None,
            200000,
            200000,
            "EUR",
        ),
        (
            "tx2",
            TransactionType.BUY,
            "2023-01-02T10:00:00Z",
            "acc1",
            None,
            "port1",
            None,
            "sec1",
            10000000000,
            100000,
            "USD",
        ),
        (
            "tx3",
            TransactionType.SELL,
            "2023-01-03T10:00:00Z",
            "acc2",
            None,
            "port1",
            None,
            "sec2",
            5000000000,
            60000,
            "EUR",
        ),
    ]
    memory_db.executemany(
        "INSERT INTO transactions (uuid, type, date, account, other_account, portfolio, other_portfolio, security, shares, amount, currency_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        transactions,
    )

    # Prices
    # Convert dates to epoch days as expected by schema/MarketResolver
    prices = [
        ("sec1", _to_epoch_day("2023-01-02"), 1100000000),
        ("sec2", _to_epoch_day("2023-01-01"), 1200000000),
        ("sec2", _to_epoch_day("2023-01-02"), 1250000000),
        ("sec2", _to_epoch_day("2023-01-03"), 1300000000),
    ]
    memory_db.executemany(
        "INSERT INTO historical_prices (security_uuid, date, close) VALUES (?, ?, ?)",
        prices,
    )

    # FX Rates
    fx_rates = [
        ("USD", "2023-01-01", 1.1),
        ("USD", "2023-01-02", 1.1),
        ("USD", "2023-01-03", 1.2),
    ]
    memory_db.executemany(
        "INSERT INTO fx_rates (currency, date, rate) VALUES (?, ?, ?)", fx_rates
    )
    memory_db.commit()

    # Act
    market_resolver = MarketResolver(memory_db)
    market_resolver.load_data()
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 4)
    rebuild_daily_wealth(memory_db, market_resolver, start_date, end_date)

    # Assert
    cursor = memory_db.execute(
        "SELECT date, total_wealth_cents, total_invested_cents FROM daily_wealth ORDER BY date"
    )
    results = cursor.fetchall()

    assert len(results) == 4
    df = pd.DataFrame(
        results, columns=["date", "total_wealth_cents", "total_invested_cents"]
    )
    df["date"] = pd.to_datetime(df["date"])

    # Verification of calculated values
    # Day 1 (2023-01-01): Deposit of 2000 EUR
    assert df.loc[0, "total_wealth_cents"] == 200000
    assert df.loc[0, "total_invested_cents"] == 200000

    # Day 2 (2023-01-02): Buy 100 shares of sec1 for 1000 USD
    # Wealth = 2000 EUR (cash) - 1000 USD / 1.1 (buy) + 100 * 11 USD / 1.1 (sec1 value) = 2000 - 909.09 + 1000 = 2090.91
    assert abs(df.loc[1, "total_wealth_cents"] - 209091) < 1

    # Day 3 (2023-01-03): Sell 50 shares of sec2 for 600 EUR
    # Wealth changes based on sec1 price change and sec2 sale
    # sec1 value: 100 shares * 11 USD/share / 1.2 FX = 916.67 EUR
    # sec2 value: -50 shares * 13 EUR/share = -650.00 EUR
    # cash: 2600 EUR (acc2) - 1000 USD / 1.2 FX (acc1) = 2600 - 833.33 = 1766.67 EUR
    # total wealth: 916.67 - 650 + 1766.67 = 2033.34 EUR
    assert abs(df.loc[2, "total_wealth_cents"] - 203333) < 2

    # Day 4 (2023-01-04): No transactions, wealth should be same as day 3
    assert abs(df.loc[3, "total_wealth_cents"] - 203333) < 2

    # Invested capital should remain at 2000 EUR
    assert all(df["total_invested_cents"] == 200000)
