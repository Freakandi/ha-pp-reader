"""Performance Calculator Service."""

import logging
import sqlite3
from collections import deque
from dataclasses import dataclass
from datetime import UTC, date, datetime

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

        # Resolve effective account IDs
        valid_account_ids = self._resolve_scope_accounts(portfolio_ids, account_ids)

        # 1. Absolute Performance (from persisted daily_wealth)
        metrics.absolute_performance = self._calculate_absolute_performance(
            start_date, end_date
        )

        # 2. Load Market Data (Shared)
        df_prices, df_rates = self._load_market_data(end_date)

        # Prepare lookup indices
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

        # 3. Capital Gains (Securities) - USE LEGACY DATA LOADING
        # Reverted to strict account filtering to restore proven values.
        df_txs_cap = self._load_transactions_legacy(end_date, valid_account_ids)
        realized, unrealized = self._calculate_capital_gains(
            df_txs_cap, start_date, end_date
        )
        metrics.realized_gains = realized
        metrics.unrealized_gains = unrealized

        # 4. FX Performance (Cash) - USE EXTENDED DATA LOADING
        # Uses smart filtering (Source OR Target) to correctly handle Transfers.
        df_txs_fx = self._load_transactions_extended(end_date, valid_account_ids)

        # Load Account Currencies for Cross-Currency handling
        account_currencies = self._load_account_currencies()

        metrics.fx_gains_cash = self._calculate_fx_performance(
            df_txs_fx, start_date, end_date, account_currencies, valid_account_ids
        )

        # Cleanup
        self._prices_idx = pd.DataFrame()
        self._rates_idx = pd.DataFrame()

        return metrics

        return df_prices, df_rates

    def _load_market_data(self, until_date: date) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Load prices and FX rates."""
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
            else:
                df_prices = pd.DataFrame(columns=["security_uuid", "date", "close"])

            # [Change] Inject Live Prices if until_date is today/future
            # This ensures we capture intraday moves for "Today" end dates.
            today = datetime.now(UTC).date()
            if until_date >= today:
                query_live = """
                    SELECT uuid as security_uuid, last_price
                    FROM securities
                    WHERE last_price IS NOT NULL AND last_price > 0
                """
                df_live = pd.read_sql_query(query_live, self.conn)
                if not df_live.empty:
                    # Current UTC midnight timestamp for "today"
                    ts_today = pd.Timestamp(today).tz_localize("UTC")
                    df_live["date"] = ts_today
                    df_live["close"] = df_live["last_price"] / PRICE_SCALE
                    df_live = df_live.drop(columns=["last_price"])

                    # Merge: We want to OVERRIDE historical data for today if it exists,
                    # or append if it doesn't.
                    # Simplest way: Concatenate and drop duplicates keeping last (live).
                    df_prices = pd.concat([df_prices, df_live])
                    df_prices = df_prices.sort_values("date").drop_duplicates(
                        subset=["security_uuid", "date"], keep="last"
                    )

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
        except pd.errors.DatabaseError:
            df_rates = pd.DataFrame(columns=["date", "currency", "rate"])

        return df_prices, df_rates

    def _load_account_currencies(self) -> dict[str, str]:
        """Load currency map for all accounts."""
        try:
            query = "SELECT uuid, currency_code FROM accounts"
            rows = self.conn.execute(query).fetchall()
            return {r[0]: (r[1] or "EUR") for r in rows}
        except sqlite3.Error:
            return {}

    def _resolve_scope_accounts(
        self,
        portfolio_ids: list[str] | None,
        account_ids: list[str] | None,
    ) -> set[str] | None:
        """Resolve all explicitly or implicitly requested account UUIDs."""
        if not portfolio_ids and not account_ids:
            return None  # Global scope

        valid_ids = set(account_ids or [])
        if portfolio_ids:
            placeholders = ",".join("?" for _ in portfolio_ids)
            query = (
                f"SELECT uuid FROM accounts WHERE portfolio_uuid IN ({placeholders})"  # noqa: S608
            )
            rows = self.conn.execute(query, tuple(portfolio_ids)).fetchall()
            valid_ids.update(r[0] for r in rows)

        return valid_ids

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

    def _load_transactions_legacy(
        self,
        until_date: date,
        valid_account_ids: set[str] | None = None,
    ) -> pd.DataFrame:
        """Load transactions using strict account filtering (Legacy behavior)."""
        tx_filter_parts = ["date <= ?"]
        params = [until_date.isoformat()]

        if valid_account_ids:
            placeholders = ",".join("?" for _ in valid_account_ids)
            tx_filter_parts.append(f"account IN ({placeholders})")
            params.extend(valid_account_ids)

        where_clause = " AND ".join(tx_filter_parts)
        query_txs = f"""
            SELECT
                uuid, type, date, account, other_account,
                security, shares, amount, currency_code
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

        return self._normalize_tx_frame(df_txs)

    def _load_transactions_extended(
        self,
        until_date: date,
        valid_account_ids: set[str] | None = None,
    ) -> pd.DataFrame:
        """Load transactions using extended filtering for Transfers (FX Fix)."""
        tx_filter_parts = ["date <= ?"]
        params = [until_date.isoformat()]

        if valid_account_ids:
            placeholders = ",".join("?" for _ in valid_account_ids)
            # Fetch transactions where ANY side touches the scope (Account OR Other)
            clause = (
                f"(account IN ({placeholders}) OR "
                f"(type = {TransactionType.CASH_TRANSFER} "
                f"AND other_account IN ({placeholders})))"
            )
            tx_filter_parts.append(clause)
            params.extend(valid_account_ids)
            params.extend(valid_account_ids)

        where_clause = " AND ".join(tx_filter_parts)
        query_txs = f"""
            SELECT
                uuid, type, date, account, other_account,
                security, shares, amount, currency_code
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

        return self._normalize_tx_frame(df_txs)

    def _normalize_tx_frame(self, df_txs: pd.DataFrame) -> pd.DataFrame:
        """Apply standard normalizations to transaction DataFrame."""
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
                    "other_account",
                ]
            )
            df_txs["date"] = pd.to_datetime([], utc=True)
        return df_txs

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

                if loc < len(c_rates):
                    return c_rates.iloc[loc]["rate"]

            except KeyError:
                pass

        except (KeyError, IndexError):
            pass

        _LOGGER.warning(
            "Missing FX rate for %s at %s - returning 0.0 (preventing 1.0 default)",
            curr,
            d,
        )
        return 0.0

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

        # Optimization: Filter types before sorting
        txs = df_txs[df_txs["type"].isin(sec_types)].sort_values("date")

        if txs.empty:
            return 0.0, 0.0

        # Load Units (Fees/Taxes) to calculate Gross Proceeds for Sells
        tx_uuids = txs["uuid"].tolist()
        units_payload = self._load_transaction_units(tx_uuids)

        for row in txs.itertuples():
            sec_id = row.security
            if not sec_id or row.shares_norm == 0:
                continue

            shares = abs(row.shares_norm)
            tx_price = 0.0

            # Gross Amount Logic
            # BUY: amount is Total Cost (already Gross).
            # SELL: amount is Net Payout. Fees/Taxes must be added for Gross.

            fees = units_payload.get(row.uuid, {}).get("fees", 0)
            taxes = units_payload.get(row.uuid, {}).get("taxes", 0)

            if row.type in (TransactionType.SELL, TransactionType.OUTBOUND_DELIVERY):
                 # Reconstruct Gross Proceeds: Net + Fees + Taxes
                 gross_amt_cents = abs(row.amount) + fees + taxes
                 if shares > 0:
                     tx_price = (gross_amt_cents / 100.0) / shares
            elif row.amount_norm != 0:
                 # BUY / INBOUND (Amount is Total Cost)
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

    def _load_transaction_units(self, tx_uuids: list[str]) -> dict[str, dict[str, int]]:
        """Load fees and taxes for a list of transactions."""
        if not tx_uuids:
             return {}

        # Chunking to avoid SQL limits
        chunk_size = 900
        result = {}

        for i in range(0, len(tx_uuids), chunk_size):
            chunk = tx_uuids[i : i + chunk_size]
            placeholders = ",".join("?" for _ in chunk)
            query = f"""
                SELECT transaction_uuid, type, amount
                FROM transaction_units
                WHERE transaction_uuid IN ({placeholders})
                  AND type IN (1, 2, 11, 13)
            """ # noqa: S608

            try:
                rows = self.conn.execute(query, tuple(chunk)).fetchall()
                for r in rows:
                    tuuid, ttype, amt = r
                    if tuuid not in result:
                        result[tuuid] = {"fees": 0, "taxes": 0}

                    if ttype in (2, 13):
                        result[tuuid]["fees"] += amt
                    elif ttype in (1, 11):
                        result[tuuid]["taxes"] += amt
            except sqlite3.Error:
                pass

        return result

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

            # FX Rate is EUR->Foreign (e.g. 1.05 USD). Conversion is / Rate.
            sale_val_eur = sale_price / sale_fx if sale_fx else 0.0
            base_val_eur = base_price / base_fx if base_fx else 0.0

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

                # FX Rate is EUR->Foreign. Conversion is / Rate.
                end_val_eur = (end_price / end_fx) if end_fx else 0.0
                base_val_eur = (base_price / base_fx) if base_fx else 0.0

                gain = (end_val_eur - base_val_eur) * lot.shares
                unrealized_gains_eur += gain

        return unrealized_gains_eur

    def _calculate_fx_performance(  # noqa: PLR0912, PLR0915
        self,
        df_txs: pd.DataFrame,
        start_date: date,
        end_date: date,
        account_currencies: dict[str, str],
        valid_account_ids: set[str] | None = None,
    ) -> float:
        """
        Calculate FX Performance for Cash Accounts.

        Logic: Change in EUR value of Foreign Cash held.
        Valuation = Balance / Rate.
        """
        start_ts = pd.Timestamp(start_date, tz="UTC")
        end_ts = pd.Timestamp(end_date, tz="UTC")

        inventory: dict[tuple[str, str], deque[Lot]] = {}
        fx_gains_eur = 0.0

        # === 1. SORTED TX STREAM ===
        txs = df_txs.sort_values("date")

        for row in txs.itertuples():
            is_transfer = row.type == TransactionType.CASH_TRANSFER

            # --- SCOPE FILTER (Account) ---
            if valid_account_ids is not None:
                if is_transfer:
                    # Transfer: Included if EITHER Source OR Target in scope
                    in_scope = (row.account in valid_account_ids) or (
                        row.other_account in valid_account_ids
                    )
                    if not in_scope:
                        continue
                elif row.account not in valid_account_ids:
                    continue

            raw_amt = row.amount_norm
            if raw_amt == 0:
                continue

            # === 2. DETERMINE SIDES TO PROCESS ===
            # List of (account_uuid, currency, amount_signed)
            operations = []

            if is_transfer:
                # --- TRANSFER LOGIC ---
                # A Transfer has two legs: Outflow (Source) and Inflow (Target).
                # We must determine the currency/amount for each leg individually
                # to avoid "Phantom FX" on Base Currency accounts.

                # 1. Target Leg (Inflow)
                # 'row.currency_code' and 'row.amount' implicitly define the Target
                # (based on standard single-row transfer convention in this app).
                target_acc = row.other_account
                target_curr = row.currency_code
                target_amt = abs(raw_amt)  # Inflow is positive

                if target_acc:
                    operations.append((target_acc, target_curr, target_amt))

                # 2. Source Leg (Outflow)
                source_acc = row.account
                if source_acc:
                    source_curr = account_currencies.get(source_acc, "EUR")

                    if source_curr == target_curr:
                        # Same Currency Transfer
                        source_amt = -abs(raw_amt)
                        operations.append((source_acc, source_curr, source_amt))
                    else:
                        # Cross-Currency Transfer
                        # We need to calculate how much Source Currency triggered this.

                        target_rate = self._get_fx(target_curr, row.date)
                        source_rate = self._get_fx(source_curr, row.date)

                        # Value in EUR
                        val_eur = (target_amt / target_rate) if target_rate else 0.0

                        # Value in Source
                        amt_source = val_eur * source_rate
                        operations.append((source_acc, source_curr, -amt_source))

            else:
                # --- STANDARD TX LOGIC ---
                sign = self._get_cash_flow_sign(row.type)
                if sign == 0:
                    continue

                # Check Account Currency vs Transaction Currency
                # Usually standard transactions act on the Account's currency balance.
                # However, for Cash Accumulators, we usually care about the
                # Account Currency.

                cash_flow = abs(raw_amt) * sign
                operations.append((row.account, row.currency_code, cash_flow))

            # === 3. PROCESS OPERATIONS ===
            for acc_id, curr, cash_flow in operations:
                if not acc_id or curr == "EUR":
                    continue

                # Scope Check (Granular)
                # If we are analyzing Account A, ignore the leg for Account B
                if valid_account_ids is not None and acc_id not in valid_account_ids:
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
        for (acc_id, curr), lots in inventory.items():
            if not lots:
                continue

            # SCOPE CHECK (Redundant if we didn't add to inventory, but safe)
            if valid_account_ids is not None and acc_id not in valid_account_ids:
                continue

            end_fx = self._get_fx(curr, end_ts)

            for lot in lots:
                base_fx = (
                    self._get_fx(curr, start_ts) if lot.date < start_ts else lot.fx_rate
                )

                # Val Delta = (Native / End_Rate) - (Native / Base_Rate)
                end_val = (lot.shares / end_fx) if end_fx else 0.0
                base_val = (lot.shares / base_fx) if base_fx else 0.0

                fx_gains_eur += end_val - base_val

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

            # Realized FX Gain on Outflow (Spending Cash)
            # We spent 'consumed' Native Currency.
            # Value at Transaction is consumed / tx_fx.
            # Value at Baseline is consumed / base_fx.
            # Gain is the difference: Val_Tx - Val_Base.

            val_tx = (consumed / tx_fx) if tx_fx else 0.0
            val_base = (consumed / base_fx) if base_fx else 0.0

            gain_accum += val_tx - val_base

        return gain_accum
