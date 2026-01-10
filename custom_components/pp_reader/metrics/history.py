"""Module for rebuilding the daily_wealth table via a vectorized implementation."""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from custom_components.pp_reader.const import SHARE_EPSILON, TransactionType

if TYPE_CHECKING:
    from datetime import date

    from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


_LOGGER = logging.getLogger(__name__)


def _calculate_daily_security_wealth(
    df_txs: pd.DataFrame,
    date_range: pd.DatetimeIndex,
    market_resolver: MarketResolver,
    fx_pivot: pd.DataFrame,
) -> pd.Series:
    """Calculate the total value of all securities for each day in the range."""
    sec_txs = df_txs[df_txs["security"].notna()].copy()
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

    active_securities = sec_holdings.columns[
        (sec_holdings.abs() > SHARE_EPSILON).any()
    ].tolist()
    prices_pivot, _ = market_resolver.get_prices_pivot(active_securities, date_range)

    aligned_prices = prices_pivot.reindex(columns=sec_holdings.columns, fill_value=0.0)
    sec_wealth_native = sec_holdings * aligned_prices
    sec_currencies = pd.Series(
        {s: market_resolver.get_security_currency(s) for s in sec_wealth_native.columns}
    )
    sec_fx_rates = fx_pivot.reindex(columns=sec_currencies.unique(), fill_value=1.0)

    daily_sec_wealth_eur = pd.Series(0.0, index=date_range)
    for curr in sec_currencies.unique():
        secs_in_curr = sec_currencies[sec_currencies == curr].index
        rate_series = sec_fx_rates.get(curr, 1.0)
        daily_sec_wealth_eur += (
            sec_wealth_native[secs_in_curr].sum(axis=1) / rate_series
        ).fillna(0.0)

    return daily_sec_wealth_eur


def _calculate_daily_cash_wealth(
    df_txs: pd.DataFrame,
    date_range: pd.DatetimeIndex,
    account_currencies: dict[str, str],
    fx_pivot: pd.DataFrame,
) -> pd.Series:
    """Calculate the total value of all cash accounts for each day in the range."""
    cash_txs = df_txs[df_txs["account"].notna()].copy()
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
        TransactionType.CASH_TRANSFER: -1,
    }
    cash_txs["sign"] = cash_txs["type"].map(cash_signs).fillna(0)
    cash_txs["delta_cash"] = cash_txs["amount_norm"].fillna(0) * cash_txs["sign"]

    transfers = cash_txs[cash_txs["type"] == TransactionType.CASH_TRANSFER].copy()
    transfers["account"] = transfers["other_account"]
    transfers["sign"] = 1
    transfers["delta_cash"] = transfers["amount_norm"].fillna(0) * transfers["sign"]

    all_cash_deltas = pd.concat([cash_txs, transfers], ignore_index=True).dropna(
        subset=["account"]
    )
    all_cash_deltas["currency_code"] = all_cash_deltas["account"].map(
        account_currencies
    )

    cash_daily_change = all_cash_deltas.pivot_table(
        index="date",
        columns=["account", "currency_code"],
        values="delta_cash",
        aggfunc="sum",
        fill_value=0,
    )
    cash_balances = (
        cash_daily_change.cumsum().reindex(date_range, method="ffill").fillna(0.0)
    )

    daily_cash_wealth_eur = pd.Series(0.0, index=date_range)
    active_currencies = (
        cash_balances.columns.get_level_values("currency_code").unique().tolist()
    )
    for curr in active_currencies:
        if curr == "EUR":
            daily_cash_wealth_eur += cash_balances.xs(
                curr, level="currency_code", axis=1
            ).sum(axis=1)
        else:
            rate_series = fx_pivot.get(curr, 1.0)
            daily_cash_wealth_eur += (
                cash_balances.xs(curr, level="currency_code", axis=1).sum(axis=1)
                / rate_series
            ).fillna(0.0)

    return daily_cash_wealth_eur


