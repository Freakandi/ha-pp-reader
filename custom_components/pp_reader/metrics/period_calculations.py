"""Module for calculating period-specific realized gains."""


import logging
import sqlite3
from collections import defaultdict
from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

_LOGGER = logging.getLogger(__name__)


def _get_fx_rate(cur: sqlite3.Cursor, currency: str, date_iso: str) -> float:
    """Get FX rate (EUR->Currency) effective for the given date (latching back)."""
    if currency == "EUR":
        return 1.0

    row = cur.execute(
        """
        SELECT rate FROM fx_rates
        WHERE currency = ? AND date <= ?
        ORDER BY date DESC LIMIT 1
        """,
        (currency, date_iso),
    ).fetchone()

    if row:
        return float(row["rate"])
    return 1.0


def calculate_period_realized_gains(  # noqa: PLR0912, PLR0915
    db_path: "Path",
    start_date: date,
    end_date: date,
) -> dict[str, float]:
    """
    Calculate realized gains for a specific period, respecting the period start value.

    Logic:
    - For Sells of securities held BEFORE start_date:
      Gain = Gross Proceeds(EUR) - Value at Start Date(EUR)
    - For Sells of securities bought AFTER start_date:
      Gain = Gross Proceeds(EUR) - Gross Cost Basis(EUR)

    Returns a dictionary mapping 'YYYY-MM-DD' -> total_realized_gain_eur
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    results: dict[str, float] = defaultdict(float)

    try:
        cur = conn.cursor()

        start_iso = start_date.isoformat()
        end_iso = end_date.isoformat()

        # 1. Fetch all Sells in the period
        query_sells = """
            SELECT t.uuid, t.date, t.security, t.shares, t.amount, t.currency_code
            FROM transactions t
            WHERE t.type = 1 -- Sell
              AND t.date >= ? AND t.date <= ?
        """
        # Note: We read t.currency_code directly.
        # We don't need join securities s unless we want s.currency_code as fallback?
        # Usually transaction currency is authoritative for 'amount'.

        sells = cur.execute(query_sells, (start_iso, end_iso)).fetchall()
        if not sells:
            return {}

        # 2. Pre-fetch historical prices for relevant securities at start_date
        # Needed for positions held before start.
        security_uuids = {s["security"] for s in sells}
        start_prices = {}  # uuid -> price_native (scaled)

        # Start Epoch
        start_epoch = (start_date - date(1970, 1, 1)).days  # type: ignore[attr-defined]

        for sec_uuid in security_uuids:
            p_row = cur.execute(
                """
                SELECT close FROM historical_prices
                WHERE security_uuid = ? AND date <= ?
                ORDER BY date DESC LIMIT 1
            """,
                (sec_uuid, start_epoch),
            ).fetchone()

            if p_row:
                start_prices[sec_uuid] = (
                    p_row["close"] / 100000000.0
                )  # Scale down
            else:
                start_prices[sec_uuid] = 0.0

        # 3. Cache start FX rates for "Before Period" valuation
        # We need the currency of the SECURITY (Native) for Start Price conversion.
        # Transaction currency might differ from Security Native Currency?
        # Usually Security Native Currency is what historical_prices are in.
        # So we need security currency code.

        sec_currencies = {}
        rows = cur.execute("SELECT uuid, currency_code FROM securities").fetchall()
        for r in rows:
            sec_currencies[r["uuid"]] = r["currency_code"]

        start_rates = {} # currency -> rate at start_date

        # 4. Iterate Sells
        for sell in sells:
            uuid = sell["uuid"]
            sec_uuid = sell["security"]
            sell_date_iso = sell["date"][:10]  # YYYY-MM-DD
            sell_dt_str = sell["date"]
            sell_curr = sell["currency_code"] or "EUR"

            # A. Calculate Gross Proceeds in EUR
            units = cur.execute(
                """
                SELECT type, amount FROM transaction_units
                WHERE transaction_uuid = ?
            """,
                (uuid,),
            ).fetchall()

            fees_cents = sum(u["amount"] for u in units if u["type"] in (2, 13))
            taxes_cents = sum(u["amount"] for u in units if u["type"] in (1, 11))

            gross_proceeds_native = (
                sell["amount"] + fees_cents + taxes_cents
            ) / 100.0

            # Convert to EUR
            sell_rate = _get_fx_rate(cur, sell_curr, sell_date_iso)
            # rate is EUR->Curr. EUR = Native / Rate.
            gross_proceeds_eur = gross_proceeds_native / sell_rate

            # B. Find Cost Basis (FIFO)
            buys = cur.execute(
                """
                SELECT date, amount, shares, currency_code FROM transactions
                WHERE security = ? AND type IN (0, 2) AND date < ?
                ORDER BY date ASC
            """,
                (sec_uuid, sell_dt_str),
            ).fetchall()

            shares_to_sell = sell["shares"]  # 10^8 factor embedded
            cost_basis_accum_eur = 0.0

            sec_native_curr = sec_currencies.get(sec_uuid, "EUR")

            for buy in buys:
                if shares_to_sell <= 0:
                    break

                buy_shares = buy["shares"]
                shares_from_lot = min(shares_to_sell, buy_shares)
                shares_ratio = shares_from_lot / buy_shares if buy_shares else 0

                # Check if Buy is inside Period
                buy_date_iso = buy["date"][:10]

                if buy_date_iso >= start_iso:
                    # Bought INSIDE Period -> Use Actual Gross Cost (EUR)
                    buy_curr = buy["currency_code"] or "EUR"
                    buy_amount_native = buy["amount"] / 100.0

                    buy_rate = _get_fx_rate(cur, buy_curr, buy_date_iso)
                    buy_amount_eur = buy_amount_native / buy_rate

                    # Prorate by shares
                    lot_cost_eur = buy_amount_eur * shares_ratio
                    cost_basis_accum_eur += lot_cost_eur
                else:
                    # Bought BEFORE Period -> Use Start Price (Mark to Market at Start)
                    # Use Security Native Currency for Start Price lookup
                    start_price_native = start_prices.get(sec_uuid, 0.0)

                    # Get rate at Start Date
                    if sec_native_curr not in start_rates:
                         start_rates[sec_native_curr] = _get_fx_rate(
                             cur, sec_native_curr, start_iso
                         )

                    start_rate = start_rates[sec_native_curr]
                    start_price_eur = start_price_native / start_rate

                    # Calculate Value
                    shares_float = shares_from_lot / 100000000.0
                    val_eur = start_price_eur * shares_float
                    cost_basis_accum_eur += val_eur

                shares_to_sell -= shares_from_lot

            # Period Gain
            gain = gross_proceeds_eur - cost_basis_accum_eur

            # Add to day bucket
            results[sell_date_iso] += gain

    except Exception:
        _LOGGER.exception("Error calculating period gains")
    finally:
        conn.close()

    return dict(results)
