# ruff: noqa: T201

import sqlite3
from datetime import date
from pathlib import Path

# Configure
DB_PATH = Path("config/pp_reader_data/S-Depot.db")
OUTPUT_FILE = Path(".docs/unrealized_breakdown.md")
START_DATE = date(2025, 11, 23)
END_DATE = date(2025, 12, 22)


def to_iso(d: date) -> str:
    return d.isoformat()


def get_price_and_fx(
    conn: sqlite3.Connection, sec_uuid: str, currency: str, at_date_iso: str
) -> tuple[float, float]:
    # Price
    # Convert ISO to epoch days for price table
    d = date.fromisoformat(at_date_iso)
    epoch = (d - date(1970, 1, 1)).days

    p_row = conn.execute(
        """
        SELECT close FROM historical_prices
        WHERE security_uuid = ? AND date <= ?
        ORDER BY date DESC LIMIT 1
    """,
        (sec_uuid, epoch),
    ).fetchone()

    price = (p_row[0] / 1e8) if p_row else 0.0

    # FX
    fx = 1.0
    if currency != "EUR":
        fx_row = conn.execute(
            """
            SELECT rate FROM fx_rates
            WHERE currency = ? AND date <= ?
            ORDER BY date DESC LIMIT 1
        """,
            (currency, at_date_iso),
        ).fetchone()
        if fx_row:
            fx = float(fx_row[0])

    return price, fx


