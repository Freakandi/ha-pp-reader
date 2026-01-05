import sqlite3
from datetime import date
from unittest.mock import MagicMock

import pandas as pd

from custom_components.pp_reader.metrics.calculator import PerformanceEngine


def test_twr_simple_growth():
    """Test TWR calculation with simple compounding growth."""
    conn = sqlite3.connect(":memory:")
    engine = PerformanceEngine(conn, MagicMock())

    # Dates
    # Dates
    d1 = "2023-01-01"
    d2 = "2023-01-02"

    # Daily Wealth DataFrame
    # Day 0: Start Value 100 is implicit as previous day's end value passed to function
    # Day 1: End 110
    # Day 2: End 121

    data = {
        "date": [d1, d2],  # Wealth records for the period
        "total_wealth_eur": [110.0, 121.0],
    }
    daily_wealth = pd.DataFrame(data)

    daily_flows = pd.Series([0.0, 0.0])

    start_value = 100.0

    twr = engine._calculate_twr(daily_wealth, daily_flows, start_value)

    # (110/100) * (121/110) - 1 = 1.21 - 1 = 0.21
    assert round(twr, 4) == 0.2100


def test_twr_with_cashflow():
    """Test TWR calculation with a deposit."""
    conn = sqlite3.connect(":memory:")
    engine = PerformanceEngine(conn, MagicMock())

    # Day 1: Start 100 -> End 120 (Deposit 10, Growth 10)
    # Return = (120 - 10) / 100 = 1.10 (+10%)

    # Day 2: Start 120 -> End 132 (Growth 12)
    # Return = (132 - 0) / 120 = 1.10 (+10%)

    daily_wealth = pd.DataFrame({"total_wealth_eur": [120.0, 132.0]})

    # Flow on Day 1 is 10.0
    daily_flows = pd.Series([10.0, 0.0])

    start_value = 100.0

    twr = engine._calculate_twr(daily_wealth, daily_flows, start_value)

    # 1.1 * 1.1 - 1 = 0.21
    assert round(twr, 4) == 0.2100


def test_irr_simple_annual():
    """Test IRR calculation for 1 year 10%."""
    conn = sqlite3.connect(":memory:")
    engine = PerformanceEngine(conn, MagicMock())

    start_date = date(2023, 1, 1)
    end_date = date(2024, 1, 1)  # 365 days

    start_value = 100.0
    end_value = 110.0

    # Single day flow series (just start date handled by function logic?)
    # Call signature asks for daily_flows series covering the period?
    # The function constructs days array from len(daily_flows).
    # If period is 365 days, daily_flows should be length 365.

    # Let's create a dummy series of length 366 (inclusive start to end)
    dates = pd.date_range(start=start_date, end=end_date, freq="D")
    # (2023-01-01 to 2024-01-01)

    daily_flows = pd.Series([0.0] * len(dates), index=dates)

    irr = engine._calculate_irr(start_value, end_value, daily_flows)

    # (110/100)^(365/365) - 1 = 0.10
    assert abs(irr - 0.10) < 1e-4


def test_irr_with_midyear_deposit():
    """Test IRR with a deposit in the middle."""
    conn = sqlite3.connect(":memory:")
    engine = PerformanceEngine(conn, MagicMock())

    # 100 Start
    # 6 Months later (182 days): Deposit 100
    # End of Year: Value 220
    # Approx 10% return on both chunks?
    # 100 * 1.1 + 100 * 1.05 ~= 110 + 105 = 215.
    # If 220, return > 10%.

    daily_flows = pd.Series([0.0] * 365)
    daily_flows[182] = 100.0  # Deposit

    start_value = 100.0
    end_value = 220.0

    # Simple check: Money weighted return should be roughly (220 - 200) / (100*1 + 100*0.5) = 20/150 = 13.3%

    irr = engine._calculate_irr(start_value, end_value, daily_flows)

    assert 0.10 < irr < 0.15
