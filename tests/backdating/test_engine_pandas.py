import sqlite3
from datetime import date

import pandas as pd
import pytest

from custom_components.pp_reader.backdating.engine_pandas import (
    BackdatingEngine,
    TransactionType,
)


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    # Setup schema
    conn.executescript("""
        CREATE TABLE transactions (
            uuid TEXT PRIMARY KEY,
            type INTEGER,
            date TEXT,
            account TEXT,
            security TEXT,
            shares INTEGER,
            amount INTEGER,
            currency_code TEXT,
            fx_rate_to_base REAL
        );
        CREATE TABLE transaction_units (
            transaction_uuid TEXT,
            type INTEGER,
            amount INTEGER,
            currency_code TEXT
        );
        CREATE TABLE historical_prices (
            security_uuid TEXT,
            date INTEGER,
            close INTEGER
        );
        CREATE TABLE fx_rates (
            date TEXT,
            currency TEXT,
            rate INTEGER
        );
        CREATE TABLE daily_wealth (
            date TEXT PRIMARY KEY,
            total_wealth_eur REAL,
            invested_capital_eur REAL,
            dividends_eur REAL,
            interest_eur REAL,
            fees_eur REAL,
            taxes_eur REAL,
            performance_neutral_movements REAL,
            portfolio_wealth_eur REAL,
            account_wealth_eur REAL,
            inbound_transfers_eur REAL,
            outbound_transfers_eur REAL,
            fx_coverage_ratio REAL,
            price_coverage_ratio REAL,
            stale_price INTEGER,
            provenance TEXT
        );
    """)
    return conn


def test_engine_basic(conn):
    # Insert test data

    # 1. Invested Capital: Deposit 1000 EUR
    conn.execute(
        "INSERT INTO transactions (uuid, type, date, amount, currency_code) VALUES ('t1', ?, '2023-01-01', 100000, 'EUR')",
        (TransactionType.DEPOSIT,),
    )

    # 2. FX Rate: USD = 0.5 EUR ? No. Rate is usually > 1 for USD/EUR or similar?
    # Let's stick to 1.0 for simplicity or check math.
    # If I have 100 USD. Rate = 0.9. EUR Value = 100 / 0.9 = 111 EUR.
    # So Rate is USD/EUR (Foreign per Base).
    # If Rate is 0.5 (2 EUR per USD). 100 USD / 0.5 = 200 EUR.

    conn.execute(
        "INSERT INTO fx_rates (date, currency, rate) VALUES ('2023-01-01', 'USD', 50000000)"
    )  # 0.5
    conn.execute(
        "INSERT INTO fx_rates (date, currency, rate) VALUES ('2023-01-02', 'USD', 50000000)"
    )  # 0.5
    conn.execute(
        "INSERT INTO fx_rates (date, currency, rate) VALUES ('2023-01-03', 'USD', 50000000)"
    )  # 0.5

    engine = BackdatingEngine(conn)
    engine.run(date(2023, 1, 1), date(2023, 1, 3))

    daily_wealth = pd.read_sql("SELECT * FROM daily_wealth ORDER BY date", conn)
    assert len(daily_wealth) == 3

    # Day 1: Deposit 1000 EUR. Invested = 1000. Wealth (Cash) = 1000.
    # Why Wealth 1000? Deposit increases cash balance of account (if account specified).
    # The test insert above didn't specify account.
    # If account is NULL, my code filters it out from Cash Wealth.

    assert daily_wealth.iloc[0]["invested_capital_eur"] == 1000.0
    # Because account is null, Wealth should be 0 (Securities 0 + Cash 0).
    assert daily_wealth.iloc[0]["total_wealth_eur"] == 0.0


