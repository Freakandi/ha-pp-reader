"""Performance Calculator Service."""

import logging
import sqlite3
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime

import pandas as pd

from custom_components.pp_reader.backdating.engine_pandas import TransactionType
from custom_components.pp_reader.util.currency import PRICE_SCALE

_LOGGER = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Result container for performance calculations."""

    absolute_performance: float = 0.0
    realized_gains: float = 0.0
    unrealized_gains: float = 0.0
    fx_gains_cash: float = 0.0


@dataclass(slots=True)
class Lot:
    """A tax lot for FIFO tracking."""

    date: datetime
    shares: float
    price_native: float
    fx_rate: float
    # For cash: price_native = 1.0


class PerformanceCalculator:
    """On-the-fly performance calculator."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Initialize with a database connection."""
        self.conn = conn
        self._prices_idx = pd.DataFrame()
        self._rates_idx = pd.DataFrame()

    def calculate(
        self,
        start_date: date,
        end_date: date,
        portfolio_ids: list[str] | None = None,
        account_ids: list[str] | None = None,
    ) -> PerformanceMetrics:
        """Calculate performance metrics for the given period."""
        metrics = PerformanceMetrics()

        # 1. Absolute Performance (from persisted daily_wealth)
        metrics.absolute_performance = self._calculate_absolute_performance(
            start_date, end_date
        )

        # 2. Load Data for Granular Metrics
        df_txs, df_prices, df_rates = self._load_data(
            end_date, portfolio_ids, account_ids
        )

        # Prepare lookup indices once
        if not df_prices.empty:
            self._prices_idx = df_prices.set_index(
                ["security_uuid", "date"]
            ).sort_index()
        else:
            self._prices_idx = pd.DataFrame()

        if not df_rates.empty:
            self._rates_idx = df_rates.set_index(["currency", "date"]).sort_index()
        else:
            self._rates_idx = pd.DataFrame()

        # 3. Capital Gains (Securities)
        realized, unrealized = self._calculate_capital_gains(
            df_txs, start_date, end_date
        )
        metrics.realized_gains = realized
        metrics.unrealized_gains = unrealized

        # 4. FX Performance (Cash)
        metrics.fx_gains_cash = self._calculate_fx_performance(
            df_txs, start_date, end_date
        )

        # Cleanup
        self._prices_idx = pd.DataFrame()
        self._rates_idx = pd.DataFrame()

        return metrics

    def _calculate_absolute_performance(
        self, start_date: date, end_date: date
    ) -> float:
        """Calculate Absolute Performance: Delta Wealth - Delta Invested."""
        query = """
            SELECT date, total_wealth_eur, invested_capital_eur
            FROM daily_wealth
            WHERE date IN (?, ?)
            ORDER BY date
        """
        end_str = end_date.isoformat()

        start_prev = start_date - pd.Timedelta(days=1)
        start_prev_str = start_prev.isoformat()

        cursor = self.conn.execute(query, (start_prev_str, end_str))
        rows = {row[0]: row for row in cursor.fetchall()}

        start_row = rows.get(start_prev_str)
        end_row = rows.get(end_str)

        start_wealth = start_row[1] if start_row else 0.0
        start_invested = start_row[2] if start_row else 0.0

        end_wealth = end_row[1] if end_row else 0.0
        end_invested = end_row[2] if end_row else 0.0

        delta_wealth = end_wealth - start_wealth
        delta_invested = end_invested - start_invested

        return delta_wealth - delta_invested

    def _load_data(
        self,
        until_date: date,
        portfolio_ids: list[str] | None = None,
        account_ids: list[str] | None = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load transactions and market data required for calculations."""
        tx_filter_parts = ["date <= ?"]
        params = [until_date.isoformat()]

        if account_ids:
            placeholders = ",".join("?" for _ in account_ids)
            tx_filter_parts.append(f"account IN ({placeholders})")
            params.extend(account_ids)

        if portfolio_ids and not account_ids:
            # Merging portfolio_ids as account IDs (simplification)
            all_ids = (portfolio_ids or []) + (account_ids or [])
            if all_ids:
                placeholders = ",".join("?" for _ in all_ids)
                params = [until_date.isoformat()]
                tx_filter_parts = ["date <= ?"]
                tx_filter_parts.append(f"account IN ({placeholders})")
                params.extend(all_ids)

        where_clause = " AND ".join(tx_filter_parts)

        # S608: Dynamic SQL construction is required for variable IN clauses.
        # Inputs are strictly controlled (dates/uuids) and passed as parameters.
        query_txs = f"""
            SELECT
                uuid, type, date, account, security, shares, amount, currency_code
            FROM transactions
            WHERE {where_clause}
            ORDER BY date
        """  # noqa: S608

        try:
            df_txs = pd.read_sql_query(
                query_txs,
                self.conn,
                params=tuple(params),
                parse_dates=["date"],
            )
        except pd.errors.DatabaseError:
            df_txs = pd.DataFrame()

        if not df_txs.empty:
            df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
            df_txs["shares_norm"] = df_txs["shares"] / 100000000.0
            df_txs["amount_norm"] = df_txs["amount"] / 100.0
        else:
            df_txs = pd.DataFrame(
                columns=[
                    "uuid",
                    "type",
                    "date",
                    "shares_norm",
                    "amount_norm",
                    "currency_code",
                    "security",
                    "account",
                ]
            )
            df_txs["date"] = pd.to_datetime([], utc=True)

        query_prices = """
            SELECT security_uuid, date, close
            FROM historical_prices
            WHERE date <= ?
        """

        try:
            df_prices = pd.read_sql_query(
                query_prices, self.conn, params=(until_date.isoformat(),)
            )
            if not df_prices.empty:
                df_prices["date"] = pd.to_datetime(
                    df_prices["date"], unit="D", origin="unix"
                ).dt.tz_localize("UTC")
                df_prices["close"] = df_prices["close"] / PRICE_SCALE
        except pd.errors.DatabaseError:
            df_prices = pd.DataFrame(columns=["security_uuid", "date", "close"])

        query_rates = """
            SELECT date, currency, rate FROM fx_rates WHERE date <= ?
        """
        try:
            df_rates = pd.read_sql_query(
                query_rates, self.conn, params=(until_date.isoformat(),)
            )
            if not df_rates.empty:
                df_rates["date"] = pd.to_datetime(
                    df_rates["date"], utc=True
                ).dt.normalize()
                df_rates["rate"] = df_rates["rate"] / PRICE_SCALE
        except pd.errors.DatabaseError:
            df_rates = pd.DataFrame(columns=["date", "currency", "rate"])

        return df_txs, df_prices, df_rates

    def _get_price(self, sec_id: str, d: pd.Timestamp) -> float:
        try:
            idx = (sec_id, d)
            if idx in self._prices_idx.index:
                return self._prices_idx.loc[idx, "close"]

            try:
                sec_prices = self._prices_idx.loc[sec_id]
                loc = sec_prices.index.searchsorted(d, side="right")
                if loc > 0:
                    return sec_prices.iloc[loc - 1]["close"]
            except KeyError:
                pass
        except (KeyError, IndexError):
            pass
        return 0.0

    def _get_fx(self, curr: str, d: pd.Timestamp) -> float:
        if curr == "EUR":
            return 1.0
        try:
            if (curr, d) in self._rates_idx.index:
                return self._rates_idx.loc[(curr, d), "rate"]

            try:
                c_rates = self._rates_idx.loc[curr]
                loc = c_rates.index.searchsorted(d, side="right")
                if loc > 0:
                    return c_rates.iloc[loc - 1]["rate"]
            except KeyError:
                pass
        except (KeyError, IndexError):
            pass
        return 1.0

    def _calculate_capital_gains(
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
    ) -> tuple[float, float]:
        """Calculate Realized and Unrealized Gains for Securities."""
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

        for row in txs.itertuples():
            sec_id = row.security
            if not sec_id or row.shares_norm == 0:
                continue

            shares = abs(row.shares_norm)
            tx_price = 0.0
            if row.amount_norm != 0:
                tx_price = abs(row.amount_norm) / shares

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
                    # Only accumulate gain if transaction is within period
                    is_eligible = row.date >= start_ts
                    gain = self._process_security_sale(
                        inventory[sec_id],
                        shares,
                        tx_price,
                        tx_fx,
                        start_ts,
                        sec_id,
                        row.currency_code,
                    )
                    if is_eligible:
                        realized_gains_eur += gain

        unrealized_gains_eur = self._calculate_unrealized_security_gains(
            inventory, df_txs, start_ts, end_ts
        )

        return realized_gains_eur, unrealized_gains_eur

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
            if lot.shares > remaining:
                consumed = remaining
                lot.shares -= remaining
                remaining = 0
            else:
                consumed = lot.shares
                remaining -= lot.shares
                lots.popleft()

            if lot.date < start_ts:
                base_price = self._get_price(sec_id, start_ts)
                base_fx = self._get_fx(currency, start_ts)
            else:
                base_price = lot.price_native
                base_fx = lot.fx_rate

            sale_val_eur = sale_price * sale_fx
            base_val_eur = base_price * base_fx

            gain_accum += (sale_val_eur - base_val_eur) * consumed

        return gain_accum

    def _calculate_unrealized_security_gains(
        self,
        inventory: dict[str, deque[Lot]],
        df_txs: pd.DataFrame,
        start_ts: pd.Timestamp,
        end_ts: pd.Timestamp,
    ) -> float:
        unrealized_gains_eur = 0.0
        sec_curr_map = (
            df_txs[["security", "currency_code"]]
            .dropna()
            .drop_duplicates("security")
            .set_index("security")["currency_code"]
            .to_dict()
        )

        for sec_id, lots in inventory.items():
            if not lots:
                continue

            curr = sec_curr_map.get(sec_id, "EUR")
            end_fx = self._get_fx(curr, end_ts)
            end_price = self._get_price(sec_id, end_ts)

            for lot in lots:
                if lot.date < start_ts:
                    base_price = self._get_price(sec_id, start_ts)
                    base_fx = self._get_fx(curr, start_ts)
                else:
                    base_price = lot.price_native
                    base_fx = lot.fx_rate

                end_val_eur = end_price * end_fx
                base_val_eur = base_price * base_fx

                gain = (end_val_eur - base_val_eur) * lot.shares
                unrealized_gains_eur += gain

        return unrealized_gains_eur

    def _calculate_fx_performance(
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
    ) -> float:
        """Calculate FX Performance for Cash Accounts."""
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")

        inventory: dict[tuple[str, str], deque[Lot]] = {}
        fx_gains_eur = 0.0

        txs = df_txs.sort_values("date")

        for row in txs.itertuples():
            raw_amt = row.amount_norm
            if raw_amt == 0:
                continue

            sign = self._get_cash_flow_sign(row.type)
            if sign == 0:
                continue

            cash_flow = abs(raw_amt) * sign
            acc_id = row.account
            curr = row.currency_code
            if not acc_id:
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
                    is_eligible = row.date >= start_ts
                    gain = self._process_cash_outflow(
                        inventory[key], abs(cash_flow), tx_fx, start_ts, curr
                    )
                    if is_eligible:
                        fx_gains_eur += gain

        # Unrealized Gains on Cash
        for (_acc_id, curr), lots in inventory.items():
            if not lots:
                continue

            end_fx = self._get_fx(curr, end_ts)

            for lot in lots:
                base_fx = (
                    self._get_fx(curr, start_ts) if lot.date < start_ts else lot.fx_rate
                )
                gain = (end_fx - base_fx) * lot.shares
                fx_gains_eur += gain

        return fx_gains_eur

    def _get_cash_flow_sign(self, t_type: int) -> int:
        if t_type in (
            TransactionType.SELL,
            TransactionType.DEPOSIT,
            TransactionType.DIVIDEND,
            TransactionType.INTEREST,
            TransactionType.TAX_REFUND,
            TransactionType.FEE_REFUND,
        ):
            return 1
        if t_type in (
            TransactionType.BUY,
            TransactionType.REMOVAL,
            TransactionType.INTEREST_CHARGE,
            TransactionType.TAX,
            TransactionType.FEE,
            TransactionType.CASH_TRANSFER,
        ):
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
            if lot.shares > remaining:
                consumed = remaining
                lot.shares -= remaining
                remaining = 0
            else:
                consumed = lot.shares
                remaining -= lot.shares
                lots.popleft()

            base_fx = (
                self._get_fx(curr, start_ts) if lot.date < start_ts else lot.fx_rate
            )
            gain_accum += (tx_fx - base_fx) * consumed

        return gain_accum
