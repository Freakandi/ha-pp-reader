"""Test the PerformanceEngine."""

import sqlite3
from datetime import date

import pandas as pd

from custom_components.pp_reader.metrics.calculator import PerformanceEngine
from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


def test_calculate_capital_gains_fifo():
    """Test FIFO logic for capital gains calculation in PerformanceEngine."""
    # In-memory SQLite database for testing
    conn = sqlite3.connect(":memory:")

    # Create necessary tables
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
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
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
        (
            "t1",
            0,
            "2023-01-01T10:00:00",
            "acc1",
            None,
            "port1",
            "sec1",
            1000000000,
            100000,
            "EUR",
        ),
        (
            "t2",
            0,
            "2023-01-02T10:00:00",
            "acc1",
            None,
            "port1",
            "sec1",
            1000000000,
            110000,
            "EUR",
        ),
        (
            "t3",
            1,
            "2023-01-03T10:00:00",
            "acc1",
            None,
            "port1",
            "sec1",
            -500000000,
            60000,
            "EUR",
        ),
        (
            "t4",
            1,
            "2023-01-04T10:00:00",
            "acc1",
            None,
            "port1",
            "sec1",
            -1000000000,
            130000,
            "EUR",
        ),
    ]
    conn.executemany(
        "INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        transactions_data,
    )

    # Mock transaction units data for sales
    transaction_units_data = [
        ("t3", 2, 500, "EUR", None, None),  # 5 EUR fee
        ("t4", 2, 500, "EUR", None, None),  # 5 EUR fee
    ]
    conn.executemany(
        "INSERT INTO transaction_units VALUES (?, ?, ?, ?, ?, ?)",
        transaction_units_data,
    )

    # Mock securities data
    securities_data = [("sec1", "Test Security", "EUR", "TEST", 1350000000)]
    conn.executemany("INSERT INTO securities VALUES (?, ?, ?, ?, ?)", securities_data)

    # Mock historical prices for unrealized gains calculation
    prices_data = [
        ("sec1", 20230101, 10000000000),  # Price for virtual lot (100.0)
        ("sec1", 20230104, 13500000000),  # Price at end (135.0)
    ]
    conn.executemany("INSERT INTO historical_prices VALUES (?, ?, ?)", prices_data)

    conn.commit()

    # Create PerformanceEngine instance
    market_resolver = MarketResolver(conn)
    market_resolver.load_data()
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()

    # Execute the capital gains calculation
    realized_gains, unrealized_gains = engine._calculate_capital_gains(
        engine._df_txs, date(2023, 1, 1), date(2023, 1, 31)
    )

    # Assertions
    # Check realized gains (360.0 = Gross Gain)
    assert round(realized_gains, 2) == 360.0

    # 5 shares remaining @ 110 cost basis. Current price is 135.
    # Unrealized gain = 5 * (135 - 110) = 125
    assert round(unrealized_gains, 2) == 125.0

    conn.close()


def test_augment_transfers_explicit_fx():
    """Test standard augmentation with explicit FX override from transaction units."""
    conn = sqlite3.connect(":memory:")

    # Create simplified schemas
    conn.execute(
        """
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
        )
        """
    )
    conn.execute("CREATE TABLE accounts (uuid TEXT, currency_code TEXT, name TEXT)")
    conn.execute("CREATE TABLE fx_rates (date TEXT, currency TEXT, rate REAL)")

    # 1. Accounts: One USD, One JPY
    conn.execute("INSERT INTO accounts VALUES ('acc_usd', 'USD', 'US Dollar Account')")
    conn.execute(
        "INSERT INTO accounts VALUES ('acc_jpy', 'JPY', 'Japanese Yen Account')"
    )

    # 2. Transaction: Transfer 200 USD -> JPY with explicit FX unit
    # UUID: tx1, Account: acc_usd, Other: acc_jpy
    # Unit: fx_amount=30000 (JPY), fx_currency=JPY
    # Note: Using 30000 units (scaled or unscaled doesn't matter for calculator logic,
    # except standard division).
    # FX Rate in unit is irrelevant for calculator.py override logic (it uses fx_amount).

    # 3. FX Rates: 1 USD = 150 JPY.
    conn.execute(
        "INSERT INTO fx_rates VALUES ('2023-01-01T00:00:00+00:00', 'USD', 1.0)"
    )
    conn.execute(
        "INSERT INTO fx_rates VALUES ('2023-01-01T00:00:00+00:00', 'JPY', 0.006666)"
    )
    # Market Calculation: 200 USD / (USD Rate 1.0) = 200 EUR?
    # Wait, my mock rates are messy. Let's make EUR base.
    # 1 EUR = 1.1 USD. 1 EUR = 160 JPY.
    # USD Rate = 1.1. JPY Rate = 160.
    # 200 USD -> 200/1.1 = 181.8 EUR.
    # 181.8 EUR * 160 = 29090 JPY.
    # Explicit Unit says: 30000 JPY.
    # We expect 30000 JPY to be used.

    conn.executemany(
        "INSERT INTO fx_rates VALUES (?, ?, ?)",
        [
            ("2023-01-01T00:00:00+00:00", "USD", 1.1),
            ("2023-01-01T00:00:00+00:00", "JPY", 160.0),
        ],
    )
    conn.executemany(
        "INSERT INTO transaction_units VALUES (?, ?, ?, ?, ?, ?)",
        [
            ("tx1", 0, 20000, "USD", 3000000, "JPY"),  # 200.00 USD, 30000.00 JPY
        ],
    )

    conn.commit()

    market_resolver = MarketResolver(conn)
    market_resolver.load_data()
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()

    # Mock Input Transfer DataFrame
    df_transfers = pd.DataFrame(
        [
            {
                "uuid": "tx1",
                "type": 5,
                "date": pd.Timestamp("2023-01-01", tz="UTC"),
                "account": "acc_usd",
                "other_account": "acc_jpy",
                "amount": 20000,
                "currency_code": "USD",
            }
        ]
    )

    augmented = engine._augment_transfers(df_transfers)

    # Verify Results
    # Should have 2 rows: Removal from USD, Deposit to JPY
    assert len(augmented) == 2

    # Row 1: Removal USD
    row_out = augmented[augmented["type"] == 7].iloc[0]  # REMOVAL
    assert row_out["amount"] == 20000
    assert row_out["currency_code"] == "USD"

    # Row 2: Deposit JPY
    row_in = augmented[augmented["type"] == 6].iloc[0]  # DEPOSIT
    assert row_in["currency_code"] == "JPY"
    # Should equal FX Amount (3,000,000) instead of Market Rate (2,909,090)
    assert row_in["amount"] == 3000000
    # Market calculated would be: 20000 * (160/1.1) = ~2909090.

    conn.close()


