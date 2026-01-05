"""Dedicated module for rebuilding the daily_wealth table efficiently (Vectorized)."""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from custom_components.pp_reader.const import (
    SHARE_EPSILON,
    TransactionType,
    UnitType,
)

if TYPE_CHECKING:
    from datetime import date

    from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


_LOGGER = logging.getLogger(__name__)
_GAIN_EPSILON = 1e-6


def rebuild_daily_wealth(
    conn: sqlite3.Connection,
    market_resolver: MarketResolver,
    start_date: date,
    end_date: date,
) -> None:
    """
    Vectorized Rebuild of the daily_wealth table.

    This function calculates daily wealth snapshots for a given date range
    and persists them to the `daily_wealth` table for later use.
    """
    _LOGGER.info(
        "Rebuilding daily wealth from %s to %s",
        start_date.isoformat(),
        end_date.isoformat(),
    )
    df_txs, df_units, _sec_name_map, _acc_name_map = _load_data(conn)
    date_range = pd.date_range(start=start_date, end=end_date, freq="D", tz="UTC")

    df_augmented = _augment_txs_with_market_data(df_txs, market_resolver)
    df_augmented["amount_eur"] = np.where(
        df_augmented["fx_rate"] != 0,
        (df_augmented["amount_norm"]) / df_augmented["fx_rate"],
        0.0,
    )

    daily_neutral_flow = _calculate_gross_neutral_flows(
        df_augmented, date_range, df_txs, df_units, market_resolver
    )
    daily_invested_cum = daily_neutral_flow.cumsum().fillna(0.0)

    daily_sec_wealth, _sec_holdings = _calculate_security_wealth(
        df_augmented, date_range, market_resolver
    )
    daily_cash_wealth, _ = _calculate_cash_wealth(df_txs, date_range, market_resolver)

    result_df = pd.DataFrame(index=date_range)
    result_df["invested_capital_eur"] = daily_invested_cum
    result_df["total_wealth_eur"] = daily_sec_wealth + daily_cash_wealth

    # Reshape for database insertion
    # For now, we only support a single scope "all"
    result_df["date"] = result_df.index.strftime("%Y-%m-%d")
    result_df["scope_uuid"] = "all"
    result_df["scope_type"] = "all"
    result_df["total_wealth_cents"] = (result_df["total_wealth_eur"] * 100).astype(int)
    result_df["total_invested_cents"] = (
        result_df["invested_capital_eur"] * 100
    ).astype(int)

    # Prepare for insertion
    records_to_insert = list(
        result_df[
            [
                "date",
                "scope_uuid",
                "scope_type",
                "total_wealth_cents",
                "total_invested_cents",
            ]
        ].itertuples(index=False, name=None)
    )

    cursor = conn.cursor()
    try:
        # Clear old data for the date range
        cursor.execute(
            "DELETE FROM daily_wealth WHERE date BETWEEN ? AND ?",
            (start_date.isoformat(), end_date.isoformat()),
        )
        # Insert new data
        cursor.executemany(
            "INSERT INTO daily_wealth "
            "(date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents) "
            "VALUES (?, ?, ?, ?, ?)",
            records_to_insert,
        )
        conn.commit()
        _LOGGER.info(
            "Successfully rebuilt daily_wealth for %d days.", len(records_to_insert)
        )
    except sqlite3.Error:
        # Use simple error log instead of exception to avoid redundant traceback
        _LOGGER.exception("Database error during daily_wealth rebuild")
        conn.rollback()
    finally:
        cursor.close()