def main() -> None:
    if not DB_PATH.exists():
        print(f"Error: {DB_PATH} not found")
        return

    conn = sqlite3.connect(DB_PATH)
    start_iso = to_iso(START_DATE)
    end_iso = to_iso(END_DATE)

    # 1. Get all Securities involved (Holdings at start OR Traded in period)
    # Holdings at start (Excl dividends type 8/11)
    holdings_rows = conn.execute(
        """
        SELECT security,
               SUM(CASE WHEN type IN (0, 2) THEN shares
                        WHEN type IN (1, 3) THEN -shares
                        ELSE 0 END)
        FROM transactions
        WHERE date < ? AND security IS NOT NULL
        GROUP BY security
    """,
        (start_iso,),
    ).fetchall()

    holdings = {r[0]: (r[1] or 0) / 1e8 for r in holdings_rows if r[1] != 0}

    # Transactions in period to find other securities
    tx_rows = conn.execute(
        """
        SELECT security FROM transactions
        WHERE date >= ? AND date <= ? AND security IS NOT NULL
    """,
        (start_iso, end_iso),
    ).fetchall()

    involved_uuids = set(holdings.keys()) | {r[0] for r in tx_rows}

    # Pre-fetch security info
    sec_info = {}
    placeholders = ",".join(["?"] * len(involved_uuids))
    # Safe usage (S608 ignored manually)
    query = f"SELECT uuid, name, currency_code FROM securities WHERE uuid IN ({placeholders})"  # noqa: S608, E501
    sec_rows = conn.execute(query, list(involved_uuids)).fetchall()
    for r in sec_rows:
        sec_info[r[0]] = {"name": r[1], "curr": (r[2] or "EUR").strip().upper()}

    report_rows = []

    for uuid in involved_uuids:
        info = sec_info.get(uuid, {"name": "Unknown", "curr": "EUR"})
        name = info["name"]
        curr = info["curr"]

        # Shares Start
        shares_start = holdings.get(uuid, 0.0)

        # Prices Start
        p_start, fx_start = get_price_and_fx(conn, uuid, curr, start_iso)
        val_start = (shares_start * p_start) / fx_start

        # Shares End = Shares Start + Net Change in Period
        # Net Change: Only Buy/Sell affects count. Divs don't.
        change_rows = conn.execute(
            """
            SELECT type, shares
            FROM transactions
            WHERE security = ? AND date >= ? AND date <= ?
        """,
            (uuid, start_iso, end_iso),
        ).fetchall()

        shares_change = 0.0
        for r in change_rows:
            t_type = r[0]
            s = (r[1] or 0) / 1e8
            if t_type in (0, 2):
                shares_change += s
            elif t_type in (1, 3):
                shares_change -= s

        # Price End
        p_end, fx_end = get_price_and_fx(conn, uuid, curr, end_iso)

        # Unrealized Gain Logic:
        # We need "Mark-to-Market" gain.
        # Simplest approximation: (Val_End_Held - Cost_Basis_Held_Adjusted)
        # BUT "Mark-to-Market" over a period for the dashboard context typically means:
        # Increase in value of assets held.
        # For positions held start->end: Delta = Shares * (PriceEnd - PriceStart)
        # For positions bought: Delta = Shares * (PriceEnd - BuyPrice)
        # For positions sold: No Unrealized at end (it's realized).

        # Let's perform the strict calculation used in the loop:
        # 1. Start Inventory assigned CostBasis = PriceStart
        # 2. Buys assigned CostBasis = BuyPrice
        # 3. Sells consume Inventory
        # 4. Result = (ExistingShares * PriceEnd) - Sum(ExistingCostBasis)

        # Fetch detailed txs for accurate cost basis of new buys
        txs = conn.execute(
            """
            SELECT type, shares, amount, date, uuid FROM transactions
            WHERE security = ? AND date >= ? AND date <= ? ORDER BY date
        """,
            (uuid, start_iso, end_iso),
        ).fetchall()

        # Inventory buckets: [shares, cost_basis_unit_eur]
        inventory = []

        # Init Start Inventory
        if shares_start > 0:
            inventory.append({"shares": shares_start, "basis": (p_start / fx_start)})

        for t in txs:
            t_type = t[0]
            t_shares = (t[1] or 0) / 1e8
            t_date = t[3][:10]

            p_tx, fx_tx = get_price_and_fx(conn, uuid, curr, t_date)

            if t_type in (0, 2):  # Buy
                # Cost Basis = Price_At_Buy / FX_At_Buy
                cost_basis_unit = p_tx / fx_tx
                inventory.append({"shares": t_shares, "basis": cost_basis_unit})

            elif t_type in (1, 3):  # Sell
                to_sell = t_shares
                # FIFO
                new_inv = []
                for lot in inventory:
                    if to_sell <= 0:
                        new_inv.append(lot)
                        continue

                    if lot["shares"] > to_sell:
                        lot["shares"] -= to_sell
                        new_inv.append(lot)
                        to_sell = 0
                    else:
                        to_sell -= lot["shares"]
                        # Lot consumed
                inventory = new_inv

        # Calculate End Value and Basis
        final_shares = sum(i["shares"] for i in inventory)
        total_basis = sum(i["shares"] * i["basis"] for i in inventory)

        # Current Market Value
        market_val_eur = final_shares * (p_end / fx_end)

        unrealized_gain = market_val_eur - total_basis

        report_rows.append(
            {
                "name": name,
                "shares_start": shares_start,
                "p_start": p_start,
                "fx_start": fx_start,
                "val_start": val_start,
                "shares_end": final_shares,
                "p_end": p_end,
                "fx_end": fx_end,
                "val_end": market_val_eur,
                "gain": unrealized_gain,
                "curr": curr,
            }
        )

    conn.close()

    # Sort
    report_rows.sort(key=lambda x: x["gain"], reverse=True)

    # Write
    with Path(OUTPUT_FILE).open("w", encoding="utf-8") as f:
        f.write("# Breakdown of Unrealized Gains (2025-11-23 to 2025-12-22)\n\n")
        f.write(
            "| Security | Gain (€) | Shares Start | Start P (Nat) | FX Start | "
            "Start Val (€) | Shares End | End P (Nat) | FX End | End Val (€) |\n"
        )
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")

        total = 0.0
        for r in report_rows:
            total += r["gain"]
            line = (
                f"| {r['name'][:30]} | **{r['gain']:,.2f}** | {r['shares_start']:,.2f} "
                f"| {r['p_start']:,.2f} {r['curr']} | {r['fx_start']:.4f} | "
                f"{r['val_start']:,.2f} | {r['shares_end']:,.2f} | {r['p_end']:,.2f} "
                f"{r['curr']} | {r['fx_end']:.4f} | {r['val_end']:,.2f} |"
            )
            f.write(line + "\n")

        f.write(f"\n**TOTAL UNREALIZED GAIN: {total:,.2f} €**\n")

    print(f"Report generated at {OUTPUT_FILE}")
    print(f"Total: {total:,.2f} EUR")


if __name__ == "__main__":
    main()