def test_engine_full_flow(conn):
    # 1. Deposit 1000 EUR to Acc1
    conn.execute(
        "INSERT INTO transactions (uuid, type, date, account, amount, currency_code) VALUES ('t1', ?, '2023-01-01', 'acc1', 100000, 'EUR')",
        (TransactionType.DEPOSIT,),
    )

    # 2. Buy 10 Shares of SEC1 for 100 EUR (10000 Cents)
    # Cash decreases by 100 EUR. Holdings increase by 10 shares.
    conn.execute(
        "INSERT INTO transactions (uuid, type, date, account, security, shares, amount, currency_code) VALUES ('t2', ?, '2023-01-02', 'acc1', 'sec1', 1000000000, 10000, 'EUR')",
        (TransactionType.BUY,),
    )

    # SEC1 Price on Jan 2: 12 EUR. (Value 120 EUR)
    # Price stored as 12 * 10^8
    conn.execute(
        "INSERT INTO historical_prices (security_uuid, date, close) VALUES ('sec1', ?, 1200000000)",
        (19359,),
    )  # 2023-01-02 is day 19359

    engine = BackdatingEngine(conn)
    engine.run(date(2023, 1, 1), date(2023, 1, 3))

    daily_wealth = pd.read_sql("SELECT * FROM daily_wealth ORDER BY date", conn)

    # Day 1: Cash 1000. Sec 0. Total 1000.
    assert daily_wealth.iloc[0]["date"] == "2023-01-01"
    assert daily_wealth.iloc[0]["total_wealth_eur"] == 1000.0
    assert daily_wealth.iloc[0]["invested_capital_eur"] == 1000.0

    # Day 2: Cash 900. Sec 10 * 12 = 120. Total 1020.
    assert daily_wealth.iloc[1]["date"] == "2023-01-02"
    assert daily_wealth.iloc[1]["total_wealth_eur"] == 1020.0

    # Day 3: Price same (ffill). Total 1020.
    assert daily_wealth.iloc[2]["total_wealth_eur"] == 1020.0


def test_engine_fx(conn):
    # Deposit 100 USD to Acc2. Rate 0.5 (1 USD = 2 EUR? No. Rate = Foreign/Base -> 0.5 USD / 1 EUR => 1 USD = 2 EUR).
    # Wait, previous logic: "Value = Bal / Rate".
    # If Rate=0.5. Value = 100 / 0.5 = 200 EUR.
    # So Rate is USD/EUR.

    conn.execute(
        "INSERT INTO fx_rates (date, currency, rate) VALUES ('2023-01-01', 'USD', 50000000)"
    )

    conn.execute(
        "INSERT INTO transactions (uuid, type, date, account, amount, currency_code) VALUES ('t1', ?, '2023-01-01', 'acc2', 10000, 'USD')",
        (TransactionType.DEPOSIT,),
    )

    engine = BackdatingEngine(conn)
    engine.run(date(2023, 1, 1), date(2023, 1, 1))

    daily_wealth = pd.read_sql("SELECT * FROM daily_wealth", conn)

    # Invested: 100 USD / 0.5 = 200 EUR.
    # Wealth: 100 USD balance / 0.5 = 200 EUR.
    assert daily_wealth.iloc[0]["invested_capital_eur"] == 200.0
    assert daily_wealth.iloc[0]["total_wealth_eur"] == 200.0


def test_engine_with_fees_and_taxes(conn):
    # 1. Dividend with Tax and Fee (Transaction Units)
    # Dividend of 100 EUR. Tax 10 EUR. Fee 5 EUR.
    # Transaction Amount is Net? Or Gross?
    # Usually Amount is the Cash Flow. If Net, then 85.
    # But units are separate.
    # Let's assume Transaction Amount = 85. Units: Tax=10, Fee=5.

    conn.execute(
        "INSERT INTO transactions (uuid, type, date, account, amount, currency_code) VALUES ('tx_div', ?, '2023-01-01', 'acc1', 8500, 'EUR')",
        (TransactionType.DIVIDEND,),
    )

    # Units: Type 1=Tax, 2=Fee
    conn.execute(
        "INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code) VALUES ('tx_div', 1, 1000, 'EUR')"
    )  # Tax 10
    conn.execute(
        "INSERT INTO transaction_units (transaction_uuid, type, amount, currency_code) VALUES ('tx_div', 2, 500, 'EUR')"
    )  # Fee 5

    engine = BackdatingEngine(conn)
    engine.run(date(2023, 1, 1), date(2023, 1, 1))

    daily_wealth = pd.read_sql("SELECT * FROM daily_wealth", conn)

    # Dividend Flow = Sum of Dividend Transactions (85).
    # Wait, spec says: "dividends_eur: Sum of DIVIDEND transactions."
    # Does it include the withheld tax?
    # Usually "Dividend" line in reports is Gross.
    # If Transaction Amount is Net, we need to add back Taxes?
    # Spec says "items to include: dividends_eur: Sum of DIVIDEND transactions."
    # "fees_eur: Sum of all fees... Embedded Fees: Sum of TransactionUnits (Type=2)".
    # "taxes_eur: Sum of all taxes... Embedded Taxes: Sum of TransactionUnits (Type=1)".

    # So `dividends_eur` comes from the Transaction row.
    # `fees_eur` and `taxes_eur` come from Units (and standalone).

    # My engine sums the transaction amount for DIVIDEND type.
    # And sums Units for FEES/TAXES.

    assert daily_wealth.iloc[0]["dividends_eur"] == 85.0
    assert daily_wealth.iloc[0]["taxes_eur"] == 10.0
    assert daily_wealth.iloc[0]["fees_eur"] == 5.0
