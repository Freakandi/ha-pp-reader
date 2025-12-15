"""Holdings aggregation helpers for backdating wealth calculations."""

from __future__ import annotations

import logging
import sqlite3
from bisect import bisect_right
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
_REALIZED_GAIN_TYPES = {1}  # SELL
_EPSILON = 1e-9


@dataclass(slots=True)
class TaxLot:
    """A single purchase lot for FIFO accounting."""

    date: date
    shares: float
    cost_per_share_eur: float
    cost_per_share_native: float
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
    purchase_value_native: float | None
    unrealized_price_gains_eur: float | None
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
    unrealized_price_gains_eur: float
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
    transactions = _load_relevant_transactions(
        db_path, portfolios, securities, until=end_date
    )
    price_cache = _load_price_cache(db_path, until=end_date)

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

    # Pre-load FX rates for the main loop to avoid N+1 queries
    fx_rates_cache = fx_module.load_fx_rates_cache_range(
        db_path, start_date.isoformat(), end_date.isoformat()
    )

    date_cursor = start_date

    while date_cursor <= end_date:
        daily_adjustments = adjustments_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        daily_fx_rates = fx_rates_cache.get(date_iso, {})

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

        unrealized_price_gains = round(
            sum(
                v.unrealized_price_gains_eur
                for v in valuations
                if v.unrealized_price_gains_eur is not None
            ),
            4,
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
                unrealized_price_gains_eur=unrealized_price_gains,
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
    until: date | None = None,
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
            continue

        parsed_date = fx_module._parse_date_value(getattr(tx, "date", None))  # noqa: SLF001
        if parsed_date is None:
            continue

        if until and parsed_date > until:
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
    until: date | None = None,
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

        if until and price_date > until:
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
    """
    Return close price on or before target date, plus stale flag.

    Uses binary search for O(log N) lookup performance instead of O(N) linear scan.
    """
    entries = price_cache.get(security_uuid)
    if not entries:
        return None, None, False

    # Find insertion point for target_date.
    # Entries are sorted by date (guaranteed by _load_price_cache).
    # We want the rightmost entry where date <= target_date.
    idx = bisect_right(entries, target_date, key=lambda x: x[0])

    if idx == 0:
        return None, None, False

    # entry at idx-1 is the largest element <= target_date
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
        purchase_value_native = details.get("purchase_value_native")

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
        unrealized_price_gains_eur: float | None = None

        if price_native is not None and fx_rate:
            price_eur = round(price_native / fx_rate, 6)
            value_eur = round(shares * price_eur, 6)

            # Calculate Unrealized Gain from Price Movement (Native Delta * FX)
            # This strips out the pure FX gain on the principal.
            if purchase_value_native is not None:
                market_value_native = shares * price_native
                native_gain = market_value_native - purchase_value_native
                unrealized_price_gains_eur = round(native_gain / fx_rate, 6)
            elif currency == "EUR":
                unrealized_price_gains_eur = round(
                    value_eur - (purchase_value_eur or 0), 6
                )

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
                purchase_value_native=(
                    round(purchase_value_native, 6)
                    if purchase_value_native is not None
                    else 0.0
                ),
                unrealized_price_gains_eur=unrealized_price_gains_eur,
                fx_rate=fx_rate,
                stale_price=stale,
            )
        )

    return valuations


def _process_buy_lots(
    entry: dict[str, Any],
    delta_shares: float,
    tx_val_eur: float,
    tx_val_native: float,
    tx_date: date,
) -> None:
    """Add new tax lot for a buy transaction."""
    entry["shares"] += delta_shares
    entry["purchase_value_eur"] += tx_val_eur
    entry["purchase_value_native"] = (
        entry.get("purchase_value_native", 0.0) + tx_val_native
    )

    cost_per_share_eur = 0.0
    cost_per_share_native = 0.0
    if delta_shares > 0:
        cost_per_share_eur = tx_val_eur / delta_shares
        cost_per_share_native = tx_val_native / delta_shares

    new_lot = TaxLot(
        date=tx_date,
        shares=delta_shares,
        cost_per_share_eur=cost_per_share_eur,
        cost_per_share_native=cost_per_share_native,
        original_shares=delta_shares,
    )
    entry["lots"].append(new_lot)


