import datetime
import sqlite3

import pytest

from custom_components.pp_reader.backdating.engine_pandas import TransactionType
from custom_components.pp_reader.metrics.calculator import PerformanceEngine


@pytest.fixture
def test_db(tmp_path):
    db_path = tmp_path / "test_period_calc.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create tables
    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        uuid TEXT PRIMARY KEY,
        type INTEGER NOT NULL,
        account TEXT,
        other_account TEXT,
        date TEXT NOT NULL,
        currency_code TEXT,
        amount INTEGER,
        shares INTEGER,
        security TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS transaction_units (
        transaction_uuid TEXT NOT NULL,
        type INTEGER NOT NULL,
        amount INTEGER,
        currency_code TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS securities (
        uuid TEXT PRIMARY KEY,
        currency_code TEXT,
        name TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS historical_prices (
        security_uuid TEXT NOT NULL,
        date INTEGER NOT NULL,
        close INTEGER NOT NULL,
        PRIMARY KEY (security_uuid, date)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS fx_rates (
        date TEXT NOT NULL,
        currency TEXT NOT NULL,
        rate INTEGER NOT NULL,
        PRIMARY KEY (date, currency)
    );
    """)

    conn.commit()
    conn.close()
    return db_path


def test_realized_gains_calculation_gross_not_double_counted(test_db):
    """
    Verify that Realized Gains are calculated as Gross Gains.
    This requires:
    1. BUY Cost Basis uses 'amount' (Total Cash Flow) directly, without adding fees again.
    2. SELL Proceeds uses 'amount' (Net Flow) + Fees + Taxes to reconstitute Gross Proceeds.
    """
    conn = sqlite3.connect(test_db)
    cur = conn.cursor()

    sec_uuid = "sec1"
    cur.execute(
        "INSERT INTO securities (uuid, currency_code) VALUES (?, ?)", (sec_uuid, "EUR")
    )

    # 1. BUY 1 share.
    # Price 100 EUR. Fee 5 EUR.
    # Total Cash Flow (amount) = 10500 cents.
    # Transaction Units: Fee 500 cents.
    #
    # Correct Cost Basis = 105.00 EUR.
    cur.execute(
        """
        INSERT INTO transactions (uuid, type, date, amount, shares, security, currency_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            "tx_buy",
            TransactionType.BUY,
            "2025-01-01T12:00:00",
            10500,
            100000000,
            sec_uuid,
            "EUR",
        ),
    )

    cur.execute(
        """
        INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code)
        VALUES (?, ?, ?, ?)
    """,
        ("tx_buy", 2, 500, "EUR"),
    )  # Fee

    # 2. SELL 1 share.
    # Gross Price 120 EUR. Fee 5 EUR. Tax 5 EUR.
    # Net Cash Flow (amount) = 11000 cents.
    # Transaction Units: Fee 500, Tax 500.
    #
    # Correct Gross Proceeds = 120.00 EUR.
    cur.execute(
        """
        INSERT INTO transactions (uuid, type, date, amount, shares, security, currency_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            "tx_sell",
            TransactionType.SELL,
            "2025-01-02T12:00:00",
            11000,
            100000000,
            sec_uuid,
            "EUR",
        ),
    )

    cur.execute(
        """
        INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code)
        VALUES (?, ?, ?, ?)
    """,
        ("tx_sell", 2, 500, "EUR"),
    )  # Fee

    cur.execute(
        """
        INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code)
        VALUES (?, ?, ?, ?)
    """,
        ("tx_sell", 1, 500, "EUR"),
    )  # Tax (Type 1 is Tax)

    # Add historical price for the start date to allow virtual lot creation
    cur.execute(
        """
        INSERT INTO historical_prices (security_uuid, date, close)
        VALUES (?, ?, ?)
        """,
        (sec_uuid, 20250101, 10500000000),  # 105 EUR
    )
    # Add historical price for the new start date to test virtual lot creation
    cur.execute(
        """
        INSERT INTO historical_prices (security_uuid, date, close)
        VALUES (?, ?, ?)
        """,
        (sec_uuid, 20250102, 11000000000),  # 110 EUR
    )

    conn.commit()
    conn.close()

    # Start period after the buy, so it becomes a virtual lot
    start_date = datetime.date(2025, 1, 2)
    end_date = datetime.date(2025, 1, 3)

    engine = PerformanceEngine(sqlite3.connect(test_db))
    engine.load_data()
    results = engine.calculate_period_performance(start_date, end_date)

    # Expected Realized Gain = Gross Proceeds (120) - Virtual Cost Basis (110) = 10.0
    assert results.realized_gains == 10.0
