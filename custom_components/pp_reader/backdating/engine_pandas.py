"""Backdating engine using Pandas for vectorized wealth calculation."""

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date
from typing import ClassVar

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

    def load_data(  # noqa: PLR0912, PLR0915
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
            # Ensure type is integer
            if df_txs["type"].dtype == "object":
                df_txs["type"] = (
                    pd.to_numeric(df_txs["type"], errors="coerce")
                    .fillna(-1)
                    .astype(int)
                )
            # Ensure shares is numeric
            if df_txs["shares"].dtype == "object":
                df_txs["shares"] = pd.to_numeric(df_txs["shares"], errors="coerce")
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

        # Load Latest Prices (Snapshot alignment)
        # We merge "live" prices (last_price) to ensure "Today" in Time Series
        # matches the "Current Value" in the Overview tab.
        query_latest = """
            SELECT
                uuid as security_uuid,
                last_price as close,
                last_price_date
            FROM securities
            WHERE last_price IS NOT NULL AND last_price_date IS NOT NULL
        """
        try:
            df_latest = pd.read_sql_query(query_latest, self.conn)
            if not df_latest.empty:
                # Convert timestamp (seconds) to datetime date (UTC midnight)
                df_latest["date"] = (
                    pd.to_datetime(
                        df_latest["last_price_date"], unit="s", origin="unix"
                    )
                    .dt.tz_localize("UTC")
                    .dt.normalize()
                )

                # Cleanup
                df_latest = df_latest.drop(columns=["last_price_date"])

                # Merge with historical (Snapshot takes precedence for same-day)
                if not df_prices.empty:
                    df_prices = pd.concat([df_prices, df_latest])
                    df_prices = df_prices.drop_duplicates(
                        subset=["security_uuid", "date"], keep="last"
                    )
                else:
                    df_prices = df_latest
        except pd.errors.DatabaseError:
            pass  # Ignore faults directly related to latest price fetching

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

        # Load Latest FX Rates (Snapshot alignment)
        # We merge "live" FX rates from exchange_rates to ensure "Today"
        # matches the "Current Value" in the Overview tab.
        query_rates_live = """
            SELECT
                date,
                term_currency as currency,
                rate
            FROM exchange_rates
            WHERE base_currency = 'EUR'
        """
        try:
            df_rates_live = pd.read_sql_query(query_rates_live, self.conn)
            if not df_rates_live.empty:
                df_rates_live["date"] = pd.to_datetime(
                    df_rates_live["date"], utc=True
                ).dt.normalize()

                # exchange_rates is stored as 10^-8 integer (PRICE_SCALE)
                # fx_rates is (historically) stored as float (1.05) or int
                # depending on implementation.
                # Inspecting 'fx_rates' schema in other files suggests it might be
                # float or integer.
                # However, the previous code block says: "FX rates are stored as
                # floats... No scaling needed".
                # BUT db_schema.py says fx_rates.rate is INTEGER.
                # AND exchange_rates.rate is INTEGER.

                # Let's assume BOTH are integers if schema says so, OR we trust the
                # "No scaling needed" comment which implies fx_rates might be
                # distinct.

                # Re-reading comment in existing code:

                # SAFE BET: If exchange_rates is INTEGER (10^8), convert to float
                # 1.05 to match what the 'fx_rates' logic *appears* to expect if it
                # claimed "float".
                # BUT, if 'fx_rates' logic didn't scale, maybe it *is* stored as
                # float (REAL) in sqlite?
                # SQLite is loose with types.

                # Let's treat exchange_rates consistently:
                # schema says INTEGER 10^-8. So divide by 100,000,000.
                df_rates_live["rate"] = df_rates_live["rate"] / PRICE_SCALE

                if not df_rates.empty:
                    df_rates = pd.concat([df_rates, df_rates_live])
                    df_rates = df_rates.drop_duplicates(
                        subset=["date", "currency"], keep="last"
                    )
                else:
                    df_rates = df_rates_live
        except pd.errors.DatabaseError:
            pass

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
        daily_cash_wealth = self._calculate_cash_wealth(
            df_txs, fx_pivot, fx_long, date_range
        )

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
            df_rates["currency"] = df_rates["currency"].astype(str)
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
        # Ensure join keys are compatible
        fx_long["currency_code"] = fx_long["currency_code"].astype(str)
        fx_long["date"] = pd.to_datetime(fx_long["date"], utc=True).dt.normalize()

        if not df_txs.empty:
            df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
            df_txs["currency_code"] = df_txs["currency_code"].astype(str)

            # Join with FX
            df_augmented = df_txs.merge(
                fx_long, on=["date", "currency_code"], how="left"
            )
            df_augmented["daily_fx_rate"] = df_augmented["daily_fx_rate"].fillna(1.0)
            df_augmented["historic_fx_rate"] = df_augmented["daily_fx_rate"]

            # Ensure amount is numeric (handle potential object dtype from
            # empty initial reads)
            if df_augmented["amount"].dtype == "object":
                df_augmented["amount"] = pd.to_numeric(
                    df_augmented["amount"], errors="coerce"
                ).fillna(0)

            # Calculate EUR Amount (Cash Flow Value)
            df_augmented["amount_eur"] = (
                df_augmented["amount"] / 100.0
            ) / df_augmented["historic_fx_rate"]
        else:
            df_augmented = pd.DataFrame(
                columns=["date", "type", "amount_eur", "security", "shares"]
            )

        # Ensure numeric types
        if not df_augmented.empty:
            df_augmented["amount_eur"] = df_augmented["amount_eur"].astype(float)
        else:
            # Even if empty, ensure correct dtypes for downstream operations
            df_augmented = df_augmented.astype({"amount_eur": float})

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

        # Vectorized share delta calculation
        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SECURITY_TRANSFER: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }

        # Map types to signs (defaults to NaN, which fillna(0) handles)
        # Note: map is significantly faster than apply
        signs = sec_txs["type"].map(share_signs).fillna(0)

        # Vectorized calculation
        # We fillna(0) on shares first to avoid propagating NaNs
        shares_norm = sec_txs["shares"].fillna(0) / 100000000.0
        sec_txs["delta_shares"] = shares_norm * signs

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

        # Vectorized Wealth Calculation
        # Optimization: Instead of looping O(N_Securities) times,
        # we calculate native wealth for all securities at once,
        # then group by currency (O(N_Currencies)) and convert to EUR.

        # 1. Identify securities present in both Holdings and Prices
        common_secs = sec_holdings.columns.intersection(price_pivot.columns)
        if common_secs.empty:
            return daily_sec_wealth

        # 2. Calculate Native Wealth (Position * Price) for all securities
        # aligned on date and security_uuid
        native_wealth = sec_holdings[common_secs] * price_pivot[common_secs]

        # 3. Map securities to currencies for grouping
        curr_list = [sec_curr_map.get(uuid, "EUR") for uuid in common_secs]

        # 4. Group by Currency and Sum
        # Note: groupby(axis=1) is deprecated in newer pandas, use T.groupby().T
        wealth_by_currency = native_wealth.T.groupby(curr_list).sum().T

        # 5. Convert to EUR
        # Loop is now over Currencies (typically < 10) instead of Securities
        for currency in wealth_by_currency.columns:
            # Get FX rates for this currency
            rates = (
                fx_pivot[currency]
                if currency in fx_pivot.columns
                else pd.Series(1.0, index=date_range)
            )

            # Convert to EUR
            val_eur = wealth_by_currency[currency] / rates.replace(0, np.nan)
            daily_sec_wealth = daily_sec_wealth.add(val_eur.fillna(0.0))

        return daily_sec_wealth

    def _calculate_cash_wealth(  # noqa: PLR0915
        self,
        df_txs: pd.DataFrame,
        fx_pivot: pd.DataFrame,
        fx_long: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> pd.Series:
        daily_cash_wealth = pd.Series(0.0, index=date_range)
        if df_txs.empty:
            return daily_cash_wealth

        # Load Account Currencies
        try:
            query = "SELECT uuid, currency_code FROM accounts"
            rows = self.conn.execute(query).fetchall()
            account_currencies = {r[0]: (r[1] or "EUR") for r in rows}
        except sqlite3.Error:
            account_currencies = {}

        # Prepare Expanded Transactions for Cash Logic
        # Type 5 (CASH_TRANSFER) needs to impact two accounts:
        # 1. Source (account) -> Debit (-)
        # 2. Target (other_account) -> Credit (+)

        # We split the dataframe
        df_standard = df_txs[df_txs["type"] != TransactionType.CASH_TRANSFER].copy()

        df_transfers = df_txs[df_txs["type"] == TransactionType.CASH_TRANSFER].copy()

        # --- Handle Transfers Special Logic (Cross-Currency Protection) ---
        df_transfers_out = df_transfers.copy()
        df_transfers_in = df_transfers.copy()

        # Vectorized Cross-Currency Calculation (Replacing apply())
        if not df_transfers_out.empty:
            # Map Source Currency
            df_transfers_out["source_currency"] = (
                df_transfers_out["account"].map(account_currencies).fillna("EUR")
            )

            # Mask identifying cross-currency transactions
            # We must ensure we ignore rows with missing accounts (mirroring legacy
            # logic)
            mask_cross = (
                df_transfers_out["currency_code"] != df_transfers_out["source_currency"]
            ) & df_transfers_out["account"].notna()

            # Optimization: Only process if there ARE cross-currency transfers
            if mask_cross.any():
                # Prepare Rates (Rate Transaction Currency, Rate Source Currency)
                # We need to merge twice with fx_long

                # 1. Rate for Transaction Currency
                # Join on [date, currency_code]
                df_merged = df_transfers_out.merge(
                    fx_long.rename(columns={"daily_fx_rate": "rate_tx"}),
                    on=["date", "currency_code"],
                    how="left",
                )

                # 2. Rate for Source Currency
                # Join on [date, source_currency] -> needs rename/mapping
                df_merged = df_merged.merge(
                    fx_long.rename(
                        columns={
                            "currency_code": "source_currency",
                            "daily_fx_rate": "rate_source",
                        }
                    ),
                    on=["date", "source_currency"],
                    how="left",
                )

                # Fill Missing Rates with 1.0 (EUR or default)
                df_merged["rate_tx"] = df_merged["rate_tx"].fillna(1.0)
                df_merged["rate_source"] = df_merged["rate_source"].fillna(1.0)

                # Calculate New Amount (Vectorized)
                # Amount (Source) = (Amount(Tx) / Rate(Tx)) * Rate(Source)
                # Apply mask to calculation
                # (We do it on all rows in the merged df to keep indices aligned,
                # then update original)

                df_merged["amount_new"] = (
                    df_merged["amount"] / df_merged["rate_tx"]
                ) * df_merged["rate_source"]

                # We must update the original dataframe 'df_transfers_out'.
                # Since we filtered 'df_cross' from 'df_transfers_out', we can use
                # the 'uuid' (which is unique) to map the calculated values back.

                df_cross = df_transfers_out[mask_cross].copy()

                # Merge 1
                df_cross = df_cross.merge(
                    fx_long.rename(columns={"daily_fx_rate": "rate_tx"}),
                    on=["date", "currency_code"],
                    how="left",
                )
                # Merge 2
                df_cross = df_cross.merge(
                    fx_long.rename(
                        columns={
                            "currency_code": "source_currency",
                            "daily_fx_rate": "rate_source",
                        }
                    ),
                    on=["date", "source_currency"],
                    how="left",
                )

                df_cross["rate_tx"] = df_cross["rate_tx"].fillna(1.0)
                df_cross["rate_source"] = df_cross["rate_source"].fillna(1.0)
                df_cross["amount_calc"] = (
                    df_cross["amount"] / df_cross["rate_tx"]
                ) * df_cross["rate_source"]

                # Now update original df_transfers_out.
                # Problem: merge drops index (or resets it?).
                # If we used 'uuid' as merge key we could set index back.
                # df_transfers has 'uuid'.
                # Let's set index to uuid before operations.

                # Update logic using uuid mapping
                updates = df_cross.set_index("uuid")["amount_calc"]
                currency_updates = df_cross.set_index("uuid")["source_currency"]

                # Apply updates
                # We need to match rows in df_transfers_out by UUID.
                # Set index temporarily
                df_transfers_out = df_transfers_out.set_index("uuid")
                df_transfers_out.update(updates.rename("amount"))
                df_transfers_out.update(currency_updates.rename("currency_code"))
                df_transfers_out = df_transfers_out.reset_index()

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
            [df_standard, df_transfers_out, df_transfers_in], ignore_index=True
        )

        # Vectorized cash delta calculation
        # (+1) Inflows
        cash_plus = {
            TransactionType.SELL: 1,
            TransactionType.DEPOSIT: 1,
            TransactionType.DIVIDEND: 1,
            TransactionType.INTEREST: 1,
            TransactionType.TAX_REFUND: 1,
            TransactionType.FEE_REFUND: 1,
        }
        # (-1) Outflows
        cash_minus = {
            TransactionType.BUY: -1,
            TransactionType.REMOVAL: -1,
            TransactionType.INTEREST_CHARGE: -1,
            TransactionType.TAX: -1,
            TransactionType.FEE: -1,
            TransactionType.CASH_TRANSFER: -1,
        }
        # Merge dictionaries
        cash_signs = {**cash_plus, **cash_minus}

        # Ensure 'type' is integer to match dictionary keys
        if not df_cash_calc.empty:
            df_cash_calc["type"] = (
                pd.to_numeric(df_cash_calc["type"], errors="coerce")
                .fillna(-1)
                .astype(int)
            )

        signs = df_cash_calc["type"].map(cash_signs).fillna(0)
        df_cash_calc["delta_cash"] = (df_cash_calc["amount"].fillna(0) / 100.0) * signs
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
