"""Module for calculating dynamic period-specific performance metrics."""

import logging
import sqlite3
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path


from custom_components.pp_reader.backdating.engine_pandas import TransactionType

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class PeriodLot:
    """A tax lot for period performance calculation."""

    shares: float
    cost_basis_eur: float  # Total cost for this lot (Mark-to-Market at start OR Actual)


@dataclass(slots=True)
class PeriodDailyResult:
    """Result metrics for a specific day."""

    realized_gains_eur: float = 0.0
    unrealized_gains_eur: float = 0.0


_EPSILON = 1e-9


def calculate_period_performance_series(  # noqa: C901, PLR0912, PLR0915
    db_path: "Path",
    start_date: date,
    end_date: date,
) -> dict[str, PeriodDailyResult]:
    """
    Calculate Realized and Unrealized Gains relative to the period start.

    Logic:
    - FIFO methodology for lot tracking.
    - **Mark-to-Market at Start**: Positions held before start_date use the
      market value at start_date as their cost basis.
    - **Actual Cost**: Positions bought during the period use their purchase cost.
    - **Unrealized Gain**: (Current Market Value of Remaining Shares)
                           - (Cost Basis of Remaining Shares).
      *Crucially, cost basis of sold shares is removed from the unrealized equation.*
    - **Realized Gain**: Cumulative sum of (Sell Proceeds - Lot Cost Basis)
      for all sell transactions within the period.

    Returns:
        Dictionary mapping 'YYYY-MM-DD' -> PeriodDailyResult

    """
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row

    results: dict[str, PeriodDailyResult] = defaultdict(PeriodDailyResult)

    try:
        cur = conn.cursor()
        start_iso = start_date.isoformat()
        end_iso = end_date.isoformat()

        # 1. Identify all relevant securities
        #    a) Held at Start Date
        #    b) Traded during Period
        # We need their UUIDs to fetch prices.

        # Fetch Holdings at Start Date
        # Sum of shares from all transactions < Start Date
        start_holdings_rows = cur.execute(
            """
            SELECT security,
                   SUM(CASE
                       WHEN type IN (1, 3) THEN -shares
                       WHEN type IN (0, 2) THEN shares
                       ELSE 0
                   END) as total_shares
            FROM transactions
            WHERE date < ? AND security IS NOT NULL
            GROUP BY security
            HAVING total_shares <> 0
            """,
            (start_iso,),
        ).fetchall()

        # Map security_uuid -> initial_shares
        holdings: dict[str, float] = {
            r["security"]: r["total_shares"] / 100000000.0 for r in start_holdings_rows
        }

        # Fetch Transactions in Period
        period_tx_rows = cur.execute(
            """
            SELECT t.uuid, t.date, t.security, t.shares, t.amount, t.type,
                   t.currency_code
            FROM transactions t
            WHERE t.date >= ? AND t.date <= ?
              AND t.type IN (0, 1, 2, 3)
            ORDER BY t.date ASC
            """,
            (start_iso, end_iso),
        ).fetchall()

        traded_securities = {r["security"] for r in period_tx_rows if r["security"]}
        all_securities = set(holdings.keys()) | traded_securities

        if not all_securities:
            return {}

        # 2. Fetch Metadata & Prices
        #    Need Close Price at Start Date (or last known) for all_securities
        #    Need Daily Prices during Period for all_securities

        # Fetch Security Currencies
        sec_currencies = {}
        # Use chunking for IN clause to avoid "too many SQL variables" error
        chunk_size = 500
        all_sec_list = list(all_securities)
        for i in range(0, len(all_sec_list), chunk_size):
            chunk = all_sec_list[i : i + chunk_size]
            sec_rows = cur.execute(
                f"""
                SELECT uuid, currency_code FROM securities
                WHERE uuid IN ({",".join(["?"] * len(chunk))})
                """,  # noqa: S608
                chunk,
            ).fetchall()
            for r in sec_rows:
                sec_currencies[r["uuid"]] = (
                    (r["currency_code"] or "EUR").strip().upper()
                )

        # Fetch Start Prices (Mark-to-Market)
        start_prices = {}
        for sec_uuid in all_securities:
            start_epoch = (start_date - date(1970, 1, 1)).days  # type: ignore[attr-defined]
            p_row = cur.execute(
                """
                SELECT close FROM historical_prices
                WHERE security_uuid = ? AND date <= ?
                ORDER BY date DESC LIMIT 1
                """,
                (sec_uuid, start_epoch),
            ).fetchone()
            if p_row:
                start_prices[sec_uuid] = p_row["close"] / 100000000.0
            else:
                start_prices[sec_uuid] = 0.0

        # Fetch Daily Prices for Period
        # We assume dense data or we tolerate missing (using last known).
        # We'll load a cache: sec_uuid -> date_iso -> price
        daily_prices: dict[str, dict[str, float]] = defaultdict(dict)

        start_epoch_ts = (start_date - date(1970, 1, 1)).days  # type: ignore[attr-defined]
        end_epoch_ts = (end_date - date(1970, 1, 1)).days  # type: ignore[attr-defined]

        for i in range(0, len(all_sec_list), chunk_size):
            chunk = all_sec_list[i : i + chunk_size]
            ph_rows = cur.execute(
                f"""
                SELECT security_uuid, date, close
                FROM historical_prices
                WHERE date >= ? AND date <= ?
                  AND security_uuid IN ({",".join(["?"] * len(chunk))})
                """,  # noqa: S608
                (start_epoch_ts, end_epoch_ts, *chunk),
            ).fetchall()

            for r in ph_rows:
                d_iso = (date(1970, 1, 1) + timedelta(days=r["date"])).isoformat()
                daily_prices[d_iso][r["security_uuid"]] = r["close"] / 100000000.0

        # 3. Fetch FX Rates
        # We need rates for all currencies involved.
        needed_currencies = set(sec_currencies.values()) | {
            (r["currency_code"] or "EUR").strip().upper() for r in period_tx_rows
        }
        needed_currencies.discard("EUR")

        fx_rates_cache: dict[str, dict[str, float]] = defaultdict(dict)
        start_fx_rates = {}
        if needed_currencies:
            needed_list = list(needed_currencies)
            fx_rows = cur.execute(
                f"""
                SELECT date, currency, rate
                FROM fx_rates
                WHERE date >= ? AND date <= ?
                  AND currency IN ({",".join(["?"] * len(needed_list))})
                """,  # noqa: S608
                (start_iso, end_iso, *needed_list),
            ).fetchall()
            for r in fx_rows:
                fx_rates_cache[r["date"]][r["currency"]] = float(r["rate"])

            # Also need Start Date FX for Mark-to-Market initialization
            # Fetch latest rate <= start_date
            start_fx_rates = {}
            for curr in needed_list:
                r_row = cur.execute(
                    """
                    SELECT rate FROM fx_rates
                    WHERE currency = ? AND date <= ?
                    ORDER BY date DESC LIMIT 1
                    """,
                    (curr, start_iso),
                ).fetchone()
                if r_row:
                    start_fx_rates[curr] = float(r_row["rate"])
                else:
                    start_fx_rates[curr] = 1.0  # Default to 1.0 if no rate found

            # Inject start rates into cache for start_date if missing
            if start_iso not in fx_rates_cache:
                fx_rates_cache[start_iso] = {}
            for c, r in start_fx_rates.items():
                if c not in fx_rates_cache[start_iso]:
                    fx_rates_cache[start_iso][c] = r

        # 4. Initialize State (Tax Lots)
        # lots: security_uuid -> deque[PeriodLot]
        lots: dict[str, deque[PeriodLot]] = defaultdict(deque)

        for sec_uuid, shares in holdings.items():
            if shares > 0:
                # Mark-to-Market Valuation at Start:
                # The cost basis for shares held at the start of the period
                # is their market value on the start date.
                price_native = start_prices.get(sec_uuid, 0.0)
                curr = sec_currencies.get(sec_uuid, "EUR")

                # We need FX rate at START date specifically
                start_rate = 1.0
                if curr != "EUR" and curr in start_fx_rates:  # type: ignore[operator]
                    start_rate = start_fx_rates[curr]  # type: ignore[index]

                price_eur = price_native / start_rate
                cost_basis_eur = shares * price_eur

                lots[sec_uuid].append(
                    PeriodLot(shares=shares, cost_basis_eur=cost_basis_eur)
                )

        # 5. Simulation Loop
        # Iterate day by day
        curr_date = start_date

        # Group tx by day for efficient processing
        tx_by_day = defaultdict(list)
        for tx in period_tx_rows:
            tx_date_str = tx["date"][:10]  # YYYY-MM-DD
            tx_by_day[tx_date_str].append(tx)

        # Latch for last known prices to handle gaps (holidays/weekends)
        last_known_prices: dict[str, float] = start_prices.copy()

        # Latch for last known FX rates to handle gaps (holidays/weekends)
        # Initialize with Start FX Rates
        last_known_rates: dict[str, float] = start_fx_rates.copy()
        last_known_rates["EUR"] = 1.0

        while curr_date <= end_date:
            day_iso = curr_date.isoformat()
            daily_realized = 0.0

            # Update Latches for current day if data exists
            if day_iso in fx_rates_cache:
                last_known_rates.update(fx_rates_cache[day_iso])

            # A. Process Transactions for the current day
            if day_iso in tx_by_day:
                day_txs = tx_by_day[day_iso]
                for tx in day_txs:
                    uuid_ = tx["uuid"]  # Renamed to avoid conflict with module name
                    sec_uuid = tx["security"]
                    tx_type = tx["type"]
                    shares = (tx["shares"] or 0) / 100000000.0

                    if not sec_uuid:
                        continue

                    # Fetch transaction units (fees, taxes)
                    units = cur.execute(
                        "SELECT type, amount FROM transaction_units "
                        "WHERE transaction_uuid = ?",
                        (uuid_,),
                    ).fetchall()

                    fees_cents = sum(u["amount"] for u in units if u["type"] in (2, 13))
                    taxes_cents = sum(
                        u["amount"] for u in units if u["type"] in (1, 11)
                    )

                    raw_amount = tx["amount"] or 0
                    tx_curr = tx["currency_code"] or "EUR"

                    # Use Latched FX Rate
                    fx_rate = last_known_rates.get(tx_curr, 1.0)

                    if tx_type == TransactionType.BUY:
                        # Cost Basis for new lots is the actual gross amount paid.
                        # For BUY, 'amount' is total cash outflow (inc. fees/taxes).
                        gross_native = raw_amount / 100.0
                        gross_eur = gross_native / fx_rate

                        lots[sec_uuid].append(
                            PeriodLot(shares=shares, cost_basis_eur=gross_eur)
                        )

                    elif tx_type == TransactionType.INBOUND_DELIVERY:
                        # For Delivery, 'amount' is typically the Security Value.
                        # Fees/Taxes are separate and increase the Cost Basis.
                        gross_native = (raw_amount + fees_cents + taxes_cents) / 100.0
                        gross_eur = gross_native / fx_rate

                        lots[sec_uuid].append(
                            PeriodLot(shares=shares, cost_basis_eur=gross_eur)
                        )

                    elif tx_type in (1, 3):  # Sell, Outbound
                        # Gross Proceeds (Payout + Fees + Taxes)
                        gross_native = (raw_amount + fees_cents + taxes_cents) / 100.0
                        gross_eur = gross_native / fx_rate

                        # Consume Lots using FIFO
                        cost_basis_sold_eur = 0.0
                        shares_to_sell = shares

                        sec_lots = lots[sec_uuid]
                        while shares_to_sell > _EPSILON and sec_lots:
                            lot = sec_lots[0]
                            if lot.shares <= shares_to_sell:
                                # Consume full lot
                                cost_basis_sold_eur += lot.cost_basis_eur
                                shares_to_sell -= lot.shares
                                sec_lots.popleft()  # Remove lot from deque
                            else:
                                # Partial consumption
                                ratio = shares_to_sell / lot.shares
                                portion_cost = lot.cost_basis_eur * ratio
                                cost_basis_sold_eur += portion_cost

                                # Update lot in place (PeriodLot is mutable)
                                lot.shares -= shares_to_sell
                                lot.cost_basis_eur -= portion_cost
                                shares_to_sell = 0.0

                        # Calculate gain for this transaction
                        gain = gross_eur - cost_basis_sold_eur

                        # Only count Realized Gains for SELLS (type 1)
                        if tx_type == 1:
                            daily_realized += gain

            # Update Prices used for valuation for the current day
            if day_iso in daily_prices:
                last_known_prices.update(daily_prices[day_iso])

            # B. Calculate Unrealized Gains (Snapshot) at end of day
            # Uses *remaining* lots and their *adjusted* cost basis.
            daily_unrealized = 0.0

            # Iterate all held securities
            for sec_uuid, sec_lots in lots.items():
                if not sec_lots:
                    continue

                # Sum of shares and cost basis for only the *remaining* lots
                total_shares = sum(lot.shares for lot in sec_lots)
                total_basis = sum(lot.cost_basis_eur for lot in sec_lots)

                # Market Value of remaining shares using Latched Price/FX
                price_native = last_known_prices.get(sec_uuid, 0.0)
                curr = sec_currencies.get(sec_uuid, "EUR")
                fx_rate = last_known_rates.get(curr, 1.0)

                price_eur = price_native / fx_rate
                market_value_eur = total_shares * price_eur

                # Unrealized gain is (Current Market Value) - (Adjusted Cost Basis)
                unrealized = market_value_eur - total_basis
                daily_unrealized += unrealized

            results[day_iso] = PeriodDailyResult(
                realized_gains_eur=daily_realized,
                unrealized_gains_eur=daily_unrealized,  # Snapshot
            )

            curr_date += timedelta(days=1)

    except Exception:
        _LOGGER.exception("Error calculating period performance")
    finally:
        conn.close()

    return results
