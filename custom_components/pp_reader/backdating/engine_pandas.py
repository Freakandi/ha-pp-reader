"""Backdating engine using Pandas for vectorized wealth calculation."""

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date
from typing import Any, ClassVar

import numpy as np
import pandas as pd

from custom_components.pp_reader.util.currency import PRICE_SCALE

_LOGGER = logging.getLogger(__name__)

# Constants for Transaction Unit Types
UNIT_TYPE_TAX = 1
UNIT_TYPE_FEE = 2


@dataclass(slots=True)
class TransactionType:
    """Transaction type constants matching Protobuf definitions."""

    BUY: ClassVar[int] = 0
    SELL: ClassVar[int] = 1
    INBOUND_DELIVERY: ClassVar[int] = 2
    OUTBOUND_DELIVERY: ClassVar[int] = 3
    SECURITY_TRANSFER: ClassVar[int] = 4
    CASH_TRANSFER: ClassVar[int] = 5
    DEPOSIT: ClassVar[int] = 6
    REMOVAL: ClassVar[int] = 7
    DIVIDEND: ClassVar[int] = 8
    INTEREST: ClassVar[int] = 9
    INTEREST_CHARGE: ClassVar[int] = 10
    TAX: ClassVar[int] = 11
    TAX_REFUND: ClassVar[int] = 12
    FEE: ClassVar[int] = 13
    FEE_REFUND: ClassVar[int] = 14


