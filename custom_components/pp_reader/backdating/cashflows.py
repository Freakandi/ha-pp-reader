"""Cashflow bucket derivation for backdating wealth calculations."""

from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.currencies import fx as fx_module
from custom_components.pp_reader.data import db_access
from custom_components.pp_reader.logic.accounting import CASH_TRANSFER_TYPE
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from collections.abc import Iterable, Mapping
    from pathlib import Path

_LOGGER = logging.getLogger("custom_components.pp_reader.backdating.cashflows")

# Confirmed via DB inspection:
# Type 8 = Dividend (has Security)
# Type 9 = Interest (no Security)
# Type 4 = Dividend (Standard PP)
# Type 5 = Interest (Standard PP)
_DIVIDEND_TYPES = {8, 4}
_INTEREST_TYPES = {9, 5}
_INTEREST_CHARGE_TYPES = {10}
_FEE_TYPES = {13}
_FEE_REFUND_TYPES = {14}
_TAX_TYPES = {11}
_TAX_REFUND_TYPES = {12}
_DEPOSIT_TYPES = {6}
_WITHDRAWAL_TYPES = {7}

_BUCKET_MAP = {
    **dict.fromkeys(_DIVIDEND_TYPES, ("dividends", 1)),
    **dict.fromkeys(_INTEREST_TYPES, ("interest", 1)),
    **dict.fromkeys(_INTEREST_CHARGE_TYPES, ("interest", -1)),
    **dict.fromkeys(_FEE_TYPES, ("fees", 1)),
    **dict.fromkeys(_FEE_REFUND_TYPES, ("fees", -1)),
    **dict.fromkeys(_TAX_TYPES, ("taxes", 1)),
    **dict.fromkeys(_TAX_REFUND_TYPES, ("taxes", -1)),
    **dict.fromkeys(_DEPOSIT_TYPES, ("inbound", 1)),
    **dict.fromkeys(_WITHDRAWAL_TYPES, ("outbound", 1)),
}


@dataclass(slots=True)
class DailyCashflowSnapshot:
    """Aggregated cashflow buckets for a specific day."""

    date: str
    dividends_eur: float
    interest_eur: float
    inbound_transfers_eur: float
    outbound_transfers_eur: float
    fees_eur: float
    taxes_eur: float
    fx_coverage_ratio: float


async def async_compute_daily_cashflows(
    hass: Any,
    db_path: Path,
    start_date: date,
    end_date: date,
) -> list[DailyCashflowSnapshot]:
    """Async wrapper to ensure FX coverage and compute daily cashflow buckets."""
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    return await async_run_executor_job(
        hass,
        _compute_daily_cashflows_sync,
        db_path,
        start_date,
        end_date,
    )


def _compute_daily_cashflows_sync(
    db_path: Path,
    start_date: date,
    end_date: date,
) -> list[DailyCashflowSnapshot]:
    """Compute cashflow buckets per day using same-day FX."""
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    accounts = _load_accounts(db_path)
    transactions = _load_relevant_transactions(db_path, accounts)
    transactions_by_date = _group_transactions_by_date(transactions)

    snapshots: list[DailyCashflowSnapshot] = []

    # Initialize FX fallback cache with 1.0 for EUR
    last_known_fx_rates: dict[str, float] = {"EUR": 1.0}

    # Pre-load FX rates for the main loop to avoid N+1 queries
    fx_rates_cache = fx_module.load_fx_rates_cache_range(
        db_path, start_date.isoformat(), end_date.isoformat()
    )

    date_cursor = start_date

    while date_cursor <= end_date:
        daily_txs = transactions_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        daily_fx_rates = fx_rates_cache.get(date_iso, {})

        # Update fallback cache with any available rates for today
        last_known_fx_rates.update(daily_fx_rates)

        if not daily_txs:
            # OPTIMIZATION: Short-circuit if no transactions
            # Returns default 0.0 values and 1.0 coverage without overhead
            snapshots.append(
                DailyCashflowSnapshot(
                    date=date_iso,
                    dividends_eur=0.0,
                    interest_eur=0.0,
                    inbound_transfers_eur=0.0,
                    outbound_transfers_eur=0.0,
                    fees_eur=0.0,
                    taxes_eur=0.0,
                    fx_coverage_ratio=1.0,
                )
            )
        else:
            # Use fallback for today's calculations
            # Optimization: fx_rates is treated as read-only by downstream
            # functions, so we can avoid a full copy.
            fx_rates = last_known_fx_rates

            (
                dividends_eur,
                interest_eur,
                inbound_transfers_eur,
                outbound_transfers_eur,
                fees_eur,
                taxes_eur,
                coverage_ratio,
            ) = _aggregate_daily_buckets(daily_txs, fx_rates)

            snapshots.append(
                DailyCashflowSnapshot(
                    date=date_iso,
                    dividends_eur=dividends_eur,
                    interest_eur=interest_eur,
                    inbound_transfers_eur=inbound_transfers_eur,
                    outbound_transfers_eur=outbound_transfers_eur,
                    fees_eur=fees_eur,
                    taxes_eur=taxes_eur,
                    fx_coverage_ratio=coverage_ratio,
                )
            )

        date_cursor += timedelta(days=1)

    return snapshots


