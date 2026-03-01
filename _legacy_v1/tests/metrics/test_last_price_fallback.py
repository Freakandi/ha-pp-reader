"""Test last price fallback logic."""
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pandas as pd
import pytest

from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


@pytest.fixture
def mock_conn():
    return MagicMock()

def test_last_price_fallback_weekend(mock_conn):
    """Test that get_price falls back to the last known price."""
    resolver = MarketResolver(mock_conn)

    # Setup data
    sec_uuid = "sec_123"
    friday = datetime(2023, 10, 27, tzinfo=UTC) # Friday
    saturday = datetime(2023, 10, 28, tzinfo=UTC) # Saturday

    # Mock internal DataFrame loading directly since we can't easily query mock sqlite
    # MarketResolver stores data in _prices_idx which is MultiIndex (sec_uuid, date)

    # Note: MarketResolver.load_data converts timestamps to UTC.
    # Here we manually construct the dataframe structure it expects.

    dates = [friday]
    closes = [150.0]

    df = pd.DataFrame({
        "security_uuid": [sec_uuid],
        "date": dates,
        "close": closes
    })

    resolver._prices_idx = df.set_index(["security_uuid", "date"]).sort_index()

    # Action: Get price for Saturday
    # This should find the Friday price as it is the last one <= Saturday
    price = resolver.get_price(sec_uuid, saturday)

    # Assert
    assert price == 150.0

def test_last_price_fallback_gap(mock_conn):
    """Test fallback over a gap (e.g. holiday)."""
    resolver = MarketResolver(mock_conn)
    sec_uuid = "sec_gap"
    prev_date = datetime(2023, 1, 1, tzinfo=UTC)
    target_date = datetime(2023, 1, 5, tzinfo=UTC)

    df = pd.DataFrame({
        "security_uuid": [sec_uuid],
        "date": [prev_date],
        "close": [10.0]
    })
    resolver._prices_idx = df.set_index(["security_uuid", "date"]).sort_index()

    price = resolver.get_price(sec_uuid, target_date)
    assert price == 10.0

def test_last_price_fallback_none_before(mock_conn):
    """Test 0.0 returned if date is before first price."""
    resolver = MarketResolver(mock_conn)
    sec_uuid = "sec_late"
    first_date = datetime(2023, 1, 5, tzinfo=UTC)
    query_date = datetime(2023, 1, 1, tzinfo=UTC)

    df = pd.DataFrame({
        "security_uuid": [sec_uuid],
        "date": [first_date],
        "close": [10.0]
    })
    resolver._prices_idx = df.set_index(["security_uuid", "date"]).sort_index()

    price = resolver.get_price(sec_uuid, query_date)
    assert price == 0.0
