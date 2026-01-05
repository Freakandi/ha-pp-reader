"""Test cases for the PerformanceEngine's get_snapshot method."""

import sqlite3
from datetime import date
from unittest.mock import MagicMock

import pytest

from custom_components.pp_reader.data.db_schema import (
    ACCOUNT_SCHEMA,
    SECURITY_SCHEMA,
    TRANSACTION_SCHEMA,
)
from custom_components.pp_reader.metrics.calculator import (
    PerformanceEngine,
    TransactionType,
)


def setup_database(conn):
    """Set up the initial database schema."""
    for schema in ACCOUNT_SCHEMA:
        conn.execute(schema)
    for schema in SECURITY_SCHEMA:
        conn.execute(schema)
    for schema in TRANSACTION_SCHEMA:
        conn.execute(schema)


def insert_test_data(conn):
    """Insert a set of transactions for testing."""
    transactions = [
        # Cash and security transactions
        (
            "tx1",
            TransactionType.DEPOSIT,
            "2023-01-01T10:00:00Z",
            "acc1",
            None,
            100000,
            "EUR",
            None,
            None,
        ),
        (
            "tx2",
            TransactionType.BUY,
            "2023-01-02T10:00:00Z",
            "acc1",
            "sec1",
            50000,
            "EUR",
            1000000000,
            "portfolio1",
        ),  # Buy 10 shares at 50 EUR
        (
            "tx3",
            TransactionType.DEPOSIT,
            "2023-01-03T10:00:00Z",
            "acc2",
            None,
            50000,
            "USD",
            None,
            None,
        ),
        (
            "tx4",
            TransactionType.INBOUND_DELIVERY,
            "2023-01-04T10:00:00Z",
            None,
            "sec2",
            0,
            "USD",
            500000000,
            "portfolio1",
        ),  # 5 shares delivered
    ]
    conn.executemany(
        "INSERT INTO transactions (uuid, type, date, account, security, amount, currency_code, shares, portfolio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        transactions,
    )

    accounts = [
        ("acc1", "Account 1", "EUR"),
        ("acc2", "Account 2", "USD"),
    ]
    conn.executemany(
        "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)", accounts
    )

    securities = [
        ("sec1", "Security 1", "EUR", "STOCK"),
        ("sec2", "Security 2", "USD", "STOCK"),
    ]
    conn.executemany(
        "INSERT INTO securities (uuid, name, currency_code, type) VALUES (?, ?, ?, ?)",
        securities,
    )


@pytest.fixture
def mock_market_resolver():
    """Fixture for a mock MarketResolver."""
    resolver = MagicMock()
    resolver.get_price.side_effect = lambda sec, dt: {"sec1": 60.0, "sec2": 110.0}.get(
        sec, 1.0
    )
    resolver.get_fx.side_effect = lambda curr, dt: {"USD": 0.9}.get(curr, 1.0)
    resolver.get_security_currency.side_effect = lambda sec: {
        "sec1": "EUR",
        "sec2": "USD",
    }.get(sec)
    return resolver


@pytest.fixture
def db_connection():
    """Fixture for an in-memory SQLite database connection."""
    conn = sqlite3.connect(":memory:")
    setup_database(conn)
    insert_test_data(conn)
    yield conn
    conn.close()


def test_get_snapshot(db_connection, mock_market_resolver):
    """Test the get_snapshot method for a specific date."""
    engine = PerformanceEngine(db_connection, mock_market_resolver)
    snapshot_date = date(2023, 1, 5)
    snapshot = engine.get_snapshot(snapshot_date)

    # Expected values:
    # sec1: 10 shares * 60 EUR/share = 600 EUR
    # sec2: 5 shares * 110 USD/share / 0.9 USD/EUR = 611.11 EUR
    # sec_wealth = 600 + 611.11 = 1211.11 EUR
    # acc1: 1000 EUR (deposit) - 500 EUR (buy) = 500 EUR
    # acc2: 500 USD / 0.9 USD/EUR = 555.56 EUR
    # cash_wealth = 500 + 555.56 = 1055.56 EUR
    # total_wealth = 1211.11 + 1055.56 = 2266.67 EUR
    # invested_capital:
    #   - 1000 EUR deposit
    #   - 500 USD deposit -> 555.56 EUR
    #   - 5 shares of sec2 delivery: 5 * 110 USD / 0.9 = 611.11 EUR
    #   - total = 1000 + 555.56 + 611.11 = 2166.67 EUR

    assert snapshot["securities_wealth"] == pytest.approx(1211.11, rel=1e-2)
    assert snapshot["cash_wealth"] == pytest.approx(1055.56, rel=1e-2)
    assert snapshot["total_wealth"] == pytest.approx(2266.67, rel=1e-2)
    assert snapshot["invested_capital"] == pytest.approx(2166.67, rel=1e-2)
