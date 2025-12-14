"""Holdings aggregation helpers for backdating wealth calculations."""

from __future__ import annotations

import logging
import sqlite3
from collections import deque
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

_LOGGER = logging.getLogger(__name__)

_PURCHASE_TYPES = {0, 2}  # BUY, INBOUND_DELIVERY
_SALE_TYPES = {1, 3}  # SELL, OUTBOUND_DELIVERY
_NEUTRAL_INBOUND_TYPES = {2}  # INBOUND_DELIVERY (Einlieferung)
_NEUTRAL_OUTBOUND_TYPES = {3}  # OUTBOUND_DELIVERY (Auslieferung)
_EPSILON = 1e-9


@dataclass(slots=True)
class TaxLot:
    """A single purchase lot for FIFO accounting."""

    date: date
    shares: float
    cost_per_share_eur: float
    original_shares: float


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
    performance_neutral_movements: float


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

    # Initialize FX fallback cache with 1.0 for EUR
    last_known_fx_rates: dict[str, float] = {"EUR": 1.0}

    holdings: dict[tuple[str, str], dict[str, Any]] = {}
    snapshots: list[DailyHoldingsSnapshot] = []
    adjustments_by_date = _group_transaction_adjustments(transactions)

    # Pre-calculate initial state from prior transactions
    # We must process in correct date order for Average Cost logic.
    sorted_dates = sorted(adjustments_by_date.keys())

    for tx_date in sorted_dates:
        if tx_date >= start_date:
            break

        # Load FX for the specific prior date to ensure correct valuation
        date_iso = tx_date.isoformat()
        daily_fx_rates = _load_fx_rates_for_date(db_path, date_iso)
        last_known_fx_rates.update(daily_fx_rates)
        fx_rates = last_known_fx_rates.copy()

        for params in adjustments_by_date[tx_date]:
            # Apply update but ignore gains/neutral movements for initialization
            _apply_transaction_update(
                *params,
                fx_rates=fx_rates,
                holdings=holdings,
                tx_date=tx_date,
            )

    date_cursor = start_date

    while date_cursor <= end_date:
        daily_adjustments = adjustments_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        daily_fx_rates = _load_fx_rates_for_date(db_path, date_iso)

        # Update fallback cache with any available rates for today
        last_known_fx_rates.update(daily_fx_rates)

        # Use fallback for today's calculations
        fx_rates = last_known_fx_rates.copy()

        daily_realized_gains = 0.0
        daily_portfolio_gains: dict[str, float] = {}
        daily_neutral_movements = 0.0

        for (
            portfolio_uuid,
            security_uuid,
            delta_shares,
            amount,
            currency,
            tx_type,
        ) in daily_adjustments:
            gain, neutral_val = _apply_transaction_update(
                portfolio_uuid,
                security_uuid,
                delta_shares,
                amount,
                currency,
                tx_type,
                fx_rates=fx_rates,
                holdings=holdings,
                tx_date=date_cursor,
            )
            daily_realized_gains += gain
            daily_neutral_movements += neutral_val

            if gain != 0.0:
                daily_portfolio_gains[portfolio_uuid] = (
                    daily_portfolio_gains.get(portfolio_uuid, 0.0) + gain
                )

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
                portfolio_realized_gains={
                    k: round(v, 4) for k, v in daily_portfolio_gains.items()
                },
                performance_neutral_movements=round(daily_neutral_movements, 4),
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
) -> list[tuple[date, str, str, float, int, str, int]]:
    """
    Return security transactions that affect holdings.

    Returns: (date, portfolio, security, shares, amount_cents, currency, type)
    """
    relevant: list[tuple[date, str, str, float, int, str, int]] = []

    for tx in db_access.get_transactions(db_path=db_path):
        if not tx.security or not tx.portfolio:
            continue

        portfolio_meta = portfolios.get(tx.portfolio)
        security_meta = securities.get(tx.security)
        if not portfolio_meta or not security_meta:
            _LOGGER.debug(
                "Skipping Tx %s type %s - Port/Sec missing. Port=%s Sec=%s",
                tx.uuid,
                tx.type,
                tx.portfolio,
                tx.security,
            )
            continue
        # Removed retired check to include history

        if tx.type not in _PURCHASE_TYPES | _SALE_TYPES:
            # Very verbose if enabled
            # _LOGGER.debug(  # noqa: ERA001
            #     "Skipping Tx %s type %s - Not relevant type", tx.uuid, tx.type
            # )
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

        relevant.append(
            (parsed_date, tx.portfolio, tx.security, shares, amount, currency, tx.type)
        )

    relevant.sort(key=lambda item: item[0])
    return relevant


