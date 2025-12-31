"""Test the PerformanceEngine breakdown calculation."""

import sqlite3
from datetime import date

from custom_components.pp_reader.metrics.calculator import PerformanceEngine


def test_calculate_period_breakdown():
    """Test detailed breakdown calculation."""
    conn = sqlite3.connect(":memory:")
    conn.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT,
            security TEXT, shares INTEGER, amount INTEGER, currency_code TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE securities (
            uuid TEXT, name TEXT, currency_code TEXT, ticker_symbol TEXT, last_price INTEGER,
            last_price_date TEXT, is_active INTEGER
        )
        """
    )
    conn.execute("CREATE TABLE accounts (uuid TEXT, name TEXT, currency_code TEXT)")
    conn.execute(
        "CREATE TABLE historical_prices (security_uuid TEXT, date INTEGER, close INTEGER)"
    )
    conn.execute("CREATE TABLE fx_rates (date TEXT, currency TEXT, rate REAL)")
    conn.execute(
        "CREATE TABLE exchange_rates (date TEXT, base_currency TEXT, term_currency TEXT, rate INTEGER)"
    )

    # Data Setup
    # Security A: Buy 10 @ 100. Sell 5 @ 120. (Gain 100 total)
    # Dividend A: 50 EUR.
    # Security B: Buy 10 @ 50. End Price 60. (Unrealized 100)
    # Account 1: Interest 10 EUR.

    conn.execute(
        "INSERT INTO securities VALUES ('secA', 'Security A', 'EUR', 'A', 0, NULL, 1)"
    )
    conn.execute(
        "INSERT INTO securities VALUES ('secB', 'Security B', 'EUR', 'B', 0, NULL, 1)"
    )
    conn.execute("INSERT INTO accounts VALUES ('acc1', 'Main Account', 'EUR')")

    conn.executemany(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
            # Buy SecA: 10 shares, 1000 EUR
            (
                "t1",
                0,
                "2023-01-01T10:00:00",
                "acc1",
                None,
                "p1",
                "secA",
                1000000000,
                100000,
                "EUR",
            ),
            # Buy SecB: 10 shares, 500 EUR
            (
                "t2",
                0,
                "2023-01-01T10:00:00",
                "acc1",
                None,
                "p1",
                "secB",
                1000000000,
                50000,
                "EUR",
            ),
            # Sell SecA: 5 shares, 600 EUR (120/share)
            (
                "t3",
                1,
                "2023-06-01T10:00:00",
                "acc1",
                None,
                "p1",
                "secA",
                -500000000,
                60000,
                "EUR",
            ),
            # Dividend SecA: 50 EUR
            (
                "t4",
                8,
                "2023-06-02T10:00:00",
                "acc1",
                None,
                "p1",
                "secA",
                0,
                5000,
                "EUR",
            ),
            # Interest: 10 EUR
            ("t5", 9, "2023-06-03T10:00:00", "acc1", None, None, None, 0, 1000, "EUR"),
        ],
    )

    # Prices for Unrealized
    # SecB end price 60.0 (x 10^8 = 6000000000)
    # SecA end price 120.0 (x 10^8 = 12000000000) -> 5 shares left * (120-100) = 100 gain
    conn.executemany(
        "INSERT INTO historical_prices VALUES (?,?,?)",
        [
            ("secA", 20230101, 10000000000),
            ("secB", 20230101, 5000000000),
            ("secA", 20231231, 12000000000),
            ("secB", 20231231, 6000000000),
        ],
    )

    conn.commit()

    engine = PerformanceEngine(conn)
    engine.load_data()

    bd = engine.calculate_period_breakdown(date(2023, 1, 1), date(2023, 12, 31))

    # Verify Realized Gains (SecA: 5 * (120-100) = 100)
    assert len(bd.realized_gains) == 1
    assert bd.realized_gains[0].label == "Security A"
    assert round(bd.realized_gains[0].amount, 2) == 100.0

    # Verify Unrealized Gains
    # SecA: 5 left * (120-100) = 100
    # SecB: 10 left * (60-50) = 100
    # Note: Order depends on sort, but both are 100.
    assert len(bd.unrealized_gains) == 2
    sum_unrealized = sum(x.amount for x in bd.unrealized_gains)
    assert round(sum_unrealized, 2) == 200.0

    # Verify Dividends
    assert len(bd.dividends) == 1
    assert bd.dividends[0].label == "Security A"
    assert bd.dividends[0].amount == 50.0

    # Verify Interest
    assert len(bd.interest) == 1
    assert bd.interest[0].label == "Main Account"
    assert bd.interest[0].amount == 10.0
