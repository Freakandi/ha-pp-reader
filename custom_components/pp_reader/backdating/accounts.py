"""Account balance rollups for backdating wealth calculations."""

from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable, Mapping
    from pathlib import Path

from custom_components.pp_reader.currencies import fx as fx_module
from custom_components.pp_reader.data import db_access
from custom_components.pp_reader.logic.accounting import CASH_TRANSFER_TYPE
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

_LOGGER = logging.getLogger("custom_components.pp_reader.backdating.accounts")

_CREDIT_TYPES = {
    1,
    5,
    6,
    8,
    9,
    12,
    14,
}  # SELL, TRANSFER_IN, DEPOSIT, DIVIDENDS, INTEREST, TAX_REFUND, FEES_REFUND
_DEBIT_TYPES = {
    0,
    5,
    7,
    10,
    11,
    13,
}  # BUY, TRANSFER_OUT, REMOVAL, INTEREST_CHARGE, TAXES, FEES


@dataclass(slots=True)
class AccountValuation:
    """Per-account balance for a specific day."""

    account_uuid: str
    currency: str
    balance_native: float
    fx_rate: float | None
    balance_eur: float | None


@dataclass(slots=True)
class DailyAccountSnapshot:
    """Aggregated account balances for a day."""

    date: str
    accounts: list[AccountValuation]
    account_wealth_eur: float
    fx_coverage_ratio: float


async def async_compute_daily_account_snapshots(
    hass: Any,
    db_path: Path,
    start_date: date,
    end_date: date,
    *,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
) -> list[DailyAccountSnapshot]:
    """Async wrapper to ensure FX coverage and compute per-day account balances."""
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
        _compute_daily_account_snapshots_sync,
        db_path,
        start_date,
        end_date,
    )


