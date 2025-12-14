"""Holdings aggregation helpers for backdating wealth calculations."""

from __future__ import annotations

import bisect
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
from custom_components.pp_reader.util.currency import cent_to_eur, normalize_raw_price

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
    purchase_value_eur: float | None
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
    invested_capital_eur: float
    realized_gains_eur: float
    portfolio_realized_gains: dict[str, float]


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

    holdings: dict[tuple[str, str], dict[str, float]] = {}
    snapshots: list[DailyHoldingsSnapshot] = []
    adjustments_by_date = _group_transaction_adjustments(transactions)
    date_cursor = start_date

    while date_cursor <= end_date:
        daily_adjustments = adjustments_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        fx_rates = _load_fx_rates_for_date(db_path, date_iso)

        daily_realized_gains = 0.0
        daily_portfolio_gains: dict[str, float] = {}

        for portfolio_uuid, security_uuid, delta_shares, amount, currency in daily_adjustments:
            key = (portfolio_uuid, security_uuid)
            entry = holdings.get(key, {"shares": 0.0, "purchase_value_eur": 0.0})
            current_shares = entry["shares"]
            current_pv = entry["purchase_value_eur"]

            # Resolving value of transaction in EUR at daily rate
            tx_val_eur = 0.0
            if amount > 0:
                tx_currency = (currency or "EUR").strip().upper()
                fx = 1.0 if tx_currency == "EUR" else fx_rates.get(tx_currency)
                if fx:
                    tx_val_eur = cent_to_eur(amount) / fx

            # Average Cost Logic
            if delta_shares > 0:
                # BUY: Add to shares and purchase value
                entry["shares"] += delta_shares
                entry["purchase_value_eur"] += tx_val_eur
            else:
                # SELL: Reduce shares and purchase value proportionally (Average Cost)
                shares_sold = abs(delta_shares)
                if current_shares > 0:
                    avg_cost = current_pv / current_shares
                    cost_basis_sold = shares_sold * avg_cost
                    entry["shares"] -= shares_sold
                    entry["purchase_value_eur"] = max(0.0, current_pv - cost_basis_sold)



                    # Realized Gain = Proceeds (tx_val_eur) - Cost Basis
                    gain = (tx_val_eur - cost_basis_sold)
                    daily_realized_gains += gain

                    # Accumulate per portfolio
                    port_gains = daily_portfolio_gains.get(portfolio_uuid, 0.0)
                    daily_portfolio_gains[portfolio_uuid] = port_gains + gain
                else:
                    # Selling something we don't have (short or data error)
                    # For now just adjust shares, assume 0 cost basis interaction
                    entry["shares"] -= shares_sold

            if entry["shares"] <= 1e-9: # Filter dust
                holdings.pop(key, None)
            else:
                holdings[key] = entry


        date_iso = date_cursor.isoformat()
        # fx_rates already loaded above
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

        invested_capital = round(
            sum(v["purchase_value_eur"] for v in holdings.values()), 4
        )

        snapshots.append(
            DailyHoldingsSnapshot(
                date=date_iso,
                holdings=valuations,
                price_coverage_ratio=price_coverage_ratio,
                fx_coverage_ratio=fx_coverage_ratio,
                stale_price=stale_price,
                total_wealth_eur=total_wealth,
                invested_capital_eur=invested_capital,

                realized_gains_eur=round(daily_realized_gains, 4),
                portfolio_realized_gains={k: round(v, 4) for k, v in daily_portfolio_gains.items()},
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
) -> list[tuple[date, str, str, float, int, str]]:
    """
    Return security transactions that affect holdings.

    Returns: (date, portfolio, security, shares, amount_cents, currency)
    """
    relevant: list[tuple[date, str, str, float, int, str]] = []
    for tx in db_access.get_transactions(db_path=db_path):
        if not tx.security or not tx.portfolio:
            continue

        portfolio_meta = portfolios.get(tx.portfolio)
        security_meta = securities.get(tx.security)
        if not portfolio_meta or not security_meta:
            continue
        # Removed retired check to include history

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

        # Assuming amount is always positive in DB for the value of transaction
        amount = int(tx.amount or 0)
        currency = tx.currency_code or "EUR"

        relevant.append((parsed_date, tx.portfolio, tx.security, shares, amount, currency))

    relevant.sort(key=lambda item: item[0])
    return relevant


def _group_transaction_adjustments(
    transactions: Iterable[tuple[date, str, str, float, int, str]],
) -> dict[date, list[tuple[str, str, float, int, str]]]:
    grouped: dict[date, list[tuple[str, str, float, int, str]]] = {}
    for tx_date, portfolio_uuid, security_uuid, delta_shares, amount, currency in transactions:
        grouped.setdefault(tx_date, []).append(
            (portfolio_uuid, security_uuid, delta_shares, amount, currency)
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

    # Find insertion point where all elements to the left are <= target_date (by date)
    # The list is sorted by date.
    # bisect_right returns index i such that all e in a[:i] have key(e) <= x
    # We want the last element that is <= target_date.
    idx = bisect.bisect_right(entries, target_date, key=lambda x: x[0])

    if idx == 0:
        return None, None, False

    selected_date, selected_price, selected_raw = entries[idx - 1]

    stale = selected_date != target_date
    return selected_price, selected_raw or selected_date.isoformat(), stale


def _build_holdings_valuations(
    holdings: Iterable[tuple[tuple[str, str], dict[str, float]]],
    securities: dict[str, dict[str, Any]],
    price_cache: dict[str, list[tuple[date, float, str]]],
    fx_rates: dict[str, float],
    *,
    target_date: date,
) -> list[HoldingValuation]:
    valuations: list[HoldingValuation] = []
    for (portfolio_uuid, security_uuid), details in holdings:
        shares = details["shares"]
        purchase_value_eur = details.get("purchase_value_eur")

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
                purchase_value_eur=round(purchase_value_eur, 6) if purchase_value_eur is not None else 0.0,
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
