"""Tests for the daily_wealth history rebuilding module."""
from __future__ import annotations

import sqlite3
from datetime import date
from unittest.mock import MagicMock

import pandas as pd
import pytest

from custom_components.pp_reader.metrics.history import rebuild_daily_wealth


@pytest.fixture
def mock_conn():
    """Fixture for an in-memory SQLite database connection."""
    conn = sqlite3.connect(":memory:")
    # Create necessary tables for the test
    conn.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT PRIMARY KEY, type INTEGER, date TEXT, account TEXT, other_account TEXT,
            portfolio TEXT, other_portfolio TEXT, security TEXT, shares INTEGER,
            amount INTEGER, currency_code TEXT
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
        );
        """
    )
    conn.execute(
        "CREATE TABLE securities (uuid TEXT PRIMARY KEY, name TEXT, currency_code TEXT);"
    )
    conn.execute("CREATE TABLE accounts (uuid TEXT PRIMARY KEY, name TEXT, currency_code TEXT);")
    conn.execute(
        """
        CREATE TABLE daily_wealth (
            date TEXT, scope_uuid TEXT, scope_type TEXT,
            total_wealth_cents INTEGER, total_invested_cents INTEGER,
            PRIMARY KEY (date, scope_uuid, scope_type)
        );
        """
    )
    yield conn
    conn.close()


@pytest.fixture
def mock_market_resolver():
    """Fixture for a mock MarketResolver."""
    resolver = MagicMock()
    resolver.get_price.return_value = 100.0  # 100 EUR
    resolver.get_fx.side_effect = lambda cur, _: 1.0 if cur == "EUR" else 0.85  # 1 USD = 0.85 EUR
    resolver.get_security_currency.return_value = "USD"
    return resolver


def test_rebuild_daily_wealth_simple_case(mock_conn, mock_market_resolver):
    """Test a simple case of rebuilding daily wealth."""
    # Arrange
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 3)

    # Insert a single BUY transaction
    mock_conn.execute(
        "INSERT INTO transactions (uuid, type, date, security, shares, amount, currency_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("tx1", 0, "2023-01-01T12:00:00Z", "sec1", 10 * 10**8, 1000 * 100, "USD"),
    )
    mock_conn.execute(
        "INSERT INTO securities (uuid, name, currency_code) VALUES (?, ?, ?)",
        ("sec1", "Test Security", "USD"),
    )
    mock_conn.commit()

    # Act
    rebuild_daily_wealth(mock_conn, mock_market_resolver, start_date, end_date)

    # Assert
    cursor = mock_conn.cursor()
    cursor.execute("SELECT date, total_wealth_cents, total_invested_cents FROM daily_wealth ORDER BY date")
    results = cursor.fetchall()

    assert len(results) == 3
    # Day 1: Buy happens, wealth is calculated at EOD
    # Invested: 1000 USD / 0.85 = 1176.47 EUR -> 117647 cents
    # Wealth: 10 shares * 100 USD/share / 0.85 = 1176.47 EUR -> 117647 cents
    assert results[0] == ("2023-01-01", 117647, 117647)
    # Day 2: No changes, values carry over
    assert results[1] == ("2023-01-02", 117647, 117647)
    # Day 3: No changes, values carry over
    assert results[2] == ("2023-01-03", 117647, 117647)
