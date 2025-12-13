# ruff: noqa: T201
# ruff: noqa: T201

import datetime
import sqlite3
from collections import defaultdict

DB_PATH = "config/pp_reader_data/S-Depot.db"
# TARGET_START = datetime.date(2023, 10, 1)
# TARGET_END = datetime.date(2023, 10, 10)
# TARGET_START = datetime.date(2024, 12, 1)
# TARGET_END = datetime.date(2024, 12, 5)
TARGET_START = datetime.date(2025, 12, 12)
TARGET_END = datetime.date(2025, 12, 13)


def parse_date(d_str):
    if not d_str:
        return None
    return datetime.datetime.fromisoformat(d_str).date()


def cent_to_eur(val):
    return (val or 0) / 100.0


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Load Retired entities
    retired_portfolios = {
        r["uuid"]
        for r in conn.execute(
            "SELECT uuid FROM portfolios WHERE is_retired=1"
        ).fetchall()
    }
    retired_accounts = {
        r["uuid"]
        for r in conn.execute("SELECT uuid FROM accounts WHERE is_retired=1").fetchall()
    }
    retired_securities = {
        r["uuid"]
        for r in conn.execute("SELECT uuid FROM securities WHERE retired=1").fetchall()
    }

    # Load Transactions + Attached Fees/Taxes
    # We join transaction_units to get fees(13,14) and taxes(11,12) sums per transaction
    # Note: This is an approximation of what db_access.get_transactions does
    sql_txs = """
        SELECT t.date, t.type, t.security, t.shares, t.amount, t.currency_code, t.portfolio, t.account, t.uuid,
            (SELECT SUM(amount) FROM transaction_units u WHERE u.transaction_uuid = t.uuid AND u.type IN (13, 14)) as fees_cent,
            (SELECT SUM(amount) FROM transaction_units u WHERE u.transaction_uuid = t.uuid AND u.type IN (11, 12)) as taxes_cent
        FROM transactions t
        ORDER BY t.date
    """
    txs = conn.execute(sql_txs).fetchall()

    # Load FX rates
    fx_rows = conn.execute("SELECT date, currency, rate FROM fx_rates").fetchall()
    fx_rates = defaultdict(dict)
    for r in fx_rows:
        fx_rates[r["date"]][r["currency"].strip().upper()] = float(r["rate"])

    # Load Prices
    price_rows = conn.execute(
        "SELECT date, security_uuid, close FROM historical_prices"
    ).fetchall()
    prices = defaultdict(dict)
    epoch = datetime.date(1970, 1, 1)

    for r in price_rows:
        try:
            # Date can be ISO string or Integer (days since epoch)
            d_val = r["date"]
            if isinstance(d_val, int) or (isinstance(d_val, str) and d_val.isdigit()):
                d_obj = epoch + datetime.timedelta(days=int(d_val))
                d_iso = d_obj.isoformat()
            else:
                d_iso = d_val  # assume already ISO string

            # Price is likely scaled by 1e8 based on observation (12205000000 -> 122.05)
            # Safe checking?
            raw_p = float(r["close"])
            prices[d_iso][r["security_uuid"]] = raw_p / 100000000.0
        except Exception:
            pass

    # Load Daily Wealth
    dw_rows = conn.execute(
        """
        SELECT date, total_wealth_eur, invested_capital_eur, realized_gains_eur, unrealized_gains_eur,
               fees_eur, taxes_eur, dividends_eur, interest_eur,
               portfolio_wealth_eur, account_wealth_eur, performance_neutral_movements
        FROM daily_wealth
        WHERE date >= ? AND date <= ?
        ORDER BY date
    """,
        (TARGET_START.isoformat(), TARGET_END.isoformat()),
    ).fetchall()
    dw_map = {r["date"]: r for r in dw_rows}

    # Simulation State
    holdings = defaultdict(
        lambda: {"shares": 0.0, "cost_basis_eur": 0.0, "currency": "EUR"}
    )
    account_cash_eur = 0.0

    # Security Meta cache for currency (needed for FX of holdings)
    sec_rows = conn.execute("SELECT uuid, currency_code FROM securities").fetchall()
    sec_meta = {
        r["uuid"]: (r["currency_code"] or "EUR").strip().upper() for r in sec_rows
    }

    # Load Account Currencies for initial cash (simplified: assume all EUR or converted)
    # Actually, we need to track cash flows.
    # Logic in `accounts.py`: sum of all cash movements.

    # Replay
    current_date = parse_date(txs[0]["date"]) if txs else datetime.date.today()
    max_date = parse_date(dw_rows[-1]["date"]) if dw_rows else datetime.date.today()

    tx_idx = 0

    print(f"Verifying range: {TARGET_START} to {TARGET_END}")
    print(
        f"{'Date':<12} | {'Metric':<25} | {'DB Value':<15} | {'Calc Value':<15} | {'Diff':<10}"
    )
    print("-" * 85)

    # FX Helper with Lookback
    def get_fx_rate(curr, date_iso):
        if curr == "EUR":
            return 1.0
        # Try direct
        if date_iso in fx_rates and curr in fx_rates[date_iso]:
            return fx_rates[date_iso][curr]

        # Lookback
        dt = parse_date(date_iso)
        for i in range(1, 31):  # 30 days back
            prev = dt - datetime.timedelta(days=i)
            prev_iso = prev.isoformat()
            if prev_iso in fx_rates and curr in fx_rates[prev_iso]:
                return fx_rates[prev_iso][curr]
        return 1.0  # Fallback

    while current_date <= max_date:
        date_iso = current_date.isoformat()
        daily_fx = fx_rates.get(date_iso, {})  # Still useful for direct check if needed

        # Daily Accumulators
        daily_realized = 0.0
        bucket_dividends = 0.0
        bucket_interest = 0.0
        bucket_fees = 0.0
        bucket_taxes = 0.0
        bucket_neutral = 0.0

        # 1. Process Transactions
        while tx_idx < len(txs) and parse_date(txs[tx_idx]["date"]) == current_date:
            tx = txs[tx_idx]
            tx_idx += 1

            if tx["portfolio"] in retired_portfolios:
                continue
            # if tx['account'] in retired_accounts: continue # FIXED: Holdings update still happens even if account is retired
            if tx["security"] and tx["security"] in retired_securities:
                continue

            t_type = tx["type"]
            sec_id = tx["security"]
            amount_eur = 0.0

            # Resolve Transaction Value in EUR
            tx_curr = (tx["currency_code"] or "EUR").strip().upper()
            if tx["amount"]:
                fx = get_fx_rate(tx_curr, date_iso)
                if fx > 0:
                    amount_eur = cent_to_eur(tx["amount"]) / fx

            # Resolve Attached Fees/Taxes in EUR
            fees_eur = 0.0
            taxes_eur = 0.0
            if tx["fees_cent"]:
                fx = get_fx_rate(tx_curr, date_iso)
                if fx > 0:
                    fees_eur = cent_to_eur(tx["fees_cent"]) / fx
            if tx["taxes_cent"]:
                fx = get_fx_rate(tx_curr, date_iso)
                if fx > 0:
                    taxes_eur = cent_to_eur(tx["taxes_cent"]) / fx

            # Bucket Logic (Cashflows)
            # Explicit Types
            if t_type == 13:
                bucket_fees += abs(amount_eur)  # Fee
            elif t_type == 14:
                bucket_fees -= abs(amount_eur)  # Fee Refund
            elif t_type == 11:
                bucket_taxes += abs(amount_eur)  # Tax
            elif t_type == 12:
                bucket_taxes -= abs(amount_eur)  # Tax Refund
            elif t_type == 9:
                bucket_dividends += amount_eur  # Dividend
            elif t_type == 8:
                bucket_interest += amount_eur  # Interest
            elif t_type == 10:
                bucket_interest -= abs(amount_eur)  # Interest Charge

            # Neutral Movements (simplified check for verification)
            # Typically Transfer (4) if internal? Or specific types.
            # In `cashflows.py` N/A. Only in `aggregate.py` or separate calc.
            # Actually, `performance_neutral_movements` in DB is usually 0 unless specific logic.
            # Let's verify that assumption.

            # Add Attached Fees/Taxes (if not already counted by explicit types)
            classification_bucket = None
            if t_type in (13, 14):
                classification_bucket = "fees"
            if t_type in (11, 12):
                classification_bucket = "taxes"

            if classification_bucket != "fees":
                bucket_fees += abs(fees_eur)
            if classification_bucket != "taxes":
                bucket_taxes += abs(taxes_eur)

            # Holdings Logic
            if sec_id:
                shares = (tx["shares"] or 0) / 100000000.0
                if t_type in (1, 3):
                    shares *= -1  # Sign for Sell/Outbound

                # Update Holdings
                if t_type in (0, 2):  # Buy
                    holdings[sec_id]["shares"] += shares
                    holdings[sec_id]["cost_basis_eur"] += amount_eur
                    holdings[sec_id]["currency"] = sec_meta.get(sec_id, "EUR")
                elif t_type in (1, 3):  # Sell
                    curr_shares = holdings[sec_id]["shares"]
                    curr_cost = holdings[sec_id]["cost_basis_eur"]
                    abs_shares = abs(shares)

                    if curr_shares > 0:
                        avg_cost = curr_cost / curr_shares
                        cost_part = abs_shares * avg_cost

                        holdings[sec_id]["shares"] -= abs_shares
                        holdings[sec_id]["cost_basis_eur"] -= cost_part

                        daily_realized += amount_eur - cost_part
                    else:
                        holdings[sec_id]["shares"] -= abs_shares

            # Cash Balance Logic
            # Only track cash for ACTIVE accounts
            # if tx['account'] not in retired_accounts:
            if True:
                # Every transaction affects cash unless it's a pure delivery (2,3) without money?
                # Assuming `amount` is the money flow.
                # Inbound (Start/Deposit 6) -> +Cash
                # Outbound (Start/Withdrawal 7) -> -Cash
                # Buy (0) -> -Cash
                # Sell (1) -> +Cash
                # Dividends(9)/Interest(8) -> +Cash
                # Tax(11)/Fee(13) -> -Cash

                # Signed amount logic matching accounting.py usually
                # Simplified:
                sign = 0
                if t_type in (6, 9, 8, 1, 14, 12):
                    sign = 1  # Deposit, Div, Int, Sell, Refund
                elif t_type in (7, 0, 13, 11, 10):
                    sign = -1  # Withdrawal, Buy, Fee, Tax, IntCharge

                # Attached fees/taxes also reduce cash
                account_cash_eur += amount_eur * sign
                account_cash_eur -= abs(fees_eur)
                account_cash_eur -= abs(taxes_eur)

        # 2. Snapshot Calculation (End of Day)
        if TARGET_START <= current_date <= TARGET_END:
            total_invested = sum(h["cost_basis_eur"] for h in holdings.values())

            total_portfolio_value = 0.0
            for sec_id, h in holdings.items():
                if h["shares"] <= 1e-9:
                    continue
                # Find Price
                price = 0.0
                lookback = current_date
                for _ in range(10):
                    p = prices.get(lookback.isoformat(), {}).get(sec_id)
                    if p is not None:
                        price = p
                        break
                    lookback -= datetime.timedelta(days=1)

                # FX for Security Valuation
                s_curr = h["currency"]
                s_fx = get_fx_rate(s_curr, date_iso)

                # Value = shares * price (native) / fx
                if s_fx > 0:
                    val_eur = (h["shares"] * price) / s_fx
                    total_portfolio_value += val_eur

                # DEBUG
                if date_iso == "2025-12-12":
                    print(
                        f"DEBUG: Sec {sec_id} | Shares {h['shares']} | Price {price} | FX {s_fx} | Val {val_eur if s_fx > 0 else 0} | Currency {s_curr}"
                    )

            calc_unrealized = total_portfolio_value - total_invested
            calc_total_wealth = total_portfolio_value + account_cash_eur

            # Compare with DB
            db_rec = dw_map.get(date_iso)
            if db_rec:
                metrics = [
                    ("Total Wealth", db_rec["total_wealth_eur"], calc_total_wealth),
                    (
                        "Portfolio Wealth",
                        db_rec["portfolio_wealth_eur"],
                        total_portfolio_value,
                    ),
                    ("Account Wealth", db_rec["account_wealth_eur"], account_cash_eur),
                    (
                        "Invested Capital",
                        db_rec["invested_capital_eur"],
                        total_invested,
                    ),
                    ("Realized Gains", db_rec["realized_gains_eur"], daily_realized),
                    (
                        "Unrealized Gains",
                        db_rec["unrealized_gains_eur"],
                        calc_unrealized,
                    ),
                    ("Fees", db_rec["fees_eur"], bucket_fees),
                    ("Taxes", db_rec["taxes_eur"], bucket_taxes),
                    ("Dividends", db_rec["dividends_eur"], bucket_dividends),
                    ("Interest", db_rec["interest_eur"], bucket_interest),
                ]

                for label, db_val, calc_val in metrics:
                    # Ignore close-to-zero if both are close to zero
                    if abs(db_val) < 0.01 and abs(calc_val) < 0.01:
                        continue

                    diff = abs(db_val - calc_val)
                    warn = " <--- MISMATCH" if diff > 0.05 else ""
                    print(
                        f"{date_iso:<12} | {label:<25} | {db_val:<15.2f} | {calc_val:<15.2f} | {diff:<10.2f}{warn}"
                    )

        current_date += datetime.timedelta(days=1)

    # Final Holdings Verification
    print("\n--- Final Holdings Verification ---")
    db_holdings = conn.execute(
        "SELECT security_uuid, SUM(current_holdings) as shares_int FROM portfolio_securities GROUP BY security_uuid"
    ).fetchall()
    db_shares_map = {
        r["security_uuid"]: r["shares_int"] / 100000000.0 for r in db_holdings
    }

    all_secs = set(holdings.keys()) | set(db_shares_map.keys())
    for sec in all_secs:
        calc_s = holdings.get(sec, {}).get("shares", 0.0)
        db_s = db_shares_map.get(sec, 0.0)

        # Resolve filtered retired securities?
        if sec in retired_securities:
            # If DB has shares for a retired security, and we skipped it, we expect mismatch.
            # But earlier analysis says retired should be excluded.
            # If DB has > 0 shares, then it's effectively NOT retired?
            pass

        if abs(calc_s - db_s) > 0.0001:
            print(
                f"Mismatch Sec {sec}: Calc {calc_s:.4f} | DB {db_s:.4f} | Diff {calc_s - db_s:.4f}"
            )
            # Get name
            name_row = conn.execute(
                "SELECT name FROM securities WHERE uuid=?", (sec,)
            ).fetchone()
            name = name_row["name"] if name_row else "Unknown"
            print(f"   Name: {name}")

    conn.close()


if __name__ == "__main__":
    main()
