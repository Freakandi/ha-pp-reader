"""Holdings aggregation helpers for backdating wealth calculations."""

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
from custom_components.pp_reader.logic.portfolio import normalize_shares
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import normalize_raw_price

_LOGGER = logging.getLogger("custom_components.pp_reader.backdating.holdings")

_PURCHASE_TYPES = {0, 2}  # BUY, INBOUND_DELIVERY
_SALE_TYPES = {1, 3}  # SELL, OUTBOUND_DELIVERY


@dataclass(slots=True)
class HoldingValuation:
    """Per-security holding valuation for a specific day."""

    portfolio_uuid: str
    security_uuid: str
    currency: str
    shares: float
    price_native: float | None
    price_date: str | None
    price_eur: float | None
    value_eur: float | None
    fx_rate: float | None
    stale_price: bool


@dataclass(slots=True)
class DailyHoldingsSnapshot:
    """Aggregated holdings valuation across all portfolios for a day."""

    date: str
    holdings: list[HoldingValuation]
    price_coverage_ratio: float
    fx_coverage_ratio: float
    stale_price: bool
    total_wealth_eur: float


async def async_compute_daily_holdings_snapshots(
    hass: Any,
    db_path: Path,
    start_date: date,
    end_date: date,
    *,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
) -> list[DailyHoldingsSnapshot]:
    """Async wrapper to ensure FX coverage and compute holdings valuations."""
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
        _compute_daily_holdings_snapshots_sync,
        db_path,
        start_date,
        end_date,
    )


def _compute_daily_holdings_snapshots_sync(
    db_path: Path,
    start_date: date,
    end_date: date,
) -> list[DailyHoldingsSnapshot]:
    """Compute holdings valuations with price fallback and same-day FX conversion."""
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    portfolios = _load_portfolios(db_path)
    securities = _load_securities(db_path)
    transactions = _load_relevant_transactions(db_path, portfolios, securities)
    price_cache = _load_price_cache(db_path)

    holdings: dict[tuple[str, str], float] = {}
    snapshots: list[DailyHoldingsSnapshot] = []
    adjustments_by_date = _group_transaction_adjustments(transactions)
    date_cursor = start_date

    while date_cursor <= end_date:
        daily_adjustments = adjustments_by_date.get(date_cursor, ())
        for portfolio_uuid, security_uuid, delta_shares in daily_adjustments:
            key = (portfolio_uuid, security_uuid)
            holdings[key] = round(holdings.get(key, 0.0) + delta_shares, 8)
            if holdings[key] <= 0:
                holdings.pop(key, None)

        date_iso = date_cursor.isoformat()
        fx_rates = _load_fx_rates_for_date(db_path, date_iso)
        valuations = _build_holdings_valuations(
            holdings.items(),
            securities,
            price_cache,
            fx_rates,
            target_date=date_cursor,
        )
        price_coverage_ratio = _compute_price_coverage_ratio(valuations)
        fx_coverage_ratio = _compute_fx_coverage_ratio(valuations)
        stale_price = any(valuation.stale_price for valuation in valuations)
        total_wealth = round(
            sum(v.value_eur for v in valuations if v.value_eur is not None), 4
        )

        snapshots.append(
            DailyHoldingsSnapshot(
                date=date_iso,
                holdings=valuations,
                price_coverage_ratio=price_coverage_ratio,
                fx_coverage_ratio=fx_coverage_ratio,
                stale_price=stale_price,
                total_wealth_eur=total_wealth,
            )
        )
        date_cursor += timedelta(days=1)

    return snapshots


def _load_portfolios(db_path: Path) -> dict[str, dict[str, Any]]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT uuid, is_retired
            FROM portfolios
            """
        ).fetchall()
    return {
        row["uuid"]: {"is_retired": bool(row["is_retired"])}
        for row in rows
        if row["uuid"]
    }


def _load_securities(db_path: Path) -> dict[str, dict[str, Any]]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT uuid, currency_code, retired
            FROM securities
            """
        ).fetchall()
    return {
        row["uuid"]: {
            "currency": (row["currency_code"] or "EUR").strip().upper(),
            "retired": bool(row["retired"]),
        }
        for row in rows
        if row["uuid"]
    }


def _load_relevant_transactions(
    db_path: Path,
    portfolios: dict[str, dict[str, Any]],
    securities: dict[str, dict[str, Any]],
) -> list[tuple[date, str, str, float]]:
    """Return security transactions that affect holdings."""
    relevant: list[tuple[date, str, str, float]] = []
    for tx in db_access.get_transactions(db_path=db_path):
        if not tx.security or not tx.portfolio:
            continue

        portfolio_meta = portfolios.get(tx.portfolio)
        security_meta = securities.get(tx.security)
        if not portfolio_meta or not security_meta:
            continue
        if portfolio_meta.get("is_retired") or security_meta.get("retired"):
            continue
        if tx.type not in _PURCHASE_TYPES | _SALE_TYPES:
            continue

        parsed_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if parsed_date is None:
            continue

        shares = normalize_shares(tx.shares) if tx.shares else 0.0
        if tx.type in _SALE_TYPES:
            shares *= -1
        if shares == 0:
            continue

        relevant.append((parsed_date, tx.portfolio, tx.security, shares))

    relevant.sort(key=lambda item: item[0])
    return relevant