def _load_accounts(db_path: Path) -> dict[str, dict[str, Any]]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT uuid, currency_code, is_retired
            FROM accounts
            """
        ).fetchall()
    return {
        row["uuid"]: {
            "currency": (row["currency_code"] or "EUR").strip().upper(),
            "retired": bool(row["is_retired"]),
        }
        for row in rows
        if row["uuid"]
    }


def _load_relevant_transactions(
    db_path: Path,
    accounts: Mapping[str, Mapping[str, Any]],
) -> list[tuple[date, db_access.Transaction]]:
    """Return cashflow-relevant transactions excluding retired accounts."""
    relevant: list[tuple[date, db_access.Transaction]] = []

    for tx in db_access.get_transactions(db_path=db_path):
        account_uuid = tx.account or tx.other_account
        if not account_uuid or account_uuid not in accounts:
            continue
        # Removed retired check to include history of retired accounts

        parsed_date = fx_module._parse_date_value(tx.date)  # noqa: SLF001
        if parsed_date is None:
            continue

        relevant.append((parsed_date, tx))

    # Data is already sorted by date from SQL query
    return relevant


def _group_transactions_by_date(
    transactions: Iterable[tuple[date, db_access.Transaction]],
) -> dict[date, list[db_access.Transaction]]:
    """Group sorted transactions by date using linear scan."""
    grouped: dict[date, list[db_access.Transaction]] = {}

    # Since transactions are sorted by date, we can avoid setdefault overhead
    # by tracking the current group.
    current_date: date | None = None
    current_list: list[db_access.Transaction] = []

    for parsed_date, tx in transactions:
        if parsed_date != current_date:
            current_date = parsed_date
            current_list = []
            grouped[current_date] = current_list
        current_list.append(tx)

    return grouped


def _load_fx_rates_for_date(
    db_path: Path,
    date_iso: str,
) -> dict[str, float]:
    records = db_access.load_fx_rates_for_date(db_path, date_iso)
    rates: dict[str, float] = {"EUR": 1.0}
    for record in records:
        try:
            numeric = float(record.rate)
        except (TypeError, ValueError):
            continue
        rates[record.currency.strip().upper()] = numeric
    return rates


def _aggregate_daily_buckets(
    transactions: Iterable[db_access.Transaction],
    fx_rates: Mapping[str, float],
) -> tuple[float, float, float, float, float, float, float]:
    curr_buckets = {
        "dividends": 0.0,
        "interest": 0.0,
        "inbound": 0.0,
        "outbound": 0.0,
        "fees": 0.0,
        "taxes": 0.0,
    }
    required_currencies: set[str] = set()
    covered_currencies: set[str] = set()

    for tx in transactions:
        _process_transaction(
            tx, fx_rates, curr_buckets, required_currencies, covered_currencies
        )

    coverage_ratio = 1.0
    if required_currencies:
        coverage_ratio = round(
            len(covered_currencies) / len(required_currencies),
            3,
        )

    return (
        round(curr_buckets["dividends"], 6),
        round(curr_buckets["interest"], 6),
        round(curr_buckets["inbound"], 6),
        round(curr_buckets["outbound"], 6),
        round(curr_buckets["fees"], 6),
        round(curr_buckets["taxes"], 6),
        coverage_ratio,
    )


def _classify_transaction(
    tx: db_access.Transaction,
) -> tuple[str | None, int]:
    """Return bucket name and sign multiplier for a transaction."""
    tx_type = tx.type
    is_internal_transfer = tx_type == CASH_TRANSFER_TYPE and bool(
        tx.account and tx.other_account
    )
    if is_internal_transfer:
        return None, 0

    if result := _BUCKET_MAP.get(tx_type):
        return result

    if tx_type == CASH_TRANSFER_TYPE:
        if tx.account and not tx.other_account:
            return "outbound", 1
        if tx.other_account and not tx.account:
            return "inbound", 1

    return None, 0


def _process_transaction(  # noqa: PLR0912
    tx: db_access.Transaction,
    fx_rates: Mapping[str, float],
    curr_buckets: dict[str, float],
    required_currencies: set[str],
    covered_currencies: set[str],
) -> None:
    """Process a single transaction and update buckets."""
    currency = (tx.currency_code or "EUR").strip().upper()
    amount_cents = int(tx.amount or 0)
    if amount_cents == 0:
        return

    is_foreign = currency != "EUR"
    if is_foreign:
        required_currencies.add(currency)
    fx_rate = fx_rates.get(currency)
    if fx_rate and is_foreign:
        covered_currencies.add(currency)

    # Optimization: Check FX availability early
    if not fx_rate or fx_rate <= 0:
        return

    # Optimization: direct division, no function call overhead
    amount_eur = amount_cents / 100.0
    amount_eur = round(amount_eur / fx_rate, 6) if is_foreign else round(amount_eur, 2)

    bucket, sign = _classify_transaction(tx)

    # Process attached fees/taxes (e.g. on Buys/Sells),
    # avoiding double-count for explicit Fee/Tax transactions
    tx_fees = tx.fees
    tx_taxes = tx.taxes

    # Pre-calculate fee/tax EUR values if they exist to reuse them
    f_eur_abs = 0.0
    t_eur_abs = 0.0

    if tx_fees or tx_taxes:
        if tx_fees:
            f_val = tx_fees / 100.0
            if is_foreign:
                f_eur_abs = abs(round(f_val / fx_rate, 6))
            else:
                f_eur_abs = abs(round(f_val, 2))

            if bucket != "fees":
                curr_buckets["fees"] += f_eur_abs

        if tx_taxes:
            t_val = tx_taxes / 100.0
            if is_foreign:
                t_eur_abs = abs(round(t_val / fx_rate, 6))
            else:
                t_eur_abs = abs(round(t_val, 2))

            if bucket != "taxes":
                curr_buckets["taxes"] += t_eur_abs

    if bucket is None:
        return

    signed_value = amount_eur * sign

    # Portfolio Performance reports Dividends and Interest as GROSS (before tax/fee).
    # The 'amount' in DB is typically Net (payout).
    # So we add back taxes and fees to the metric for these buckets.
    if bucket in ("dividends", "interest"):
        # Optimization: Reuse pre-calculated absolute values
        # Note: signed_value is positive for Div/Int (Income).
        # We add taxes/fees to make it larger (Gross).
        curr_buckets[bucket] += signed_value + t_eur_abs + f_eur_abs
    elif bucket in curr_buckets:
        curr_buckets[bucket] += signed_value
    elif bucket == "fees":
        # Separate fees bucket (for non-attached fees)
        curr_buckets["fees"] += abs(signed_value)
