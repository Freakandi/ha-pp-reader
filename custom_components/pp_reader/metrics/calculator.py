"""Unified Performance Engine for on-the-fly calculations."""

from __future__ import annotations

import dataclasses
import logging
import sqlite3
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING, Any

import numpy as np
import pandas as pd

from custom_components.pp_reader.const import (
    SHARE_EPSILON,
    TransactionType,
)
from custom_components.pp_reader.data import db_access
from custom_components.pp_reader.data.db_access import Transaction

if TYPE_CHECKING:
    from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


_LOGGER = logging.getLogger(__name__)


_CONVERGENCE_THRESHOLD = 1e-6
_BREAKDOWN_THRESHOLD = 0.01
_GAIN_EPSILON = 1e-6
_ZERO_AMOUNT_EPSILON = 0.0001


# Constants from TransactionType in engine_pandas.py
# TransactionType enum is now imported from const.py


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
    twr: float = 0.0
    irr: float = 0.0

    # UI Waterfall components
    start_wealth: float = 0.0
    end_wealth: float = 0.0
    dividends: float = 0.0
    fees: float = 0.0
    taxes: float = 0.0
    interest: float = 0.0
    net_transfers: float = 0.0


@dataclass
class BreakdownItem:
    """A single item in the performance breakdown."""

    label: str
    amount: float
    details: dict | None = None


@dataclass
class PerformanceBreakdown:
    """Detailed breakdown of performance components."""

    realized_gains: list[BreakdownItem]
    unrealized_gains: list[BreakdownItem]
    dividends: list[BreakdownItem]
    fees: list[BreakdownItem]
    taxes: list[BreakdownItem]
    interest: list[BreakdownItem]
    fx_gains: list[BreakdownItem] = dataclasses.field(default_factory=list)
    total: float = 0.0


@dataclass
class RealizedTrade:
    """Represents a closed trade calculated via FIFO."""

    security_uuid: str
    buy_date: datetime
    sell_date: datetime
    shares: float
    buy_cost_eur: float
    sell_value_eur: float
    realized_gain_eur: float
    opportunity_gain_eur: float | None = None


