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
            security TEXT, shares INTEGER, amount INTEGER, currency_code TEXT, fx_rate_used REAL
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
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
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
            None,
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
    # The test's goal is to verify the invariant:
    # End Wealth = Start Wealth + Net Transfers + Performance Components
    # The engine now calculates all these components, so we get them from the metrics object.

    sum_components = (
        start_wealth
        + perf_metrics.net_transfers
        + perf_metrics.realized_gains
        + perf_metrics.unrealized_gains
        + perf_metrics.fx_gains_cash
        + perf_metrics.dividends
        + perf_metrics.interest
        - perf_metrics.fees  # Fees are a negative contribution
        - perf_metrics.taxes  # Taxes are a negative contribution
    )

    # Verify individual components calculated by the engine
    assert perf_metrics.dividends == pytest.approx(0.0)
    assert perf_metrics.fees == pytest.approx(10.0)
    assert perf_metrics.net_transfers == pytest.approx(100.0)
    assert perf_metrics.fx_gains_cash == pytest.approx(-45.0)

    # Verify start/end state
    assert start_wealth == pytest.approx(0.0)
    assert end_wealth == pytest.approx(45.0)

    # The Critical Assertion: Does the engine's breakdown sum correctly to the final wealth?
    assert sum_components == pytest.approx(end_wealth, abs=0.01), (
        f"Summation Mismatch! Sum of engine components: {sum_components}, End Wealth: {end_wealth}"
    )
