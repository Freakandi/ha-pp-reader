"""
Performance breakdown calculation service.

This module provides granular performance analysis for a specific time period,
breaking down aggregated metrics (Realized, Dividends, etc.) by security or account.
"""

from __future__ import annotations

import logging
import sqlite3
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

import pandas as pd

from custom_components.pp_reader.backdating.engine_pandas import (
    UNIT_TYPE_FEE,
    UNIT_TYPE_TAX,
    BackdatingEngine,
    TransactionType,
)

_LOGGER = logging.getLogger(__name__)

EPSILON = 1e-9


@dataclass
class BreakdownItem:
    """Represents a single item in the performance breakdown."""

    label: str
    amount: float
    details: dict[str, Any] | None = None


@dataclass
class PerformanceBreakdown:
    """Holds the aggregated performance breakdown lists."""

    realized_gains: list[BreakdownItem] = field(default_factory=list)
    unrealized_gains: list[BreakdownItem] = field(default_factory=list)
    dividends: list[BreakdownItem] = field(default_factory=list)
    fees: list[BreakdownItem] = field(default_factory=list)
    taxes: list[BreakdownItem] = field(default_factory=list)
    interest: list[BreakdownItem] = field(default_factory=list)


@dataclass
class FifoLot:
    """Represents a tax lot for FIFO calculations."""

    shares: float
    cost_basis_eur: float