def _process_sell_lots(
    entry: dict[str, Any],
    shares_to_sell: float,
) -> tuple[float, float]:
    """Consume tax lots FIFO for a sell transaction."""
    lots: deque[TaxLot] = entry["lots"]
    entry["shares"] -= shares_to_sell

    cost_sold_eur = 0.0
    cost_sold_native = 0.0

    while shares_to_sell > _EPSILON and lots:
        current_lot = lots[0]

        if current_lot.shares <= shares_to_sell:
            # Consume entire lot
            shares_from_lot = current_lot.shares
            cost_from_lot_eur = shares_from_lot * current_lot.cost_per_share_eur
            cost_from_lot_native = shares_from_lot * current_lot.cost_per_share_native

            cost_sold_eur += cost_from_lot_eur
            cost_sold_native += cost_from_lot_native
            shares_to_sell -= shares_from_lot
            lots.popleft()  # Remove exhausted lot
        else:
            # Partial consumption
            shares_from_lot = shares_to_sell
            cost_from_lot_eur = shares_from_lot * current_lot.cost_per_share_eur
            cost_from_lot_native = shares_from_lot * current_lot.cost_per_share_native

            cost_sold_eur += cost_from_lot_eur
            cost_sold_native += cost_from_lot_native

            # Update remaining shares in the lot (mutate in place)
            current_lot.shares -= shares_from_lot
            shares_to_sell = 0.0

    entry["purchase_value_eur"] -= cost_sold_eur
    entry["purchase_value_native"] = (
        entry.get("purchase_value_native", 0.0) - cost_sold_native
    )

    # Avoid negative zeros
    if entry["shares"] < _EPSILON:
        entry["shares"] = 0.0
    if entry["purchase_value_eur"] < 0:
        entry["purchase_value_eur"] = 0.0
    if entry["purchase_value_native"] < 0:
        entry["purchase_value_native"] = 0.0

    return cost_sold_eur, cost_sold_native


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
    Apply a single transaction to holdings state.

    Returns (realized_gain, neutral_movement).
    """
    key = (portfolio_uuid, security_uuid)
    # Entry structure:
    # - "shares": float
    # - "purchase_value_eur": float (Sum of cost of remaining lots)
    # - "purchase_value_native": float (Sum of cost of remaining
    #   lots in native currency)

    # - "lots": deque[TaxLot]
    if key not in holdings:
        holdings[key] = {
            "shares": 0.0,
            "purchase_value_eur": 0.0,
            "purchase_value_native": 0.0,
            "lots": deque(),
        }

    entry = holdings[key]

    # Resolving value of transaction in EUR at daily rate
    tx_val_eur = 0.0
    tx_val_native = 0.0
    if amount > 0:
        tx_currency = (currency or "EUR").strip().upper()
        # For Type 2/3 (Delivery/Transfer), amount is value.
        # For Type 0/1 (Buy/Sell), amount is value.
        # This value is in tx_currency.

        # Native value (in Security Currency units) needs conversion
        # if Tx currency != Security currency?
        # Assuming for now Tx Currency matches Security Currency or is acceptable proxy.
        # Ideally we'd need Security Metadata here to know its currency,
        # but explicit "currency" arg comes from the transaction record.

        # Determine native value (units of security currency)
        # We invoke cent_to_eur effectively as cent_to_unit here.
        tx_val_native = cent_to_eur(amount)

        fx = 1.0 if tx_currency == "EUR" else fx_rates.get(tx_currency)
        if fx:
            tx_val_eur = tx_val_native / fx

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
        _process_buy_lots(entry, delta_shares, tx_val_eur, tx_val_native, tx_date)

    else:
        # SELL: Reduce shares, consume lots FIFO
        shares_to_sell = abs(delta_shares)

        # Helper returns total cost basis of the sold shares
        cost_basis_sold_eur, _ = _process_sell_lots(entry, shares_to_sell)

        # Realized Gain = Proceeds (Val in EUR) - Cost Basis (in EUR)
        # Note: tx_val_eur is usually positive for "Sell" type (Type 1),
        # but check sign convention. In common usage here, 'amount' is positive value.
        # So Realized Gain = Sale Value - Cost Basis
        if tx_type in _REALIZED_GAIN_TYPES:
            realized_gain = tx_val_eur - cost_basis_sold_eur

    if entry["shares"] <= _EPSILON:  # Filter dust
        holdings.pop(key, None)

    return realized_gain, neutral_movement
