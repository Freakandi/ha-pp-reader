"""Unified Performance Engine for on-the-fly calculations."""

import logging
import sqlite3
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime

import pandas as pd

from custom_components.pp_reader.util.currency import PRICE_SCALE

_LOGGER = logging.getLogger(__name__)


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


class PerformanceEngine:
    """
    Unified performance calculation engine.

    This engine is responsible for all on-the-fly performance and wealth
    calculations, replacing the previous fragmented system of multiple engines.
    It loads all necessary data into memory and performs vectorized calculations
    using pandas for speed and efficiency.
    """

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Initialize with a database connection."""
        self.conn = conn
        self._df_txs = pd.DataFrame()
        self._df_units = pd.DataFrame()
        self._df_prices = pd.DataFrame()
        self._df_rates = pd.DataFrame()
        self._df_securities = pd.DataFrame()
        self._account_currencies: dict[str, str] = {}
        self._sec_curr_map: dict[str, str] = {}
        self._prices_idx = pd.DataFrame()
        self._rates_idx = pd.DataFrame()

    def load_data(self) -> None:  # noqa: PLR0912, PLR0915
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
        query_units = "SELECT transaction_uuid, type, amount, currency_code FROM transaction_units"  # noqa: E501
        try:
            self._df_units = pd.read_sql_query(query_units, self.conn)
        except pd.errors.DatabaseError:
            self._df_units = pd.DataFrame(
                columns=["transaction_uuid", "type", "amount", "currency_code"]
            )

        # historical prices
        query_prices = "SELECT security_uuid, date, close FROM historical_prices"
        try:
            self._df_prices = pd.read_sql_query(query_prices, self.conn)
            if not self._df_prices.empty:
                self._df_prices["date"] = self._df_prices["date"].apply(
                    self._parse_date_value
                )
                self._df_prices["close"] = self._df_prices["close"] / PRICE_SCALE
        except pd.errors.DatabaseError:
            self._df_prices = pd.DataFrame(columns=["security_uuid", "date", "close"])

        # live prices
        query_latest = "SELECT uuid as security_uuid, last_price as close, last_price_date FROM securities WHERE last_price IS NOT NULL AND last_price_date IS NOT NULL"  # noqa: E501
        try:
            df_latest = pd.read_sql_query(query_latest, self.conn)
            if not df_latest.empty:
                df_latest["date"] = (
                    pd.to_datetime(
                        df_latest["last_price_date"], unit="s", origin="unix"
                    )
                    .dt.tz_localize("UTC")
                    .dt.normalize()
                )
                df_latest = df_latest.drop(columns=["last_price_date"])
                df_latest["close"] = df_latest["close"] / PRICE_SCALE

                if not self._df_prices.empty:
                    self._df_prices = pd.concat(
                        [self._df_prices, df_latest]
                    ).drop_duplicates(subset=["security_uuid", "date"], keep="last")
                else:
                    self._df_prices = df_latest
        except pd.errors.DatabaseError:
            pass

        # fx rates
        query_rates = "SELECT date, currency, rate FROM fx_rates"
        try:
            self._df_rates = pd.read_sql_query(query_rates, self.conn)
            if not self._df_rates.empty:
                self._df_rates["date"] = pd.to_datetime(
                    self._df_rates["date"], utc=True
                ).dt.normalize()
        except pd.errors.DatabaseError:
            self._df_rates = pd.DataFrame(columns=["date", "currency", "rate"])

        # live fx rates
        query_rates_live = "SELECT date, term_currency as currency, rate FROM exchange_rates WHERE base_currency = 'EUR'"  # noqa: E501
        try:
            df_rates_live = pd.read_sql_query(query_rates_live, self.conn)
            if not df_rates_live.empty:
                df_rates_live["date"] = pd.to_datetime(
                    df_rates_live["date"], utc=True
                ).dt.normalize()
                df_rates_live["rate"] = df_rates_live["rate"] / PRICE_SCALE

                if not self._df_rates.empty:
                    self._df_rates = pd.concat(
                        [self._df_rates, df_rates_live]
                    ).drop_duplicates(subset=["date", "currency"], keep="last")
                else:
                    self._df_rates = df_rates_live
        except pd.errors.DatabaseError:
            pass

        # securities
        query_sec = "SELECT uuid, currency_code FROM securities"
        try:
            self._df_securities = pd.read_sql_query(query_sec, self.conn)
            self._sec_curr_map = self._df_securities.set_index("uuid")[
                "currency_code"
            ].to_dict()
        except (pd.errors.DatabaseError, KeyError):
            self._df_securities = pd.DataFrame(columns=["uuid", "currency_code"])
            self._sec_curr_map = {}

        # account currencies
        try:
            query = "SELECT uuid, currency_code FROM accounts"
            rows = self.conn.execute(query).fetchall()
            self._account_currencies = {r[0]: (r[1] or "EUR") for r in rows}
        except sqlite3.Error:
            self._account_currencies = {}

        if not self._df_prices.empty:
            self._prices_idx = self._df_prices.set_index(
                ["security_uuid", "date"]
            ).sort_index()
        else:
            self._prices_idx = pd.DataFrame()

        if not self._df_rates.empty:
            self._rates_idx = self._df_rates.set_index(
                ["currency", "date"]
            ).sort_index()
        else:
            self._rates_idx = pd.DataFrame()

    def get_daily_wealth(self, start_date: date, end_date: date) -> pd.DataFrame:
        """
        Calculate daily wealth metrics for a given date range.

        This method produces a time series DataFrame with key financial metrics
        for each day in the specified range, such as total wealth, invested
        capital, and various cash flow buckets.
        """
        date_range = pd.date_range(start=start_date, end=end_date, freq="D", tz="UTC")

        fx_pivot, price_pivot, price_exists_mask = self._prepare_market_data(
            self._df_rates, self._df_prices, date_range
        )

        df_augmented, fx_long = self._augment_transactions(self._df_txs, fx_pivot)

        daily_invested_cum = self._calculate_invested_capital(df_augmented, date_range)

        div_flow, int_net, fees_net, taxes_net = self._calculate_cash_accumulators(
            df_augmented, self._df_units, self._df_txs, fx_long, date_range
        )

        daily_sec_wealth, sec_holdings = self._calculate_security_wealth(
            df_augmented, price_pivot, fx_pivot, self._df_securities, date_range
        )

        daily_cash_wealth = self._calculate_cash_wealth(
            self._df_txs, fx_pivot, fx_long, date_range
        )

        common_cols = sec_holdings.columns.intersection(price_exists_mask.columns)
        sh_aligned = sec_holdings[common_cols]
        pem_aligned = price_exists_mask[common_cols]
        stale_securities = (sh_aligned > 0) & (~pem_aligned)
        daily_stale_flag = stale_securities.any(axis=1)

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

        neutral_map = {
            TransactionType.DEPOSIT: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.REMOVAL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
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
        result["inbound_transfers_eur"] = 0.0
        result["outbound_transfers_eur"] = 0.0
        result["stale_price"] = daily_stale_flag.astype(int)
        result["provenance"] = "performance_engine"

        result = result.reset_index().rename(columns={"index": "date"})
        result["date"] = result["date"].dt.strftime("%Y-%m-%d")

        return result

    def _augment_transfers(
        self, df_transfers: pd.DataFrame, fx_long: pd.DataFrame  # noqa: ARG002
    ) -> pd.DataFrame:
        """Augment transfer transactions with source currency information."""
        if df_transfers.empty:
            return df_transfers

        df_out = df_transfers.copy()
        df_out["currency_code"] = (
            df_out["account"].map(self._account_currencies).fillna("EUR")
        )
        df_out["type"] = TransactionType.REMOVAL

        df_in = df_transfers.copy()
        df_in["account"] = df_in["other_account"]
        df_in["type"] = TransactionType.DEPOSIT

        return pd.concat([df_out, df_in], ignore_index=True)

    def _parse_date_value(self, value: int) -> pd.Timestamp:
        """Parse an integer date value into a pandas Timestamp."""
        if value < EPOCH_DAY_THRESHOLD:  # Epoch day
            return pd.to_datetime(value, unit="D", origin="unix").tz_localize("UTC")
        return pd.to_datetime(str(value), format="%Y%m%d").tz_localize("UTC")

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

        start_row = daily_wealth[daily_wealth["date"] == start_prev.isoformat()]
        end_row = daily_wealth[daily_wealth["date"] == end_date.isoformat()]

        start_wealth = (
            start_row.iloc[0]["total_wealth_eur"] if not start_row.empty else 0.0
        )
        start_invested = (
            start_row.iloc[0]["invested_capital_eur"] if not start_row.empty else 0.0
        )
        end_wealth = end_row.iloc[0]["total_wealth_eur"] if not end_row.empty else 0.0
        end_invested = (
            end_row.iloc[0]["invested_capital_eur"] if not end_row.empty else 0.0
        )

        metrics.absolute_performance = (end_wealth - start_wealth) - (
            end_invested - start_invested
        )

        realized, unrealized = self._calculate_capital_gains(
            self._df_txs, start_date, end_date
        )
        metrics.realized_gains = realized
        metrics.unrealized_gains = unrealized

        metrics.fx_gains_cash = self._calculate_fx_performance(
            self._df_txs, start_date, end_date, self._account_currencies
        )

        return metrics

    def _prepare_market_data(
        self,
        df_rates: pd.DataFrame,
        df_prices: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        if not df_rates.empty:
            fx_pivot = df_rates.pivot_table(
                index="date", columns="currency", values="rate"
            )
        else:
            fx_pivot = pd.DataFrame(index=date_range)
        fx_pivot["EUR"] = 1.0
        fx_pivot = fx_pivot.reindex(date_range).ffill().bfill()

        if not df_prices.empty:
            price_pivot_unfilled = df_prices.pivot_table(
                index="date", columns="security_uuid", values="close"
            )
            price_pivot = price_pivot_unfilled.reindex(date_range)
            price_exists_mask = price_pivot.notna()
            price_pivot = price_pivot.ffill().bfill()
        else:
            price_pivot = pd.DataFrame(index=date_range)
            price_exists_mask = pd.DataFrame(index=date_range)

        return fx_pivot, price_pivot, price_exists_mask

    def _augment_transactions(
        self, df_txs: pd.DataFrame, fx_pivot: pd.DataFrame
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        fx_long = fx_pivot.reset_index(names="date").melt(
            id_vars="date", var_name="currency_code", value_name="daily_fx_rate"
        )
        fx_long["currency_code"] = fx_long["currency_code"].astype(str)
        fx_long["date"] = pd.to_datetime(fx_long["date"], utc=True).dt.normalize()

        if not df_txs.empty:
            df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
            df_txs["currency_code"] = df_txs["currency_code"].astype(str)
            df_augmented = df_txs.merge(
                fx_long, on=["date", "currency_code"], how="left"
            )
            df_augmented["daily_fx_rate"] = df_augmented["daily_fx_rate"].fillna(1.0)
            df_augmented["amount_eur"] = (
                df_augmented["amount"] / 100.0
            ) / df_augmented["daily_fx_rate"]
        else:
            df_augmented = pd.DataFrame(
                columns=["date", "type", "amount_eur", "security", "shares"]
            )

        return df_augmented, fx_long

    def _calculate_invested_capital(
        self, df_augmented: pd.DataFrame, date_range: pd.DatetimeIndex
    ) -> pd.Series:
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
            return (
                daily_invested_flow.cumsum()
                .reindex(date_range, method="ffill")
                .fillna(0.0)
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
            df_units_aug = df_units.merge(
                df_txs[["uuid", "date"]],
                left_on="transaction_uuid",
                right_on="uuid",
                how="left",
            )
            df_units_aug = df_units_aug.dropna(subset=["date"])
            df_units_aug = df_units_aug.merge(
                fx_long, on=["date", "currency_code"], how="left"
            )
            df_units_aug["daily_fx_rate"] = df_units_aug["daily_fx_rate"].fillna(1.0)
            df_units_aug["amount_eur"] = (
                df_units_aug["amount"] / 100.0
            ) / df_units_aug["daily_fx_rate"]

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
        _df_securities: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> tuple[pd.Series, pd.DataFrame]:
        sec_txs = df_augmented[df_augmented["security"].notna()].copy()
        daily_sec_wealth = pd.Series(0.0, index=date_range)
        if sec_txs.empty:
            return daily_sec_wealth, pd.DataFrame(index=date_range)

        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SECURITY_TRANSFER: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
        signs = sec_txs["type"].map(share_signs).fillna(0)
        shares_norm = sec_txs["shares"].fillna(0) / 100000000.0
        sec_txs["delta_shares"] = shares_norm * signs

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

        for sec_uuid in sec_holdings.columns:
            if sec_uuid not in price_pivot.columns:
                continue
            qty = sec_holdings[sec_uuid]
            prices = price_pivot[sec_uuid]
            curr = self._sec_curr_map.get(sec_uuid, "EUR")
            rates = (
                fx_pivot[curr]
                if curr in fx_pivot.columns
                else pd.Series(1.0, index=date_range)
            )
            val = (qty * prices) / rates.where(rates > 0, 1.0)
            daily_sec_wealth = daily_sec_wealth.add(val.fillna(0.0))

        return daily_sec_wealth, sec_holdings

    def _calculate_cash_wealth(
        self,
        df_txs: pd.DataFrame,
        fx_pivot: pd.DataFrame,
        fx_long: pd.DataFrame,
        date_range: pd.DatetimeIndex,
    ) -> pd.Series:
        daily_cash_wealth = pd.Series(0.0, index=date_range)
        if df_txs.empty:
            return daily_cash_wealth

        df_standard = df_txs[df_txs["type"] != TransactionType.CASH_TRANSFER].copy()
        df_transfers = df_txs[df_txs["type"] == TransactionType.CASH_TRANSFER].copy()

        if not df_transfers.empty:
            df_transfers_augmented = self._augment_transfers(df_transfers, fx_long)
            df_cash_calc = pd.concat(
                [df_standard, df_transfers_augmented], ignore_index=True
            )
        else:
            df_cash_calc = df_standard

        cash_signs = {
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
        }

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
        acc_balances = (
            acc_daily_change.cumsum().reindex(date_range, method="ffill").fillna(0.0)
        )

        for col in acc_balances.columns:
            _acc, curr = col
            bal = acc_balances[col]
            rates = (
                fx_pivot[curr]
                if curr in fx_pivot.columns
                else pd.Series(1.0, index=date_range)
            )
            val = bal / rates.where(rates > 0, 1.0)
            daily_cash_wealth = daily_cash_wealth.add(val.fillna(0.0))

        return daily_cash_wealth

    def _get_price(self, sec_id: str, d: pd.Timestamp) -> float:
        try:
            # Ensure the input datetime is timezone-aware to match the index
            if d.tzinfo is None:
                d = d.tz_localize("UTC")
            idx = (sec_id, d)
            if idx in self._prices_idx.index:
                return self._prices_idx.loc[idx, "close"]
            sec_prices = self._prices_idx.loc[sec_id]
            loc = sec_prices.index.searchsorted(d, side="right")
            if loc > 0:
                return sec_prices.iloc[loc - 1]["close"]
        except (KeyError, IndexError):
            pass
        return 0.0

    def _get_fx(self, curr: str, d: pd.Timestamp) -> float:
        if curr == "EUR":
            return 1.0
        try:
            if (curr, d) in self._rates_idx.index:
                return self._rates_idx.loc[(curr, d), "rate"]
            c_rates = self._rates_idx.loc[curr]
            loc = c_rates.index.searchsorted(d, side="right")
            if loc > 0:
                return c_rates.iloc[loc - 1]["rate"]
            if loc < len(c_rates):
                return c_rates.iloc[loc]["rate"]
        except (KeyError, IndexError):
            pass
        _LOGGER.warning("Missing FX rate for %s at %s - returning 1.0", curr, d)
        return 1.0

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

    def _calculate_capital_gains(  # noqa: PLR0912
        self, df_txs: pd.DataFrame, start_date: date, end_date: date
    ) -> tuple[float, float]:
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")
        inventory: dict[str, deque[Lot]] = {}
        realized_gains_eur = 0.0

        sec_types = [
            TransactionType.BUY,
            TransactionType.SELL,
            TransactionType.INBOUND_DELIVERY,
            TransactionType.OUTBOUND_DELIVERY,
            TransactionType.SECURITY_TRANSFER,
        ]
        txs = df_txs[df_txs["type"].isin(sec_types)].sort_values("date")

        if txs.empty:
            return 0.0, 0.0

        units_payload = self._load_transaction_units(txs["uuid"].tolist())

        for row in txs.itertuples():
            sec_id = row.security
            if not sec_id or row.shares_norm == 0:
                continue

            shares = abs(row.shares_norm)
            tx_price = 0.0
            fees = units_payload.get(row.uuid, {}).get("fees", 0)
            taxes = units_payload.get(row.uuid, {}).get("taxes", 0)

            if row.type in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                # For sells, reconstitute gross proceeds from net amount + fees/taxes
                gross_amt_cents = abs(row.amount) + fees + taxes
                if shares > 0:
                    tx_price = (gross_amt_cents / 100.0) / shares
            elif row.type in (TransactionType.BUY, TransactionType.INBOUND_DELIVERY):
                # For buys, cost basis is the total cash outflow (amount)
                if shares > 0 and row.amount is not None and row.amount != 0:
                    tx_price = abs(row.amount) / 100.0 / shares
                else:  # Fallback for deliveries without amount
                    tx_price = self._get_price(sec_id, row.date)
            elif row.type == TransactionType.SECURITY_TRANSFER:
                # For transfers, assume price is based on market value at the time
                tx_price = self._get_price(sec_id, row.date)

            tx_fx = self._get_fx(row.currency_code, row.date)

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
            elif row.type in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                if inventory.get(sec_id):
                    gain = self._process_security_sale(
                        inventory[sec_id],
                        shares,
                        tx_price,
                        tx_fx,
                        start_ts,
                        sec_id,
                        row.currency_code,
                    )
                    if row.date >= start_ts:
                        realized_gains_eur += gain

        unrealized_gains_eur = self._calculate_unrealized_security_gains(
            inventory, start_ts, end_ts
        )
        return realized_gains_eur, unrealized_gains_eur

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
        txs = self._df_txs[self._df_txs["type"].isin(sec_types)].sort_values("date")

        if txs.empty:
            return pd.Series(dtype=float), pd.Series(dtype=float)

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
                    tx_price = abs(row.amount) / 100.0 / shares
                else:
                    tx_price = self._get_price(sec_id, row.date)
            elif row.type == TransactionType.SECURITY_TRANSFER:
                tx_price = self._get_price(sec_id, row.date)

            tx_fx = self._get_fx(row.currency_code, row.date)

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

        realized_series = pd.Series(daily_realized, dtype=float)
        cost_basis_series = pd.Series(daily_basis_changes, dtype=float)

        return realized_series, cost_basis_series

    def _process_security_sale(
        self,
        lots: deque[Lot],
        shares_sold: float,
        sale_price: float,
        sale_fx: float,
        start_ts: pd.Timestamp,
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
            # date, its cost basis is the market price at the start date.
            base_price = (
                lot.price_native
                if lot.date >= start_ts
                else self._get_price(sec_id, start_ts)
            )
            base_fx = (
                lot.fx_rate
                if lot.date >= start_ts
                else self._get_fx(currency, start_ts)
            )

            sale_val_eur = sale_price / sale_fx if sale_fx else 0.0
            base_val_eur = base_price / base_fx if base_fx else 0.0
            gain_accum += (sale_val_eur - base_val_eur) * consumed
        return gain_accum

    def _calculate_unrealized_security_gains(
        self,
        inventory: dict[str, deque[Lot]],
        start_ts: pd.Timestamp,
        end_ts: pd.Timestamp,
    ) -> float:
        unrealized_gains_eur = 0.0
        for sec_id, lots in inventory.items():
            if not lots:
                continue
            curr = self._sec_curr_map.get(sec_id, "EUR")
            end_price = self._get_price(sec_id, end_ts)
            end_fx = self._get_fx(curr, end_ts)
            for lot in lots:
                # Implement "virtual lot" logic for unrealized gains as well.
                base_price = (
                    lot.price_native
                    if lot.date >= start_ts
                    else self._get_price(sec_id, start_ts)
                )
                base_fx = (
                    lot.fx_rate
                    if lot.date >= start_ts
                    else self._get_fx(curr, start_ts)
                )
                end_val_eur = end_price / end_fx if end_fx else 0.0
                base_val_eur = base_price / base_fx if base_fx else 0.0
                unrealized_gains_eur += (end_val_eur - base_val_eur) * lot.shares
        return unrealized_gains_eur

    def _calculate_fx_performance(  # noqa: PLR0912
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
        account_currencies: dict[str, str],
    ) -> float:
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")
        inventory: dict[tuple[str, str], deque[Lot]] = {}
        fx_gains_eur = 0.0
        txs = df_txs.sort_values("date")
        for row in txs.itertuples():
            operations = []
            if row.type == TransactionType.CASH_TRANSFER:
                target_acc = row.other_account
                target_curr = row.currency_code
                target_amt = abs(row.amount_norm)
                if target_acc:
                    operations.append((target_acc, target_curr, target_amt))
                source_acc = row.account
                if source_acc:
                    source_curr = account_currencies.get(source_acc, "EUR")
                    if source_curr == target_curr:
                        source_amt = -abs(row.amount_norm)
                        operations.append((source_acc, source_curr, source_amt))
                    else:
                        target_rate = self._get_fx(target_curr, row.date)
                        source_rate = self._get_fx(source_curr, row.date)
                        val_eur = (target_amt / target_rate) if target_rate else 0.0
                        amt_source = val_eur * source_rate
                        operations.append((source_acc, source_curr, -amt_source))
            else:
                sign = self._get_cash_flow_sign(row.type)
                if sign != 0:
                    operations.append(
                        (row.account, row.currency_code, row.amount_norm * sign)
                    )

            for acc_id, curr, cash_flow in operations:
                if not acc_id or curr == "EUR":
                    continue
                key = (acc_id, curr)
                tx_fx = self._get_fx(curr, row.date)
                if cash_flow > 0:
                    if key not in inventory:
                        inventory[key] = deque()
                    inventory[key].append(
                        Lot(
                            date=row.date,
                            shares=cash_flow,
                            price_native=1.0,
                            fx_rate=tx_fx,
                        )
                    )
                elif cash_flow < 0:
                    if inventory.get(key):
                        gain = self._process_cash_outflow(
                            inventory[key], abs(cash_flow), tx_fx, start_ts, curr
                        )
                        if row.date >= start_ts:
                            fx_gains_eur += gain
        # Unrealized
        for (_acc_id, curr), lots in inventory.items():
            if not lots:
                continue
            end_fx = self._get_fx(curr, end_ts)
            for lot in lots:
                base_fx = (
                    self._get_fx(curr, start_ts) if lot.date < start_ts else lot.fx_rate
                )
                end_val = (lot.shares / end_fx) if end_fx else 0.0
                base_val = (lot.shares / base_fx) if base_fx else 0.0
                fx_gains_eur += end_val - base_val
        return fx_gains_eur

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
                self._get_fx(curr, start_ts) if lot.date < start_ts else lot.fx_rate
            )
            val_tx = (consumed / tx_fx) if tx_fx else 0.0
            val_base = (consumed / base_fx) if base_fx else 0.0
            gain_accum += val_tx - val_base
        return gain_accum
