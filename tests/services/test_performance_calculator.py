"""Tests for the Performance Calculator Service."""

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.backdating.engine_pandas import TransactionType
from custom_components.pp_reader.services.performance_calculator import (
    PerformanceCalculator,
)
from custom_components.pp_reader.util.currency import PRICE_SCALE


@pytest.fixture
def conn():
    """Create an in-memory SQLite database."""
    c = sqlite3.connect(":memory:")
    c.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT PRIMARY KEY,
            type INTEGER,
            date TEXT,
            account TEXT,
            security TEXT,
            shares INTEGER,
            amount INTEGER,
            currency_code TEXT
        )
        """
    )
    c.execute(
        """
        CREATE TABLE historical_prices (
            security_uuid TEXT,
            date REAL,
            close INTEGER
        )
        """
    )
    c.execute(
        """
        CREATE TABLE fx_rates (
            date TEXT,
            currency TEXT,
            rate INTEGER
        )
        """
    )
    c.execute(
        """
        CREATE TABLE daily_wealth (
            date TEXT PRIMARY KEY,
            total_wealth_eur REAL,
            invested_capital_eur REAL
        )
        """
    )
    return c


@pytest.fixture
def calc(conn):
    """Create a PerformanceCalculator instance."""
    return PerformanceCalculator(conn)


def _insert_tx(conn, uuid, tx_type, date_str, security, shares_norm, amount_norm, currency, account="acc1"):
    # shares stored as * 10^8
    # amount stored as * 100
    conn.execute(
        "INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            uuid,
            tx_type,
            date_str,
            account,
            security,
            int(shares_norm * 100000000),
            int(amount_norm * 100),
            currency,
        ),
    )


def _insert_price(conn, security, date_obj, price_norm):
    # Price stored as * PRICE_SCALE (10^8)
    days = (date_obj - date(1970, 1, 1)).days
    conn.execute(
        "INSERT INTO historical_prices VALUES (?, ?, ?)",
        (security, days, int(price_norm * PRICE_SCALE)),
    )


def _insert_fx(conn, date_str, currency, rate_norm):
    # Rate stored as * PRICE_SCALE
    conn.execute(
        "INSERT INTO fx_rates VALUES (?, ?, ?)",
        (date_str, currency, int(rate_norm * PRICE_SCALE)),
    )


def test_standard_share_b_example(conn, calc):
    """Test Spec Example: Buy 150 -> Sell 160 = +10 Realized."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 12, 31)

    buy_date = "2023-02-01"
    sell_date = "2023-03-01"

    sec_id = "share_b"

    # 1. Buy 1 Share at 150 EUR
    _insert_tx(
        conn, "tx1", TransactionType.BUY, buy_date, sec_id, 1.0, -150.0, "EUR"
    )

    # 2. Sell 1 Share at 160 EUR
    _insert_tx(
        conn, "tx2", TransactionType.SELL, sell_date, sec_id, 1.0, 160.0, "EUR"
    )

    # Gain = (160 * 1) - (150 * 1) = 10.
    metrics = calc.calculate(start_date, end_date)

    assert metrics.realized_gains == 10.0
    assert metrics.unrealized_gains == 0.0


def test_unrealized_gain_held_at_start(conn, calc):
    """Test Unrealized Gain for share held at start."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Buy before start (10 shares @ 100 EUR)
    _insert_tx(
        conn, "tx1", TransactionType.BUY, "2022-12-01", "sec1", 10.0, -1000.0, "EUR"
    )

    # Price at Start (2023-01-01) = 110.0
    _insert_price(conn, "sec1", start_date, 110.0)

    # Price at End (2023-01-31) = 120.0
    _insert_price(conn, "sec1", end_date, 120.0)

    metrics = calc.calculate(start_date, end_date)

    # Baseline Price @ Start = 110.
    # End Value Price @ End = 120.
    # Gain = (120 - 110) * 10 = 100.

    assert metrics.unrealized_gains == 100.0
    assert metrics.realized_gains == 0.0


def test_realized_gain_held_at_start(conn, calc):
    """Test Realized Gain for share held at start and sold during period."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Buy before start (10 shares @ 100)
    _insert_tx(
        conn, "tx1", TransactionType.BUY, "2022-12-01", "sec1", 10.0, -1000.0, "EUR"
    )

    # Price at Start = 110.0
    _insert_price(conn, "sec1", start_date, 110.0)

    # Sell during period (5 shares @ 130)
    _insert_tx(
        conn, "tx2", TransactionType.SELL, "2023-01-15", "sec1", 5.0, 650.0, "EUR"
    )

    # Price at End for remaining 5 shares = 125.0
    _insert_price(conn, "sec1", end_date, 125.0)

    metrics = calc.calculate(start_date, end_date)

    # Realized:
    # Baseline Price @ Start = 110.
    # Sale Price = 130.
    # Gain = (130 - 110) * 5 = 20 * 5 = 100.
    assert metrics.realized_gains == 100.0

    # Unrealized:
    # Remaining 5 shares.
    # Baseline Price @ Start = 110.
    # End Price = 125.
    # Gain = (125 - 110) * 5 = 15 * 5 = 75.
    assert metrics.unrealized_gains == 75.0


