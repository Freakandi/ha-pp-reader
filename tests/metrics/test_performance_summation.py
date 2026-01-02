"""Test the PerformanceEngine summation consistency."""
# ruff: noqa: ERA001

import sqlite3
from datetime import date, timedelta

import pytest

from custom_components.pp_reader.metrics.calculator import PerformanceEngine


def test_summation_with_cash_flows_and_fx():
    """
    Test that the summation of performance breakdown components equals End Wealth,
    specifically when foreign currency cash flows (Dividends, Fees) are present.
    """
    conn = sqlite3.connect(":memory:")

    # Schema
    conn.execute("""
        CREATE TABLE transactions (
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT,
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
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("t_dep", 6, "2023-01-15T12:00:00", "acc1", None, None, None, 0, 9000, "USD"),
    )  # Net Amount 90.00

    # Unit: Fee 10 USD
    conn.execute(
        "INSERT INTO transaction_units VALUES (?,?,?,?,?,?)",
        ("t_dep", 2, 1000, "USD", None, None),
    )  # Type 2 = Fee.

    conn.commit()

    engine = PerformanceEngine(conn)
    engine.load_data()

    # Dates
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Get Daily Wealth for Start/End and Flow Sums
    engine.get_daily_wealth(start_date, end_date)

    # Start/End Wealth
    # Note: df_daily includes start_prev (T-1) typically? No, get_daily_wealth result index is start to end.
    # Start Wealth is actually End Wealth of T-1.

    start_prev = start_date - timedelta(days=1)
    df_daily_extended = engine.get_daily_wealth(start_prev, end_date)

    row_start_prev = df_daily_extended[
        df_daily_extended["date"] == start_prev.isoformat()
    ]
    row_end = df_daily_extended[df_daily_extended["date"] == end_date.isoformat()]

    start_wealth = (
        row_start_prev.iloc[0]["total_wealth_eur"] if not row_start_prev.empty else 0.0
    )
    end_wealth = row_end.iloc[0]["total_wealth_eur"] if not row_end.empty else 0.0

    # Get Metric Components (Realized, Unrealized, FX Cash)
    perf_metrics = engine.calculate_period_performance(start_date, end_date)

    # Get Breakdown Lists (Dividends, Fees, Taxes - usually summed from lists or daily wealth)

    # Filter for [start, end]
    mask_window = (df_daily_extended["date"] >= start_date.isoformat()) & (
        df_daily_extended["date"] <= end_date.isoformat()
    )
    df_window = df_daily_extended[mask_window]

    total_dividends = df_window["dividends_eur"].sum()
    total_interest = df_window["interest_eur"].sum()
    total_fees = df_window["fees_eur"].sum()
    total_taxes = df_window["taxes_eur"].sum()
    total_neutral = df_window["performance_neutral_movements"].sum()

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
            uuid TEXT, type INTEGER, date TEXT, account TEXT, other_account TEXT, portfolio TEXT,
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
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("t1", 6, "2023-01-02T10:00:00", "acc1", None, None, None, 0, 100000, "EUR"),
    )  # Net 1000. No fee. Neutral = +1000.

    # 2. Removal with Fee.
    # User removes 100 Net (receives 90 externally?). Or removes 100 Net from account (110 total debit?).
    # Let's say: User wants to withdraw 100 EUR from ATM.
    # Account Debited: 100 EUR. Fee: 2 EUR charged separately?
    # Usually: 'amount' is what hits the account balance.
    # If I see -100 in account. And -2 Fee in account.
    # These are two txs? Or one tx with Unit?
    # Logic relies on Unit attached to Neutral Tx.
    # So: Removal Tx Amount = -100. Unit Fee = 2.
    # Neutral Flow = -100 + 2 = -98.
    # This implies 98 left the building. 2 was burnt.
    # Start: 1000.
    # Flow: -98.
    # Fee is 2.
    # End calculation: 1000 - 100(Debit) = 900.
    # Wait. Fee is usually separate line item in calculation?
    # End equals Start + Flow - Fee + Perf.
    # 900 = 1000 + (-98) - 2 + 0.
    # 900 = 1000 - 98 - 2 = 900. Matches.

    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("t2", 7, "2023-01-05T10:00:00", "acc1", None, None, None, 0, 10000, "EUR"),
    )  # Amount 100.00 (Positive magnitude, Sign -1 applied by type)
    conn.execute(
        "INSERT INTO transaction_units VALUES (?,?,?,?,?,?)",
        ("t2", 2, 200, "EUR", None, None),
    )  # Fee 2.00

    # 3. Security Transfer (Inbound)
    # Transfer In 10 Shares of sec1 at 2023-01-10.
    # Price 100. Value 1000.
    # Shares field needs to be normalized (x 100,000,000?)
    # shares_norm = shares / 10^8.
    # So 10 shares becomes 10 * 10^8.
    conn.execute(
        "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?)",
        (
            "t3",
            4,
            "2023-01-10T10:00:00",
            None,
            None,
            "p1",
            "sec1",
            1000000000,
            0,
            "EUR",
        ),
    )  # 10 shares.

    # At 2023-01-31:
    # Cash becomes 1000 - 100 = 900.
    # Shares becomes 10 shares * 120 = 1200.
    # Total End Wealth should be 2100.

    # Breakdown:
    # Start is 0.
    # Neutral Flows:
    #  +1000 (Deposit)
    #  -98 (Removal Gross)
    #  +1000 (Transfer In Value at time of transfer)
    #  Total Neutral is 1902.

    # Fees:
    #  2.00

    # Performance (Capital Gains):
    #  Shares: Cost Basis 1000 (Transfer In Value). Value 1200.
    #  Unrealized Gain is 200.

    # Summation Check:
    # 0 + 1902 - 2 + 200 = 2100.
    # Matches End Wealth (2100).

    conn.commit()
    engine = PerformanceEngine(conn)
    engine.load_data()

    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    # Run
    metrics = engine.calculate_period_performance(start_date, end_date)
    daily = engine.get_daily_wealth(start_date, end_date)

    # Verify End Wealth
    row_end = daily.iloc[-1]
    end_wealth = row_end["total_wealth_eur"]
    assert end_wealth == pytest.approx(2100.0)

    # Verify Components
    total_neutral = daily["performance_neutral_movements"].sum()
    total_fees = daily["fees_eur"].sum()
    # Unrealized Gain should be 200 (1200 end val - 1000 cost basis from transfer)

    # Note: _setup_virtual_inventory + calculate_capital_gains uses FIFO.
    # It must pick up the Security Transfer as an INFLOW into inventory.
    # We need to ensure _calculate_capital_gains handles Type 4?
    # It usually iterates transactions. If Type 4 is "Inbound", it adds to inventory.
    # If not, it won't be in inventory, and Unrealized Gain might be 0?
    # If not in inventory, but in Holdings, it counts as "Phantom" -> Unrealized?
    # Logic in _calculate_capital_gains needs checking if Type 4 adds to inventory.

    assert total_fees == pytest.approx(2.0)
    assert total_neutral == pytest.approx(1902.0)

    # Summation
    sum_components = (
        metrics.realized_gains
        + metrics.unrealized_gains
        + metrics.fx_gains_cash
        + total_neutral
        - total_fees
        - daily["taxes_eur"].sum()  # 0
        + daily["dividends_eur"].sum()  # 0
        + daily["interest_eur"].sum()  # 0
    )

    assert sum_components == pytest.approx(end_wealth, abs=0.01)
