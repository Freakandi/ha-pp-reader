"""Unified Performance Engine for on-the-fly calculations."""

import logging
import sqlite3
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from custom_components.pp_reader.metrics.breakdown import (
    BreakdownItem,
    PerformanceBreakdown,
)

if TYPE_CHECKING:
    from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


_LOGGER = logging.getLogger(__name__)

_CONVERGENCE_THRESHOLD = 1e-6
_BREAKDOWN_THRESHOLD = 0.01
_GAIN_EPSILON = 1e-6


# Constants from TransactionType in engine_pandas.py
class TransactionType:
    """Enumeration of transaction types."""

    BUY = 0
    SELL = 1
    INBOUND_DELIVERY = 2
    OUTBOUND_DELIVERY = 3
    SECURITY_TRANSFER = 4
    CASH_TRANSFER = 5
    DEPOSIT = 6
    REMOVAL = 7
    DIVIDEND = 8
    INTEREST = 9
    INTEREST_CHARGE = 10
    TAX = 11
    TAX_REFUND = 12
    FEE = 13
    FEE_REFUND = 14


# Constants from Transaction Unit Types in engine_pandas.py
UNIT_TYPE_TAX = 1
UNIT_TYPE_FEE = 2
EPOCH_DAY_THRESHOLD = 100000
_SHARE_EPSILON = 1e-9


@dataclass(slots=True)
class Lot:
    """A tax lot for FIFO tracking."""

    date: datetime
    shares: float
    price_native: float
    fx_rate: float


@dataclass
class PerformanceMetrics:
    """Result container for performance calculations."""

    absolute_performance: float = 0.0
    realized_gains: float = 0.0
    unrealized_gains: float = 0.0
    fx_gains_cash: float = 0.0
    twr: float = 0.0
    irr: float = 0.0


