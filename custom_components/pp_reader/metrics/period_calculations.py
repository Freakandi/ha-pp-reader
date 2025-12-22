
import logging
import sqlite3
from collections import defaultdict
from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

_LOGGER = logging.getLogger(__name__)


def calculate_period_realized_gains(  # noqa: PLR0912, PLR0915
    db_path: "Path",
    start_date: date,
    end_date: date,
) -> dict[str, float]:
    """
    Calculate realized gains for a specific period, respecting the period start value.

    Logic:
    - For Sells of securities held BEFORE start_date:
      Gain = Gross Proceeds - Value at Start Date
    - For Sells of securities bought AFTER start_date:
      Gain = Gross Proceeds - Gross Cost Basis

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
            SELECT t.uuid, t.date, t.security, t.shares, t.amount, s.currency_code
            FROM transactions t
            JOIN securities s ON t.security = s.uuid
            WHERE t.type = 1 -- Sell
              AND t.date >= ? AND t.date <= ?
        """

        sells = cur.execute(query_sells, (start_iso, end_iso)).fetchall()
        if not sells:
            return {}

        # 2. Pre-fetch historical prices for relevant securities at start_date
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

        # 3. Prepare FX map: currency -> rate (at start_date)
        # Rate is assumed EUR base -> Term Currency? (e.g. USD=1.15).
        # We need Price_EUR = Price_Native / Rate.

        required_currencies = {s["currency_code"] for s in sells}
        required_currencies.discard(None)
        required_currencies.discard("EUR")

        fx_rates = {}  # currency -> float

        for curr in required_currencies:
            # Fetch latest rate on or before start_iso
            # Check fx_rates table: date | currency | rate
            fx_row = cur.execute(
                """
                SELECT rate FROM fx_rates
                WHERE currency = ? AND date <= ?
                ORDER BY date DESC LIMIT 1
            """,
                (curr, start_iso),
            ).fetchone()

            if fx_row:
                fx_rates[curr] = float(fx_row["rate"])
            else:
                fx_rates[curr] = 1.0

        # 4. Iterate Sells
        for sell in sells:
            uuid = sell["uuid"]
            sec_uuid = sell["security"]
            sell_date_iso = sell["date"][:10]  # YYYY-MM-DD
            sell_dt_str = sell["date"]
            sec_currency = sell["currency_code"] or "EUR"

            # Fetch sell costs
            units = cur.execute(
                """
                SELECT type, amount FROM transaction_units
                WHERE transaction_uuid = ?
            """,
                (uuid,),
            ).fetchall()

            fees_cents = sum(u["amount"] for u in units if u["type"] in (2, 13))
            taxes_cents = sum(u["amount"] for u in units if u["type"] in (1, 11))

            # Gross Proceeds = Net Amount + Fees + Taxes (in EUR/Account Ccy)
            gross_proceeds = (
                sell["amount"] + fees_cents + taxes_cents
            ) / 100.0

            # Find Cost Basis (FIFO)
            buys = cur.execute(
                """
                SELECT date, amount, shares FROM transactions
                WHERE security = ? AND type IN (0, 2) AND date < ?
                ORDER BY date ASC
            """,
                (sec_uuid, sell_dt_str),
            ).fetchall()

            shares_to_sell = sell["shares"]  # 10^8 factor embedded
            cost_basis_accum = 0.0

            for buy in buys:
                if shares_to_sell <= 0:
                    break

                buy_shares = buy["shares"]
                shares_from_lot = min(shares_to_sell, buy_shares)

                # Check if Buy is inside Period
                buy_date_iso = buy["date"][:10]

                if buy_date_iso >= start_iso:
                    # Bought INSIDE Period -> Use Gross Cost (EUR)
                    lot_cost = (
                        (buy["amount"] / buy_shares)
                        * shares_from_lot
                        / 100.0
                    )
                    cost_basis_accum += lot_cost
                else:
                    # Bought BEFORE Period -> Use Start Price
                    start_price_native = start_prices.get(sec_uuid, 0.0)

                    # Convert to EUR if needed
                    if sec_currency != "EUR":
                        rate = fx_rates.get(sec_currency, 1.0)
                        # Avoid div by zero
                        if rate == 0:
                            rate = 1.0
                        start_price_eur = start_price_native / rate
                    else:
                        start_price_eur = start_price_native

                    # Calculate Value
                    shares_float = shares_from_lot / 100000000.0
                    val_eur = start_price_eur * shares_float
                    cost_basis_accum += val_eur

                shares_to_sell -= shares_from_lot

            # Period Gain
            gain = gross_proceeds - cost_basis_accum

            # Add to day bucket
            results[sell_date_iso] += gain

    except Exception:
        _LOGGER.exception("Error calculating period gains")
    finally:
        conn.close()

    return dict(results)