def _load_data(
    conn: sqlite3.Connection,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, str], dict[str, str]]:
    """Load transaction and unit data into DataFrames."""
    # transactions
    query_txs = (
        "SELECT uuid, type, date, account, other_account, portfolio, other_portfolio, "
        "security, shares, amount, currency_code FROM transactions ORDER BY date"
    )
    try:
        df_txs = pd.read_sql_query(query_txs, conn, parse_dates=["date"])
    except pd.errors.DatabaseError:
        df_txs = pd.DataFrame(
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
            ]
        )

    if not df_txs.empty:
        # Localize to UTC
        df_txs["date"] = pd.to_datetime(df_txs["date"], utc=True).dt.normalize()
        df_txs["shares_norm"] = df_txs["shares"] / 100000000.0
        df_txs["amount_norm"] = df_txs["amount"] / 100.0
    else:
        df_txs["date"] = pd.to_datetime([], utc=True)
        df_txs["shares_norm"] = []
        df_txs["amount_norm"] = []

    # transaction units
    query_units = (
        "SELECT transaction_uuid, type, amount, currency_code, "
        "fx_amount, fx_currency_code FROM transaction_units"
    )
    try:
        df_units = pd.read_sql_query(query_units, conn)
    except pd.errors.DatabaseError:
        df_units = pd.DataFrame(
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
        df_securities = pd.read_sql_query(query_sec, conn)
        sec_name_map = df_securities.set_index("uuid")["name"].to_dict()
    except (pd.errors.DatabaseError, KeyError):
        sec_name_map = {}

    # account currencies and names
    acc_name_map = {}
    try:
        query = "SELECT uuid, name FROM accounts"
        rows = conn.execute(query).fetchall()
        acc_name_map = {r[0]: (r[1] or "Unknown Account") for r in rows}
    except sqlite3.Error:
        acc_name_map = {}

    return df_txs, df_units, sec_name_map, acc_name_map


def _augment_txs_with_market_data(
    df_txs: pd.DataFrame, market_resolver: MarketResolver
) -> pd.DataFrame:
    """Augment transactions with FX rates and prices using scalar lookups."""
    if df_txs.empty:
        df_txs["fx_rate"] = []
        df_txs["price"] = []
        return df_txs.copy()

    df_out = df_txs.copy()
    rates = [
        market_resolver.get_fx(getattr(row, "currency_code", "EUR"), row.date)
        for row in df_out.itertuples(index=False)
    ]
    prices = [
        market_resolver.get_price(getattr(row, "security", None), row.date)
        if getattr(row, "security", None)
        else 0.0
        for row in df_out.itertuples(index=False)
    ]
    df_out["fx_rate"] = rates
    df_out["price"] = prices
    return df_out


def _calculate_gross_neutral_flows(  # noqa: PLR0912
    df_augmented: pd.DataFrame,
    date_range: pd.DatetimeIndex,
    df_txs: pd.DataFrame,
    df_units: pd.DataFrame,
    market_resolver: MarketResolver,
) -> pd.Series:
    """Calculate daily gross neutral flows (Invested Capital changes)."""
    neutral_types = [
        TransactionType.DEPOSIT,
        TransactionType.REMOVAL,
        TransactionType.INBOUND_DELIVERY,
        TransactionType.OUTBOUND_DELIVERY,
        TransactionType.SECURITY_TRANSFER,
        # TransactionType.BUY,  # BUY/SELL are internal, not invested capital flows
        # TransactionType.SELL,
    ]
    daily_flow = pd.Series(0.0, index=date_range)
    mask_neutral = df_augmented["type"].isin(neutral_types)
    if not mask_neutral.any():
        return daily_flow

    neutral_uuids = df_augmented.loc[mask_neutral, "uuid"]
    df_neutral_raw = df_txs[df_txs["uuid"].isin(neutral_uuids)].copy()

    if df_neutral_raw.empty:
        return daily_flow

    df_neutral = _augment_txs_with_market_data(df_neutral_raw, market_resolver)
    type_signs = {
        TransactionType.DEPOSIT: 1,
        TransactionType.INBOUND_DELIVERY: 1,
        TransactionType.REMOVAL: -1,
        TransactionType.OUTBOUND_DELIVERY: -1,
        TransactionType.SECURITY_TRANSFER: 1,  # Checked by shares
        # TransactionType.BUY: 1,
        # TransactionType.SELL: -1,
    }
    df_neutral["sign"] = df_neutral["type"].map(type_signs)

    flow_sums = {}
    for row in df_neutral.itertuples():
        d = row.date
        val_eur = 0.0
        fx = row.fx_rate if row.fx_rate else 1.0

        # Dynamic sign for Security Transfer
        sign = row.sign
        if row.type == TransactionType.SECURITY_TRANSFER and row.shares_norm < 0:
            sign = -1

        if row.amount is not None and abs(row.amount) > _GAIN_EPSILON:
            val_eur = (abs(row.amount) / 100.0) / fx
        elif row.security and abs(row.shares_norm) > 0:
            price = market_resolver.get_price(row.security, d)
            val_eur = (abs(row.shares_norm) * price) / fx

        if val_eur != 0.0:
            flow_sums[d] = flow_sums.get(d, 0.0) + (val_eur * sign)

    if flow_sums:
        daily_main = pd.Series(flow_sums).reindex(date_range, fill_value=0.0)
        daily_flow = daily_flow.add(daily_main, fill_value=0)

    if not df_units.empty:
        df_u_neutral = df_units[
            df_units["transaction_uuid"].isin(df_neutral["uuid"])
        ].copy()
        if not df_u_neutral.empty:
            df_u_neutral = df_u_neutral[
                df_u_neutral["type"].isin([UnitType.FEE, UnitType.TAX])
            ]
        if not df_u_neutral.empty:
            df_u_aug = df_u_neutral.merge(
                df_neutral[["uuid", "date"]],
                left_on="transaction_uuid",
                right_on="uuid",
                how="left",
            )
            unit_sums = {}
            for u_row in df_u_aug.itertuples():
                r = market_resolver.get_fx(u_row.currency_code, u_row.date)
                u_val = (u_row.amount / 100.0) / (r if r else 1.0)
                unit_sums[u_row.date] = unit_sums.get(u_row.date, 0.0) + u_val
            if unit_sums:
                daily_adj = pd.Series(unit_sums).reindex(date_range, fill_value=0.0)
                daily_flow = daily_flow.add(daily_adj, fill_value=0)

    return daily_flow


def _calculate_security_wealth(
    df_augmented: pd.DataFrame,
    date_range: pd.DatetimeIndex,
    market_resolver: MarketResolver,
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
    if not sec_txs.empty:
        pass

    wealth_values = []
    for d in date_range:
        daily_total = 0.0
        if d in sec_holdings.index:
            holdings_on_date = sec_holdings.loc[d]
            held_secs = holdings_on_date[holdings_on_date.abs() > SHARE_EPSILON]
            for sec_uuid, qty in held_secs.items():
                price = market_resolver.get_price(sec_uuid, d)
                curr = market_resolver.get_security_currency(sec_uuid)
                rate = market_resolver.get_fx(curr, d)
                daily_total += (qty * price) / rate if rate else 0.0
        wealth_values.append(daily_total)

    return pd.Series(wealth_values, index=date_range), sec_holdings


def _calculate_cash_wealth(
    df_txs: pd.DataFrame, date_range: pd.DatetimeIndex, market_resolver: MarketResolver
) -> tuple[pd.Series, pd.DataFrame]:
    """Calculate the total value of all cash accounts on each day of the range."""
    if df_txs.empty:
        return pd.Series(0.0, index=date_range), pd.DataFrame(index=date_range)

    # Simplified version for history rebuild, no complex transfer augmentation
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
        TransactionType.CASH_TRANSFER: -1,  # Treat as outflow from source
    }
    df_txs["sign"] = df_txs["type"].map(cash_signs).fillna(0)
    df_txs["delta_cash"] = df_txs["amount_norm"].fillna(0) * df_txs["sign"]

    acc_txs = df_txs.dropna(subset=["account"])
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
                    rate = market_resolver.get_fx(curr, d)
                    daily_total += bal / rate if rate else 0.0
        wealth_values.append(daily_total)

    return pd.Series(wealth_values, index=date_range), acc_balances