class PerformanceEngine:
    """
    Unified performance calculation engine.

    This engine is responsible for all on-the-fly performance and wealth
    calculations, replacing the previous fragmented system of multiple engines.
    It loads all necessary data into memory and performs vectorized calculations
    using pandas for speed and efficiency.
    """

    def __init__(
        self, conn: sqlite3.Connection, market_resolver: MarketResolver
    ) -> None:
        """Initialize with a database connection."""
        self.conn = conn
        self.market_resolver = market_resolver
        self._df_txs = pd.DataFrame()
        self._df_units = pd.DataFrame()
        self._account_currencies: dict[str, str] = {}
        self._account_name_map: dict[str, str] = {}
        self._sec_name_map: dict[str, str] = {}
        self._account_portfolios: dict[str, str] = {}

    def get_snapshot(
        self, snapshot_date: date, portfolio_uuid: str | None = None
    ) -> dict[str, float]:
        """
        Calculate portfolio valuation (Wealth) at a specific date.

        Provides a Single Source of Truth for point-in-time valuation.
        This method relies on the dataframes loaded by `load_data()`.
        """
        if self._df_txs.empty:
            self.load_data()

        valuation_ts = pd.Timestamp(snapshot_date, tz="UTC")

        # 1. Securities Wealth
        # _get_holdings_at_date is exclusive of the date passed, so we add a day
        # to get holdings at the end of snapshot_date.
        holdings_date = snapshot_date + pd.Timedelta(days=1)
        security_inventory = self._get_holdings_at_date(
            holdings_date, portfolio_uuid=portfolio_uuid
        )
        securities_wealth = 0.0
        for sec_uuid, quantity in security_inventory.items():
            price = self.market_resolver.get_price(sec_uuid, valuation_ts)
            currency = self.market_resolver.get_security_currency(sec_uuid)
            fx_rate = self.market_resolver.get_fx(currency, valuation_ts)
            value_eur = (quantity * price) / fx_rate if fx_rate else 0.0
            securities_wealth += value_eur

        # 2. Cash Wealth
        # _get_account_balances is exclusive, so add a day.
        balances_ts = valuation_ts + pd.Timedelta(days=1)
        cash_balances = self._get_account_balances(
            balances_ts, portfolio_uuid=portfolio_uuid
        )
        cash_wealth = 0.0
        if not cash_balances.empty:
            for (_acc_uuid, currency), balance in cash_balances.items():
                fx_rate = self.market_resolver.get_fx(currency, valuation_ts)
                value_eur = balance / fx_rate if fx_rate else 0.0
                cash_wealth += value_eur

        # 3. Invested Capital
        # Create a transaction list from the dataframe up to the snapshot date.
        end_ts_inclusive = valuation_ts + pd.Timedelta(days=1, microseconds=-1)
        df_txs_scoped = self._df_txs
        if portfolio_uuid:
            # Filter transactions to the specific portfolio for invested capital
            # calculation.
            # This relies on the 'portfolio' field of a transaction being the
            # authoritative link.
            df_txs_scoped = df_txs_scoped[df_txs_scoped["portfolio"] == portfolio_uuid]
        df_txs_up_to = df_txs_scoped[df_txs_scoped["date"] <= end_ts_inclusive]

        valid_fields = {f.name for f in dataclasses.fields(Transaction)}
        txs_dict = df_txs_up_to.to_dict("records")
        filtered_txs_dict = [
            {k: v for k, v in row.items() if k in valid_fields} for row in txs_dict
        ]
        transactions = [Transaction(**row) for row in filtered_txs_dict]
        invested_capital = self._calculate_invested_capital(transactions)

        return {
            "total_wealth": securities_wealth + cash_wealth,
            "securities_wealth": securities_wealth,
            "cash_wealth": cash_wealth,
            "invested_capital": invested_capital,
        }

    def _get_transactions_up_to(self, snapshot_date: date) -> list[Transaction]:
        """Fetch all transactions from the database up to and including a given date."""
        return db_access.get_transactions(conn=self.conn, end_date=snapshot_date)

    def _calculate_security_inventory(
        self, transactions: list[Transaction]
    ) -> dict[str, float]:
        """Calculate the quantity of each security from a list of transactions."""
        inventory = defaultdict(float)
        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }

        for tx in transactions:
            if tx.security and tx.type in share_signs and tx.shares is not None:
                inventory[tx.security] += tx.shares / 1e8 * share_signs.get(tx.type, 0)

        return {sec: qty for sec, qty in inventory.items() if abs(qty) > SHARE_EPSILON}

    def _calculate_cash_inventory(
        self, transactions: list[Transaction]
    ) -> dict[tuple[str, str], float]:
        """Calculate the balance of each cash account from a list of transactions."""
        inventory = defaultdict(float)
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

        for tx in transactions:
            if tx.account and tx.type in cash_signs and tx.amount is not None:
                inventory[(tx.account, tx.currency_code)] += (
                    tx.amount / 100.0 * cash_signs.get(tx.type, 0)
                )

            if tx.type == TransactionType.CASH_TRANSFER:
                if tx.account and tx.amount is not None:
                    inventory[(tx.account, tx.currency_code)] -= tx.amount / 100.0
                if tx.other_account and tx.amount is not None:
                    inventory[(tx.other_account, tx.currency_code)] += tx.amount / 100.0

        return {acc: bal for acc, bal in inventory.items() if abs(bal) > SHARE_EPSILON}

    def _calculate_invested_capital(  # noqa: PLR0912
        self,
        transactions: list[Transaction],
    ) -> float:
        """
        Calculate the total invested capital from external flows.

        This method correctly "grosses up" flows by including associated fees and
        taxes from transaction_units to reflect the true external capital movement.
        """
        invested_capital = 0.0
        flow_types = {
            TransactionType.DEPOSIT: 1,
            TransactionType.REMOVAL: -1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }

        flow_txs = [tx for tx in transactions if tx.type in flow_types]
        if not flow_txs:
            return 0.0

        # Pre-calculate EUR value of all fee/tax units associated with these flows
        flow_tx_uuids = [tx.uuid for tx in flow_txs]
        df_flow_units = self._df_units[
            self._df_units["transaction_uuid"].isin(flow_tx_uuids)
        ]
        df_flow_units = df_flow_units[
            df_flow_units["type"].isin([UNIT_TYPE_FEE, UNIT_TYPE_TAX])
        ]

        unit_sums_eur = defaultdict(float)
        if not df_flow_units.empty:
            tx_date_map = {tx.uuid: tx.date for tx in flow_txs}
            for unit_row in df_flow_units.itertuples():
                tx_uuid = unit_row.transaction_uuid
                tx_date = tx_date_map.get(tx_uuid)
                if tx_date:
                    rate = self.market_resolver.get_fx(unit_row.currency_code, tx_date)
                    unit_val_eur = (unit_row.amount / 100.0) / rate if rate else 0.0
                    unit_sums_eur[tx_uuid] += unit_val_eur

        for tx in flow_txs:
            sign = flow_types[tx.type]
            value_eur = 0.0

            if isinstance(tx.date, str):
                tx_ts = datetime.fromisoformat(tx.date).replace(tzinfo=UTC)
            else:
                tx_ts = pd.Timestamp(tx.date).to_pydatetime()
                if tx_ts.tzinfo is None:
                    tx_ts = tx_ts.replace(tzinfo=UTC)

            if tx.security and tx.shares is not None:
                price = self.market_resolver.get_price(tx.security, tx_ts)
                currency = self.market_resolver.get_security_currency(tx.security)
                fx_rate = self.market_resolver.get_fx(currency, tx_ts)
                value_eur = (abs(tx.shares) / 1e8 * price) / (
                    fx_rate if fx_rate else 0.0
                )
            elif tx.amount is not None:
                # Priority 1: Use explicit transaction rate if available
                if tx.fx_rate_used and tx.fx_rate_used > 0:
                    fx_rate = tx.fx_rate_used
                else:
                    fx_rate = self.market_resolver.get_fx(tx.currency_code, tx_ts)

                value_eur = (abs(tx.amount) / 100.0) / fx_rate if fx_rate else 0.0

            # Gross up the value with associated fees/taxes only for Inflows
            if sign > 0:
                total_value_eur = value_eur + unit_sums_eur.get(tx.uuid, 0.0)
            else:
                total_value_eur = value_eur

            invested_capital += total_value_eur * sign

        return invested_capital

    def load_data(self) -> None:
        """
        Load all necessary data from the database into pandas DataFrames.

        This method centralizes data loading from various tables like transactions,
        prices, and FX rates, preparing them for calculations. It also handles
        the injection of "live" prices and rates to ensure calculations for
        "today" are up-to-date.
        """
        # transactions
        query_txs = "SELECT uuid, type, date, account, other_account, portfolio, other_portfolio, security, shares, amount, currency_code, fx_rate_used FROM transactions ORDER BY date"  # noqa: E501
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
                    "portfolio",
                    "other_portfolio",
                    "security",
                    "shares",
                    "amount",
                    "currency_code",
                    "fx_rate_used",
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
            query = "SELECT uuid, currency_code, name, portfolio_uuid FROM accounts"
            rows = self.conn.execute(query).fetchall()
            self._account_currencies = {r[0]: (r[1] or "EUR") for r in rows}
            self._account_name_map = {r[0]: (r[2] or "Unknown Account") for r in rows}
            self._account_portfolios = {r[0]: r[3] for r in rows if r[3]}
        except sqlite3.Error:
            self._account_currencies = {}
            self._account_name_map = {}
            self._account_portfolios = {}

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

            val_eur = (qty * price) / (rate if rate else 0.0)
            sec_wealth += val_eur

        # 2. Cash Wealth
        # _get_account_balances returns balances strictly < start_ts (so EOD d-1)
        balances = self._get_account_balances(start_ts)
        cash_wealth = 0.0

        for (_acc_id, curr), bal in balances.items():
            # Use basis_ts (T-1) for FX
            rate = self._get_fx(curr, basis_ts)
            val_eur = bal / (rate if rate else 0.0)
            cash_wealth += val_eur

        return {
            "total_wealth": sec_wealth + cash_wealth,
            "securities_wealth": sec_wealth,
            "cash_wealth": cash_wealth,
        }

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

    def _calculate_period_fees_taxes(
        self, df_augmented: pd.DataFrame, df_txs_window: pd.DataFrame
    ) -> tuple[float, float]:
        """Calculate total fees and taxes for the period from explicit txs and units."""
        # Calculate Fees and Taxes from both explicit transactions and transaction_units
        fees_from_txs = (
            df_augmented[df_augmented["type"] == TransactionType.FEE]["amount_eur"]
            .abs()
            .sum()
        )
        taxes_from_txs = (
            df_augmented[df_augmented["type"] == TransactionType.TAX]["amount_eur"]
            .abs()
            .sum()
        )

        fees_from_units = 0.0
        taxes_from_units = 0.0
        if not self._df_units.empty and not df_txs_window.empty:
            df_units_in_window = self._df_units[
                self._df_units["transaction_uuid"].isin(df_txs_window["uuid"])
            ].copy()
            if not df_units_in_window.empty:
                df_units_dated = df_units_in_window.merge(
                    df_txs_window[["uuid", "date"]],
                    left_on="transaction_uuid",
                    right_on="uuid",
                    how="left",
                )
                df_units_augmented = self._augment_txs_with_market_data(df_units_dated)
                df_units_augmented["amount_norm"] = df_units_augmented["amount"] / 100.0
                df_units_augmented["amount_eur"] = np.where(
                    df_units_augmented["fx_rate"] != 0,
                    df_units_augmented["amount_norm"] / df_units_augmented["fx_rate"],
                    0.0,
                )
                fees_from_units = (
                    df_units_augmented[df_units_augmented["type"] == UNIT_TYPE_FEE][
                        "amount_eur"
                    ]
                    .abs()
                    .sum()
                )
                taxes_from_units = (
                    df_units_augmented[df_units_augmented["type"] == UNIT_TYPE_TAX][
                        "amount_eur"
                    ]
                    .abs()
                    .sum()
                )

        fees = fees_from_txs + fees_from_units
        taxes = taxes_from_txs + taxes_from_units
        return fees, taxes

    def calculate_period_performance(
        self, start_date: date, end_date: date
    ) -> PerformanceMetrics:
        """
        Calculate performance metrics for a specific period using attribution.

        This method strictly adheres to the formula:
        End Wealth = Start Wealth + Net Flows + Sum of Performance Components

        It computes key performance indicators like absolute performance,
        realized and unrealized gains, and FX gains on cash for the given
        start and end dates.
        """
        metrics = PerformanceMetrics()
        start_prev = start_date - pd.Timedelta(days=1)

        # 1. Get Start and End Portfolio State
        start_state = self.get_snapshot(start_prev)
        end_state = self.get_snapshot(end_date)
        start_wealth = start_state["total_wealth"]
        end_wealth = end_state["total_wealth"]
        metrics.start_wealth = start_wealth
        metrics.end_wealth = end_wealth

        # 2. Calculate Net External Flows for the period
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")
        window_mask = (self._df_txs["date"] >= start_ts) & (
            self._df_txs["date"] <= end_ts
        )
        df_txs_window = self._df_txs[window_mask]

        valid_fields = {f.name for f in dataclasses.fields(Transaction)}
        txs_dict = df_txs_window.to_dict("records")
        filtered_txs_dict = [
            {k: v for k, v in row.items() if k in valid_fields} for row in txs_dict
        ]

        transactions_in_period = [Transaction(**row) for row in filtered_txs_dict]
        net_flows = self._calculate_invested_capital(transactions_in_period)
        metrics.net_transfers = net_flows

        # 3. Calculate Performance Components
        # a. Capital Gains (Realized and Unrealized)
        virtual_inventory, _, basis_ts = self._setup_virtual_inventory(start_date)

        # Augment transactions with fees/taxes for accurate Cost Basis/Proceeds
        tx_uuids = [tx.uuid for tx in transactions_in_period]
        units_payload = self._load_transaction_units(tx_uuids)
        for tx in transactions_in_period:
            if tx.uuid in units_payload:
                payload = units_payload[tx.uuid]
                tx.fees = payload.get("fees", 0)
                tx.taxes = payload.get("taxes", 0)

        realized, unrealized = self._calculate_capital_gains(
            transactions_in_period,
            start_date,
            end_date,
            initial_inventory=virtual_inventory,
            basis_ts=basis_ts,
        )
        metrics.realized_gains = realized
        metrics.unrealized_gains = unrealized

        # b. FX Gains on Cash
        metrics.fx_gains_cash = self._calculate_fx_performance(
            self._df_txs,  # needs full history for start/end balance
            start_date,
            end_date,
            basis_ts=basis_ts,
        )

        # c. Other Cash Flows (Dividends, Fees, etc.)
        # These are not directly part of the performance metrics object yet,
        # but are implicitly included in the absolute performance calculation.

        # 4. Calculate Absolute Performance (System Delta)
        metrics.absolute_performance = (end_wealth - start_wealth) - net_flows

        # 5. Invariant Check (for debugging and validation)
        df_augmented = self._augment_txs_with_market_data(df_txs_window)
        df_augmented["amount_eur"] = np.where(
            df_augmented["fx_rate"] != 0,
            df_augmented["amount_norm"] / df_augmented["fx_rate"],
            0.0,
        )

        dividends = df_augmented[df_augmented["type"] == TransactionType.DIVIDEND][
            "amount_eur"
        ].sum()
        interest = df_augmented[df_augmented["type"] == TransactionType.INTEREST][
            "amount_eur"
        ].sum()

        # Calculate Fees and Taxes
        metrics.fees, metrics.taxes = self._calculate_period_fees_taxes(
            df_augmented, df_txs_window
        )

        # Populate metrics object for UI
        metrics.dividends = dividends
        metrics.interest = interest

        sum_components = (
            metrics.realized_gains
            + metrics.unrealized_gains
            + metrics.fx_gains_cash
            + metrics.dividends
            + metrics.interest
            - metrics.fees  # Fees are a negative contribution
            - metrics.taxes  # Taxes are a negative contribution
        )

        system_delta = metrics.absolute_performance
        if abs(system_delta - sum_components) > _CONVERGENCE_THRESHOLD:
            _LOGGER.warning(
                (
                    "Performance invariant mismatch. "
                    "System Delta: %.2f, Sum of Components: %.2f"
                ),
                system_delta,
                sum_components,
            )

        # TWR and IRR are not part of this refactoring step.
        metrics.twr = 0.0
        metrics.irr = 0.0

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
        transactions = [Transaction(**row) for row in df_augmented.to_dict("records")]
        realized_map, unrealized_map = self._calculate_capital_gains_detailed(
            transactions,  # Use augmented DF
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

    def calculate_realized_performance(
        self, scope_uuid: str | None = None
    ) -> list[RealizedTrade]:
        """
        Calculate realized trades for history using FIFO logic.

        This method processes all security transactions to match buys and sells,
        calculating the realized gain for each closed trade.

        Args:
            scope_uuid: Optional UUID of a portfolio or account to limit the scope.
                        If None, calculates for all portfolios, treating transfers
                        between portfolios as internal and thus not realizing gains.

        Returns:
            A list of RealizedTrade objects representing all closed trades.

        """
        if self._df_txs.empty:
            self.load_data()

        df_txs = self._df_txs.copy()

        # --- Scoping Logic ---
        if scope_uuid:
            # For a scoped view, a transfer out is a "sell", a transfer in is a "buy".
            is_source = df_txs["portfolio"] == scope_uuid
            is_target = (df_txs["type"] == TransactionType.SECURITY_TRANSFER) & (
                df_txs["other_portfolio"] == scope_uuid
            )
            df_txs = df_txs[is_source | is_target].copy()

            # Remap transfer types to buy/sell based on direction relative to scope
            mask_transfer_out = (
                df_txs["type"] == TransactionType.SECURITY_TRANSFER
            ) & (df_txs["portfolio"] == scope_uuid)
            df_txs.loc[mask_transfer_out, "type"] = TransactionType.OUTBOUND_DELIVERY

            mask_transfer_in = (df_txs["type"] == TransactionType.SECURITY_TRANSFER) & (
                df_txs["other_portfolio"] == scope_uuid
            )
            df_txs.loc[mask_transfer_in, "type"] = TransactionType.INBOUND_DELIVERY
        else:
            # For a global view, internal transfers do not realize gains. Ignore them.
            df_txs = df_txs[df_txs["type"] != TransactionType.SECURITY_TRANSFER].copy()

        units_payload = self._load_transaction_units(df_txs["uuid"].tolist())
        inventory: dict[str, deque[Lot]] = {}
        realized_trades: list[RealizedTrade] = []
        today = datetime.now(UTC)

        df_txs = df_txs.sort_values("date")

        for tx_row in df_txs.itertuples():
            sec_id = tx_row.security
            if not sec_id or not tx_row.shares or tx_row.shares == 0:
                continue

            tx_date = tx_row.date.to_pydatetime()
            if tx_date.tzinfo is None:
                tx_date = tx_date.replace(tzinfo=UTC)

            shares = abs(tx_row.shares_norm)
            tx_units = units_payload.get(tx_row.uuid, {})
            fees = tx_units.get("fees", 0)
            taxes = tx_units.get("taxes", 0)

            # Inbound: BUY, INBOUND_DELIVERY
            if tx_row.type in {TransactionType.BUY, TransactionType.INBOUND_DELIVERY}:
                self._process_fifo_inbound(
                    tx_row, sec_id, tx_date, shares, fees, taxes, inventory
                )

            # Outbound: SELL, OUTBOUND_DELIVERY
            elif tx_row.type in {
                TransactionType.SELL,
                TransactionType.OUTBOUND_DELIVERY,
            }:
                self._process_fifo_outbound(
                    tx_row,
                    sec_id,
                    tx_date,
                    shares,
                    fees,
                    taxes,
                    inventory,
                    realized_trades,
                    today,
                )

        return realized_trades

    def get_fifo_active_lots(
        self, scope_uuid: str | None = None
    ) -> dict[str, list[Lot]]:
        """
        Calculate the active lots (cost basis inventory) using FIFO logic.

        This method performs the same FIFO replay as `calculate_realized_performance`
        but returns the final state of the inventory instead of the realized trades.

        Args:
            scope_uuid: Optional UUID of a portfolio or account to limit the scope.

        Returns:
            A dictionary where keys are security UUIDs and values are lists of
            active `Lot` objects.

        """
        if self._df_txs.empty:
            self.load_data()

        df_txs = self._df_txs.copy()

        # --- Scoping Logic (copied from calculate_realized_performance) ---
        if scope_uuid:
            # For a scoped view, a transfer out is a "sell", a transfer in is a "buy".
            is_source = df_txs["portfolio"] == scope_uuid
            is_target = (df_txs["type"] == TransactionType.SECURITY_TRANSFER) & (
                df_txs["other_portfolio"] == scope_uuid
            )
            df_txs = df_txs[is_source | is_target].copy()

            # Remap transfer types to buy/sell based on direction relative to scope
            mask_transfer_out = (
                df_txs["type"] == TransactionType.SECURITY_TRANSFER
            ) & (df_txs["portfolio"] == scope_uuid)
            df_txs.loc[mask_transfer_out, "type"] = TransactionType.OUTBOUND_DELIVERY

            mask_transfer_in = (df_txs["type"] == TransactionType.SECURITY_TRANSFER) & (
                df_txs["other_portfolio"] == scope_uuid
            )
            df_txs.loc[mask_transfer_in, "type"] = TransactionType.INBOUND_DELIVERY
        else:
            # For a global view, internal transfers do not realize gains. Ignore them.
            df_txs = df_txs[df_txs["type"] != TransactionType.SECURITY_TRANSFER].copy()

        units_payload = self._load_transaction_units(df_txs["uuid"].tolist())
        inventory: dict[str, deque[Lot]] = {}
        today = datetime.now(UTC)

        df_txs = df_txs.sort_values("date")

        for tx_row in df_txs.itertuples():
            sec_id = tx_row.security
            if not sec_id or not tx_row.shares or tx_row.shares == 0:
                continue

            tx_date = tx_row.date.to_pydatetime()
            if tx_date.tzinfo is None:
                tx_date = tx_date.replace(tzinfo=UTC)

            shares = abs(tx_row.shares_norm)
            tx_units = units_payload.get(tx_row.uuid, {})
            fees = tx_units.get("fees", 0)
            taxes = tx_units.get("taxes", 0)

            # Inbound: BUY, INBOUND_DELIVERY
            if tx_row.type in {TransactionType.BUY, TransactionType.INBOUND_DELIVERY}:
                self._process_fifo_inbound(
                    tx_row, sec_id, tx_date, shares, fees, taxes, inventory
                )

            # Outbound: SELL, OUTBOUND_DELIVERY
            elif tx_row.type in {
                TransactionType.SELL,
                TransactionType.OUTBOUND_DELIVERY,
            }:
                # We don't need the realized trades, but the method calculates them.
                # Pass a dummy list to satisfy the signature.
                dummy_realized_trades: list[RealizedTrade] = []
                self._process_fifo_outbound(
                    tx_row,
                    sec_id,
                    tx_date,
                    shares,
                    fees,
                    taxes,
                    inventory,
                    dummy_realized_trades,
                    today,
                )

        # Convert deques to lists for the final output, filtering out empty lists.
        return {sec_uuid: list(lots) for sec_uuid, lots in inventory.items() if lots}

    def _process_fifo_inbound(
        self,
        tx_row: Any,
        sec_id: str,
        tx_date: datetime,
        shares: float,
        fees: float,
        taxes: float,
        inventory: dict[str, deque[Lot]],
    ) -> None:
        """Process an inbound transaction (Buy/Delivery) adding to FIFO inventory."""
        net_amount = (
            abs(tx_row.amount) - fees - taxes if tx_row.amount is not None else 0
        )

        if (
            net_amount < _ZERO_AMOUNT_EPSILON
            and tx_row.type == TransactionType.INBOUND_DELIVERY
        ):
            price_native = self.market_resolver.get_price(sec_id, tx_date)
        else:
            price_native = (net_amount / 100.0) / shares if shares > 0 else 0.0

            price_native = (net_amount / 100.0) / shares if shares > 0 else 0.0

        # Priority 1: Use explicitly recorded FX rate for this transaction
        explicit_rate = getattr(tx_row, "fx_rate_used", None)
        if explicit_rate and explicit_rate > 0:
            fx_rate = explicit_rate
        else:
            # Priority 2: Use MarketResolver (Date-specific or lookback)
            fx_rate = self.market_resolver.get_fx(tx_row.currency_code, tx_date)

        if sec_id not in inventory:
            inventory[sec_id] = deque()

        inventory[sec_id].append(
            Lot(
                date=tx_date,
                shares=shares,
                price_native=price_native,
                fx_rate=fx_rate,
            )
        )

    def _process_fifo_outbound(
        self,
        tx_row: Any,
        sec_id: str,
        tx_date: datetime,
        shares: float,
        fees: float,
        taxes: float,
        inventory: dict[str, deque[Lot]],
        realized_trades: list[RealizedTrade],
        today: datetime,
    ) -> None:
        """
        Process an outbound transaction (Sell/Delivery).

        Matches against FIFO inventory and calculates realized gains/losses.
        """
        gross_proceeds = (
            abs(tx_row.amount) + fees + taxes if tx_row.amount is not None else 0
        )

        if (
            gross_proceeds < _ZERO_AMOUNT_EPSILON
            and tx_row.type == TransactionType.OUTBOUND_DELIVERY
        ):
            sale_price_native = self.market_resolver.get_price(sec_id, tx_date)
        else:
            sale_price_native = (gross_proceeds / 100.0) / shares if shares > 0 else 0.0

        sale_fx_rate = self.market_resolver.get_fx(tx_row.currency_code, tx_date)
        sale_price_eur = (
            sale_price_native / sale_fx_rate
            if sale_fx_rate and sale_fx_rate != 0
            else 0.0
        )

        if sec_id in inventory:
            lots_to_process = inventory[sec_id]
            remaining_shares_to_sell = shares

            while remaining_shares_to_sell > SHARE_EPSILON and lots_to_process:
                lot = lots_to_process[0]
                shares_from_lot = min(lot.shares, remaining_shares_to_sell)

                lot.shares -= shares_from_lot
                remaining_shares_to_sell -= shares_from_lot

                buy_price_eur = (
                    lot.price_native / lot.fx_rate
                    if lot.fx_rate and lot.fx_rate != 0
                    else 0.0
                )
                buy_cost_total_eur = buy_price_eur * shares_from_lot
                sell_value_total_eur = sale_price_eur * shares_from_lot
                gain = sell_value_total_eur - buy_cost_total_eur

                # Ghost Enrichment (Opportunity Cost against Today)
                current_price_native = self.market_resolver.get_price(sec_id, today)
                sec_curr = self.market_resolver.get_security_currency(sec_id)
                current_fx_rate = self.market_resolver.get_fx(sec_curr, today)
                current_price_eur = (
                    current_price_native / current_fx_rate
                    if current_fx_rate and current_fx_rate != 0
                    else 0.0
                )
                opportunity_cost = (
                    current_price_eur - sale_price_eur
                ) * shares_from_lot

                realized_trades.append(
                    RealizedTrade(
                        security_uuid=sec_id,
                        buy_date=lot.date,
                        sell_date=tx_date,
                        shares=shares_from_lot,
                        buy_cost_eur=buy_cost_total_eur,
                        sell_value_eur=sell_value_total_eur,
                        realized_gain_eur=gain,
                        opportunity_gain_eur=opportunity_cost,
                    )
                )

                if lot.shares < SHARE_EPSILON:
                    lots_to_process.popleft()

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
            # Priority 1: Use explicit transaction rate if available and valid
            tx_rate = getattr(row, "fx_rate_used", None)
            if tx_rate and tx_rate > 0:
                rates.append(tx_rate)
            else:
                # Priority 2 & 3: Market/ECB Rate (fallback logic in MarketResolver)
                currency = getattr(row, "currency_code", "EUR")
                rates.append(self._get_fx(currency, row.date) or 0.0)

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
                    u_val = (u_row.amount / 100.0) / (r if r else 0.0)
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
                held_secs = holdings_on_date[holdings_on_date.abs() > SHARE_EPSILON]
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
                    if abs(bal) > SHARE_EPSILON:
                        rate = self._get_fx(curr, d)
                        daily_total += bal / rate if rate else 0.0
            wealth_values.append(daily_total)

        daily_cash_wealth = pd.Series(wealth_values, index=date_range)
        return daily_cash_wealth, acc_balances

    def _get_price(self, sec_id: str, d: pd.Timestamp) -> float:
        return self.market_resolver.get_price(sec_id, d)

    def _get_fx(self, curr: str, d: pd.Timestamp) -> float | None:
        return self.market_resolver.get_fx(curr, d)

    def _load_transaction_units(self, tx_uuids: list[str]) -> dict[str, dict[str, int]]:
        if not tx_uuids:
            return {}
        chunk_size = 900
        result = {}
        for i in range(0, len(tx_uuids), chunk_size):
            chunk = tx_uuids[i : i + chunk_size]
            placeholders = ",".join("?" for _ in chunk)
            query = f"SELECT transaction_uuid, type, amount FROM transaction_units WHERE transaction_uuid IN ({placeholders}) AND type IN (1, 2, 11, 13)"  # noqa: E501, S608
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
        transactions: list[Transaction],
        start_date: date,
        end_date: date,
        initial_inventory: dict[str, deque[Lot]] | None = None,
        basis_ts: pd.Timestamp | None = None,
    ) -> tuple[float, float]:
        realized_map, unrealized_map = self._calculate_capital_gains_detailed(
            transactions, start_date, end_date, initial_inventory, basis_ts
        )
        return sum(realized_map.values()), sum(unrealized_map.values())

    def _calculate_capital_gains_detailed(  # noqa: PLR0912
        self,
        transactions: list[Transaction],
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
        realized_gains_map: defaultdict[str, float] = defaultdict(float)

        for tx in transactions:
            sec_id = tx.security
            if not sec_id or not tx.shares:
                continue

            if isinstance(tx.date, str):
                tx_date = datetime.fromisoformat(tx.date).replace(tzinfo=UTC)
            else:
                tx_date = pd.Timestamp(tx.date).to_pydatetime()
                if tx_date.tzinfo is None:
                    tx_date = tx_date.replace(tzinfo=UTC)
            shares_raw = tx.shares / 1e8
            shares = abs(shares_raw)

            is_inbound = tx.type in {
                TransactionType.BUY,
                TransactionType.INBOUND_DELIVERY,
            } or (tx.type == TransactionType.SECURITY_TRANSFER and shares_raw > 0)

            is_outbound = tx.type in {
                TransactionType.SELL,
                TransactionType.OUTBOUND_DELIVERY,
            } or (tx.type == TransactionType.SECURITY_TRANSFER and shares_raw < 0)

            if is_inbound:
                net_amount = abs(tx.amount - tx.fees - tx.taxes)
                if net_amount < _ZERO_AMOUNT_EPSILON and tx.type in {
                    TransactionType.INBOUND_DELIVERY,
                    TransactionType.SECURITY_TRANSFER,
                }:
                    price_native = self.market_resolver.get_price(sec_id, tx_date)
                else:
                    price_native = (net_amount / 100.0) / shares if shares else 0.0
                fx_rate = self.market_resolver.get_fx(tx.currency_code, tx_date)

                if sec_id not in inventory:
                    inventory[sec_id] = deque()
                inventory[sec_id].append(
                    Lot(
                        date=tx_date,
                        shares=shares,
                        price_native=price_native,
                        fx_rate=fx_rate,
                    )
                )

            elif is_outbound:
                gross_proceeds = abs(tx.amount + tx.fees + tx.taxes)
                sale_price_native = (gross_proceeds / 100.0) / shares if shares else 0.0
                sale_fx_rate = self.market_resolver.get_fx(tx.currency_code, tx_date)
                sale_price_eur = (
                    sale_price_native / sale_fx_rate if sale_fx_rate else 0.0
                )

                if inventory.get(sec_id):
                    gain = self._process_security_sale(
                        inventory[sec_id],
                        shares,
                        sale_price_eur,
                        start_ts,
                        basis_ts,
                        sec_id,
                        tx.currency_code,
                    )
                    if tx_date >= start_ts:
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
        sale_price_eur: float,
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

            base_val_eur = base_price / base_fx if base_fx else 0.0
            gain_accum += (sale_price_eur - base_val_eur) * consumed
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

        # Now iterate Combined to sum Flows by Account
        # We need Net Flow EUR.
        # If 'flow_eur' exists (from transfers), use it.
        # Else compute: amount_norm / rate_at_date.

        def calc_flow_val(row: pd.Series) -> float:
            if (
                hasattr(row, "flow_eur")
                and pd.notna(row.flow_eur)
                and row.flow_eur != 0
            ):
                # We need to apply sign.
                return float(row.flow_eur)

            # Standard logic
            r = self._get_fx(row.currency_code, row.date)
            return (
                (row.amount_norm if hasattr(row, "amount_norm") else row.amount / 100.0)
                / r
                if r
                else 0.0
            )

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

        # Calculate EUR value for each row
        # We can vectorizing lookup of rates
        # But 'augment' did complex logic.
        # We need to respect 'flow_eur' if present.

        # Calculate EUR value for each row
        # Scalar Logic:
        # For Transfer rows, use "flow_eur". For others, use (Amount / Rate).

        def _get_val(row: pd.Series) -> float:
            # Standard Calculation
            # NOTE: We intentionally do NOT use the symmetric 'flow_eur' for FX gain
            # calculations, as we need the actual value of each leg of the transfer.
            curr = getattr(row, "currency_code", "EUR")
            amt_cents = getattr(row, "amount", 0.0)

            if curr == "EUR":
                return amt_cents / 100.0

            rate = self._get_fx(curr, row["date"])
            return (amt_cents / 100.0) / rate if rate else 0.0

        if not combined.empty:
            combined["final_val_eur"] = combined.apply(_get_val, axis=1)
        else:
            combined["final_val_eur"] = 0.0

        # This redundant block is removed as _get_val is now the single source of truth.

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

    def _get_holdings_at_date(
        self, d: date, portfolio_uuid: str | None = None
    ) -> dict[str, float]:
        """Calculate security holdings at the start of a specific date (EOD of d-1)."""
        if self._df_txs.empty:
            return {}

        ts = pd.Timestamp(d, tz="UTC")

        df_txs_scoped = self._df_txs
        if portfolio_uuid:
            is_source = df_txs_scoped["portfolio"] == portfolio_uuid
            is_target_transfer = (
                df_txs_scoped["type"] == TransactionType.SECURITY_TRANSFER
            ) & (df_txs_scoped["other_portfolio"] == portfolio_uuid)
            df_txs_scoped = df_txs_scoped[is_source | is_target_transfer]

        # Filter transactions strictly BEFORE the date
        mask = (df_txs_scoped["date"] < ts) & (df_txs_scoped["security"].notna())
        df_past = df_txs_scoped.loc[mask].copy()

        if df_past.empty:
            return {}

        share_signs = {
            TransactionType.BUY: 1,
            TransactionType.INBOUND_DELIVERY: 1,
            TransactionType.SELL: -1,
            TransactionType.OUTBOUND_DELIVERY: -1,
        }
        df_past["sign"] = df_past["type"].map(share_signs)

        # Handle transfers
        is_transfer = df_past["type"] == TransactionType.SECURITY_TRANSFER
        if portfolio_uuid:
            # Scoped view: transfers are directional
            df_past.loc[
                is_transfer & (df_past["portfolio"] == portfolio_uuid), "sign"
            ] = -1
            df_past.loc[
                is_transfer & (df_past["other_portfolio"] == portfolio_uuid), "sign"
            ] = 1
        else:
            # Global view: replicate original behavior (treat as net inbound for
            # the target portfolio)
            df_past.loc[is_transfer, "sign"] = 1

        df_past["delta_shares"] = df_past["shares_norm"].fillna(0.0) * df_past[
            "sign"
        ].fillna(0.0)

        # Sum by security
        holdings = df_past.groupby("security")["delta_shares"].sum()

        # Filter out zero or near-zero holdings and return dict
        return {k: v for k, v in holdings.items() if abs(v) > SHARE_EPSILON}

    def _get_account_balances(
        self, ts: pd.Timestamp, portfolio_uuid: str | None = None
    ) -> pd.Series:
        """
        Calculate account balances at a specific timestamp (EOD of previous day).

        Returns Series with index [account, currency] and values as balance.
        """
        if self._df_txs.empty:
            return pd.Series(dtype=float)

        df_txs_scoped = self._df_txs
        if portfolio_uuid:
            # For cash balances, a transaction is relevant if it originates from
            # an account within the portfolio. Transfers into the portfolio are handled
            # by creating an inbound leg, so we don't need to check other_portfolio
            # here.

            accounts_in_portfolio = {
                acc_uuid
                for acc_uuid, port_uuid in self._account_portfolios.items()
                if port_uuid == portfolio_uuid
            }
            df_txs_scoped = df_txs_scoped[
                df_txs_scoped["account"].isin(accounts_in_portfolio)
            ]

        mask = (df_txs_scoped["date"] < ts) & (df_txs_scoped["account"].notna())
        df_past = df_txs_scoped[mask].copy()

        if df_past.empty:
            return pd.Series(dtype=float)

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
        df_past["sign"] = df_past["type"].map(type_signs).fillna(0)

        mask_transfers = df_past["type"] == TransactionType.CASH_TRANSFER
        if mask_transfers.any():
            transfers = df_past[mask_transfers].copy()
            transfers["account"] = transfers["other_account"]
            transfers["sign"] = 1

            target_accs = transfers["account"]
            mapped_curr = target_accs.map(self._account_currencies)
            transfers["currency_code"] = mapped_curr.fillna(transfers["currency_code"])

            if not self._df_units.empty:
                transfers = transfers.merge(
                    self._df_units[
                        ["transaction_uuid", "fx_amount", "fx_currency_code"]
                    ],
                    left_on="uuid",
                    right_on="transaction_uuid",
                    how="left",
                )
                mask_fx = transfers["fx_amount"].notna()
                if mask_fx.any():
                    transfers.loc[mask_fx, "amount_norm"] = (
                        transfers.loc[mask_fx, "fx_amount"] / 100.0
                    )
                transfers = transfers.drop(
                    columns=["transaction_uuid", "fx_amount", "fx_currency_code"],
                    errors="ignore",
                )

            df_past = pd.concat([df_past, transfers], ignore_index=True)

        df_past["signed_amount"] = df_past["amount_norm"].fillna(0) * df_past[
            "sign"
        ].fillna(0)
        balances = df_past.groupby(["account", "currency_code"])["signed_amount"].sum()

        if portfolio_uuid:
            accounts_in_portfolio = {
                acc_uuid
                for acc_uuid, port_uuid in self._account_portfolios.items()
                if port_uuid == portfolio_uuid
            }
            if not balances.empty:
                balances = balances[
                    balances.index.get_level_values("account").isin(
                        accounts_in_portfolio
                    )
                ]

        return balances
