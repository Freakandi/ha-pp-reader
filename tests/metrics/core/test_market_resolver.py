"""Unit tests for the MarketResolver class."""

from __future__ import annotations

import sqlite3
from datetime import UTC, date, datetime

import pytest

from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver
from custom_components.pp_reader.util.currency import PRICE_SCALE


@pytest.fixture
def db_connection():
    """Set up an in-memory SQLite database for testing."""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    # Create tables
    cursor.execute(
        """
        CREATE TABLE securities (
            uuid TEXT PRIMARY KEY,
            name TEXT,
            currency_code TEXT,
            last_price INTEGER,
            last_price_date INTEGER
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE historical_prices (
            security_uuid TEXT,
            date INTEGER,
            close INTEGER
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE fx_rates (
            date TEXT,
            currency TEXT,
            rate REAL
        )
    """
    )

    # Calculate EPOCH days for clarity
    # 2022-01-07
    ts_jan7 = (datetime(2022, 1, 7, tzinfo=UTC) - datetime(1970, 1, 1, tzinfo=UTC)).days

    # 2022-01-09
    ts_jan9 = (datetime(2022, 1, 9, tzinfo=UTC) - datetime(1970, 1, 1, tzinfo=UTC)).days
    # Insert test data
    securities_data = [
        ("sec_a", "Security A", "USD", 155 * PRICE_SCALE, ts_jan7),  # Live: 2022-01-07
        ("sec_b", "Security B", "EUR", None, None),
        ("sec_c", "Security C", "GBP", 210 * PRICE_SCALE, ts_jan9),  # Live: 2022-01-09
    ]
    historical_prices_data = [
        ("sec_a", 20220105, 150 * PRICE_SCALE),  # Jan 5
        ("sec_a", 20220106, 152 * PRICE_SCALE),  # Jan 6
        ("sec_a", 20220107, 153 * PRICE_SCALE),  # Jan 7 (Should be overridden by Live)
        ("sec_c", 20220108, 200 * PRICE_SCALE),  # Jan 8
    ]
    fx_rates_data = [
        ("2022-01-05", "USD", 1.2),
        ("2022-01-06", "USD", 1.21),
        ("2022-01-08", "GBP", 0.85),
    ]
    cursor.executemany("INSERT INTO securities VALUES (?, ?, ?, ?, ?)", securities_data)
    cursor.executemany(
        "INSERT INTO historical_prices VALUES (?, ?, ?)", historical_prices_data
    )
    cursor.executemany("INSERT INTO fx_rates VALUES (?, ?, ?)", fx_rates_data)
    conn.commit()
    yield conn
    conn.close()


def test_price_lookup_exact_match(db_connection):
    """Test retrieving a price on a date with an exact historical record."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    # Jan 6 is purely historical
    price = resolver.get_price("sec_a", date(2022, 1, 6))
    assert price == pytest.approx(152.0)


def test_price_lookup_forward_fill(db_connection):
    """Test that the resolver forward-fills prices to a future date."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    # sec_c: Hist(Jan 8)=200, Live(Jan 9)=210.
    # Query Jan 14 -> Expect 210.
    price = resolver.get_price("sec_c", date(2022, 1, 14))
    assert price == pytest.approx(210.0)


def test_price_lookup_missing(db_connection):
    """Test that a missing security returns a price of 0.0."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    price = resolver.get_price("sec_b", date(2022, 1, 5))
    assert price == 0.0
    price_unknown = resolver.get_price("sec_unknown", date(2022, 1, 5))
    assert price_unknown == 0.0


def test_live_price_priority(db_connection):
    """Test that the live price from the securities table overrides historical data."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    # sec_a: Hist(Jan 7)=153, Live(Jan 7)=155.
    # Expect 155.
    price = resolver.get_price("sec_a", date(2022, 1, 7))
    assert price == pytest.approx(155.0)


def test_get_security_currency(db_connection):
    """Test the lookup of a security's currency code."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    assert resolver.get_security_currency("sec_a") == "USD"
    assert resolver.get_security_currency("sec_b") == "EUR"
    assert resolver.get_security_currency("sec_c") == "GBP"
    assert resolver.get_security_currency("sec_unknown") == "EUR"


def test_fx_lookup(db_connection):
    """Test FX rate lookups are delegated correctly."""
    resolver = MarketResolver(db_connection)
    resolver.load_data()
    assert resolver.get_fx("USD", date(2022, 1, 6)) == pytest.approx(1.21)
    assert resolver.get_fx("USD", date(2022, 1, 7)) == pytest.approx(1.21)
    assert resolver.get_fx("JPY", date(2022, 1, 5)) == 1.0