def _group_transaction_adjustments(
    transactions: Iterable[tuple[date, str, str, float]],
) -> dict[date, list[tuple[str, str, float]]]:
    grouped: dict[date, list[tuple[str, str, float]]] = {}
    for tx_date, portfolio_uuid, security_uuid, delta_shares in transactions:
        grouped.setdefault(tx_date, []).append(
            (portfolio_uuid, security_uuid, delta_shares)
        )
    return grouped


def _load_price_cache(
    db_path: Path,
) -> dict[str, list[tuple[date, float, str]]]:
    """Load historical prices into a security->sorted list cache."""
    cache: dict[str, list[tuple[date, float, str]]] = {}
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT security_uuid, date, close
            FROM historical_prices
            ORDER BY security_uuid, date
            """
        ).fetchall()

    for row in rows:
        security_uuid = row["security_uuid"]
        price_date = fx_module._parse_date_value(row["date"])  # noqa: SLF001
        if security_uuid is None or price_date is None:
            continue
        normalized_price = normalize_raw_price(row["close"], decimals=6)
        if normalized_price is None:
            continue
        cache.setdefault(security_uuid, []).append(
            (price_date, normalized_price, str(row["date"]))
        )

    for entries in cache.values():
        entries.sort(key=lambda entry: entry[0])
    return cache


def _load_fx_rates_for_date(
    db_path: Path,
    date_iso: str,
) -> dict[str, float]:
    records = db_access.load_fx_rates_for_date(db_path, date_iso)
    rates: dict[str, float] = {}
    for record in records:
        try:
            numeric = float(record.rate)
        except (TypeError, ValueError):
            continue
        rates[record.currency.strip().upper()] = numeric
    return rates


def _resolve_price_for_date(
    security_uuid: str,
    price_cache: dict[str, list[tuple[date, float, str]]],
    target_date: date,
) -> tuple[float | None, str | None, bool]:
    """Return close price on or before target date, plus stale flag."""
    entries = price_cache.get(security_uuid)
    if not entries:
        return None, None, False

    selected_price: float | None = None
    selected_date: date | None = None
    selected_raw: str | None = None

    for price_date, price_value, raw_date in reversed(entries):
        if price_date <= target_date:
            selected_price = price_value
            selected_date = price_date
            selected_raw = raw_date
            break

    if selected_price is None or selected_date is None:
        return None, None, False

    stale = selected_date != target_date
    return selected_price, selected_raw or selected_date.isoformat(), stale


def _build_holdings_valuations(
    holdings: Iterable[tuple[tuple[str, str], float]],
    securities: dict[str, dict[str, Any]],
    price_cache: dict[str, list[tuple[date, float, str]]],
    fx_rates: dict[str, float],
    *,
    target_date: date,
) -> list[HoldingValuation]:
    valuations: list[HoldingValuation] = []
    for (portfolio_uuid, security_uuid), shares in holdings:
        security_meta = securities.get(security_uuid, {})
        currency = security_meta.get("currency") or "EUR"

        price_native, price_date_raw, stale = _resolve_price_for_date(
            security_uuid,
            price_cache,
            target_date,
        )

        fx_rate: float | None = 1.0 if currency == "EUR" else fx_rates.get(currency)
        value_eur: float | None = None
        price_eur: float | None = None

        if price_native is not None and fx_rate:
            price_eur = round(price_native / fx_rate, 6)
            value_eur = round(shares * price_eur, 6)

        valuations.append(
            HoldingValuation(
                portfolio_uuid=portfolio_uuid,
                security_uuid=security_uuid,
                currency=currency,
                shares=round(shares, 8),
                price_native=price_native,
                price_date=price_date_raw,
                price_eur=price_eur,
                value_eur=value_eur,
                fx_rate=fx_rate,
                stale_price=stale,
            )
        )

    return valuations


def _compute_price_coverage_ratio(
    holdings: list[HoldingValuation],
) -> float:
    if not holdings:
        return 1.0
    covered = sum(1 for holding in holdings if holding.price_native is not None)
    return round(covered / len(holdings), 3)


def _compute_fx_coverage_ratio(
    holdings: list[HoldingValuation],
) -> float:
    if not holdings:
        return 1.0
    covered = 0
    for valuation in holdings:
        if valuation.currency == "EUR" or valuation.fx_rate:
            covered += 1
    return round(covered / len(holdings), 3)