def _calculate_daily_invested_capital(
    df_txs: pd.DataFrame, date_range: pd.DatetimeIndex, market_resolver: MarketResolver
) -> pd.Series:
    """Calculate the daily invested capital."""
    flow_types = {
        TransactionType.DEPOSIT: 1,
        TransactionType.REMOVAL: -1,
        TransactionType.INBOUND_DELIVERY: 1,
        TransactionType.OUTBOUND_DELIVERY: -1,
    }
    flow_txs = df_txs[df_txs["type"].isin(flow_types.keys())].copy()
    flow_txs["sign"] = flow_txs["type"].map(flow_types)

    # Resolve active currencies and securities
    active_secs = flow_txs["security"].dropna().unique().tolist()
    active_currs = flow_txs["currency_code"].dropna().unique().tolist()
    unique_dates = pd.DatetimeIndex(flow_txs["date"].unique()).sort_values()

    # Pre-fetch pivots
    flow_prices, _ = market_resolver.get_prices_pivot(active_secs, unique_dates)
    flow_fx = market_resolver.get_fx_pivot(active_currs, unique_dates)

    # --- Vectorized Calculation ---

    # 1. Map Securities to Currencies
    sec_curr_map = {s: market_resolver.get_security_currency(s) for s in active_secs}
    flow_txs["sec_currency"] = flow_txs["security"].map(sec_curr_map)
    flow_txs["calc_currency"] = flow_txs["sec_currency"].fillna(
        flow_txs["currency_code"]
    )

    # 2. Merge FX Rates
    # Melt FX pivot to long format for merge
    # Index is Date, Columns are Currencies.
    if not flow_fx.empty:
        # Reset index to make date a column
        fx_long = flow_fx.reset_index().melt(
            id_vars="date", var_name="calc_currency", value_name="fx_rate"
        )
        # Ensure types match for merge
        fx_long["calc_currency"] = fx_long["calc_currency"].astype(object)

        flow_txs = flow_txs.merge(fx_long, on=["date", "calc_currency"], how="left")
        flow_txs["fx_rate"] = flow_txs["fx_rate"].fillna(1.0)
    else:
        flow_txs["fx_rate"] = 1.0

    # 3. Merge Prices
    if not flow_prices.empty:
        prices_long = flow_prices.reset_index().melt(
            id_vars="date", var_name="security", value_name="price"
        )
        prices_long["security"] = prices_long["security"].astype(object)

        flow_txs = flow_txs.merge(prices_long, on=["date", "security"], how="left")
    else:
        flow_txs["price"] = 0.0

    # 4. Compute Flow EUR
    # Logic:
    # If security: val = shares_norm * price / fx_rate
    # If cash: val = amount_norm / fx_rate

    # Use numpy where for vectorization
    is_sec = flow_txs["security"].notna()
    val_sec = flow_txs["shares_norm"] * flow_txs["price"] / flow_txs["fx_rate"]
    val_cash = flow_txs["amount_norm"] / flow_txs["fx_rate"]

    flow_txs["val_eur_unsigned"] = np.where(is_sec, val_sec, val_cash)
    flow_txs["flow_eur"] = flow_txs["val_eur_unsigned"].fillna(0.0) * flow_txs["sign"]

    daily_flows = (
        flow_txs.groupby("date")["flow_eur"].sum().reindex(date_range, fill_value=0.0)
    )
    return daily_flows.cumsum()


def rebuild_daily_wealth(
    conn: sqlite3.Connection,
    market_resolver: MarketResolver,
    start_date: date,
    end_date: date,
    scopes: list[str] | None = None,
) -> None:
    """Rebuild the daily_wealth table using a vectorized pandas implementation."""
    _LOGGER.info(
        "Rebuilding daily wealth from %s to %s using vectorized implementation.",
        start_date.isoformat(),
        end_date.isoformat(),
    )
    if scopes is None:
        scopes = ["all"]

    query = (
        "SELECT uuid, type, date, account, other_account, security, "
        "shares, amount, currency_code FROM transactions"
    )
    params = []
    if end_date:
        query += " WHERE date <= ?"
        params.append(f"{end_date.isoformat()}T23:59:59Z")
    query += " ORDER BY date"

    df_txs = pd.read_sql_query(query, conn, params=params, parse_dates=["date"])

    if df_txs.empty:
        _LOGGER.info("No transactions found up to the end date. Nothing to rebuild.")
        return
    df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
    df_txs["shares_norm"] = df_txs["shares"] / 100000000.0
    df_txs["amount_norm"] = df_txs["amount"] / 100.0

    accounts_query = "SELECT uuid, currency_code FROM accounts"
    accounts = pd.read_sql_query(accounts_query, conn)
    account_currencies = accounts.set_index("uuid")["currency_code"].to_dict()

    date_range = pd.date_range(start=start_date, end=end_date, freq="D", tz="UTC")

    all_currencies = (
        list(df_txs["currency_code"].dropna().unique())
        + list(account_currencies.values())
        + [
            market_resolver.get_security_currency(s)
            for s in df_txs["security"].dropna().unique()
        ]
    )
    fx_pivot = market_resolver.get_fx_pivot(list(set(all_currencies)), date_range)

    daily_sec_wealth = _calculate_daily_security_wealth(
        df_txs, date_range, market_resolver, fx_pivot
    )
    daily_cash_wealth = _calculate_daily_cash_wealth(
        df_txs, date_range, account_currencies, fx_pivot
    )
    daily_total_wealth = daily_sec_wealth + daily_cash_wealth
    daily_invested_capital = _calculate_daily_invested_capital(
        df_txs, date_range, market_resolver
    )

    final_df = pd.DataFrame(
        {
            "total_wealth_cents": (daily_total_wealth * 100).round().astype(int),
            "total_invested_cents": (daily_invested_capital * 100).round().astype(int),
        }
    )
    final_df["date"] = final_df.index.strftime("%Y-%m-%d")
    final_df["scope_uuid"] = "all"
    final_df["scope_type"] = "all"

    records = list(
        final_df[
            [
                "date",
                "scope_uuid",
                "scope_type",
                "total_wealth_cents",
                "total_invested_cents",
            ]
        ].itertuples(index=False, name=None)
    )

    if not records:
        _LOGGER.info("No data to insert for the given date range.")
        return

    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM daily_wealth "
            "WHERE date BETWEEN ? AND ? AND scope_uuid = 'all'",
            (start_date.isoformat(), end_date.isoformat()),
        )
        cursor.executemany(
            "INSERT INTO daily_wealth "
            "(date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents) "
            "VALUES (?, ?, ?, ?, ?)",
            records,
        )
        conn.commit()
        _LOGGER.info("Successfully rebuilt daily_wealth for %d days.", len(records))
    except sqlite3.Error:
        _LOGGER.exception("Database error during daily_wealth rebuild")
        conn.rollback()
    finally:
        cursor.close()