def test_calculate_fx_performance_with_override():
    """Test FX performance calculation with explicit transfer overrides."""
    conn = sqlite3.connect(":memory:")

    # Schema
    conn.execute(
        """
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
        )
        """
    )
    conn.execute("CREATE TABLE accounts (uuid TEXT, currency_code TEXT, name TEXT)")
    conn.execute("CREATE TABLE fx_rates (date TEXT, currency TEXT, rate REAL)")
    conn.execute(
        """
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT,
            security TEXT, shares INTEGER, amount INTEGER, currency_code TEXT
        )
        """
    )
    conn.execute("CREATE TABLE securities (uuid TEXT, currency_code TEXT, name TEXT)")
    conn.execute(
        "CREATE TABLE historical_prices (security_uuid TEXT, date INTEGER, close INTEGER)"
    )

    # Data
    # 1. Accounts
    conn.execute("INSERT INTO accounts VALUES ('acc_usd', 'USD', 'USD Acc')")
    conn.execute("INSERT INTO accounts VALUES ('acc_jpy', 'JPY', 'JPY Acc')")

    # 2. Transfer: 100 USD to JPY on Day 1.
    # explicit FX: 15000 JPY. (Rate 150).
    conn.execute(
        """
        INSERT INTO transactions VALUES
        ('tx1', 5, '2023-01-01T00:00:00', 'acc_usd', 'acc_jpy', NULL, NULL, 0, 10000, 'USD')
        """
    )
    conn.execute(
        "INSERT INTO transaction_units VALUES ('tx1', 0, 10000, 'USD', 1500000, 'JPY')"
    )  # 15000 JPY

    # 3. Rates
    # Day 1: USD=1.0, JPY=100.0 (Market Rate is 100).
    # If standard convert: 100 USD -> 100 * (100/1) = 10000 JPY.
    # BUT explicit is 15000 JPY (User got lucky/great rate).
    # Day 2: USD=1.0, JPY=100.0.

    # We measure FX Performace from Day 1 to Day 2.
    # On Day 1:
    #   Remove 100 USD from 'acc_usd'. (Value -100 EUR). (Cost basis 1.0).
    #   Deposit 15000 JPY to 'acc_jpy'. (Value 150 EUR).
    # wait, FX Performance tracks Cash *Inventory*.
    # 'acc_jpy' gets 15000 JPY on Day 1.
    # Cost Basis: Value at time of deposit.
    # Value at Day 1: 15000 / 100.0 = 150 EUR.
    # Rate at Day 1 is 100.

    # At Day 2 (End):
    # Holding 15000 JPY. Rate 100.
    # Value: 15000 / 100 = 150 EUR.
    # Expected Gain: End (150) - Basis (150) = 0.

    # BUT, let's change Rate on Day 2 to 200.0.
    # Value Day 2: 15000 / 200 = 75 EUR.
    # Expected Gain: 75 - 150 = -75 EUR.

    conn.executemany(
        "INSERT INTO fx_rates VALUES (?, ?, ?)",
        [
            ("2023-01-01", "USD", 1.0),
            ("2023-01-01", "JPY", 100.0),
            ("2023-01-02", "USD", 1.0),
            ("2023-01-02", "JPY", 200.0),
        ],
    )
    conn.commit()

    market_resolver = MarketResolver(conn)
    market_resolver.load_data()
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()
    # Mocking _df_units manually to avoid full load issues if any
    # (But we populated tables, so load_data should work)

    # Run Calculation
    # We need to ensure account name map is populated for _calculate_fx_performance (it uses account_currencies dict)
    # load_data populates it.

    fx_gain = engine._calculate_fx_performance(
        engine._df_txs, date(2023, 1, 1), date(2023, 1, 2)
    )

    # Expected (Balance Sheet with Asymmetric Flow):
    # Flow USD: -100 USD @ 1.0 = -100 EUR.
    # Flow JPY: +15000 JPY @ 100.0 = +150 EUR.
    # USD Gain: End(-100) - Start(0) - Flow(-100) = 0.
    # JPY Gain: End(75) - Start(0) - Flow(150) = -75.
    # Total = -75.0.
    assert round(fx_gain, 2) == -75.0

    conn.close()
