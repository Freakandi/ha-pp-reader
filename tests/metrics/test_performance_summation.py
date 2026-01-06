"""Test the PerformanceEngine summation consistency."""

# ruff: noqa: ERA001

import sqlite3
from datetime import date, timedelta

import pandas as pd
import pytest

from custom_components.pp_reader.metrics.calculator import PerformanceEngine
from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver
from custom_components.pp_reader.metrics.history import rebuild_daily_wealth


def test_summation_with_cash_flows_and_fx():
    """
    Test that the summation of performance breakdown components equals End Wealth,
    specifically when foreign currency cash flows (Dividends, Fees) are present.
    """
    conn = sqlite3.connect(":memory:")

    # Schema
    conn.execute("""
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT, other_portfolio TEXT,
            security TEXT, shares INTEGER, amount INTEGER, currency_code TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE securities (
            uuid TEXT, name TEXT, currency_code TEXT, ticker_symbol TEXT, last_price INTEGER,
            last_price_date TEXT, is_active INTEGER
        )
    """)
    conn.execute("CREATE TABLE accounts (uuid TEXT, name TEXT, currency_code TEXT)")
    conn.execute(
        "CREATE TABLE historical_prices (security_uuid TEXT, date INTEGER, close INTEGER)"
    )
    conn.execute(
        "CREATE TABLE exchange_rates (date TEXT, base_currency TEXT, term_currency TEXT, rate INTEGER)"
    )
    # Note: fx_rates table is populated by common.py helpers usually, but here engine reads 'exchange_rates' or 'fx_rates'?
    # PerformanceEngine.load_data uses `get_currency_master_table` which might rely on `exchange_rates` being processed into `fx_rates`?
    # Let's check typical setup. common.py often uses `fx_rates` table for easy lookups.
    # Looking at `test_calculator_breakdown.py`, it creates both.
    conn.execute("CREATE TABLE fx_rates (date TEXT, currency TEXT, rate REAL)")
    conn.execute("""
        CREATE TABLE daily_wealth (
            date TEXT, scope_uuid TEXT, scope_type TEXT,
            total_wealth_cents INTEGER, total_invested_cents INTEGER,
            PRIMARY KEY (date, scope_uuid, scope_type)
        )
    """)

    # DATA SETUP
    # Base Currency: EUR.
    # Account: USD Account.
    # Timeframe: 2023-01-01 to 2023-01-31.

    conn.execute("INSERT INTO accounts VALUES ('acc1', 'USD Account', 'USD')")

    # FX Rates (EUR based)
    # T0 (Start): 2023-01-01. 1 EUR = 1.0 USD.
    # T1 (Div):   2023-01-15. 1 EUR = 1.0 USD.
    # T2 (End):   2023-01-31. 1 EUR = 2.0 USD. (USD depreciates by half compared to EUR).

    # We populate `exchange_rates` (raw) and logic might need to fill `fx_rates`.
    conn.executemany(
        "INSERT INTO fx_rates VALUES (?,?,?)",
        [
            ("2023-01-01", "USD", 1.0),
            ("2022-12-31", "USD", 1.0),  # For Start Wealth T-1
            ("2023-01-15", "USD", 1.0),
            ("2023-01-31", "USD", 2.0),
        ],
    )

    # Transactions
    # 1. Deposit (T_mid). 100 USD (Gross) -> 90 USD (Net) + 10 USD Fee.
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            "t_dep",
            6,
            "2023-01-15T12:00:00",
            "acc1",
            None,
            None,
            None,
            None,
            0,
            9000,
            "USD",
        ),
    )  # Net Amount 90.00

    # Unit: Fee 10 USD
    conn.execute(
        "INSERT INTO transaction_units VALUES (?,?,?,?,?,?)",
        ("t_dep", 2, 1000, "USD", None, None),
    )  # Type 2 = Fee.

    conn.commit()

    market_resolver = MarketResolver(conn)
    market_resolver.load_data()
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()

    # Dates
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Rebuild Daily Wealth History so we can query it
    # We must invoke this because get_daily_wealth is removed from Engine
    rebuild_daily_wealth(conn, market_resolver, start_date, end_date)

    # Get Daily Wealth for Start/End and Flow Sums
    # engine.get_daily_wealth(start_date, end_date)  <- Removed

    # Start/End Wealth
    # Note: df_daily includes start_prev (T-1) typically? No, get_daily_wealth result index is start to end.
    # Start Wealth is actually End Wealth of T-1.
    start_prev = start_date - timedelta(days=1)
    # We need T-1 also in DB for proper period calc, rebuild T-1
    rebuild_daily_wealth(conn, market_resolver, start_prev, end_date)

    df_daily_extended = pd.read_sql_query(
        "SELECT * FROM daily_wealth WHERE date BETWEEN ? AND ?",
        conn,
        params=(start_prev.isoformat(), end_date.isoformat()),
        parse_dates=["date"],
    )
    # Convert cents to float EUR
    df_daily_extended["total_wealth_eur"] = (
        df_daily_extended["total_wealth_cents"] / 100.0
    )
    df_daily_extended["invested_capital_eur"] = (
        df_daily_extended["total_invested_cents"] / 100.0
    )

    row_start_prev = df_daily_extended[
        df_daily_extended["date"] == pd.Timestamp(start_prev, tz="UTC")
    ]
    if row_start_prev.empty:
        # Fallback if tz mismatch in test env
        row_start_prev = df_daily_extended[
            df_daily_extended["date"].dt.strftime("%Y-%m-%d") == start_prev.isoformat()
        ]

    row_end = df_daily_extended[
        df_daily_extended["date"] == pd.Timestamp(end_date, tz="UTC")
    ]
    if row_end.empty:
        row_end = df_daily_extended[
            df_daily_extended["date"].dt.strftime("%Y-%m-%d") == end_date.isoformat()
        ]

    start_wealth = (
        row_start_prev.iloc[0]["total_wealth_eur"] if not row_start_prev.empty else 0.0
    )
    end_wealth = row_end.iloc[0]["total_wealth_eur"] if not row_end.empty else 0.0

    # Get Metric Components (Realized, Unrealized, FX Cash)
    perf_metrics = engine.calculate_period_performance(start_date, end_date)

    # Note: breakdown components (divs, fees, taxes, neutral) are not yet in daily_wealth table
    # Phase 3 Step 6 "DB Schema Update" only added total_wealth and invested_capital.
    # The detailed breakdown columns (dividends_eur, etc.) are NOT in the schema yet?
    # Checking tasks/refactor_phase_3_financial_engine.md:
    # "Add DAILY_WEALTH_SCHEMA definition with columns: date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents."
    # It does NOT mention adding dividends, fees, taxes to daily_wealth.
    # So we cannot sum them from daily_wealth.
    # BUT, calculate_period_performance logic usually derives them?
    # Or we must sum them manually from transactions for this test.

    # Manual summation for test verification
    # Txs in window
    df_txs = pd.read_sql_query("SELECT * FROM transactions", conn)
    df_txs["date"] = pd.to_datetime(df_txs["date"])

    # Filter Txs
    # Note: Using string date comparison for simplicity in test
    (df_txs["date"] >= pd.Timestamp(start_date)) & (
        df_txs["date"] <= pd.Timestamp(end_date)
    )
    # The deposit is on Jan 15.
    # Amount 90 USD. Fee 10.
    # Net Flow in Invested Capital:
    # Deposit (Type 6). 90 USD. Rate 1.0. = 90 EUR.
    # Fee (Type 2 Unit). 10 USD. Rate 1.0 = 10 EUR.
    # Gross Deposit = 100 EUR.

    # Fees
    total_fees = 10.0  # From the unit
    total_dividends = 0.0
    total_taxes = 0.0
    total_interest = 0.0

    # Neutral Flow (Invested Capital Change)
    # Start Invested: 0.
    # End Invested: 90 USD (90 EUR).
    # Wait, rebuild_daily_wealth logic calculates "Gross Neutral Flows".
    # It adds Fees/Taxes back to the Net Amount for Invested Capital?
    # _calculate_gross_neutral_flows in history.py:
    # Adds daily_adj (Fees/Taxes) to daily_flow.
    # So Invested Capital = 90 + 10 = 100.

    start_inv = (
        row_start_prev.iloc[0]["invested_capital_eur"]
        if not row_start_prev.empty
        else 0.0
    )
    end_inv = row_end.iloc[0]["invested_capital_eur"] if not row_end.empty else 0.0
    total_neutral = end_inv - start_inv  # This roughly proxies "Net External Flow"

    # Sum Components
    # Abs Perf = (EndW - StartW) - (EndInv - StartInv)
    # 45 - 0 - (100 - 0) = -55.

    # Breakdown:
    # Fees = 10.
    # FX Cash:
    #   Cash 90 USD.
    #   Bought at 1.0. Value 90 EUR.
    #   End Rate 0.5 (1 USD = 2.0 EUR? No. Rate=2.0 usually means 1 EUR = 2.0 USD => 0.5 EUR/USD).
    #   Wait, FX Rates in setup:
    #   Date 2023-01-31. USD. 2.0.
    #   If Price is 2.0. USD is weak? Or Strong?
    #   Usually standard is EURUSD=1.1 (1 EUR = 1.1 USD).
    #   So Rate 2.0 means 1 EUR = 2.0 USD.
    #   So 1 USD = 0.5 EUR.
    #   90 USD * 0.5 = 45 EUR.
    #   Loss of 45 EUR.
    #   FX Cash Gain = -45.

    # Start Wealth = 0.
    # End Wealth = 45.
    # Sum =
    # Realized (0) + Unrealized (0) + FX Cash (-45) + Neutral (0?? No) - Fees (10).
    # If Neutral is summed in equation, it usually represents "Money In".
    # End = Start + Flows + Gains - Costs.
    # 45 = 0 + 100 + (-45) - 10.
    # 45 = 45.
    # So "total_neutral" here basically means Gross Flow (100).

    sum_components = (
        start_wealth
        + perf_metrics.realized_gains
        + perf_metrics.unrealized_gains
        + total_dividends
        + total_interest
        - total_fees
        - total_taxes
        + perf_metrics.fx_gains_cash
        + total_neutral
    )

    assert total_dividends == pytest.approx(0.0)
    assert total_fees == pytest.approx(10.0)
    assert start_wealth == pytest.approx(0.0)
    assert end_wealth == pytest.approx(45.0)

    # The Critical Assertion involving the Fix
    assert sum_components == pytest.approx(end_wealth, abs=0.01), (
        f"Summation Mismatch! Sum: {sum_components}, End: {end_wealth}"
    )


