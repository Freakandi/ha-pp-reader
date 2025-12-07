"""Cashflow bucket derivation for backdating wealth calculations."""

from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping

from custom_components.pp_reader.currencies import fx as fx_module
from custom_components.pp_reader.data import db_access
from custom_components.pp_reader.logic.accounting import CASH_TRANSFER_TYPE
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

_LOGGER = logging.getLogger("custom_components.pp_reader.backdating.cashflows")

_DIVIDEND_TYPES = {9}
_INTEREST_TYPES = {8}
_INTEREST_CHARGE_TYPES = {10}
_FEE_TYPES = {13}
_FEE_REFUND_TYPES = {14}
_TAX_TYPES = {11}
_TAX_REFUND_TYPES = {12}
_DEPOSIT_TYPES = {6}
_WITHDRAWAL_TYPES = {7}


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
    *,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
) -> list[DailyCashflowSnapshot]:
    """Async wrapper to ensure FX coverage and compute daily cashflow buckets."""
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    await fx_module.async_prepare_exchange_rates_for_backdating(
        hass,
        db_path,
        until=end_date,
        emit_progress=emit_progress,
    )

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
    date_cursor = start_date

    while date_cursor <= end_date:
        daily_txs = transactions_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        fx_rates = _load_fx_rates_for_date(db_path, date_iso)

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
) -> list[db_access.Transaction]:
    """Return cashflow-relevant transactions excluding retired accounts."""
    relevant: list[db_access.Transaction] = []
    for tx in db_access.get_transactions(db_path=db_path):
        account_uuid = tx.account or tx.other_account
        if not account_uuid or account_uuid not in accounts:
            continue
        if accounts.get(account_uuid, {}).get("retired"):
            continue

        parsed_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if parsed_date is None:
            continue

        relevant.append(tx)

    relevant.sort(key=lambda txn: fx_module._parse_date_value(txn.date) or date.min)  # noqa: SLF001
    return relevant


def _group_transactions_by_date(
    transactions: Iterable[db_access.Transaction],
) -> dict[date, list[db_access.Transaction]]:
    grouped: dict[date, list[db_access.Transaction]] = {}
    for tx in transactions:
        parsed_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if parsed_date is None:
            continue
        grouped.setdefault(parsed_date, []).append(tx)
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
    dividends = interest = inbound = outbound = fees = taxes = 0.0
    required_currencies: set[str] = set()
    covered_currencies: set[str] = set()

    for tx in transactions:
        currency = (tx.currency_code or "EUR").strip().upper()
        amount_cents = int(tx.amount or 0)
        if amount_cents == 0:
            continue

        is_foreign = currency != "EUR"
        if is_foreign:
            required_currencies.add(currency)
        fx_rate = fx_rates.get(currency)
        if fx_rate and is_foreign:
            covered_currencies.add(currency)

        amount_eur = None
        if fx_rate and fx_rate > 0:
            amount_eur = cent_to_eur(amount_cents, default=0.0) or 0.0
            if currency != "EUR":
                amount_eur = round(amount_eur / fx_rate, 6)

        bucket, sign = _classify_transaction(tx)
        if bucket is None or amount_eur is None:
            continue

        signed_value = amount_eur * sign
        if bucket == "dividends":
            dividends += signed_value
        elif bucket == "interest":
            interest += signed_value
        elif bucket == "inbound":
            inbound += signed_value
        elif bucket == "outbound":
            outbound += signed_value
        elif bucket == "fees":
            fees += abs(signed_value)
        elif bucket == "taxes":
            taxes += signed_value

    coverage_ratio = 1.0
    if required_currencies:
        coverage_ratio = round(
            len(covered_currencies) / len(required_currencies),
            3,
        )

    return (
        round(dividends, 6),
        round(interest, 6),
        round(inbound, 6),
        round(outbound, 6),
        round(fees, 6),
        round(taxes, 6),
        coverage_ratio,
    )


def _classify_transaction(
    tx: db_access.Transaction,
) -> tuple[str | None, int]:
    """Return bucket name and sign multiplier for a transaction."""
    tx_type = tx.type
    is_internal_transfer = (
        tx_type == CASH_TRANSFER_TYPE and bool(tx.account and tx.other_account)
    )
    if is_internal_transfer:
        return None, 0

    if tx_type in _DIVIDEND_TYPES:
        return "dividends", 1
    if tx_type in _INTEREST_TYPES:
        return "interest", 1
    if tx_type in _INTEREST_CHARGE_TYPES:
        return "interest", -1
    if tx_type in _FEE_TYPES:
        return "fees", 1
    if tx_type in _FEE_REFUND_TYPES:
        return "fees", -1
    if tx_type in _TAX_TYPES:
        return "taxes", 1
    if tx_type in _TAX_REFUND_TYPES:
        return "taxes", -1

    if tx_type in _DEPOSIT_TYPES:
        return "inbound", 1
    if tx_type in _WITHDRAWAL_TYPES:
        return "outbound", 1
    if tx_type == CASH_TRANSFER_TYPE:
        if tx.account and not tx.other_account:
            return "outbound", 1
        if tx.other_account and not tx.account:
            return "inbound", 1

    return None, 0