class PerformanceEngine:
    """
    Unified performance calculation engine.

    This engine is responsible for all on-the-fly performance and wealth
    calculations, replacing the previous fragmented system of multiple engines.
    It loads all necessary data into memory and performs vectorized calculations
    using pandas for speed and efficiency.
    """

    def __init__(
        self, conn: sqlite3.Connection, market_resolver: "MarketResolver"
    ) -> None:
        """Initialize with a database connection."""
        self.conn = conn
        self.market_resolver = market_resolver
        self._df_txs = pd.DataFrame()
        self._df_units = pd.DataFrame()
        self._account_currencies: dict[str, str] = {}
        self._account_name_map: dict[str, str] = {}
        self._sec_name_map: dict[str, str] = {}

    def load_data(self) -> None:
        """
        Load all necessary data from the database into pandas DataFrames.

        This method centralizes data loading from various tables like transactions,
        prices, and FX rates, preparing them for calculations. It also handles
        the injection of "live" prices and rates to ensure calculations for
        "today" are up-to-date.
        """
        # transactions
        query_txs = "SELECT uuid, type, date, account, other_account, security, shares, amount, currency_code FROM transactions ORDER BY date"  # noqa: E501
        try:
            self._df_txs = pd.read_sql_query(query_txs, self.conn, parse_dates=["date"])
        except pd.errors.DatabaseError:
            self._df_txs = pd.DataFrame(
                columns=[
                    "uuid",
                    "type",
                    "date",
                    "account",
                    "other_account",
                    "security",
                    "shares",
                    "amount",
                    "currency_code",
                ]
            )

        if not self._df_txs.empty:
            self._df_txs["date"] = pd.to_datetime(
                self._df_txs["date"], utc=True
            ).dt.normalize()
            self._df_txs["shares_norm"] = self._df_txs["shares"] / 100000000.0
            self._df_txs["amount_norm"] = self._df_txs["amount"] / 100.0
        else:
            self._df_txs["date"] = pd.to_datetime([], utc=True)
            self._df_txs["shares_norm"] = []
            self._df_txs["amount_norm"] = []

        # transaction units
        query_units = "SELECT transaction_uuid, type, amount, currency_code, fx_amount, fx_currency_code FROM transaction_units"  # noqa: E501
        try:
            self._df_units = pd.read_sql_query(query_units, self.conn)
        except pd.errors.DatabaseError:
            self._df_units = pd.DataFrame(
                columns=[
                    "transaction_uuid",
                    "type",
                    "amount",
                    "currency_code",
                    "fx_amount",
                    "fx_currency_code",
                ]
            )

        # securities
        query_sec = "SELECT uuid, name FROM securities"
        try:
            df_securities = pd.read_sql_query(query_sec, self.conn)
            self._sec_name_map = df_securities.set_index("uuid")["name"].to_dict()
        except (pd.errors.DatabaseError, KeyError):
            self._sec_name_map = {}

        # account currencies
        try:
            query = "SELECT uuid, currency_code, name FROM accounts"
            rows = self.conn.execute(query).fetchall()
            self._account_currencies = {r[0]: (r[1] or "EUR") for r in rows}
            self._account_name_map = {r[0]: (r[2] or "Unknown Account") for r in rows}
        except sqlite3.Error:
            self._account_currencies = {}
            self._account_name_map = {}

    def _calculate_portfolio_state_at_date(self, d: date) -> dict[str, float]:
        """
        Calculate portfolio valuation (Wealth) at a specific date (EOD of d-1).

        This aligns with _setup_virtual_inventory which sets Cost Basis at T-1.
        It provides a Single Source of Truth for point-in-time valuation using
        direct scalar lookups, avoiding pivot/resample discrepancies.

        Returns:
            dict with keys:
            - total_wealth: Total Value in EUR
            - securities_wealth: Securities Value in EUR
            - cash_wealth: Cash Value in EUR

        """
        # Valuation Timestamp: EOD of d-1 (Start of d)
        start_ts = pd.Timestamp(d, tz="UTC")
        basis_ts = start_ts - pd.Timedelta(days=1)

        # 1. Securities Wealth
        # _get_holdings_at_date returns holdings strictly < d (so EOD d-1)
        holdings = self._get_holdings_at_date(d)
        sec_wealth = 0.0

        for sec_uuid, qty in holdings.items():
            # Use basis_ts (T-1) for Price/FX to match Virtual Inventory Cost Basis
            price = self._get_price(sec_uuid, basis_ts)
            curr = self.market_resolver.get_security_currency(sec_uuid)
            rate = self._get_fx(curr, basis_ts)

            val_eur = (qty * price) / (rate if rate else 1.0)
            sec_wealth += val_eur

        # 2. Cash Wealth
        # _get_account_balances returns balances strictly < start_ts (so EOD d-1)
        balances = self._get_account_balances(start_ts)
        cash_wealth = 0.0

        for (acc_id, curr), bal in balances.items():  # noqa: B007
            # Use basis_ts (T-1) for FX
            rate = self._get_fx(curr, basis_ts)
            val_eur = bal / (rate if rate else 1.0)
            cash_wealth += val_eur

        return {
            "total_wealth": sec_wealth + cash_wealth,
            "securities_wealth": sec_wealth,
            "cash_wealth": cash_wealth,
        }

    def get_daily_wealth(  # noqa: PLR0912, PLR0915
        self, start_date: date, end_date: date
    ) -> pd.DataFrame:
        """
        Calculate daily wealth metrics for a given date range.

        This method produces a time series DataFrame with key financial metrics
        for each day in the specified range, such as total wealth, invested
        capital, and various cash flow buckets.
        """
        date_range = pd.date_range(start=start_date, end=end_date, freq="D", tz="UTC")

        # Create extended range for FX/Prices to cover full history (for Balances)
        # Assuming earliest transaction matters.
        first_tx = self._df_txs["date"].min()

        # Ensure start_date is a Timestamp for comparison.
        # Since we use tz="UTC" for date_range, we assume UTC here.
        start_date_ts = pd.Timestamp(start_date)
        if start_date_ts.tzinfo is None:
            start_date_ts = start_date_ts.tz_localize("UTC")

        if pd.notna(first_tx) and first_tx < start_date_ts:
            _ = first_tx
        else:
            _ = start_date_ts

        # Ensure end_date is also UTC for range generation
        end_date_ts = pd.Timestamp(end_date)
        if end_date_ts.tzinfo is None:
            end_date_ts = end_date_ts.tz_localize("UTC")

        # unified_resolver: Pivot tables are no longer generated here.
        # All calculations will rely on scalar lookups against the MarketResolver.
        df_augmented = self._augment_txs_with_market_data(self._df_txs)

        # Add amount_eur column, which is essential for many downstream calcs
        # Guard against division by zero for fx_rate.
        df_augmented["amount_eur"] = np.where(
            df_augmented["fx_rate"] != 0,
            (df_augmented["amount_norm"]) / df_augmented["fx_rate"],
            0.0,
        )

        daily_neutral_flow = self._calculate_gross_neutral_flows(
            df_augmented, date_range
        )
        daily_invested_cum = daily_neutral_flow.cumsum().fillna(0.0)

        div_flow, int_net, fees_net, taxes_net = self._calculate_cash_accumulators(
            df_augmented, self._df_units, self._df_txs, date_range
        )

        daily_sec_wealth, sec_holdings = self._calculate_security_wealth(
            df_augmented, date_range
        )

        daily_cash_wealth, acc_balances = self._calculate_cash_wealth(
            self._df_txs, date_range
        )

        # unified_resolver: Stale price detection using daily scalar lookups.
        stale_flags = []
        for d in date_range:
            stale_for_day = False
            if d in sec_holdings.index:
                holdings_on_date = sec_holdings.loc[d]
                held_securities = holdings_on_date[
                    holdings_on_date.abs() > _SHARE_EPSILON
                ].index
                for sec_uuid in held_securities:
                    if self.market_resolver.is_price_stale(sec_uuid, d):
                        stale_for_day = True
                        break
            stale_flags.append(stale_for_day)
        daily_stale_flag = pd.Series(stale_flags, index=date_range)

        result = pd.DataFrame(index=date_range)
        result["invested_capital_eur"] = daily_invested_cum.fillna(0).round(2)
        result["portfolio_wealth_eur"] = daily_sec_wealth.fillna(0).round(2)
        result["account_wealth_eur"] = daily_cash_wealth.fillna(0).round(2)
        result["total_wealth_eur"] = (
            daily_sec_wealth.fillna(0) + daily_cash_wealth.fillna(0)
        ).round(2)
        result["dividends_eur"] = div_flow.fillna(0).round(2)
        result["interest_eur"] = int_net.fillna(0).round(2)
        result["fees_eur"] = fees_net.fillna(0).round(2)
        result["taxes_eur"] = taxes_net.fillna(0).round(2)

        # FIFO Gains Calculation
        s_realized_flow, s_cost_basis = self._calculate_fifo_series(
            start_date, end_date
        )
        daily_realized = s_realized_flow.reindex(date_range, fill_value=0.0)
        daily_basis = s_cost_basis.reindex(date_range, method="ffill").fillna(0.0)

        daily_unrealized = daily_sec_wealth.fillna(0.0) - daily_basis

        result["realized_gains_eur"] = daily_realized.round(2)
        result["unrealized_gains_eur"] = daily_unrealized.round(2)

        result["performance_neutral_movements"] = daily_neutral_flow.round(2)
        result["inbound_transfers_eur"] = 0.0
        result["outbound_transfers_eur"] = 0.0
        result["stale_price"] = daily_stale_flag.astype(int)
        result["provenance"] = "performance_engine"

        result = result.reset_index().rename(columns={"index": "date"})
        result["date"] = result["date"].dt.strftime("%Y-%m-%d")

        if not result.empty:
            last_row = result.iloc[-1]
            _LOGGER.debug(
                "Performance End Wealth Debug: Date=%s, Total=%.2f, Invested=%.2f",
                last_row["date"],
                last_row["total_wealth_eur"],
                last_row["invested_capital_eur"],
            )

            # --- DEBUG: Detailed Breakdown Logic ---
            try:
                # End state only
                e_ts = pd.Timestamp(end_date, tz="UTC")

                # Securities
                if not sec_holdings.empty and e_ts in sec_holdings.index:
                    sh_row = sec_holdings.loc[e_ts]
                    held = sh_row[sh_row.abs() > 1e-6]  # noqa: PLR2004
                    if not held.empty:
                        _LOGGER.debug("--- Security Breakdown for %s ---", end_date)
                        for sec_uuid, qty in held.items():
                            sec_name = self._resolve_sec_name(sec_uuid)
                            # unified_resolver: Use scalar lookups for debug info
                            price = self._get_price(sec_uuid, e_ts)
                            curr = self.market_resolver.get_security_currency(sec_uuid)
                            rate = self._get_fx(curr, e_ts)

                            val_eur = (qty * price) / rate if rate else 0.0
                            _LOGGER.debug(
                                "SEC: %s | Qty=%.4f | P=%.4f | "
                                "FX=%.4f (%s) | ValEUR=%.2f",
                                sec_name,
                                qty,
                                price,
                                rate,
                                curr,
                                val_eur,
                            )

                # Cash
                if not acc_balances.empty and e_ts in acc_balances.index:
                    ab_row = acc_balances.loc[e_ts]
                    held_cash = ab_row[ab_row.abs() > 0.005]  # noqa: PLR2004
                    if not held_cash.empty:
                        _LOGGER.debug("--- Cash Breakdown for %s ---", end_date)
                        for (acc_uuid, curr), balance in held_cash.items():
                            acc_name = self._resolve_acc_name(acc_uuid)
                            rate = self._get_fx(curr, e_ts)
                            val_eur = balance / rate if rate else 0.0
                            _LOGGER.debug(
                                "CASH: %s (%s) | Bal=%.2f | FX=%.4f | ValEUR=%.2f",
                                acc_name,
                                curr,
                                balance,
                                rate,
                                val_eur,
                            )
            except Exception:
                _LOGGER.exception("Failed to dump breakdown debug logs")

        return result

    def _augment_transfers(  # noqa: PLR0915, PLR0912
        self, df_transfers: pd.DataFrame
    ) -> pd.DataFrame:
        """Augment transfer transactions with source and target currency information."""
        if df_transfers.empty:
            return df_transfers

        # Pre-process Units for FX Overrides
        # We look for units that have explicit FX targets
        df_fx_units = pd.DataFrame()
        if not self._df_units.empty:
            # Filter for units with explicit FX data
            mask_fx = (
                self._df_units["fx_amount"].notna()
                & self._df_units["fx_currency_code"].notna()
            )
            if mask_fx.any():
                df_fx_units = self._df_units[mask_fx][
                    ["transaction_uuid", "fx_amount", "fx_currency_code"]
                ].drop_duplicates(subset=["transaction_uuid"])

        # 1. Incoming Side (Target Account)
        df_in = df_transfers.copy()
        df_in["account"] = df_in["other_account"]
        df_in["type"] = TransactionType.DEPOSIT

        # Resolve Target Currencies
        target_currencies = df_in["account"].map(self._account_currencies).fillna("EUR")
        df_in["currency_code_target"] = target_currencies

        # Merge Explicit FX Data (Use join to preserve/align index)
        if not df_fx_units.empty:
            df_in = df_in.join(
                df_fx_units.set_index("transaction_uuid"),
                on="uuid",
                how="left",
            )
        else:
            df_in["fx_amount"] = np.nan
            df_in["fx_currency_code"] = None

        # 2. Outgoing Side (Source Account)
        df_out = df_transfers.copy()
        # Ensure type is explicitly int
        df_out["type"] = int(TransactionType.REMOVAL)

        # Resolve Source Currencies
        source_currencies = (
            df_out["account"].map(self._account_currencies).fillna("EUR")
        )
        df_out["currency_code_source"] = source_currencies

        # --- Value Conversion & Flow Euro Value Logic ---
        # We need 'flow_eur' to be the symmetric EUR value of the transfer.
        # Strategy:
        # 1. Calc Value_EUR for Source (from Amount_Source + Rate_Source)
        # 2. Calc Value_EUR for Target (from Amount_Target + Rate_Target)
        #    [Amount_Target from FX Units or Amount_Source]
        # 3. If one is EUR, use that. Else Average.

        # Fix df_in "amount" using Explicit FX Data (matches Target Side)
        mask_fx = pd.Series(data=False, index=df_in.index)
        if "fx_amount" in df_in.columns:
            mask_fx = df_in["fx_amount"].notna()
            if mask_fx.any():
                df_in.loc[mask_fx, "amount"] = df_in.loc[mask_fx, "fx_amount"]
                df_in.loc[mask_fx, "currency_code_target"] = df_in.loc[
                    mask_fx, "fx_currency_code"
                ]  # Ensure currency matches fx

            df_in = df_in.drop(
                columns=["transaction_uuid", "fx_amount", "fx_currency_code"],
                errors="ignore",
            )

        # --- Scalar FX Lookup ---
        # We perform row-wise calculation to ensure consistency with single-point vals.

        # Optimization: Pull out necessary arrays
        dates = df_out["date"].tolist()
        amts_source = df_out["amount"].tolist()
        currs_source = df_out["currency_code_source"].tolist()

        amts_target = df_in["amount"].tolist()
        currs_target = df_in["currency_code_target"].tolist()

        n = len(dates)
        final_flow_eur = np.zeros(n)
        corrected_target_amts = [0] * n

        # Single Loop for Flow Calculation AND Amount Correction
        for i in range(n):
            d = dates[i]
            # Rates
            # Note: d must be Timestamp for _get_fx.
            # df_transfers["date"] is usually Timestamps from DB load.
            curr_s = currs_source[i]
            rate_s = self._get_fx(curr_s, d)
            val_s_eur = (amts_source[i] / 100.0) / rate_s if rate_s else 0.0

            curr_t = currs_target[i]
            rate_t = self._get_fx(curr_t, d)
            val_t_eur = (amts_target[i] / 100.0) / rate_t if rate_t else 0.0

            # Decision: Average if cross-currency foreign, else use EUR side
            if curr_s == "EUR":
                flow = val_s_eur
            elif curr_t == "EUR":
                flow = val_t_eur
            else:
                flow = (val_s_eur + val_t_eur) / 2.0

            final_flow_eur[i] = flow

            # Amount Correction
            # If mismatch and equal amounts and not manually fixed
            # (We rely on logic: if Equal and Diff Curr, it needs fix)
            if amts_source[i] == amts_target[i] and curr_s != curr_t:
                # Convert: Use the calculated flow to back-calculate amount
                # Formula is (Amount = Flow * Rate * 100)
                new_val = flow * rate_t * 100.0
                corrected_target_amts[i] = round(new_val)
            else:
                corrected_target_amts[i] = amts_target[i]  # Keep existing

        # Apply results
        df_out["flow_eur"] = final_flow_eur
        df_in["flow_eur"] = final_flow_eur

        # Apply corrected amounts to df_in
        df_in["amount"] = corrected_target_amts

        # Logic cleanup
        df_in["currency_code"] = df_in["currency_code_target"]
        df_out["currency_code"] = df_out["currency_code_source"]

        drop_cols = ["currency_code_target", "currency_code_source"]
        df_in = df_in.drop(columns=drop_cols, errors="ignore")
        df_out = df_out.drop(columns=drop_cols, errors="ignore")

        return pd.concat([df_out, df_in], ignore_index=True)

    def _setup_virtual_inventory(
        self, start_date: date
    ) -> tuple[dict[str, deque[Lot]], pd.Timestamp, pd.Timestamp]:
        """
        Initialize virtual inventory for start of period.

        Returns:
            virtual_inventory: Mark-to-Market holdings at start_prev (t-1).
            start_ts: Timestamp for start_date.
            basis_ts: Timestamp for start_prev (t-1).

        """
        start_ts = pd.Timestamp(start_date, tz="UTC")
        start_prev = start_date - pd.Timedelta(days=1)
        basis_ts = pd.Timestamp(start_prev, tz="UTC")

        # Snapshot holdings at start date
        start_holdings = self._get_holdings_at_date(start_date)
        virtual_inventory: dict[str, deque[Lot]] = {}

        for sec_uuid, share_count in start_holdings.items():
            if share_count <= 0:
                continue

            curr = self.market_resolver.get_security_currency(sec_uuid)
            # Use basis_ts (t-1) for Mark-to-Market Valuation
            start_price = self._get_price(sec_uuid, basis_ts)
            start_fx = self._get_fx(curr, basis_ts)

            virtual_inventory[sec_uuid] = deque(
                [
                    Lot(
                        date=basis_ts,  # Set date to t-1
                        shares=share_count,
                        price_native=start_price,
                        fx_rate=start_fx,
                    )
                ]
            )
        return virtual_inventory, start_ts, basis_ts

    def calculate_period_performance(
        self, start_date: date, end_date: date
    ) -> PerformanceMetrics:
        """
        Calculate performance metrics for a specific period.

        This method computes key performance indicators like absolute performance,
        realized and unrealized gains, and FX gains on cash for the given
        start and end dates.
        """
        metrics = PerformanceMetrics()

        start_prev = start_date - pd.Timedelta(days=1)
        daily_wealth = self.get_daily_wealth(start_prev, end_date)

        # Use Scalar Valuation for Start/End Wealth (Single Source of Truth)
        # Start Wealth: State at Start of start_date (EOD T-1)
        start_state = self._calculate_portfolio_state_at_date(start_date)
        start_wealth = start_state["total_wealth"]

        # End Wealth: State at End of end_date (Start of T+1)
        end_state = self._calculate_portfolio_state_at_date(
            end_date + pd.Timedelta(days=1)
        )
        end_wealth = end_state["total_wealth"]

        # Invested Capital: Derive delta from daily_wealth flow accumulation
        # daily_wealth covers [start_prev, end_date].
        # start_row is at start_prev. end_row is at end_date.
        # Delta = end_cum - start_cum = Sum of flows in (start_prev, end_date].
        # Since start_prev = start-1, this covers flows ON start_date up to end_date.
        # This matches PP logic (usually).

        start_row = daily_wealth[daily_wealth["date"] == start_prev.isoformat()]
        end_row = daily_wealth[daily_wealth["date"] == end_date.isoformat()]

        start_invested = (
            start_row.iloc[0]["invested_capital_eur"] if not start_row.empty else 0.0
        )
        end_invested = (
            end_row.iloc[0]["invested_capital_eur"] if not end_row.empty else 0.0
        )

        metrics.absolute_performance = (end_wealth - start_wealth) - (
            end_invested - start_invested
        )

        # Optimization: Use Partial Replay Strategy
        virtual_inventory, start_ts, basis_ts = self._setup_virtual_inventory(
            start_date
        )

        # 3. Filter Transactions for the Window
        # We include transactions ON the start date in the window replay
        end_ts = pd.Timestamp(end_date, tz="UTC")
        window_mask = (self._df_txs["date"] >= start_ts) & (
            self._df_txs["date"] <= end_ts
        )
        df_txs_window = self._df_txs[window_mask]

        realized, unrealized = self._calculate_capital_gains(
            df_txs_window,
            start_date,
            end_date,
            initial_inventory=virtual_inventory,
            basis_ts=basis_ts,
        )
        metrics.realized_gains = realized
        metrics.unrealized_gains = unrealized

        metrics.fx_gains_cash = self._calculate_fx_performance(
            self._df_txs,
            start_date,
            end_date,
            basis_ts=basis_ts,
        )

        # Verification: Summation Consistency Check
        # Re-derive components from daily_wealth for the window
        dw_win = daily_wealth[
            (daily_wealth["date"] >= start_date.isoformat())
            & (daily_wealth["date"] <= end_date.isoformat())
        ]
        sum_div = dw_win["dividends_eur"].sum()
        sum_int = dw_win["interest_eur"].sum()
        sum_fee = dw_win["fees_eur"].sum()
        sum_tax = dw_win["taxes_eur"].sum()
        sum_neu = dw_win["performance_neutral_movements"].sum()

        derived_abs = (
            metrics.realized_gains
            + metrics.unrealized_gains
            + metrics.fx_gains_cash
            + sum_div
            + sum_int
            - sum_fee
            - sum_tax
        )

        diff = abs(metrics.absolute_performance - derived_abs)
        if diff > _BREAKDOWN_THRESHOLD or _LOGGER.isEnabledFor(logging.DEBUG):
            log_level = (
                logging.WARNING if diff > _BREAKDOWN_THRESHOLD else logging.DEBUG
            )
            _LOGGER.log(
                log_level,
                "Performance Summation: %s to %s\n"
                "  > Wealth: Start=%.2f, End=%.2f, Delta=%.2f\n"
                "  > Invested: Start=%.2f, End=%.2f, Delta=%.2f\n"
                "  > AbsPerf (WealthDelta - InvDelta) = %.2f\n"
                "  > Derived (Sum of Components)    = %.2f\n"
                "  > Difference                     = %.2f\n"
                "  > Components:\n"
                "      Realized   = %.2f\n"
                "      Unrealized = %.2f\n"
                "      FX Cash    = %.2f\n"
                "      Dividends  = %.2f\n"
                "      Interest   = %.2f\n"
                "      Fees       = %.2f\n"
                "      Taxes      = %.2f\n"
                "      Neutral    = %.2f",
                start_date,
                end_date,
                start_wealth,
                end_wealth,
                end_wealth - start_wealth,
                start_invested,
                end_invested,
                end_invested - start_invested,
                metrics.absolute_performance,
                derived_abs,
                diff,
                metrics.realized_gains,
                metrics.unrealized_gains,
                metrics.fx_gains_cash,
                sum_div,
                sum_int,
                sum_fee,
                sum_tax,
                sum_neu,
            )

        # 4. Filter Cash Flows (TWR/IRR)
        # We need external flows: Deposits, Removals (including fees/taxes on them?)
        # PP Standard: TWR uses daily valuations and external flows.
        # IRR uses initial value, final value, and stream of external flows.

        # Helper to extract relevant flows for the period
        # Note: df_txs_window includes flows on start_date.
        # PP Logic: Flows > Start-1day and <= End.

        # We need ALL flows for the window to calculate TWR properly day-by-day
        # We reuse daily_wealth which already has daily totals.

        # Extract flows from daily_wealth
        # daily_wealth info:
        # invested_capital_eur = cumulative sum of flows.
        # So daily flow = diff(invested_capital_eur)

        daily_wealth_window = daily_wealth[
            (daily_wealth["date"] >= start_date.isoformat())
            & (daily_wealth["date"] <= end_date.isoformat())
        ].copy()

        # Recalculate daily flow from the window's perspective or use diff
        # Since invested_capital is cumulative from dawn of time, diff gives daily flow.
        daily_invested = daily_wealth_window["invested_capital_eur"]
        # We need the flow for the first day too.
        # previous day invested
        prev_invested = start_invested

        # Vectorized flow calculation
        daily_flows = daily_invested.diff().fillna(
            daily_invested.iloc[0] - prev_invested
        )

        metrics.twr = self._calculate_twr(
            daily_wealth_window, daily_flows, start_wealth
        )

        metrics.irr = self._calculate_irr(start_wealth, end_wealth, daily_flows)

        return metrics

    def calculate_period_breakdown(
        self, start_date: date, end_date: date
    ) -> PerformanceBreakdown:
        """Calculate detailed performance breakdown for a specific period."""
        # 1. Virtual Inventory Setup
        virtual_inventory, start_ts, basis_ts = self._setup_virtual_inventory(
            start_date
        )
        end_ts = pd.Timestamp(end_date, tz="UTC")

        # 2. Filter transactions for the period
        window_mask = (self._df_txs["date"] >= start_ts) & (
            self._df_txs["date"] <= end_ts
        )
        df_txs_window = self._df_txs[window_mask].copy()

        # 3. Augment with Market Data
        df_augmented = self._augment_txs_with_market_data(df_txs_window)
        df_augmented["amount_eur"] = np.where(
            df_augmented["fx_rate"] != 0,
            df_augmented["amount_norm"] / df_augmented["fx_rate"],
            0.0,
        )

        # 4. Capital Gains
        realized_map, unrealized_map = self._calculate_capital_gains_detailed(
            df_augmented,  # Use augmented DF
            start_date,
            end_date,
            initial_inventory=virtual_inventory,
            basis_ts=basis_ts,
        )

        # 5. Other Metrics Aggregation
        divs = self._aggregate_dividends(df_augmented)
        fees = self._aggregate_fees(df_augmented)
        taxes = self._aggregate_taxes(df_augmented)
        interest = self._aggregate_interest(df_augmented)

        # 4. Format Results
        realized_items = [
            BreakdownItem(label=self._resolve_sec_name(k), amount=v)
            for k, v in realized_map.items()
            if abs(v) > _BREAKDOWN_THRESHOLD
        ]
        unrealized_items = [
            BreakdownItem(label=self._resolve_sec_name(k), amount=v)
            for k, v in unrealized_map.items()
            if abs(v) > _BREAKDOWN_THRESHOLD
        ]

        realized_items.sort(key=lambda x: x.amount, reverse=True)
        unrealized_items.sort(key=lambda x: x.amount, reverse=True)

        return PerformanceBreakdown(
            realized_gains=realized_items,
            unrealized_gains=unrealized_items,
            dividends=divs,
            fees=fees,
            taxes=taxes,
            interest=interest,
        )

    def _resolve_sec_name(self, uuid_val: str) -> str:
        return self._sec_name_map.get(uuid_val, f"Security {uuid_val[:8]}")

    def _resolve_acc_name(self, uuid_val: str) -> str:
        return self._account_name_map.get(uuid_val, f"Account {uuid_val[:8]}")

    def _format_breakdown_list(
        self, items: list[BreakdownItem], threshold: float = _BREAKDOWN_THRESHOLD
    ) -> list[BreakdownItem]:
        filtered = [x for x in items if abs(x.amount) >= threshold]
        filtered.sort(key=lambda x: x.amount, reverse=True)
        return filtered

    def _aggregate_dividends(self, df_augmented: pd.DataFrame) -> list[BreakdownItem]:
        """Aggregate dividend income, grossed up with associated fees and taxes."""
        div_txs = df_augmented[df_augmented["type"] == TransactionType.DIVIDEND]
        base_sums = div_txs.groupby("security")["amount_eur"].sum()

        gross_additions = pd.Series(dtype=float)
        if not self._df_units.empty and not df_augmented.empty:
            # Merge units with parent transactions to identify dividend-related units
            df_u_aug = self._df_units.merge(
                df_augmented[["uuid", "type", "security"]].rename(
                    columns={
                        "type": "parent_type",
                        "security": "parent_sec",
                        "uuid": "tx_uuid",
                    }
                ),
                left_on="transaction_uuid",
                right_on="tx_uuid",
                how="inner",
            )
            # The parent df_augmented is already window-filtered, so units are too.
            # We just need to augment these units with their own FX rates.
            df_u_aug_market = self._augment_txs_with_market_data(df_u_aug)
            df_u_aug_market["amount_eur"] = np.where(
                df_u_aug_market["fx_rate"] != 0,
                (df_u_aug_market["amount"] / 100.0) / df_u_aug_market["fx_rate"],
                0.0,
            )

            mask_gross = (
                df_u_aug_market["parent_type"] == TransactionType.DIVIDEND
            ) & (df_u_aug_market["type"].isin([UNIT_TYPE_TAX, UNIT_TYPE_FEE]))
            gross_additions = (
                df_u_aug_market[mask_gross].groupby("parent_sec")["amount_eur"].sum()
            )

        total_sums = base_sums.add(gross_additions, fill_value=0)
        results = [
            BreakdownItem(label=self._resolve_sec_name(k), amount=v)
            for k, v in total_sums.items()
        ]
        return self._format_breakdown_list(results)

    def _aggregate_interest(self, df_augmented: pd.DataFrame) -> list[BreakdownItem]:
        """Aggregate net interest income, grossed up with associated fees/taxes."""
        # 1. Base Net Amounts from main transactions
        df_int = df_augmented[df_augmented["type"] == TransactionType.INTEREST]
        df_chg = df_augmented[df_augmented["type"] == TransactionType.INTEREST_CHARGE]
        pos = df_int.groupby("account")["amount_eur"].sum()
        neg = df_chg.groupby("account")["amount_eur"].sum()
        net = pos.sub(neg, fill_value=0)

        # 2. Gross up with unit costs (fees/taxes)
        gross_additions = pd.Series(dtype=float)
        if not self._df_units.empty and not df_augmented.empty:
            # Filter for interest-related parent transactions
            mask_int = df_augmented["type"].isin(
                [TransactionType.INTEREST, TransactionType.INTEREST_CHARGE]
            )
            df_int_aug = df_augmented[mask_int]

            if not df_int_aug.empty:
                # Merge units to find those attached to interest transactions
                df_u_aug = self._df_units.merge(
                    df_int_aug[["uuid", "account"]].rename(
                        columns={"uuid": "tx_uuid", "account": "parent_acc"}
                    ),
                    left_on="transaction_uuid",
                    right_on="tx_uuid",
                    how="inner",
                )
                if not df_u_aug.empty:
                    # Augment units with market data and calculate EUR value
                    df_u_aug_market = self._augment_txs_with_market_data(df_u_aug)
                    df_u_aug_market["amount_eur"] = np.where(
                        df_u_aug_market["fx_rate"] != 0,
                        (df_u_aug_market["amount"] / 100.0)
                        / df_u_aug_market["fx_rate"],
                        0.0,
                    )

                    mask_gross = df_u_aug_market["type"].isin(
                        [UNIT_TYPE_TAX, UNIT_TYPE_FEE]
                    )
                    gross_additions = (
                        df_u_aug_market[mask_gross]
                        .groupby("parent_acc")["amount_eur"]
                        .sum()
                    )

        total = net.add(gross_additions, fill_value=0)
        results = [
            BreakdownItem(label=self._resolve_acc_name(k), amount=v)
            for k, v in total.items()
        ]
        return self._format_breakdown_list(results)

    def _aggregate_fees_taxes_generic(
        self, df_augmented: pd.DataFrame, main_type: int, unit_type: int
    ) -> list[BreakdownItem]:
        """Aggregate fees or taxes from transactions and units."""
        # 1. Sum explicit Fee/Tax transactions from the augmented main DF
        df_main = df_augmented[df_augmented["type"] == main_type].copy()
        df_main["group_id"] = df_main["security"].fillna(df_main["account"])
        df_main["group_id"] = df_main["group_id"].fillna("Unknown")
        base_sums = df_main.groupby("group_id")["amount_eur"].sum()

        # 2. Sum Fee/Tax units from all transaction types in the period
        unit_sums = pd.Series(dtype=float)
        if not self._df_units.empty and not df_augmented.empty:
            # Merge units with parent transactions (already filtered for the period)
            df_u_aug = self._df_units.merge(
                df_augmented[["uuid", "security", "account"]].rename(
                    columns={
                        "uuid": "tx_uuid",
                        "security": "p_sec",
                        "account": "p_acc",
                    }
                ),
                left_on="transaction_uuid",
                right_on="tx_uuid",
                how="inner",
            )
            if not df_u_aug.empty:
                # Augment the units with market data
                df_u_aug_market = self._augment_txs_with_market_data(df_u_aug)
                df_u_aug_market["amount_eur"] = np.where(
                    df_u_aug_market["fx_rate"] != 0,
                    (df_u_aug_market["amount"] / 100.0) / df_u_aug_market["fx_rate"],
                    0.0,
                )

                df_target = df_u_aug_market[df_u_aug_market["type"] == unit_type].copy()
                df_target["group_id"] = (
                    df_target["p_sec"].fillna(df_target["p_acc"]).fillna("Unknown")
                )
                unit_sums = df_target.groupby("group_id")["amount_eur"].sum()

        total = base_sums.add(unit_sums, fill_value=0)

        # Resolve UUIDs to names for the final breakdown list
        results = []
        for uid, val in total.items():
            name = self._sec_name_map.get(
                uid, self._account_name_map.get(uid, str(uid))
            )
            results.append(BreakdownItem(label=name, amount=val))

        return self._format_breakdown_list(results)

    def _aggregate_fees(self, df_augmented: pd.DataFrame) -> list[BreakdownItem]:
        """Aggregate all fees from transactions and units."""
        return self._aggregate_fees_taxes_generic(
            df_augmented, TransactionType.FEE, UNIT_TYPE_FEE
        )

    def _aggregate_taxes(self, df_augmented: pd.DataFrame) -> list[BreakdownItem]:
        """Aggregate all taxes from transactions and units."""
        return self._aggregate_fees_taxes_generic(
            df_augmented, TransactionType.TAX, UNIT_TYPE_TAX
        )

    def _augment_txs_with_market_data(self, df_txs: pd.DataFrame) -> pd.DataFrame:
        """
        Augment transactions with FX rates and prices using scalar lookups.

        This method populates 'fx_rate' and 'price' columns by iterating through
        the DataFrame and calling the MarketResolver's scalar `_get_fx` and `_get_price`
        methods. This ensures consistency between point-in-time valuations and
        transaction flow valuations, sacrificing some performance for accuracy.
        """
        if df_txs.empty:
            # Ensure columns exist even for empty DataFrame
            df_txs["fx_rate"] = []
            df_txs["price"] = []
            return df_txs.copy()

        df_out = df_txs.copy()

        rates = []
        prices = []
        # Use itertuples for performance over iterrows
        for row in df_out.itertuples(index=False):
            # FX Rate Lookup
            currency = getattr(row, "currency_code", "EUR")
            rates.append(self._get_fx(currency, row.date))

            # Price Lookup (only if security is present)
            security = getattr(row, "security", None)
            if security:
                prices.append(self._get_price(security, row.date))
            else:
                prices.append(0.0)

        df_out["fx_rate"] = rates
        df_out["price"] = prices
        return df_out

    def _calculate_gross_neutral_flows(
        self,
        df_augmented: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> pd.Series:
        """
        Calculate daily gross neutral flows (Invested Capital changes).

        Includes:
        - Cash Flows: Deposits (In), Removals (Out).
        - Asset Flows: Deliveries (In/Out), Transfers (Internal/External).
        - Grossing Up/Down: Adds Fees/Taxes to the neutral flow to reflect
          pure external movements before expenses.
        """
        neutral_types = [
            TransactionType.DEPOSIT,
            TransactionType.INBOUND_DELIVERY,
            TransactionType.REMOVAL,
            TransactionType.OUTBOUND_DELIVERY,
            TransactionType.SECURITY_TRANSFER,
        ]

        daily_flow = pd.Series(0.0, index=date_range)

        # Filter for neutral types using the UUIDs from df_augmented
        mask_neutral = df_augmented["type"].isin(neutral_types)
        if not mask_neutral.any():
            return daily_flow

        neutral_uuids = df_augmented.loc[mask_neutral, "uuid"]
        df_neutral_raw = self._df_txs[self._df_txs["uuid"].isin(neutral_uuids)].copy()

        if df_neutral_raw.empty:
            return daily_flow

        # Augment using the SAME method as Capital Gains (merge_asof for FX)
        # to ensure Cost Basis and Neutral Flow valuations are identical.
        df_neutral = self._augment_txs_with_market_data(df_neutral_raw)

        type_signs = {
            TransactionType.DEPOSIT: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SECURITY_TRANSFER: 1,
            TransactionType.REMOVAL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
        df_neutral["sign"] = df_neutral["type"].map(type_signs)

        flow_sums = {}

        for row in df_neutral.itertuples():
            d = row.date
            val_eur = 0.0

            # FX Rate (from merge_asof, consistent with CapGains)
            fx = row.fx_rate if row.fx_rate else 1.0

            # Logic A: Amount-based (Cash or Delivery w/ Amount)
            if row.amount is not None and abs(row.amount) > _GAIN_EPSILON:
                val_eur = (abs(row.amount) / 100.0) / fx

            # Logic B: Price-based (Delivery w/o Amount or Share Transfer)
            elif row.security and abs(row.shares_norm) > 0:
                price = self._get_price(row.security, d)
                val_eur = (abs(row.shares_norm) * price) / fx

            if val_eur != 0.0:
                val_signed = val_eur * row.sign
                flow_sums[d] = flow_sums.get(d, 0.0) + val_signed

        if flow_sums:
            daily_main = pd.Series(flow_sums).reindex(date_range, fill_value=0.0)
            daily_flow = daily_flow.add(daily_main, fill_value=0)

        # --- C. Gross Adjustment (Fees/Taxes) ---
        if not self._df_units.empty:
            df_u_neutral = self._df_units[
                self._df_units["transaction_uuid"].isin(df_neutral["uuid"])
            ].copy()

            if not df_u_neutral.empty:
                df_u_neutral = df_u_neutral[
                    df_u_neutral["type"].isin([UNIT_TYPE_FEE, UNIT_TYPE_TAX])
                ]

            if not df_u_neutral.empty:
                # Merge date to handle FX
                df_u_aug = df_u_neutral.merge(
                    df_neutral[["uuid", "date"]],
                    left_on="transaction_uuid",
                    right_on="uuid",
                    how="left",
                )

                unit_sums = {}
                for u_row in df_u_aug.itertuples():
                    d = u_row.date
                    # Use _get_fx to ensure precision matching
                    r = self._get_fx(u_row.currency_code, d)
                    u_val = (u_row.amount / 100.0) / (r if r else 1.0)
                    unit_sums[d] = unit_sums.get(d, 0.0) + u_val

                if unit_sums:
                    daily_adj = pd.Series(unit_sums).reindex(date_range, fill_value=0.0)
                    daily_flow = daily_flow.add(daily_adj, fill_value=0)

        return daily_flow

    def _calculate_cash_accumulators(
        self,
        df_augmented: pd.DataFrame,
        df_units: pd.DataFrame,
        df_txs: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
        """Calculate daily sums for dividends, interest, fees, and taxes."""

        def _sum_by_type(tx_type: int) -> pd.Series:
            return (
                df_augmented[df_augmented["type"] == tx_type]
                .groupby("date")["amount_eur"]
                .sum()
                .reindex(date_range, fill_value=0)
            )

        div_gross = _sum_by_type(TransactionType.DIVIDEND)
        int_gross = _sum_by_type(TransactionType.INTEREST).sub(
            _sum_by_type(TransactionType.INTEREST_CHARGE), fill_value=0
        )
        fees_net = _sum_by_type(TransactionType.FEE).sub(
            _sum_by_type(TransactionType.FEE_REFUND), fill_value=0
        )
        taxes_net = _sum_by_type(TransactionType.TAX).sub(
            _sum_by_type(TransactionType.TAX_REFUND), fill_value=0
        )

        if not df_units.empty and not df_txs.empty:
            # Merge units with their parent transactions to get the date
            df_units_dated = df_units.merge(
                df_txs[["uuid", "date", "type"]].rename(
                    columns={"type": "parent_type"}
                ),
                left_on="transaction_uuid",
                right_on="uuid",
                how="left",
            ).dropna(subset=["date"])

            # Augment the dated units with FX rates
            df_units_aug = self._augment_txs_with_market_data(df_units_dated)

            # Calculate the EUR value of each unit
            df_units_aug["amount_eur"] = np.where(
                df_units_aug["fx_rate"] != 0,
                (df_units_aug["amount"] / 100.0) / df_units_aug["fx_rate"],
                0.0,
            )

            units_tax = (
                df_units_aug[df_units_aug["type"] == UNIT_TYPE_TAX]
                .groupby("date")["amount_eur"]
                .sum()
            )
            units_fee = (
                df_units_aug[df_units_aug["type"] == UNIT_TYPE_FEE]
                .groupby("date")["amount_eur"]
                .sum()
            )

            # Gross up Dividends: Add Taxes + Fees from dividend-related units
            mask_div_units = (
                df_units_aug["parent_type"] == TransactionType.DIVIDEND
            ) & (df_units_aug["type"].isin([UNIT_TYPE_TAX, UNIT_TYPE_FEE]))

            div_additions = (
                df_units_aug[mask_div_units].groupby("date")["amount_eur"].sum()
            )

            div_gross = div_gross.add(
                div_additions.reindex(date_range, fill_value=0), fill_value=0
            )

            # Add all tax and fee units to their respective totals
            taxes_net = taxes_net.add(
                units_tax.reindex(date_range, fill_value=0), fill_value=0
            )
            fees_net = fees_net.add(
                units_fee.reindex(date_range, fill_value=0), fill_value=0
            )

        return div_gross, int_gross, fees_net, taxes_net

    def _calculate_security_wealth(
        self,
        df_augmented: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.Series, pd.DataFrame]:
        """Calculate the total value of all securities on each day of the range."""
        sec_txs = df_augmented[df_augmented["security"].notna()].copy()
        if sec_txs.empty:
            return pd.Series(0.0, index=date_range), pd.DataFrame(index=date_range)

        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SECURITY_TRANSFER: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
        signs = sec_txs["type"].map(share_signs).fillna(0)
        sec_txs["delta_shares"] = sec_txs["shares_norm"].fillna(0) * signs

        sec_daily_change = sec_txs.pivot_table(
            index="date",
            columns="security",
            values="delta_shares",
            aggfunc="sum",
            fill_value=0,
        )
        sec_holdings = (
            sec_daily_change.cumsum().reindex(date_range, method="ffill").fillna(0.0)
        )

        # Use a list to accumulate daily wealth values, then create Series
        wealth_values = []
        for d in date_range:
            daily_total = 0.0
            if d in sec_holdings.index:
                holdings_on_date = sec_holdings.loc[d]
                held_secs = holdings_on_date[holdings_on_date.abs() > _SHARE_EPSILON]
                for sec_uuid, qty in held_secs.items():
                    price = self._get_price(sec_uuid, d)
                    curr = self.market_resolver.get_security_currency(sec_uuid)
                    rate = self._get_fx(curr, d)
                    val_eur = (qty * price) / rate if rate else 0.0
                    daily_total += val_eur
            wealth_values.append(daily_total)

        daily_sec_wealth = pd.Series(wealth_values, index=date_range)
        return daily_sec_wealth, sec_holdings

    def _calculate_cash_wealth(
        self,
        df_txs: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.Series, pd.DataFrame]:
        """Calculate the total value of all cash accounts on each day of the range."""
        if df_txs.empty:
            return pd.Series(0.0, index=date_range), pd.DataFrame(index=date_range)

        df_standard = df_txs[df_txs["type"] != TransactionType.CASH_TRANSFER].copy()
        df_transfers = df_txs[df_txs["type"] == TransactionType.CASH_TRANSFER].copy()

        df_transfers_augmented = (
            self._augment_transfers(df_transfers)
            if not df_transfers.empty
            else pd.DataFrame()
        )
        df_cash_calc = pd.concat(
            [df_standard, df_transfers_augmented], ignore_index=True
        )

        cash_signs = {
            int(TransactionType.SELL): 1,
            int(TransactionType.DEPOSIT): 1,
            int(TransactionType.DIVIDEND): 1,
            int(TransactionType.INTEREST): 1,
            int(TransactionType.TAX_REFUND): 1,
            int(TransactionType.FEE_REFUND): 1,
            int(TransactionType.BUY): -1,
            int(TransactionType.REMOVAL): -1,
            int(TransactionType.INTEREST_CHARGE): -1,
            int(TransactionType.TAX): -1,
            int(TransactionType.FEE): -1,
        }

        df_cash_calc["type"] = (
            pd.to_numeric(df_cash_calc["type"], errors="coerce").fillna(-1).astype(int)
        )
        signs = df_cash_calc["type"].map(cash_signs).fillna(0)
        df_cash_calc["delta_cash"] = (df_cash_calc["amount_norm"].fillna(0)) * signs
        acc_txs = df_cash_calc.dropna(subset=["account"])

        acc_daily_change = acc_txs.pivot_table(
            index="date",
            columns=["account", "currency_code"],
            values="delta_cash",
            aggfunc="sum",
            fill_value=0,
        )
        acc_balances = (
            acc_daily_change.cumsum().reindex(date_range, method="ffill").fillna(0.0)
        )

        wealth_values = []
        for d in date_range:
            daily_total = 0.0
            if d in acc_balances.index:
                balances_on_date = acc_balances.loc[d]
                for (_acc, curr), bal in balances_on_date.items():
                    if abs(bal) > _SHARE_EPSILON:
                        rate = self._get_fx(curr, d)
                        daily_total += bal / rate if rate else 0.0
            wealth_values.append(daily_total)

        daily_cash_wealth = pd.Series(wealth_values, index=date_range)
        return daily_cash_wealth, acc_balances

    def _get_price(self, sec_id: str, d: pd.Timestamp) -> float:
        return self.market_resolver.get_price(sec_id, d)

    def _get_fx(self, curr: str, d: pd.Timestamp) -> float:
        return self.market_resolver.get_fx(curr, d)

    def _load_transaction_units(self, tx_uuids: list[str]) -> dict[str, dict[str, int]]:
        if not tx_uuids:
            return {}
        chunk_size = 900
        result = {}
        for i in range(0, len(tx_uuids), chunk_size):
            chunk = tx_uuids[i : i + chunk_size]
            placeholders = ",".join("?" for _ in chunk)
            query = f"SELECT transaction_uuid, type, amount FROM transaction_units WHERE transaction_uuid IN ({placeholders}) AND type IN (1, 2, 11, 13)"  # noqa: S608, E501
            try:
                rows = self.conn.execute(query, tuple(chunk)).fetchall()
                for r in rows:
                    tuuid, ttype, amt = r
                    if tuuid not in result:
                        result[tuuid] = {"fees": 0, "taxes": 0}
                    if ttype in (UNIT_TYPE_FEE, TransactionType.FEE):
                        result[tuuid]["fees"] += amt
                    elif ttype in (UNIT_TYPE_TAX, TransactionType.TAX):
                        result[tuuid]["taxes"] += amt
            except sqlite3.Error:
                pass
        return result

    def _calculate_capital_gains(
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
        initial_inventory: dict[str, deque[Lot]] | None = None,
        basis_ts: pd.Timestamp | None = None,
    ) -> tuple[float, float]:
        realized_map, unrealized_map = self._calculate_capital_gains_detailed(
            df_txs, start_date, end_date, initial_inventory, basis_ts
        )
        return sum(realized_map.values()), sum(unrealized_map.values())

    def _calculate_capital_gains_detailed(  # noqa: PLR0912
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
        initial_inventory: dict[str, deque[Lot]] | None = None,
        basis_ts: pd.Timestamp | None = None,
    ) -> tuple[dict[str, float], dict[str, float]]:
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC") + pd.Timedelta(
            days=1, microseconds=-1
        )

        # Default basis_ts to start_ts if not provided (fallback)
        if basis_ts is None:
            basis_ts = start_ts

        inventory: dict[str, deque[Lot]] = initial_inventory or {}
        realized_gains_map: dict[str, float] = {}

        sec_types = [
            TransactionType.BUY,
            TransactionType.SELL,
            TransactionType.INBOUND_DELIVERY,
            TransactionType.OUTBOUND_DELIVERY,
            TransactionType.SECURITY_TRANSFER,
        ]

        # Pre-filter
        txs = df_txs[df_txs["type"].isin(sec_types)]

        if not txs.empty:
            # Augment with FX Rates (Vectorized Optimization)
            txs = self._augment_txs_with_market_data(txs)
            # Ensure sorting by date after augmentation (merge_asof requires it, but result is sorted by date too)  # noqa: E501
            # However, let's be safe as we need it sorted for FIFO replay
            # merge_asof returns sorted if left is sorted.

            units_payload = self._load_transaction_units(txs["uuid"].tolist())

            for row in txs.itertuples():
                sec_id = row.security
                if not sec_id or row.shares_norm == 0:
                    continue

                # Ensure map entry exists
                if sec_id not in realized_gains_map:
                    realized_gains_map[sec_id] = 0.0

                shares = abs(row.shares_norm)
                tx_price = 0.0
                fees = units_payload.get(row.uuid, {}).get("fees", 0)
                taxes = units_payload.get(row.uuid, {}).get("taxes", 0)

                if row.type in (
                    TransactionType.SELL,
                    TransactionType.OUTBOUND_DELIVERY,
                ):
                    # For sells, reconstitute gross proceeds from net amount
                    # + fees/taxes
                    gross_amt_cents = abs(row.amount) + fees + taxes
                    tx_price = (gross_amt_cents / 100.0) / shares
                elif row.type in (
                    TransactionType.BUY,
                    TransactionType.INBOUND_DELIVERY,
                ):
                    # For buys, cost basis is the total cash outflow (amount)
                    # Deduct Fees/Taxes from Amount to get pure Cost Basis
                    if shares > 0 and row.amount is not None and row.amount != 0:
                        net_amt_cents = abs(row.amount) - fees - taxes
                        tx_price = (net_amt_cents / 100.0) / shares
                    else:  # Fallback for deliveries without amount
                        tx_price = self._get_price(sec_id, row.date)
                elif row.type == TransactionType.SECURITY_TRANSFER:
                    # For transfers, assume price is based on market value at the time
                    tx_price = self._get_price(sec_id, row.date)

                # Use pre-calculated FX rate
                tx_fx = row.fx_rate

                if row.type in (
                    TransactionType.BUY,
                    TransactionType.INBOUND_DELIVERY,
                    TransactionType.SECURITY_TRANSFER,
                ):
                    if sec_id not in inventory:
                        inventory[sec_id] = deque()
                    inventory[sec_id].append(
                        Lot(
                            date=row.date,
                            shares=shares,
                            price_native=tx_price,
                            fx_rate=tx_fx,
                        )
                    )
                elif row.type in (
                    TransactionType.SELL,
                    TransactionType.OUTBOUND_DELIVERY,
                ):
                    if inventory.get(sec_id):
                        gain = self._process_security_sale(
                            inventory[sec_id],
                            shares,
                            tx_price,
                            tx_fx,
                            start_ts,
                            basis_ts,
                            sec_id,
                            row.currency_code,
                        )
                        if row.date >= start_ts:
                            realized_gains_map[sec_id] += gain

        unrealized_gains_map = self._calculate_unrealized_security_gains_detailed(
            inventory, start_ts, basis_ts, end_ts
        )
        return realized_gains_map, unrealized_gains_map

    def _calculate_fifo_series(  # noqa: PLR0912, PLR0915
        self, start_date: date, end_date: date
    ) -> tuple[pd.Series, pd.Series]:
        """
        Calculate realized gains flow and cost basis state using global FIFO.

        Returns:
            realized_flow: Series indexed by date (daily sum of realized gains)
            cost_basis: Series indexed by date (EOD cost basis of held securities)

        """
        inventory: dict[str, deque[Lot]] = {}
        daily_realized: dict[pd.Timestamp, float] = {}
        daily_basis_changes: dict[pd.Timestamp, float] = {}

        # We must replay from start to ensure correct FIFO state
        sec_types = [
            TransactionType.BUY,
            TransactionType.SELL,
            TransactionType.INBOUND_DELIVERY,
            TransactionType.OUTBOUND_DELIVERY,
            TransactionType.SECURITY_TRANSFER,
        ]
        # Pre-filter
        txs = self._df_txs[self._df_txs["type"].isin(sec_types)]

        if txs.empty:
            return pd.Series(
                dtype=float, index=pd.DatetimeIndex([], dtype="datetime64[ns, UTC]")
            ), pd.Series(
                dtype=float, index=pd.DatetimeIndex([], dtype="datetime64[ns, UTC]")
            )

        # Augment with FX Rates (Vectorized Optimization)
        txs = self._augment_txs_with_market_data(txs)
        # Result of merge_asof is sorted by date if we sorted inputs (we did inside helper)  # noqa: E501
        # But let's rely on helper to return it sorted (merge_asof does preserve left order usually)  # noqa: E501
        # The helper sorts left input.

        units_payload = self._load_transaction_units(txs["uuid"].tolist())
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")

        current_total_basis = 0.0

        for row in txs.itertuples():
            # Optimization: Stop loop if we passed end_date?
            # No, need checks inside, but we can't stop early effectively if basis is needed.  # noqa: E501
            # But the caller usually asks for "start to end".
            # For data after end_date, we can ignore for state AT end_date.
            if row.date > end_ts:
                break

            sec_id = row.security
            if not sec_id or row.shares_norm == 0:
                continue

            shares = abs(row.shares_norm)
            tx_price = 0.0
            fees = units_payload.get(row.uuid, {}).get("fees", 0)
            taxes = units_payload.get(row.uuid, {}).get("taxes", 0)

            if row.type in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                gross_amt_cents = abs(row.amount) + fees + taxes
                if shares > 0:
                    tx_price = (gross_amt_cents / 100.0) / shares
            elif row.type in (TransactionType.BUY, TransactionType.INBOUND_DELIVERY):
                if shares > 0 and row.amount is not None and row.amount != 0:
                    # Deduct Fees/Taxes from Amount to get pure Cost Basis
                    net_amt_cents = abs(row.amount) - fees - taxes
                    tx_price = (net_amt_cents / 100.0) / shares
                else:
                    tx_price = self._get_price(sec_id, row.date)
            elif row.type == TransactionType.SECURITY_TRANSFER:
                tx_price = self._get_price(sec_id, row.date)

            # Use pre-calculated FX rate
            tx_fx = row.fx_rate

            if row.type in (
                TransactionType.BUY,
                TransactionType.INBOUND_DELIVERY,
                TransactionType.SECURITY_TRANSFER,
            ):
                if sec_id not in inventory:
                    inventory[sec_id] = deque()
                new_lot = Lot(
                    date=row.date, shares=shares, price_native=tx_price, fx_rate=tx_fx
                )
                inventory[sec_id].append(new_lot)

                # Add to basis
                lot_cost_eur = (new_lot.shares * new_lot.price_native) / (
                    new_lot.fx_rate if new_lot.fx_rate else 1.0
                )
                current_total_basis += lot_cost_eur

            elif row.type in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                if inventory.get(sec_id):
                    # Process sale - calculate realized gain AND reduce basis
                    lots = inventory[sec_id]
                    remaining = shares
                    gain_accum = 0.0
                    basis_reduction = 0.0

                    sale_val_unit_eur = tx_price / tx_fx if tx_fx else 0.0

                    while remaining > 0 and lots:
                        lot = lots[0]
                        consumed = min(lot.shares, remaining)
                        lot.shares -= consumed
                        remaining -= consumed

                        base_val_unit_eur = lot.price_native / (
                            lot.fx_rate if lot.fx_rate else 1.0
                        )

                        gain_accum += (sale_val_unit_eur - base_val_unit_eur) * consumed
                        basis_reduction += base_val_unit_eur * consumed

                        if lot.shares == 0:
                            lots.popleft()

                    current_total_basis -= basis_reduction

                    if row.date >= start_ts:
                        daily_realized[row.date] = (
                            daily_realized.get(row.date, 0.0) + gain_accum
                        )

            # Record EOD basis for this date
            # We overwrite previous entry for same day, so last tx wins (EOD state)
            daily_basis_changes[row.date] = current_total_basis

        # Ensure index is datetime even if empty
        if not daily_realized:
            realized_series = pd.Series(
                dtype=float, index=pd.DatetimeIndex([], dtype="datetime64[ns, UTC]")
            )
        else:
            realized_series = pd.Series(daily_realized, dtype=float)

        if not daily_basis_changes:
            cost_basis_series = pd.Series(
                dtype=float, index=pd.DatetimeIndex([], dtype="datetime64[ns, UTC]")
            )
        else:
            cost_basis_series = pd.Series(daily_basis_changes, dtype=float)

        return realized_series, cost_basis_series

    def _process_security_sale(
        self,
        lots: deque[Lot],
        shares_sold: float,
        sale_price: float,
        sale_fx: float,
        start_ts: pd.Timestamp,
        basis_ts: pd.Timestamp,
        sec_id: str,
        currency: str,
    ) -> float:
        remaining = shares_sold
        gain_accum = 0.0
        while remaining > 0 and lots:
            lot = lots[0]
            consumed = min(lot.shares, remaining)
            lot.shares -= consumed
            remaining -= consumed
            if lot.shares == 0:
                lots.popleft()

            # Implement "virtual lot" logic: if lot was created before the start
            # date, its cost basis is the market price at the basis date (t-1).
            base_price = (
                lot.price_native
                if lot.date >= start_ts
                else self._get_price(sec_id, basis_ts)
            )
            base_fx = (
                lot.fx_rate
                if lot.date >= start_ts
                else self._get_fx(currency, basis_ts)
            )

            sale_val_eur = sale_price / sale_fx if sale_fx else 0.0
            base_val_eur = base_price / base_fx if base_fx else 0.0
            gain_accum += (sale_val_eur - base_val_eur) * consumed
        return gain_accum

    def _calculate_unrealized_security_gains_detailed(
        self,
        inventory: dict[str, deque[Lot]],
        start_ts: pd.Timestamp,
        basis_ts: pd.Timestamp,
        end_ts: pd.Timestamp,
    ) -> dict[str, float]:
        unrealized_gains_map: dict[str, float] = {}
        for sec_id, lots in inventory.items():
            if not lots:
                continue
            curr = self.market_resolver.get_security_currency(sec_id)
            end_price = self._get_price(sec_id, end_ts)
            end_fx = self._get_fx(curr, end_ts)

            if _LOGGER.isEnabledFor(logging.DEBUG):
                _LOGGER.debug(
                    "Unrealized End Price Debug: Sec=%s, Date=%s, Price=%.4f, FX=%.4f",
                    sec_id,
                    end_ts,
                    end_price,
                    end_fx,
                )

            gain_accum = 0.0
            for lot in lots:
                # Implement "virtual lot" logic for unrealized gains as well.
                base_price = (
                    lot.price_native
                    if lot.date >= start_ts
                    else self._get_price(sec_id, basis_ts)
                )
                base_fx = (
                    lot.fx_rate
                    if lot.date >= start_ts
                    else self._get_fx(curr, basis_ts)
                )
                end_val_eur = end_price / end_fx if end_fx else 0.0
                base_val_eur = base_price / base_fx if base_fx else 0.0
                gain_accum += (end_val_eur - base_val_eur) * lot.shares

            if abs(gain_accum) > _GAIN_EPSILON:
                unrealized_gains_map[sec_id] = gain_accum
                if abs(gain_accum) > 100.0 and _LOGGER.isEnabledFor(  # noqa: PLR2004
                    logging.DEBUG
                ):
                    # Only log significant items
                    _LOGGER.debug(
                        "Detailed Unrealized: Sec=%s, EndPrice=%.4f (FX=%.4f), "
                        "Gain=%.2f. InvCount=%d",
                        sec_id,
                        end_price,
                        end_fx,
                        gain_accum,
                        len(lots),
                    )

        return unrealized_gains_map

    def _calculate_eur_flows_vectorized(self, combined: pd.DataFrame) -> pd.Series:
        """Calculate EUR value of flows efficiently without using apply."""
        # 1. Handle explicit 'flow_eur' (from transfers logic)
        # Note: We intentionally do NOT use the symmetric 'flow_eur' for FX gain
        # calculations, as we need the actual value of each leg of the transfer.
        # But if the column is present (from augmentation), and valid,
        # does _get_val usage suggest we ignore it?
        # The previous code's _get_val IGNORED flow_eur for standard calc,
        # but 'calc_flow_val' (unused?) tried to use it.
        # _get_val was the source of truth, so we match that logic:
        # It calculates (Amount / FX) for everything.

        if combined.empty:
            return pd.Series(dtype=float)

        # Ensure currency_code is filled
        # Note: df["currency_code"] might be object type.
        curr_codes = combined["currency_code"].fillna("EUR")
        amounts = combined["amount"].fillna(0.0)
        dates = combined["date"]

        # 2. Vectorized FX Lookup
        # We need rates for all non-EUR rows
        # Since _get_fx is scalar, we can't fully vectorize without a helper.
        # However, _augment_txs_with_market_data does this efficiently via map/loop.
        # Or we can iterate just the needed rows.

        # Optimization: Use zip for fast iteration
        # This avoids the overhead of apply() and is faster than manual index shuffling

        # Start with 1:1 EUR conversion
        # We work with numpy arrays for speed where possible
        final_vals_arr = (amounts.to_numpy() / 100.0)

        mask_non_eur = (curr_codes != "EUR").to_numpy()

        if mask_non_eur.any():
            # Extract data for non-EUR rows using boolean indexing
            ne_dates = dates.loc[mask_non_eur]
            ne_currs = curr_codes.loc[mask_non_eur]
            ne_amounts = final_vals_arr[mask_non_eur]

            # Use lists for fast iteration (avoiding Series iteration overhead)
            # This is the critical optimization over apply() or Series iteration
            l_dates = ne_dates.tolist()
            l_currs = ne_currs.tolist()

            # Using zip is significantly faster than itertuples or apply
            rates = []
            # Track if rate was found/valid to handle 0.0 fallback correctly
            # If rate is 0/None, result should be 0.0

            # We use a secondary list or just 0.0 in rate?
            # if r is 0/None -> result 0.
            # 1.0 is WRONG.
            # But we can't divide by 0.
            # Strategy: Store rate. If valid, use it. If not, use special value or mask later?
            # Easiest: Use 1.0 for division, but multiply by 0 if invalid.
            # Or just calc value inside loop?
            # But we want to use numpy division if possible.
            # But "value inside loop" is what apply did essentially.
            # Is division that expensive?
            # If we iterate anyway, maybe just calculate value?
            # "zip loop" + "calc value" avoids numpy allocation/overhead if loop is python anyway.
            # Let's do that. It's safer and avoids the "mask later" complexity.

            vals = []
            for curr, d, amt in zip(l_currs, l_dates, ne_amounts, strict=False):
                r = self._get_fx(curr, d)
                if r:
                    vals.append(amt / r)
                else:
                    vals.append(0.0)

            new_vals = np.array(vals)

            # Update the specific slots in the main array
            # boolean indexing on numpy array allows direct assignment
            final_vals_arr[mask_non_eur] = new_vals

        return pd.Series(final_vals_arr, index=combined.index)

    def _calculate_fx_performance(
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
        basis_ts: pd.Timestamp | None = None,
    ) -> float:
        """
        Calculate FX gains on Cash Accounts using Balance Sheet method.

        Formula: Gain = (End_Val_EUR - Start_Val_EUR) - (Net_Inflows_EUR)
        Where Net_Inflows = Sum(Inflows_EUR) - Sum(Outflows_EUR)
        """
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC") + pd.Timedelta(
            days=1, microseconds=-1
        )
        if basis_ts is None:
            basis_ts = start_ts

        if df_txs.empty:
            return 0.0

        # 2. Get Start and End Balances
        # Start Balance is at 'start_date'.
        # (which is effectively end of previous day/start of this day)
        # Note: 'get_account_balances' returns PRE-start balances if passed start_ts.
        # Yes, Gain period is [start_ts, end_ts].
        # Start Value = Value at start_ts (End of Day t-1).
        # End Value = Value at end_ts.

        # Note: get_daily_wealth uses start_prev for Basis.
        # But 'basis_ts' arg here is 'start_prev'.
        # We need balances at 'basis_ts' (t-1) for START value?
        # NO. We need Balances at Start of Period. Start of Period is T.
        # So we need Balances at End of T-1.

        # _get_account_balances(start_ts) returns balances at start_ts
        # (exclusive of txs ON start_ts).
        # Which is exactly what we want for "Start of Day" Balance.

        bal_start = self._get_account_balances(start_ts)
        bal_end = self._get_account_balances(
            end_ts + pd.Timedelta(days=1)
        )  # Inclusive of end_ts?
        # end_date is usually inclusive in PP.
        # So we want Balances AFTER end_date transactions.
        # So pass end_ts + 1 day.

        # 3. Calculate Valuation Changes
        fx_gains_total = 0.0

        # Identify Foreign Accounts (UNION of start keys, end keys)
        all_keys = set(bal_start.index) | set(bal_end.index)

        # --- Augmentation & Flow Calculation ---
        # Filter for the relevant time window first to save time?
        mask_window = (df_txs["date"] >= start_ts) & (df_txs["date"] <= end_ts)
        df_window = df_txs[mask_window].copy()

        transfers = df_window[df_window["type"] == TransactionType.CASH_TRANSFER].copy()
        standard = df_window[df_window["type"] != TransactionType.CASH_TRANSFER].copy()

        augmented_transfers = self._augment_transfers(transfers)

        # Combine
        combined = pd.concat([standard, augmented_transfers], ignore_index=True)

        # Apply signs
        # DEPOSIT = Inflow (+). REMOVAL = Outflow (-).

        # We can iterate or group.
        # Group by [account, currency]

        # We need to apply signs to the flows!
        # We need to apply signs to the flows!
        type_signs = {
            TransactionType.SELL: 1,
            TransactionType.DEPOSIT: 1,
            TransactionType.DIVIDEND: 1,
            TransactionType.INTEREST: 1,
            TransactionType.TAX_REFUND: 1,
            TransactionType.FEE_REFUND: 1,
            TransactionType.BUY: -1,
            TransactionType.REMOVAL: -1,
            TransactionType.INTEREST_CHARGE: -1,
            TransactionType.TAX: -1,
            TransactionType.FEE: -1,
            TransactionType.CASH_TRANSFER: -1,
        }

        combined["sign"] = combined["type"].map(type_signs).fillna(0)

        # Optimized Vectorized Calculation
        if not combined.empty:
            combined["final_val_eur"] = self._calculate_eur_flows_vectorized(combined)
        else:
            combined["final_val_eur"] = 0.0

        combined["signed_flow_eur"] = combined["final_val_eur"] * combined["sign"]

        # Sum by Account/Currency
        net_flows = combined.groupby(["account", "currency_code"])[
            "signed_flow_eur"
        ].sum()

        # Now Calc Gains per Account
        for acc_id, curr_code in all_keys:
            if curr_code == "EUR":
                continue

            qty_start = bal_start.get((acc_id, curr_code), 0.0)
            qty_end = bal_end.get((acc_id, curr_code), 0.0)

            rate_start = self._get_fx(curr_code, basis_ts)
            rate_end = self._get_fx(curr_code, end_ts)

            val_start_eur = qty_start / rate_start if rate_start else 0.0
            val_end_eur = qty_end / rate_end if rate_end else 0.0

            flow_eur = net_flows.get((acc_id, curr_code), 0.0)

            # Calc Gain
            gain = (val_end_eur - val_start_eur) - flow_eur

            if abs(gain) > 0.005:  # noqa: PLR2004
                fx_gains_total += gain

        return fx_gains_total

    def _get_cash_flow_sign(self, t_type: int) -> int:
        if t_type in [
            TransactionType.SELL,
            TransactionType.DEPOSIT,
            TransactionType.DIVIDEND,
            TransactionType.INTEREST,
            TransactionType.TAX_REFUND,
            TransactionType.FEE_REFUND,
        ]:
            return 1
        if t_type in [
            TransactionType.BUY,
            TransactionType.REMOVAL,
            TransactionType.INTEREST_CHARGE,
            TransactionType.TAX,
            TransactionType.FEE,
            TransactionType.CASH_TRANSFER,
        ]:
            return -1
        return 0

    def _process_cash_outflow(
        self,
        lots: deque[Lot],
        amount: float,
        tx_fx: float,
        start_ts: pd.Timestamp,
        basis_ts: pd.Timestamp,
        curr: str,
    ) -> float:
        remaining = amount
        gain_accum = 0.0
        while remaining > 0 and lots:
            lot = lots[0]
            consumed = min(lot.shares, remaining)
            lot.shares -= consumed
            remaining -= consumed
            if lot.shares == 0:
                lots.popleft()
            base_fx = (
                self._get_fx(curr, basis_ts) if lot.date < start_ts else lot.fx_rate
            )
            val_tx = (consumed / tx_fx) if tx_fx else 0.0
            val_base = (consumed / base_fx) if base_fx else 0.0
            gain_accum += val_tx - val_base
        return gain_accum

    def _calculate_twr(
        self, daily_wealth: pd.DataFrame, daily_flows: pd.Series, start_value: float
    ) -> float:
        """
        Calculate Time-Weighted Rate of Return (TWR).

        Formula: Product( (EndVal - Flow) / StartVal ) - 1
        Where StartVal for day t is EndVal for day t-1.
        """
        if daily_wealth.empty:
            return 0.0

        # Aligntment
        vals = daily_wealth["total_wealth_eur"].to_numpy()
        flows = daily_flows.to_numpy()

        # We need a series of start_values.
        # Day 0 Start = start_value
        # Day i Start = Day i-1 End (vals[i-1])

        start_vals = np.empty_like(vals)
        start_vals[0] = start_value
        start_vals[1:] = vals[:-1]

        # Prevent division by zero
        # If start value is 0, and we have a flow, the return is undefined.
        # If start is 0 and we have inflow 100 and end is 110? Gain 10.
        # But (110 - 100) / 0 is inf.
        # Strategy: Skip days where start_val is 0.

        # TWR Formula: (End - Flow) / Start
        # If Start is 0, we treat the factor as 1.0 (no return impact).

        with np.errstate(divide="ignore", invalid="ignore"):
            adj_end = vals - flows
            factors = adj_end / start_vals

            # Fix valid entries
            mask_valid = start_vals != 0

            # Where start_vals is 0:
            # If flow == end, then factor is 0/0 = nan.
            # Implies just cash in, no gain. Factor 1.0 needed.
            # If flow != end (e.g. intraday gain on new cash?),
            # we can't capture it with EOD data perfectly.
            # We assume factor 1.0

            factors[~mask_valid] = 1.0
            factors[np.isnan(factors)] = 1.0

            # If factor is 0 (total loss?), it is valid.

        twr = np.prod(factors) - 1.0
        return float(twr)

    def _calculate_irr(
        self,
        start_value: float,
        end_value: float,
        daily_flows: pd.Series,
    ) -> float:
        """Calculate Internal Rate of Return (IRR) using Newton-Raphson method."""
        # 1. Construct Cash Flow Stream
        # 1. Construct Cash Flow Stream

        # We need to map flows to their relative day counts
        # daily_flows index is aligned with daily_wealth_window.
        # We need to map flows to their relative day counts

        # Let's fix the call site to pass a Series with DatetimeIndex if possible,
        # OR just reconstruct dates since we know it is daily from start_date

        # daily_flows covers start_date to end_date (inclusive or not?)
        # So daily_flows has length same as window.
        # daily_flows[0] is for start_date.

        # Dates relative to start_date
        # Dates relative to start_date
        days = np.arange(len(daily_flows))
        amounts = -daily_flows.to_numpy()  # Negate flows (Deposit is negative)

        # Add Start Value at t=0
        # If daily_flows[0] is the flow ON start_date, we have:
        # Initial Stock (Start Value) AND Flow on Day 0.
        # We can combine them or treat them as same day.
        amounts[0] -= start_value

        # Add End Value at t=end
        # The stream currently is only flows.
        # The End Value is at end_date.
        # valid_flows are daily_flows. The last element corresponds to end_date.
        # We don't add to amounts[-1],
        # we treat End Value as a separate positive flow at the end.

        # Append End Value
        days = np.append(days, days[-1])  # Same day as last flow
        amounts = np.append(amounts, end_value)

        # Filter out zeros to speed up solver
        mask = amounts != 0
        days = days[mask]
        amounts = amounts[mask]

        if len(amounts) < 1:
            return 0.0

        # 2. Solver (Newton-Raphson)
        # 2. Solver (Newton-Raphson)

        # Guess 0.1 (10%)
        rate = 0.1

        for _ in range(20):  # Max iterations
            # Optimization: Precompute factor
            # f(r) = sum( C_i * (1+r)^(-t_i) )
            years = days / 365.0

            # Avoid negative base if rate <= -1
            if rate <= -1.0:
                rate = -0.99

            base = 1.0 + rate

            # np.power might be slow, but fine for N < 1000
            pow_factor = np.power(base, -years)
            f_val = np.dot(amounts, pow_factor)

            if abs(f_val) < _CONVERGENCE_THRESHOLD:
                return float(rate)

            # Derivative
            # f'(r) = sum( C_i * (-t_i) * (1+r)^(-t_i - 1) )
            #       = sum( C_i * (-t_i) * pow_factor / base )

            f_prime = np.dot(amounts, -years * pow_factor) / base

            if f_prime == 0:
                break

            new_rate = rate - f_val / f_prime

            if abs(new_rate - rate) < _CONVERGENCE_THRESHOLD:
                return float(new_rate)

            rate = new_rate

        return float(rate)

    def _get_holdings_at_date(self, d: date) -> dict[str, float]:
        """Calculate security holdings at the start of a specific date (EOD of d-1)."""
        if self._df_txs.empty:
            return {}

        ts = pd.Timestamp(d, tz="UTC")

        # Filter transactions strictly BEFORE the date
        mask = (self._df_txs["date"] < ts) & (self._df_txs["security"].notna())
        df_past = self._df_txs[mask].copy()

        if df_past.empty:
            return {}

        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SECURITY_TRANSFER: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }

        # Calculate signed shares
        # Note: We rely on the fact that `shares_norm` is usually positive in DB,
        # but apply the direction map to handle Buy/Sell correctly.
        # If shares_norm is negative (legacy), this might double-flip,
        # but we align with engine_pandas.

        df_past["sign"] = df_past["type"].map(share_signs).fillna(0)
        df_past["delta_shares"] = df_past["shares_norm"].fillna(0.0) * df_past["sign"]

        # Sum by security
        holdings = df_past.groupby("security")["delta_shares"].sum()

        # Filter out zero or near-zero holdings and return dict
        return {k: v for k, v in holdings.items() if abs(v) > _SHARE_EPSILON}

    def _get_account_balances(self, ts: pd.Timestamp) -> pd.Series:
        """
        Calculate account balances at a specific timestamp (EOD of previous day).

        Returns Series with index [account, currency] and values as balance.
        """
        if self._df_txs.empty:
            return pd.Series(dtype=float)

        # Filter transactions strictly BEFORE the ts (ts is Start of Day)
        # We want End of Prev Day.
        # Actually ts is usually Start Date 00:00:00.
        # So transactions ON ts should NOT be included in "Starting Balance".
        # Transactions < ts.

        mask = (self._df_txs["date"] < ts) & (self._df_txs["account"].notna())
        df_past = self._df_txs[mask].copy()

        if df_past.empty:
            return pd.Series(dtype=float)

        # Calculate signs
        # We can't vector-map _get_cash_flow_sign efficiently via apply row-by-row
        # if performance matters, but map using a dict is fast.

        # Build map
        type_signs = {
            TransactionType.SELL: 1,
            TransactionType.DEPOSIT: 1,
            TransactionType.DIVIDEND: 1,
            TransactionType.INTEREST: 1,
            TransactionType.TAX_REFUND: 1,
            TransactionType.FEE_REFUND: 1,
            TransactionType.BUY: -1,
            TransactionType.REMOVAL: -1,
            TransactionType.INTEREST_CHARGE: -1,
            TransactionType.TAX: -1,
            TransactionType.FEE: -1,
            # In native df_txs, CASH_TRANSFER rows are Outflows from 'account'.
            TransactionType.CASH_TRANSFER: -1,
        }

        df_past["sign"] = df_past["type"].map(type_signs).fillna(0)

        # We need to handle Transfers carefully if they appear once or twice.
        # IF source/target logic is tricky, we rely on normalization elsewhere
        # but here we approximate.
        # In HA-PP: CASH_TRANSFER is typically filtered/normalized.
        # If the DB has two rows (one for each side), great.

        # Quick fix: Double the transfer rows for the target side.
        mask_transfers = df_past["type"] == TransactionType.CASH_TRANSFER
        if mask_transfers.any():
            transfers = df_past[mask_transfers].copy()
            transfers["account"] = transfers["other_account"]
            transfers["sign"] = 1  # Deposit

            # Currency for target?
            # In 'transactions' table, 'currency_code' is for the 'amount'.
            # If transfer is Cross-Currency, we need the Target Currency.
            # We can look it up from account map.

            # Vectorized lookup
            target_accs = transfers["account"]
            # self._account_currencies is dict.
            mapped_curr = target_accs.map(self._account_currencies)
            transfers["currency_code"] = mapped_curr.fillna(transfers["currency_code"])

            # Amount? If FX involved, we ideally look at transaction_units.
            # But for speed in this helper, we might drift if we don't look at Units.
            # Let's assume simplest case (Balance Sheet is robust-ish).
            # Or assume we rely on 'augment' elsewhere.
            # BUT this function is used for Start/End Balance. Accuracy matters.

            # Try to fetch fx_amount from df_units if loaded
            if not self._df_units.empty:
                # Merge
                transfers = transfers.merge(
                    self._df_units[
                        ["transaction_uuid", "fx_amount", "fx_currency_code"]
                    ],
                    left_on="uuid",
                    right_on="transaction_uuid",
                    how="left",
                )

                # If fx_amount present, use it
                mask_fx = transfers["fx_amount"].notna()
                if mask_fx.any():
                    # amount_norm update
                    transfers.loc[mask_fx, "amount_norm"] = (
                        transfers.loc[mask_fx, "fx_amount"] / 100.0
                    )

                # cleanup
                transfers = transfers.drop(
                    columns=["transaction_uuid", "fx_amount", "fx_currency_code"],
                    errors="ignore",
                )

            df_past = pd.concat([df_past, transfers], ignore_index=True)

        df_past["signed_amount"] = df_past["amount_norm"] * df_past["sign"]

        return df_past.groupby(["account", "currency_code"])["signed_amount"].sum()