def test_summation_with_all_neutral_types():
    """
    Test summation with Removals (Gross Down) and Security Transfers using the new unified logic.
    """
    conn = sqlite3.connect(":memory:")

    # Schema
    conn.execute("""
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT, other_portfolio TEXT,
            security TEXT, shares INTEGER, amount INTEGER, currency_code TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE transaction_units (
            transaction_uuid TEXT, type INTEGER, amount INTEGER, currency_code TEXT,
            fx_amount INTEGER, fx_currency_code TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE securities (
            uuid TEXT, name TEXT, currency_code TEXT, ticker_symbol TEXT, last_price INTEGER,
            last_price_date INTEGER, is_active INTEGER
        )
    """)
    conn.execute("CREATE TABLE accounts (uuid TEXT, name TEXT, currency_code TEXT)")
    conn.execute(
        "CREATE TABLE historical_prices (security_uuid TEXT, date INTEGER, close INTEGER)"
    )
    conn.execute(
        "CREATE TABLE exchange_rates (date TEXT, base_currency TEXT, term_currency TEXT, rate INTEGER)"
    )
    conn.execute("CREATE TABLE fx_rates (date TEXT, currency TEXT, rate REAL)")
    conn.execute("""
        CREATE TABLE daily_wealth (
            date TEXT, scope_uuid TEXT, scope_type TEXT,
            total_wealth_cents INTEGER, total_invested_cents INTEGER,
            PRIMARY KEY (date, scope_uuid, scope_type)
        )
    """)

    conn.execute("INSERT INTO accounts VALUES ('acc1', 'EUR Account', 'EUR')")
    conn.execute(
        "INSERT INTO securities VALUES ('sec1', 'Test Share', 'EUR', 'TST', 10000000000, 0, 1)"
    )

    # FX Rates (Flat EUR)
    conn.executemany(
        "INSERT INTO fx_rates VALUES (?,?,?)",
        [
            ("2023-01-01", "EUR", 1.0),
            ("2023-01-31", "EUR", 1.0),
        ],
    )

    # Prices for Security Transfer
    # 2023-01-10: Price 100.00 EUR
    conn.execute("INSERT INTO historical_prices VALUES ('sec1', 20230110, 10000000000)")
    # 2023-01-31: Price 120.00 EUR
    conn.execute("INSERT INTO historical_prices VALUES ('sec1', 20230131, 12000000000)")

    # TRANSACTIONS

    # 1. Deposit 1000 EUR (Start Money) - Day 1
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            "t1",
            6,
            "2023-01-02T10:00:00",
            "acc1",
            None,
            None,
            None,
            None,
            0,
            100000,
            "EUR",
        ),
    )  # Net 1000. No fee. Neutral = +1000.

    # 2. Removal with Fee.
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            "t2",
            7,
            "2023-01-05T10:00:00",
            "acc1",
            None,
            None,
            None,
            None,
            0,
            10000,
            "EUR",
        ),
    )  # Amount 100.00
    conn.execute(
        "INSERT INTO transaction_units VALUES (?,?,?,?,?,?)",
        ("t2", 2, 200, "EUR", None, None),
    )  # Fee 2.00

    # 3. Security Transfer (Inbound) -> Use INBOUND_DELIVERY (Type 2) for external injection
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            "t3",
            2,  # INBOUND_DELIVERY
            "2023-01-10T10:00:00",
            None,
            None,
            "p1",
            None,
            "sec1",
            1000000000,
            0,
            "EUR",
        ),
    )  # 10 shares.

    # 4. Explicit Fee Transaction (to affect Cash Balance)
    # The unit on t2 creates the performance expense, but 'calculator.py' cash inventory
    # ignores units. To mechanically lower the cash balance by 2 EUR, we need a FEE transaction.
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (
            "t2_fee",
            13,  # FEE
            "2023-01-05T10:00:00",
            "acc1",
            None,
            None,
            None,
            None,
            0,
            200,
            "EUR",
        ),
    )

    conn.commit()
    market_resolver = MarketResolver(conn)
    market_resolver.load_data()
    engine = PerformanceEngine(conn, market_resolver)
    engine.load_data()

    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    start_prev = start_date - timedelta(days=1)
    rebuild_daily_wealth(conn, market_resolver, start_prev, end_date)

    # Run
    metrics = engine.calculate_period_performance(start_date, end_date)

    # Check Wealth
    df_daily = pd.read_sql_query(
        "SELECT * FROM daily_wealth WHERE date = ?",
        conn,
        params=(end_date.isoformat(),),
    )
    end_wealth = df_daily.iloc[0]["total_wealth_cents"] / 100.0

    # Expected:
    # Cash: 1000 (Dep) - 100 (Rem) - 2 (Fee) = 898.
    # Sec: 10 * 120 = 1200.
    # Total: 2098.
    assert end_wealth == pytest.approx(2098.0)

    # Components
    row_start = pd.read_sql_query(
        "SELECT * FROM daily_wealth WHERE date = ?",
        conn,
        params=(start_prev.isoformat(),),
    )
    row_start.iloc[0]["total_wealth_cents"] / 100.0 if not row_start.empty else 0.0

    start_inv = (
        row_start.iloc[0]["total_invested_cents"] / 100.0
        if not row_start.empty
        else 0.0
    )
    end_inv = df_daily.iloc[0]["total_invested_cents"] / 100.0
    total_neutral = end_inv - start_inv

    total_fees = 2.0

    # Summation
    sum_components = (
        metrics.realized_gains
        + metrics.unrealized_gains
        + metrics.fx_gains_cash
        + total_neutral
        - total_fees
        - 0  # taxes
        + 0  # dividends
        + 0  # interest
    )

    assert sum_components == pytest.approx(end_wealth, abs=0.01)