def test_fx_performance_cash(conn, calc):
    """Test FX Performance on USD Cash Account."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Initial Balance before start: 1000 USD
    _insert_tx(
        conn, "tx1", TransactionType.DEPOSIT, "2022-12-01", None, 0, 1000.0, "USD", account="usd_acc"
    )
    # FX Rate at Deposit: 1 USD = 0.9 EUR
    _insert_fx(conn, "2022-12-01", "USD", 0.90)

    # FX Rate at Start: 0.95
    _insert_fx(conn, "2023-01-01", "USD", 0.95)

    # Transaction during period: Buy something for 500 USD (Outflow)
    _insert_tx(
        conn, "tx2", TransactionType.BUY, "2023-01-15", "secA", 10.0, -500.0, "USD", account="usd_acc"
    )
    # FX Rate at Transaction: 1.00
    _insert_fx(conn, "2023-01-15", "USD", 1.00)

    # FX Rate at End: 1.10
    _insert_fx(conn, "2023-01-31", "USD", 1.10)

    metrics = calc.calculate(start_date, end_date)

    # 1. Outflow (Realized FX Gain on Cash spent)
    # Consumed 500 USD.
    # Baseline Rate @ Start = 0.95.
    # Exit Rate @ Tx = 1.00.
    # Gain = (1.00 - 0.95) * 500 = 0.05 * 500 = 25.0 EUR.

    # 2. Remaining Balance (Unrealized FX Gain on Cash held)
    # Remaining 500 USD.
    # Baseline Rate @ Start = 0.95.
    # End Rate @ End = 1.10.
    # Gain = (1.10 - 0.95) * 500 = 0.15 * 500 = 75.0 EUR.

    # Total FX Gain = 25 + 75 = 100.0 EUR.

    assert metrics.fx_gains_cash == pytest.approx(100.0)


def test_absolute_performance(conn, calc):
    """Test Absolute Performance calculation from daily_wealth."""
    start_date = date(2023, 1, 10)
    end_date = date(2023, 1, 20)

    # Need Start-1 (Jan 9) and End (Jan 20)
    conn.execute(
        "INSERT INTO daily_wealth VALUES (?, ?, ?)",
        ("2023-01-09", 1000.0, 500.0) # Start Wealth, Start Invested
    )
    conn.execute(
        "INSERT INTO daily_wealth VALUES (?, ?, ?)",
        ("2023-01-20", 1200.0, 600.0) # End Wealth, End Invested
    )

    metrics = calc.calculate(start_date, end_date)

    # Delta Wealth = 1200 - 1000 = 200
    # Delta Invested = 600 - 500 = 100
    # Abs Perf = 200 - 100 = 100

    assert metrics.absolute_performance == 100.0


def test_filtering_by_account(conn, calc):
    """Test that account_ids filter works."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Account A (included)
    # Buy 1 share @ 100 EUR
    _insert_tx(conn, "tx1", TransactionType.BUY, "2023-01-01", "sec1", 1.0, -100.0, "EUR", account="accA")
    # Sell 1 share @ 120 EUR
    _insert_tx(conn, "tx2", TransactionType.SELL, "2023-01-15", "sec1", 1.0, 120.0, "EUR", account="accA")
    # Realized Gain = 20

    # Account B (excluded)
    # Buy 1 share @ 100 EUR
    _insert_tx(conn, "tx3", TransactionType.BUY, "2023-01-01", "sec1", 1.0, -100.0, "EUR", account="accB")
    # Sell 1 share @ 200 EUR
    _insert_tx(conn, "tx4", TransactionType.SELL, "2023-01-15", "sec1", 1.0, 200.0, "EUR", account="accB")
    # Realized Gain = 100

    # Calculate filtering only Account A
    metrics = calc.calculate(start_date, end_date, account_ids=["accA"])

    assert metrics.realized_gains == 20.0