class BackdatingEngine:
    """Vectorized wealth calculation engine."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Initialize with a database connection."""
        self.conn = conn

    def run(self, start_date: date, end_date: date) -> None:
        """Execute the backdating process."""
        _LOGGER.debug("Starting Pandas backdating from %s to %s", start_date, end_date)

        # 1. Load Data
        df_txs, df_units, df_prices, df_rates, df_securities = self.load_data()

        # 2. Calculate Daily Wealth
        daily_wealth_df = self.calculate_daily_wealth(
            df_txs, df_units, df_prices, df_rates, df_securities, start_date, end_date
        )

        # 3. Persist
        self.persist_results(daily_wealth_df)
        _LOGGER.debug("Backdating completed.")

    def load_data(
        self,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load raw data from SQLite into Pandas DataFrames."""
        # Load Transactions
        query_txs = """
            SELECT
                uuid, type, date, account, other_account,
                security, shares, amount, currency_code
            FROM transactions
            ORDER BY date
        """
        try:
            df_txs = pd.read_sql_query(query_txs, self.conn, parse_dates=["date"])
        except pd.errors.DatabaseError:
            # Handle case where table might be empty or missing columns in test mocks
            df_txs = pd.DataFrame(
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

        if not df_txs.empty:
            df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
        else:
            # Ensure date column is datetime even if empty, for later merging
            df_txs["date"] = pd.to_datetime([], utc=True)

        # Load Transaction Units (Fees/Taxes)
        query_units = """
            SELECT
                transaction_uuid, type, amount, currency_code
            FROM transaction_units
        """
        try:
            df_units = pd.read_sql_query(query_units, self.conn)
        except pd.errors.DatabaseError:
            df_units = pd.DataFrame(
                columns=["transaction_uuid", "type", "amount", "currency_code"]
            )

        # Load Historical Prices
        query_prices = """
            SELECT
                security_uuid, date, close
            FROM historical_prices
        """
        try:
            df_prices = pd.read_sql_query(query_prices, self.conn)
            if not df_prices.empty:
                df_prices["date"] = pd.to_datetime(
                    df_prices["date"], unit="D", origin="unix"
                ).dt.tz_localize("UTC")
        except pd.errors.DatabaseError:
            df_prices = pd.DataFrame(columns=["security_uuid", "date", "close"])

        # Load FX Rates
        query_rates = """
            SELECT
                date, currency, rate
            FROM fx_rates
        """
        try:
            df_rates = pd.read_sql_query(query_rates, self.conn)
            if not df_rates.empty:
                df_rates["date"] = pd.to_datetime(
                    df_rates["date"], utc=True
                ).dt.normalize()
                # FX rates are stored as floats in the DB (e.g. 1.05).
                # No scaling needed (previously divided by PRICE_SCALE).
        except pd.errors.DatabaseError:
            df_rates = pd.DataFrame(columns=["date", "currency", "rate"])

        # Load Securities Metadata (Currency)
        query_sec = "SELECT uuid, currency_code FROM securities"
        try:
            df_securities = pd.read_sql_query(query_sec, self.conn)
        except pd.errors.DatabaseError:
            df_securities = pd.DataFrame(columns=["uuid", "currency_code"])

        return df_txs, df_units, df_prices, df_rates, df_securities

    def calculate_daily_wealth(
        self,
        df_txs: pd.DataFrame,
        df_units: pd.DataFrame,
        df_prices: pd.DataFrame,
        df_rates: pd.DataFrame,
        df_securities: pd.DataFrame,
        start_date: date,
        end_date: date,
    ) -> pd.DataFrame:
        """Calculate daily wealth metrics."""
        date_range = pd.date_range(start=start_date, end=end_date, freq="D", tz="UTC")

        # --- 1. PREPARE MARKET DATA ---
        fx_pivot, price_pivot = self._prepare_market_data(
            df_rates, df_prices, date_range
        )

        # --- 2. AUGMENT TRANSACTIONS ---
        df_augmented, fx_long = self._augment_transactions(df_txs, fx_pivot)

        # --- 3. INVESTED CAPITAL ---
        daily_invested_cum = self._calculate_invested_capital(df_augmented, date_range)

        # --- 4. CASH ACCUMULATORS ---
        div_flow, int_net, fees_net, taxes_net = self._calculate_cash_accumulators(
            df_augmented, df_units, df_txs, fx_long, date_range
        )

        # --- 5. WEALTH CALCULATION (SECURITIES) ---
        daily_sec_wealth = self._calculate_security_wealth(
            df_augmented, price_pivot, fx_pivot, df_securities, date_range
        )

        # --- 6. WEALTH CALCULATION (CASH) ---
        daily_cash_wealth = self._calculate_cash_wealth(df_txs, fx_pivot, date_range)

        # --- 7. ASSEMBLE RESULT ---
        result = pd.DataFrame(index=date_range)
        result["invested_capital_eur"] = daily_invested_cum.round(2)
        result["total_wealth_eur"] = (daily_sec_wealth + daily_cash_wealth).round(2)

        result["dividends_eur"] = div_flow.round(2)
        result["interest_eur"] = int_net.round(2)
        result["fees_eur"] = fees_net.round(2)
        result["taxes_eur"] = taxes_net.round(2)

        # Performance Neutral Movements (Spec 1D)
        # Includes Deposits (+), Removals (-), Inbound Delivery (+),
        # Outbound Delivery (-)
        # Internal Transfers (4, 5) are excluded from global (sum to 0)

        neutral_map = {
            TransactionType.DEPOSIT: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.REMOVAL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }

        # Helper to apply signs
        df_neutral = df_augmented[df_augmented["type"].isin(neutral_map.keys())].copy()
        if not df_neutral.empty:
            df_neutral["neutral_sign"] = df_neutral["type"].map(neutral_map)
            df_neutral["signed_amount"] = (
                df_neutral["amount_eur"] * df_neutral["neutral_sign"]
            )
            neutral_flow = (
                df_neutral.groupby("date")["signed_amount"]
                .sum()
                .reindex(date_range, fill_value=0.0)
            )
        else:
            neutral_flow = pd.Series(0.0, index=date_range)

        result["performance_neutral_movements"] = neutral_flow.round(2)

        # Fill schema defaults
        result["portfolio_wealth_eur"] = 0.0
        result["account_wealth_eur"] = 0.0
        result["inbound_transfers_eur"] = 0.0
        result["outbound_transfers_eur"] = 0.0
        result["fx_coverage_ratio"] = 1.0
        result["price_coverage_ratio"] = 1.0
        result["stale_price"] = 0
        result["provenance"] = "pandas_engine"

        result = result.reset_index().rename(columns={"index": "date"})
        result["date"] = result["date"].dt.strftime("%Y-%m-%d")

        return result

    def _prepare_market_data(
        self,
        df_rates: pd.DataFrame,
        df_prices: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Prepare FX and Price pivot tables."""
        if not df_rates.empty:
            fx_pivot = df_rates.pivot_table(
                index="date", columns="currency", values="rate"
            )
        else:
            fx_pivot = pd.DataFrame(index=date_range)

        fx_pivot["EUR"] = 1.0
        fx_pivot = fx_pivot.reindex(date_range).ffill().bfill()

        if not df_prices.empty:
            price_pivot = df_prices.pivot_table(
                index="date", columns="security_uuid", values="close"
            )
            price_pivot = price_pivot / PRICE_SCALE
            price_pivot = price_pivot.reindex(date_range).ffill().bfill()
        else:
            price_pivot = pd.DataFrame(index=date_range)

        return fx_pivot, price_pivot

    def _augment_transactions(
        self,
        df_txs: pd.DataFrame,
        fx_pivot: pd.DataFrame,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Augment transactions with FX rates and EUR values."""
        # Create long-form FX table using melt instead of stack
        # reset_index(names="date") guarantees the column name for merging
        fx_long = fx_pivot.reset_index(names="date").melt(
            id_vars="date", var_name="currency_code", value_name="daily_fx_rate"
        )

        if not df_txs.empty:
            # Join with FX
            df_augmented = df_txs.merge(
                fx_long, on=["date", "currency_code"], how="left"
            )
            df_augmented["daily_fx_rate"] = df_augmented["daily_fx_rate"].fillna(1.0)
            df_augmented["historic_fx_rate"] = df_augmented["daily_fx_rate"]
            # Calculate EUR Amount (Cash Flow Value)
            df_augmented["amount_eur"] = (
                df_augmented["amount"] / 100.0
            ) / df_augmented["historic_fx_rate"]
        else:
            df_augmented = pd.DataFrame(
                columns=["date", "type", "amount_eur", "security", "shares"]
            )

        return df_augmented, fx_long

    def _calculate_invested_capital(
        self, df_augmented: pd.DataFrame, date_range: pd.DatetimeIndex
    ) -> pd.Series:
        """Calculate cumulative invested capital from external flows."""
        flow_types = {
            TransactionType.DEPOSIT: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.REMOVAL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
        df_flows = df_augmented[df_augmented["type"].isin(flow_types)].copy()
        if not df_flows.empty:
            df_flows["sign"] = df_flows["type"].map(flow_types)
            df_flows["flow_val"] = df_flows["amount_eur"] * df_flows["sign"]
            daily_invested_flow = df_flows.groupby("date")["flow_val"].sum()
            # Cumsum on full history first
            daily_invested_cum_full = daily_invested_flow.cumsum()
            # reindex with ffill to carry forward state
            return daily_invested_cum_full.reindex(date_range, method="ffill").fillna(
                0.0
            )

        return pd.Series(0.0, index=date_range)

    def _calculate_cash_accumulators(
        self,
        df_augmented: pd.DataFrame,
        df_units: pd.DataFrame,
        df_txs: pd.DataFrame,
        fx_long: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
        """Calculate daily sums for Dividends, Interest, Fees, and Taxes."""

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
            # We need parent transaction type to attribute units to Divs/Interest
            df_units_aug = df_units.merge(
                df_txs[["uuid", "date", "type"]].rename(
                    columns={"type": "parent_type"}
                ),
                left_on="transaction_uuid",
                right_on="uuid",
                how="left",
            )
            df_units_aug = df_units_aug.dropna(subset=["date"])

            # Now merge FX using df_units' currency_code
            df_units_aug = df_units_aug.merge(
                fx_long, on=["date", "currency_code"], how="left"
            )
            df_units_aug["daily_fx_rate"] = df_units_aug["daily_fx_rate"].fillna(1.0)
            df_units_aug["amount_eur"] = (
                df_units_aug["amount"] / 100.0
            ) / df_units_aug["daily_fx_rate"]

            # Separate Units by Parent Type
            # Units for Dividends (Type 8) should be added to Gross Dividend
            # ONLY include Taxes (1) and Fees (2). Ignore Type 0 (Gross Base) or others.
            mask_div_units = (
                df_units_aug["parent_type"] == TransactionType.DIVIDEND
            ) & (df_units_aug["type"].isin([UNIT_TYPE_TAX, UNIT_TYPE_FEE]))
            units_div = df_units_aug[mask_div_units].groupby("date")["amount_eur"].sum()
            div_gross = div_gross.add(
                units_div.reindex(date_range, fill_value=0), fill_value=0
            )

            # Units for Interest (Type 9)
            # ONLY include Taxes and Fees.
            mask_int_units = (
                df_units_aug["parent_type"] == TransactionType.INTEREST
            ) & (df_units_aug["type"].isin([UNIT_TYPE_TAX, UNIT_TYPE_FEE]))
            units_int = df_units_aug[mask_int_units].groupby("date")["amount_eur"].sum()
            int_gross = int_gross.add(
                units_int.reindex(date_range, fill_value=0), fill_value=0
            )

            # Total Fees/Taxes for result columns
            # (aggregates all Taxes/Fees, including those on Divs)
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
        price_pivot: pd.DataFrame,
        fx_pivot: pd.DataFrame,
        df_securities: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> pd.Series:
        sec_txs = df_augmented[df_augmented["security"].notna()].copy()
        daily_sec_wealth = pd.Series(0.0, index=date_range)

        if sec_txs.empty:
            return daily_sec_wealth

        def get_share_delta(row: Any) -> float:
            t = row["type"]
            s = row["shares"]
            if pd.isna(s):
                return 0.0
            s_norm = s / 100000000.0  # 10^8 scale
            if t in (
                TransactionType.BUY,
                TransactionType.INBOUND_DELIVERY,
                TransactionType.SECURITY_TRANSFER,
            ):
                return s_norm
            if t in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                return -s_norm
            return 0.0

        sec_txs["delta_shares"] = sec_txs.apply(get_share_delta, axis=1)

        sec_daily_change = sec_txs.pivot_table(
            index="date",
            columns="security",
            values="delta_shares",
            aggfunc="sum",
            fill_value=0,
        )
        # Cumsum on full history first to establish correct levels
        sec_holdings_full = sec_daily_change.cumsum()
        # forward fill to handle days without transactions before slicing
        sec_holdings = sec_holdings_full.reindex(date_range, method="ffill").fillna(0.0)

        # Build Currency Map from Securities Table (Authoritative)
        # Fallback to Transactions if missing (Legacy/Robustness)
        if not df_securities.empty:
            sec_curr_map = df_securities.set_index("uuid")["currency_code"].to_dict()
        else:
            sec_curr_map = {}

        # Merge with transaction-based inference for any missing ones
        tx_curr_map = (
            sec_txs.dropna(subset=["security"])
            .drop_duplicates("security")
            .set_index("security")["currency_code"]
        )
        # Update missing entries in sec_curr_map with inferred ones
        for k, v in tx_curr_map.items():
            if k not in sec_curr_map and v:
                sec_curr_map[k] = v

        for sec_uuid in sec_holdings.columns:
            if sec_uuid not in price_pivot.columns:
                continue

            qty = sec_holdings[sec_uuid]
            prices = price_pivot[sec_uuid]
            curr = sec_curr_map.get(sec_uuid, "EUR")
            rates = (
                fx_pivot[curr]
                if curr in fx_pivot.columns
                else pd.Series(1.0, index=date_range)
            )

            val = (qty * prices) / rates.replace(0, np.nan)
            daily_sec_wealth = daily_sec_wealth.add(val.fillna(0.0))

        return daily_sec_wealth

    def _calculate_cash_wealth(
        self,
        df_txs: pd.DataFrame,
        fx_pivot: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> pd.Series:
        daily_cash_wealth = pd.Series(0.0, index=date_range)
        if df_txs.empty:
            return daily_cash_wealth

        # Prepare Expanded Transactions for Cash Logic
        # Type 5 (CASH_TRANSFER) needs to impact two accounts:
        # 1. Source (account) -> Debit (-)
        # 2. Target (other_account) -> Credit (+)

        # We split the dataframe
        df_standard = df_txs[df_txs["type"] != TransactionType.CASH_TRANSFER].copy()

        df_transfers = df_txs[df_txs["type"] == TransactionType.CASH_TRANSFER].copy()
        df_transfers_in = df_transfers.copy()

        # Outflow leg (Source)
        # Type 5 is treated as an outflow from 'account' in get_cash_delta below

        # Inflow leg (Target)
        if not df_transfers_in.empty:
            df_transfers_in["account"] = df_transfers_in["other_account"]
            # We flag it as DEPOSIT (Type 6) to treat it as (+)
            df_transfers_in["type"] = TransactionType.DEPOSIT
            # IMPORTANT: Drop rows where other_account was NaN/None
            # so we don't attribute to global null account
            df_transfers_in = df_transfers_in.dropna(subset=["account"])

        # Recombine
        df_cash_calc = pd.concat(
            [df_standard, df_transfers, df_transfers_in], ignore_index=True
        )

        def get_cash_delta(row: Any) -> float:
            t = row["type"]
            amt = row["amount"]
            if pd.isna(amt):
                amt = 0
            sign = 0
            if t in (
                TransactionType.SELL,
                TransactionType.DEPOSIT,
                TransactionType.DIVIDEND,
                TransactionType.INTEREST,
                TransactionType.TAX_REFUND,
                TransactionType.FEE_REFUND,
            ):
                sign = 1
            elif t in (
                TransactionType.BUY,
                TransactionType.REMOVAL,
                TransactionType.INTEREST_CHARGE,
                TransactionType.TAX,
                TransactionType.FEE,
                TransactionType.CASH_TRANSFER,  # Treat as outflow for the primary record
            ):
                sign = -1
            return (amt / 100.0) * sign

        df_cash_calc["delta_cash"] = df_cash_calc.apply(get_cash_delta, axis=1)
        acc_txs = df_cash_calc.dropna(subset=["account"])

        acc_daily_change = acc_txs.pivot_table(
            index="date",
            columns=["account", "currency_code"],
            values="delta_cash",
            aggfunc="sum",
            fill_value=0,
        )
        # Cumsum on full history first to establish correct levels
        acc_balances_full = acc_daily_change.cumsum()
        # forward fill to handle days without transactions before slicing
        acc_balances = acc_balances_full.reindex(date_range, method="ffill").fillna(0.0)

        for _, curr in acc_balances.columns:
            bal = acc_balances[(_, curr)]
            rates = (
                fx_pivot[curr]
                if curr in fx_pivot.columns
                else pd.Series(1.0, index=date_range)
            )
            val = bal / rates.replace(0, np.nan)
            daily_cash_wealth = daily_cash_wealth.add(val.fillna(0.0))

        return daily_cash_wealth

    def persist_results(self, df: pd.DataFrame) -> None:
        """Persist results to daily_wealth table."""
        self.conn.execute("DELETE FROM daily_wealth")
        df.to_sql("daily_wealth", self.conn, if_exists="append", index=False)
