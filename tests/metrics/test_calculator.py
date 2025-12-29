"""Test the PerformanceEngine."""

import sqlite3
from datetime import date
from pathlib import Path

from custom_components.pp_reader.metrics.calculator import PerformanceEngine

def test_calculate_capital_gains_fifo():
    """Test FIFO logic for capital gains calculation in PerformanceEngine."""
    # In-memory SQLite database for testing
    conn = sqlite3.connect(":memory:")
    
    # Create necessary tables
    conn.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, portfolio TEXT,
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
            uuid TEXT, name TEXT, currency_code TEXT, ticker_symbol TEXT, last_price INTEGER
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE historical_prices (
            security_uuid TEXT, date INTEGER, close INTEGER
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE fx_rates (
            date TEXT, currency TEXT, rate REAL
        )
        """
    )

    # Mock transactions data
    transactions_data = [
        ("t1", 0, "2023-01-01T10:00:00", "acc1", "port1", "sec1", 1000000000, 100000, "EUR"),
        ("t2", 0, "2023-01-02T10:00:00", "acc1", "port1", "sec1", 1000000000, 110000, "EUR"),
        ("t3", 1, "2023-01-03T10:00:00", "acc1", "port1", "sec1", -500000000, 60000, "EUR"),
        ("t4", 1, "2023-01-04T10:00:00", "acc1", "port1", "sec1", -1000000000, 130000, "EUR"),
    ]
    conn.executemany("INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", transactions_data)

    # Mock transaction units data for sales
    transaction_units_data = [
        ("t3", 2, 500, "EUR"),  # 5 EUR fee
        ("t4", 2, 500, "EUR"),  # 5 EUR fee
    ]
    conn.executemany("INSERT INTO transaction_units VALUES (?, ?, ?, ?)", transaction_units_data)

    # Mock securities data
    securities_data = [
        ("sec1", "Test Security", "EUR", "TEST", 1350000000)
    ]
    conn.executemany("INSERT INTO securities VALUES (?, ?, ?, ?, ?)", securities_data)

    # Mock historical prices for unrealized gains calculation
    prices_data = [
            ("sec1", 20230101, 1000000000),  # Price for virtual lot
        ("sec1", 20230104, 1350000000),
    ]
    conn.executemany("INSERT INTO historical_prices VALUES (?, ?, ?)", prices_data)
    
    conn.commit()

    # Create PerformanceEngine instance
    engine = PerformanceEngine(conn)
    engine.load_data()

    # Execute the capital gains calculation
    realized_gains, unrealized_gains = engine._calculate_capital_gains(
        engine._df_txs, date(2023, 1, 1), date(2023, 1, 31)
    )

    # Assertions
    assert round(realized_gains, 2) == 350.0
    
    # 5 shares remaining @ 110 cost basis. Current price is 135.
    # Unrealized gain = 5 * (135 - 110) = 125
    assert round(unrealized_gains, 2) == 125.0
    
    conn.close()