def _compute_daily_account_snapshots_sync(
    db_path: Path,
    start_date: date,
    end_date: date,
) -> list[DailyAccountSnapshot]:
    """Compute account balances per day and convert to EUR using same-day FX."""
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    accounts = _load_accounts(db_path)
    tx_units = _load_transaction_units(db_path)
    transactions = _load_relevant_transactions(db_path, accounts)
    adjustments_by_date = _group_transaction_adjustments(
        transactions,
        accounts_currency_map=accounts,
        tx_units=tx_units,
    )

    balances_cents: dict[str, int] = {}
    snapshots: list[DailyAccountSnapshot] = []

    # Pre-calculate initial state from prior transactions
    for tx_date, adjustments in adjustments_by_date.items():
        if tx_date < start_date:
            for account_uuid, delta in adjustments:
                balances_cents[account_uuid] = (
                    balances_cents.get(account_uuid, 0) + delta
                )

    date_cursor = start_date

    while date_cursor <= end_date:
        for account_uuid, delta in adjustments_by_date.get(date_cursor, ()):
            balances_cents[account_uuid] = balances_cents.get(account_uuid, 0) + delta

        date_iso = date_cursor.isoformat()
        fx_rates = _load_fx_rates_for_date(db_path, date_iso)
        accounts_snapshot = _build_account_valuations(
            balances_cents,
            accounts,
            fx_rates,
        )
        fx_coverage_ratio = _compute_fx_coverage_ratio(accounts_snapshot)
        account_wealth = round(
            sum(
                val.balance_eur
                for val in accounts_snapshot
                if val.balance_eur is not None
            ),
            6,
        )

        snapshots.append(
            DailyAccountSnapshot(
                date=date_iso,
                accounts=accounts_snapshot,
                account_wealth_eur=account_wealth,
                fx_coverage_ratio=fx_coverage_ratio,
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
        # Retired accounts are included to ensure historical transactions are processed.
    }


def _load_transaction_units(db_path: Path) -> dict[str, dict[str, int | str]]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                transaction_uuid,
                fx_amount,
                fx_currency_code
            FROM transaction_units
            WHERE fx_amount IS NOT NULL
            """
        ).fetchall()
    payload: dict[str, dict[str, int | str]] = {}
    for row in rows:
        payload[row["transaction_uuid"]] = {
            "fx_amount": row["fx_amount"],
            "fx_currency_code": (row["fx_currency_code"] or "").strip().upper(),
        }
    return payload


def _load_relevant_transactions(
    db_path: Path,
    accounts: Mapping[str, Mapping[str, Any]],
) -> list[db_access.Transaction]:
    """Return account-linked transactions excluding retired accounts."""
    relevant: list[db_access.Transaction] = []
    for tx in db_access.get_transactions(db_path=db_path):
        if not tx.account and not tx.other_account:
            continue

        account_uuid = tx.account or tx.other_account
        if not account_uuid or account_uuid not in accounts:
            continue
        # Removed retired check to include history

        parsed_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if parsed_date is None:
            continue

        relevant.append(tx)

    relevant.sort(key=lambda txn: fx_module._parse_date_value(txn.date) or date.min)  # noqa: SLF001
    return relevant


def _group_transaction_adjustments(
    transactions: Iterable[db_access.Transaction],
    *,
    accounts_currency_map: Mapping[str, Mapping[str, Any]],
    tx_units: Mapping[str, Mapping[str, int | str]],
) -> dict[date, list[tuple[str, int]]]:
    """Aggregate transaction deltas per account keyed by transaction date."""
    grouped: dict[date, list[tuple[str, int]]] = {}
    for tx in transactions:
        tx_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if tx_date is None:
            continue

        for account_uuid, delta in _transaction_deltas(
            tx,
            accounts_currency_map=accounts_currency_map,
            tx_units=tx_units,
        ):
            grouped.setdefault(tx_date, []).append((account_uuid, delta))
    return grouped


def _transaction_deltas(
    tx: db_access.Transaction,
    *,
    accounts_currency_map: Mapping[str, Mapping[str, Any]],
    tx_units: Mapping[str, Mapping[str, int | str]],
) -> list[tuple[str, int]]:
    """Return per-account balance deltas (cents) for a transaction."""
    deltas: list[tuple[str, int]] = []
    account_uuid = tx.account
    other_account_uuid = tx.other_account

    if tx.type == CASH_TRANSFER_TYPE:
        if account_uuid and account_uuid in accounts_currency_map:
            deltas.append((account_uuid, -int(tx.amount or 0)))
        if other_account_uuid and other_account_uuid in accounts_currency_map:
            credit_amount = int(tx.amount or 0)
            if tx_units:
                unit = tx_units.get(tx.uuid)
                dest_currency = accounts_currency_map.get(other_account_uuid, {}).get(
                    "currency"
                )
                if (
                    unit
                    and unit.get("fx_amount") is not None
                    and unit.get("fx_currency_code") == dest_currency
                ):
                    credit_amount = int(unit["fx_amount"] or 0)
            deltas.append((other_account_uuid, credit_amount))
        return deltas

    if account_uuid and account_uuid in accounts_currency_map:
        if tx.type in _CREDIT_TYPES:
            deltas.append((account_uuid, int(tx.amount or 0)))
        elif tx.type in _DEBIT_TYPES:
            deltas.append((account_uuid, -int(tx.amount or 0)))

    return deltas


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


def _build_account_valuations(
    balances_cents: Mapping[str, int],
    accounts: Mapping[str, Mapping[str, Any]],
    fx_rates: Mapping[str, float],
) -> list[AccountValuation]:
    valuations: list[AccountValuation] = []
    for account_uuid, balance_cents in balances_cents.items():
        if account_uuid not in accounts:
            continue
        currency = accounts[account_uuid].get("currency") or "EUR"
        balance_native = cent_to_eur(balance_cents, default=0.0) or 0.0

        if currency == "EUR":
            fx_rate = 1.0
            balance_eur = round(balance_native, 6)
        else:
            fx_rate = fx_rates.get(currency)
            balance_eur = (
                round(balance_native / fx_rate, 6) if fx_rate and fx_rate > 0 else None
            )

        valuations.append(
            AccountValuation(
                account_uuid=account_uuid,
                currency=currency,
                balance_native=balance_native,
                fx_rate=fx_rate,
                balance_eur=balance_eur,
            )
        )
    return valuations


def _compute_fx_coverage_ratio(accounts: list[AccountValuation]) -> float:
    required_currencies = {
        valuation.currency for valuation in accounts if valuation.balance_native != 0.0
    }
    if not required_currencies:
        return 1.0

    covered = 0
    for valuation in accounts:
        if valuation.balance_native == 0.0:
            continue
        if valuation.currency == "EUR":
            covered += 1
            continue
        if valuation.balance_eur is not None:
            covered += 1
    return round(covered / len(required_currencies), 3)