class BreakdownCalculator:
    """Calculates detailed performance breakdown for a period."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Initialize with database connection."""
        self.conn = conn
        self.engine = BackdatingEngine(conn)

    def calculate(  # noqa: C901, PLR0912, PLR0915
        self, start_date: date, end_date: date
    ) -> PerformanceBreakdown:
        """
        Calculate breakdown for the given period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            PerformanceBreakdown object containing realized/unrealized gains, etc.

        """
        # 1. Load Data
        df_txs, df_units, df_prices, df_rates, df_securities = self.engine.load_data()

        if df_txs.empty:
            return PerformanceBreakdown()

        # Normalize Data (Engine returns raw DB values)
        # Shares and Prices are 10^8
        if "shares" in df_txs.columns:
            df_txs["shares"] = df_txs["shares"].fillna(0) / 100_000_000.0
        if "amount" in df_txs.columns:
            df_txs["amount"] = df_txs["amount"].fillna(0) / 100.0

        if not df_prices.empty and "close" in df_prices.columns:
            df_prices["close"] = df_prices["close"] / 100_000_000.0

        if not df_units.empty and "amount" in df_units.columns:
            df_units["amount"] = df_units["amount"].fillna(0) / 100.0

        # Build Name Maps
        sec_map = self._load_security_names()
        account_map = self._load_account_names()
        curr_map = (
            df_securities.set_index("uuid")["currency_code"].to_dict()
            if not df_securities.empty
            else {}
        )

        # Sanitize Dates
        start_ts = pd.Timestamp(start_date).tz_localize("UTC")
        end_ts = pd.Timestamp(end_date).tz_localize("UTC")
        t0_date = start_ts - timedelta(days=1)

        # 2. Prepare Market Data
        # Calc dates for pivots
        # CRITICAL: Include dates of ALL transactions, not just in-period.
        # Otherwise, historical BUYs miss FX rates/prices (Cost Basis fails).
        all_tx_dates = df_txs["date"].unique()
        calc_dates = pd.DatetimeIndex([t0_date, start_ts, end_ts]).union(
            pd.DatetimeIndex(all_tx_dates)
        )
        calc_dates = calc_dates.sort_values().unique()

        # fx_long returned here but re-derived properly for helper methods
        fx_pivot, _ = self.engine._prepare_market_data(  # noqa: SLF001
            df_rates, df_prices, calc_dates
        )

        price_pivot = df_prices.pivot_table(
            index="date", columns="security_uuid", values="close", aggfunc="last"
        )
        price_pivot = price_pivot.reindex(calc_dates, method="ffill")

        # 3. Process Transactions (Period-Specific Performance)

        # A. Determine Portfolio Point-in-Time State at Start Date
        # We need the 'shares held' for every security at `t_start`.
        # We treat these holdings as having a baseline cost equal to the
        # Price/FX at `t_start`.

        # Prepare Units lookup (by TX UUID)
        units_by_tx = defaultdict(list)
        if not df_units.empty:
            for _, u in df_units.iterrows():
                units_by_tx[u["transaction_uuid"]].append(u)

        # Calculate Shares at Start
        df_sorted = df_txs.sort_values("date")
        start_holdings = defaultdict(float)

        # Pre-Period accumulation
        mask_pre = df_sorted["date"] < start_ts
        for _, tx in df_sorted[mask_pre].iterrows():
            sec = tx["security"]
            if not sec:
                continue

            # Apply signs (simplified)
            # Buy=0, Sell=1, Delivery=2/3
            sh = float(tx["shares"] or 0)
            t_type = tx["type"]

            # Typically shares in DB are unsigned, we must sign them
            # EXCEPT if the DB already has signs (Repo uses positive).
            # Let's use standard logic:
            if t_type in [TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY]:
                sh = -abs(sh)
            else:
                sh = abs(sh)

            start_holdings[sec] += sh

        # Initialize Lots for Period Simulation
        # Concept: All holdings at Start are a single "Lot" with Cost = Price @ Start
        lots: dict[str, deque[FifoLot]] = defaultdict(deque)

        # We use T-1 (or T if T is available? Logic says Start-1).
        # Actually, "Unrealized at Start" uses Price @ Start.
        # "Period Performance" compares End vs Start.
        # Baseline = Price @ Start Date (Midnight).

        for sec, qty in start_holdings.items():
            if qty > EPSILON:
                # Get MTM Price
                price = 0.0
                # Use start_ts
                if sec in price_pivot.columns:
                    if start_ts in price_pivot.index:
                        price = price_pivot.loc[start_ts, sec]
                    else:
                        # Fallback to last available
                        idx = price_pivot.index.searchsorted(start_ts, side="right") - 1
                        if idx >= 0:
                            price = price_pivot.iloc[idx][sec]

                # FX
                fx = 1.0
                curr = curr_map.get(sec, "EUR")
                if curr != "EUR" and curr in fx_pivot.columns:
                    if start_ts in fx_pivot.index:
                        fx = fx_pivot.loc[start_ts, curr]
                    else:
                        idx = fx_pivot.index.searchsorted(start_ts, side="right") - 1
                        if idx >= 0:
                            fx = fx_pivot.iloc[idx][curr]

                # Basis in EUR
                # price is already normal (not 10^8) due to clean loading
                basis_eur = price / fx
                lots[sec].append(FifoLot(qty, basis_eur))

        # B. Run Simulation (In-Period)
        realized_items: dict[str, float] = defaultdict(float)

        mask_period = (df_sorted["date"] >= start_ts) & (df_sorted["date"] <= end_ts)

        for _, tx in df_sorted[mask_period].iterrows():
            sec = tx["security"]
            uuid_ = tx["uuid"]
            raw_amt = float(tx["amount"] or 0)
            shares_raw = float(tx["shares"] or 0)
            t_type = tx["type"]
            curr = tx["currency_code"]
            d = tx["date"]

            # Resolve Fees/Taxes for Gross derivation
            u_fees = 0.0
            u_taxes = 0.0
            for u in units_by_tx.get(uuid_, []):
                if u["type"] in [UNIT_TYPE_FEE, 13]:
                    u_fees += float(u["amount"])
                elif u["type"] in [UNIT_TYPE_TAX, 11]:
                    u_taxes += float(u["amount"])

            # FX Rate for this transaction
            fx = 1.0
            if curr != "EUR" and curr in fx_pivot.columns and d in fx_pivot.index:
                fx = fx_pivot.loc[d, curr]

            if t_type in [TransactionType.BUY, TransactionType.INBOUND_DELIVERY]:
                qty = abs(shares_raw)
                # Gross Value Calculation
                # Amount is Outflow. Value = Amount - Fees - Taxes.
                val_native = raw_amt - u_fees - u_taxes
                val_eur = val_native / fx

                # Cost Basis per Share
                if qty > 0:
                    basis_unit = val_eur / qty
                    lots[sec].append(FifoLot(qty, basis_unit))

            elif t_type in [TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY]:
                qty_sold = abs(shares_raw)
                # Gross Value
                # Amount is Inflow. Value = Amount + Fees + Taxes.
                val_native = raw_amt + u_fees + u_taxes
                val_eur = val_native / fx

                # Price per Share (Effective Exit Price)
                exit_price_unit = 0.0
                if qty_sold > 0:
                    exit_price_unit = val_eur / qty_sold

                curr_lots = lots[sec]
                r_gain = 0.0

                while qty_sold > EPSILON and curr_lots:
                    lot = curr_lots[0]
                    consumed = min(qty_sold, lot.shares)

                    gain_chunk = (exit_price_unit - lot.cost_basis_eur) * consumed
                    r_gain += gain_chunk

                    lot.shares -= consumed
                    qty_sold -= consumed

                    if lot.shares < EPSILON:
                        curr_lots.popleft()

                realized_items[sec] += r_gain

        # C. Calculate Unrealized (Remaining Holdings)

        unrealized_items: dict[str, float] = defaultdict(float)

        # Get End Prices/FX
        # We optimize accessing pivot for End Date

        for sec, sec_lots in lots.items():
            remaining = sum(lot.shares for lot in sec_lots)
            # Use small epsilon
            if remaining < EPSILON:
                continue

            # Price @ End
            price_end = 0.0
            if sec in price_pivot.columns:
                # Try exact match, else closest past match
                if end_ts in price_pivot.index:
                    price_end = price_pivot.loc[end_ts, sec]
                else:
                    # Search
                    idx = price_pivot.index.searchsorted(end_ts, side="right") - 1
                    if idx >= 0:
                        price_end = price_pivot.iloc[idx][sec]

            # FX @ End
            fx_end = 1.0
            curr = curr_map.get(sec, "EUR")
            if curr != "EUR" and curr in fx_pivot.columns:
                if end_ts in fx_pivot.index:
                    fx_end = fx_pivot.loc[end_ts, curr]
                else:
                    idx = fx_pivot.index.searchsorted(end_ts, side="right") - 1
                    if idx >= 0:
                        fx_end = fx_pivot.iloc[idx][curr]

            price_end_eur = price_end / fx_end

            # Sum up gain for each lot
            total_gain = 0.0
            for lot in sec_lots:
                if lot.shares > EPSILON:
                    total_gain += (price_end_eur - lot.cost_basis_eur) * lot.shares

            unrealized_items[sec] = total_gain

        # 4. Compile Results

        # Realized
        res_realized = []
        for sec, val in realized_items.items():
            res_realized.append(BreakdownItem(self._resolve_name(sec, sec_map), val))

        # Unrealized
        res_unrealized = []
        for sec, val in unrealized_items.items():
            res_unrealized.append(BreakdownItem(self._resolve_name(sec, sec_map), val))

        # Other Metrics (using Vectorized approach for simplicity/speed)
        # We need df_period with fx_long
        df_val, fx_long = self.engine._augment_transactions(  # noqa: SLF001
            df_txs, fx_pivot
        )
        mask_period = (df_val["date"] >= start_ts) & (df_val["date"] <= end_ts)
        df_period = df_val[mask_period].copy()

        interest = self._group_and_resolve(
            df_period[df_period["type"] == TransactionType.INTEREST],
            "amount_eur",
            "account",
            account_map,
        )
        dividends = self._calc_divs(df_period, df_units, fx_long, sec_map)
        fees = self._calc_fees(df_period, df_units, fx_long, sec_map, account_map)
        taxes = self._calc_taxes(df_period, df_units, fx_long, sec_map, account_map)

        return PerformanceBreakdown(
            realized_gains=self._format_result(res_realized),
            unrealized_gains=self._format_result(res_unrealized),
            dividends=dividends,
            fees=fees,
            taxes=taxes,
            interest=interest,
        )

    def _load_security_names(self) -> dict[str, str]:
        """Fetch security names from DB."""
        try:
            cur = self.conn.cursor()
            cur.execute("SELECT uuid, name FROM securities")
            return dict(cur.fetchall())
        except sqlite3.Error:
            return {}

    def _load_account_names(self) -> dict[str, str]:
        try:
            cur = self.conn.cursor()
            cur.execute("SELECT uuid, name FROM accounts")
            return dict(cur.fetchall())
        except sqlite3.Error:
            return {}

    def _resolve_name(
        self, uuid_val: Any, name_map: dict[str, str], default_prefix: str = "Unknown"
    ) -> str:
        s_uuid = str(uuid_val)
        if s_uuid in name_map:
            return name_map[s_uuid]
        return f"{default_prefix} {s_uuid[:8]}" if s_uuid else default_prefix

    def _format_result(self, results: list[BreakdownItem]) -> list[BreakdownItem]:
        # Filter small amounts and sort
        threshold = 0.01
        filtered = [x for x in results if abs(x.amount) >= threshold]
        filtered.sort(key=lambda x: x.amount, reverse=True)
        return filtered

    def _group_and_resolve(
        self, df: pd.DataFrame, value_col: str, group_col: str, name_map: dict[str, str]
    ) -> list[BreakdownItem]:
        if df.empty:
            return []
        grouped = df.groupby(group_col)[value_col].sum()
        results = []
        for uuid_val, amount in grouped.items():
            label = self._resolve_name(uuid_val, name_map)
            results.append(BreakdownItem(label=label, amount=float(amount)))
        return self._format_result(results)

    def _calc_divs(
        self,
        df_period: pd.DataFrame,
        df_units: pd.DataFrame,
        fx_long: pd.DataFrame,
        sec_map: dict,
    ) -> list[BreakdownItem]:
        # Base Dividends
        div_txs = df_period[df_period["type"] == TransactionType.DIVIDEND].copy()

        base_sums = div_txs.groupby("security")["amount_eur"].sum()

        gross_additions = pd.Series(dtype=float)

        if not df_units.empty:
            # Join with df_period to get parent context and Filter for period
            df_u_aug = df_units.merge(
                df_period[["uuid", "type", "security", "date"]].rename(
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

            if not df_u_aug.empty:
                df_u_aug = df_u_aug.merge(
                    fx_long, on=["date", "currency_code"], how="left"
                )
                df_u_aug["daily_fx_rate"] = df_u_aug["daily_fx_rate"].fillna(1.0)
                df_u_aug["amount_eur"] = (df_u_aug["amount"] / 100.0) / df_u_aug[
                    "daily_fx_rate"
                ]

                mask_gross = (df_u_aug["parent_type"] == TransactionType.DIVIDEND) & (
                    df_u_aug["type"].isin([UNIT_TYPE_TAX, UNIT_TYPE_FEE])
                )

                gross_additions = (
                    df_u_aug[mask_gross].groupby("parent_sec")["amount_eur"].sum()
                )

        total_sums = base_sums.add(gross_additions, fill_value=0)

        results = []
        for sec_uuid, amt in total_sums.items():
            results.append(
                BreakdownItem(
                    label=self._resolve_name(sec_uuid, sec_map), amount=float(amt)
                )
            )
        return self._format_result(results)

    def _calc_fees_taxes_generic(
        self,
        df_period: pd.DataFrame,
        df_units: pd.DataFrame,
        fx_long: pd.DataFrame,
        main_type: int,
        unit_type: int,
        sec_map: dict,
        acc_map: dict,
    ) -> list[BreakdownItem]:
        # 1. Explicit Transactions
        df_main = df_period[df_period["type"] == main_type].copy()
        # Group by Security (preferred) or Account
        df_main["group_id"] = df_main["security"].fillna(df_main["account"])
        base_sums = df_main.groupby("group_id")["amount_eur"].sum()

        # 2. Units
        unit_sums = pd.Series(dtype=float)
        if not df_units.empty:
            # Join with df_period
            df_u_aug = df_units.merge(
                df_period[["uuid", "security", "account", "date"]].rename(
                    columns={"uuid": "tx_uuid", "security": "p_sec", "account": "p_acc"}
                ),
                left_on="transaction_uuid",
                right_on="tx_uuid",
                how="inner",
            )

            if not df_u_aug.empty:
                df_u_aug = df_u_aug.merge(
                    fx_long, on=["date", "currency_code"], how="left"
                )
                df_u_aug["daily_fx_rate"] = df_u_aug["daily_fx_rate"].fillna(1.0)
                df_u_aug["amount_eur"] = (df_u_aug["amount"] / 100.0) / df_u_aug[
                    "daily_fx_rate"
                ]

                df_u_target = df_u_aug[df_u_aug["type"] == unit_type].copy()
                df_u_target["group_id"] = df_u_target["p_sec"].fillna(
                    df_u_target["p_acc"]
                )

                unit_sums = df_u_target.groupby("group_id")["amount_eur"].sum()

        total_sums = base_sums.add(unit_sums, fill_value=0)

        results = []
        for uuid_val, amt in total_sums.items():
            name = self._resolve_name(uuid_val, sec_map, "")
            if not name:
                name = self._resolve_name(uuid_val, acc_map, "Unknown")
            results.append(BreakdownItem(label=name, amount=float(amt)))

        return self._format_result(results)

    def _calc_fees(
        self,
        df_period: pd.DataFrame,
        df_units: pd.DataFrame,
        fx_long: pd.DataFrame,
        sec_map: dict,
        acc_map: dict,
    ) -> list[BreakdownItem]:
        return self._calc_fees_taxes_generic(
            df_period,
            df_units,
            fx_long,
            TransactionType.FEE,
            UNIT_TYPE_FEE,
            sec_map,
            acc_map,
        )

    def _calc_taxes(
        self,
        df_period: pd.DataFrame,
        df_units: pd.DataFrame,
        fx_long: pd.DataFrame,
        sec_map: dict,
        acc_map: dict,
    ) -> list[BreakdownItem]:
        return self._calc_fees_taxes_generic(
            df_period,
            df_units,
            fx_long,
            TransactionType.TAX,
            UNIT_TYPE_TAX,
            sec_map,
            acc_map,
        )