def _group_transaction_adjustments(
    transactions: Iterable[tuple[date, str, str, float, int, str, int]],
) -> dict[date, list[tuple[str, str, float, int, str, int]]]:
    grouped: dict[date, list[tuple[str, str, float, int, str, int]]] = {}
    for (
        tx_date,
        portfolio_uuid,
        security_uuid,
        delta_shares,
        amount,
        currency,
        tx_type,
    ) in transactions:
        grouped.setdefault(tx_date, []).append(
            (portfolio_uuid, security_uuid, delta_shares, amount, currency, tx_type)
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
                purchase_value_eur=(
                    round(purchase_value_eur, 6)
                    if purchase_value_eur is not None
                    else 0.0
                ),
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


def _apply_transaction_update(
    portfolio_uuid: str,
    security_uuid: str,
    delta_shares: float,
    amount: int,
    currency: str,
    tx_type: int,
    fx_rates: dict[str, float],
    holdings: dict[tuple[str, str], dict[str, Any]],
    tx_date: date,
) -> tuple[float, float]:
    """
    Apply a single transaction to holdings state and return
    (realized_gain, neutral_movement).
    """
    key = (portfolio_uuid, security_uuid)
    # Entry structure:
    # - "shares": float
    # - "purchase_value_eur": float (Sum of cost of remaining lots)
    # - "lots": deque[TaxLot]
    if key not in holdings:
        holdings[key] = {
            "shares": 0.0,
            "purchase_value_eur": 0.0,
            "lots": deque(),
        }

    entry = holdings[key]
    lots: deque[TaxLot] = entry["lots"]

    # Resolving value of transaction in EUR at daily rate
    tx_val_eur = 0.0
    if amount > 0:
        tx_currency = (currency or "EUR").strip().upper()
        fx = 1.0 if tx_currency == "EUR" else fx_rates.get(tx_currency)
        if fx:
            tx_val_eur = cent_to_eur(amount) / fx

    neutral_movement = 0.0
    # Accumulate Performance Neutral Movements (Ein-/Auslieferung)
    if tx_type in _NEUTRAL_INBOUND_TYPES or tx_type in _NEUTRAL_OUTBOUND_TYPES:
        # Type 2 (In w/ value) or Type 3 (Out w/ value)
        # Transaction amount is absolute value.
        sign = 1 if tx_type in _NEUTRAL_INBOUND_TYPES else -1
        neutral_movement = tx_val_eur * sign

    realized_gain = 0.0

    # FIFO Logic
    if delta_shares > 0:
        # BUY: Add to shares and purchase value, append new lot
        entry["shares"] += delta_shares

        # Cost basis for this specific buy
        # Note: For inbound delivery (Type 2), tx_val_eur is the cost basis we assume.
        entry["purchase_value_eur"] += tx_val_eur

        cost_per_share = tx_val_eur / delta_shares if delta_shares > 0 else 0.0

        new_lot = TaxLot(
            date=tx_date,
            shares=delta_shares,
            cost_per_share_eur=cost_per_share,
            original_shares=delta_shares,
        )
        lots.append(new_lot)

    else:
        # SELL: Reduce shares, consume lots FIFO
        shares_to_sell = abs(delta_shares)
        entry["shares"] -= shares_to_sell

        total_cost_basis_sold = 0.0

        while shares_to_sell > _EPSILON and lots:
            current_lot = lots[0]

            if current_lot.shares <= shares_to_sell:
                # Consume entire lot
                shares_from_lot = current_lot.shares
                cost_from_lot = shares_from_lot * current_lot.cost_per_share_eur

                total_cost_basis_sold += cost_from_lot
                shares_to_sell -= shares_from_lot
                lots.popleft()  # Remove exhausted lot
            else:
                # Python doesn't support modifying dataclass fields if frozen?
                # slots=True is mutable by default unless frozen=True is set.
                # However, replacement is cleaner.

                shares_from_lot = shares_to_sell
                cost_from_lot = shares_from_lot * current_lot.cost_per_share_eur

                total_cost_basis_sold += cost_from_lot

                # Update lot with remaining shares
                current_lot.shares -= shares_to_sell
                shares_to_sell = 0.0
                # Lot remains at head of queue

        # If we ran out of lots but still sold shares (data inconsistencies)
        # We assume 0 cost basis for the excess.

        # Update aggregate purchase value
        entry["purchase_value_eur"] = max(
            0.0, entry["purchase_value_eur"] - total_cost_basis_sold
        )

        # Realized Gain = Proceeds (tx_val_eur) - Cost Basis of Sold Lots
        realized_gain = tx_val_eur - total_cost_basis_sold

    if entry["shares"] <= _EPSILON:  # Filter dust
        holdings.pop(key, None)

    return realized_gain, neutral_movement
