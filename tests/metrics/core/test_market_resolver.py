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

    # Calculate EPOCH days (for historical_prices) and seconds (for securities live price)
    base_date = datetime(1970, 1, 1, tzinfo=UTC)

    # Days
    ts_jan5_days = (datetime(2022, 1, 5, tzinfo=UTC) - base_date).days
    ts_jan6_days = (datetime(2022, 1, 6, tzinfo=UTC) - base_date).days
    ts_jan7_days = (datetime(2022, 1, 7, tzinfo=UTC) - base_date).days
    ts_jan8_days = (datetime(2022, 1, 8, tzinfo=UTC) - base_date).days

    # Seconds
    ts_jan7_sec = int(datetime(2022, 1, 7, tzinfo=UTC).timestamp())
    ts_jan9_sec = int(datetime(2022, 1, 9, tzinfo=UTC).timestamp())

    # Insert test data
    securities_data = [
        (
            "sec_a",
            "Security A",
            "USD",
            155 * PRICE_SCALE,
            ts_jan7_sec,
        ),  # Live: 2022-01-07
        ("sec_b", "Security B", "EUR", None, None),
        (
            "sec_c",
            "Security C",
            "GBP",
            210 * PRICE_SCALE,
            ts_jan9_sec,
        ),  # Live: 2022-01-09
    ]
    historical_prices_data = [
        ("sec_a", ts_jan5_days, 150 * PRICE_SCALE),  # Jan 5
        ("sec_a", ts_jan6_days, 152 * PRICE_SCALE),  # Jan 6
        (
            "sec_a",
            ts_jan7_days,
            153 * PRICE_SCALE,
        ),  # Jan 7 (Should be overridden by Live)
        ("sec_c", ts_jan8_days, 200 * PRICE_SCALE),  # Jan 8
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


def test_timestamp_handling(db_connection):
    """Test that the resolver handles Unix timestamps (seconds) correctly."""
    cursor = db_connection.cursor()

    # 2022-01-10 in seconds
    ts_seconds_1 = int(datetime(2022, 1, 10, tzinfo=UTC).timestamp())
    # 2022-01-11 in seconds
    ts_seconds_2 = int(datetime(2022, 1, 11, tzinfo=UTC).timestamp())

    data = [
        ("sec_1", "Security 1", "USD", 160 * PRICE_SCALE, ts_seconds_1),
        ("sec_2", "Security 2", "USD", 170 * PRICE_SCALE, ts_seconds_2),
    ]
    cursor.executemany("INSERT OR REPLACE INTO securities VALUES (?, ?, ?, ?, ?)", data)
    db_connection.commit()

    resolver = MarketResolver(db_connection)
    resolver.load_data()

    # Check seconds-based price
    price_1 = resolver.get_price("sec_1", date(2022, 1, 10))
    assert price_1 == pytest.approx(160.0)

    # Check seconds-based price
    price_2 = resolver.get_price("sec_2", date(2022, 1, 11))
    assert price_2 == pytest.approx(170.0)
