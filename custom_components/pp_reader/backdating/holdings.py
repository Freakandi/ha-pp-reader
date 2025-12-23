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

    bounds = await async_run_executor_job(
        hass, fx_module.discover_currency_date_bounds, db_path
    )
    schedule = fx_module.build_fx_schedule_from_bounds(bounds, until=end_date)
    await fx_module.async_ensure_exchange_rates_for_schedule(
        hass,
        db_path,
        schedule,
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
    price_cache = _load_price_cache(db_path, until=end_date, securities=securities)

    # Initialize FX fallback cache with 1.0 for EUR
    last_known_fx_rates: dict[str, float] = {"EUR": 1.0}

    holdings: dict[tuple[str, str], dict[str, Any]] = {}
    snapshots: list[DailyHoldingsSnapshot] = []
    adjustments_by_date = _group_transaction_adjustments(transactions)

    # Pre-calculate initial state from prior transactions
    # We must process in correct date order for Average Cost logic.
    sorted_dates = sorted(adjustments_by_date.keys())

    # Pre-load FX rates for the entire relevant range (init + main loop)
    # Plus a 7-day lookback to ensure we have a latch for the start_date
    lookback_start = start_date - timedelta(days=7)
    cache_start_date = lookback_start
    if sorted_dates:
        first_tx_date = sorted_dates[0]
        if first_tx_date < lookback_start:
            cache_start_date = first_tx_date

    fx_rates_cache = fx_module.load_fx_rates_cache_range(
        db_path, cache_start_date.isoformat(), end_date.isoformat()
    )

    # Explicitly seed the latch from the lookback period up to start_date
    # This handles cases where no transactions occurred recently but we need valid FX
    # (e.g. Price Stale check)
    seed_cursor = lookback_start
    while seed_cursor < start_date:
        if day_rates := fx_rates_cache.get(seed_cursor.isoformat()):
            last_known_fx_rates.update(day_rates)
        seed_cursor += timedelta(days=1)

    for tx_date in sorted_dates:
        if tx_date >= start_date:
            break

        # Use cached FX rates for the specific prior date
        date_iso = tx_date.isoformat()
        daily_fx_rates = fx_rates_cache.get(date_iso, {})
        last_known_fx_rates.update(daily_fx_rates)
        # Optimization: Pass reference directly, avoid copy (consumers are read-only)
        fx_rates = last_known_fx_rates

        for params in adjustments_by_date[tx_date]:
            # Apply update but ignore gains/neutral movements for initialization
            _apply_transaction_update(
                *params,
                fx_rates=fx_rates,
                holdings=holdings,
                tx_date=tx_date,
            )

    date_cursor = start_date

    # Cursor map for O(1) price lookups: security_uuid -> last_index
    price_cursors: dict[str, int] = {}

    while date_cursor <= end_date:
        daily_adjustments = adjustments_by_date.get(date_cursor, ())
        date_iso = date_cursor.isoformat()
        daily_fx_rates = fx_rates_cache.get(date_iso, {})

        # Update fallback cache with any available rates for today
        last_known_fx_rates.update(daily_fx_rates)

        # Use fallback for today's calculations
        # Optimization: Pass reference directly, avoid copy (consumers are read-only)
        fx_rates = last_known_fx_rates

        daily_neutral_movements = 0.0

        for (
            portfolio_uuid,
            security_uuid,
            delta_shares,
            amount,
            currency,
            tx_type,
            fees,
            taxes,
            fx_rate_to_base,
        ) in daily_adjustments:
            _, _, neutral_val = _apply_transaction_update(
                portfolio_uuid,
                security_uuid,
                delta_shares,
                amount,
                currency,
                tx_type,
                fees,
                taxes,
                fx_rate_to_base,
                fx_rates=fx_rates,
                holdings=holdings,
                tx_date=date_cursor,
                security_currency=(
                    securities.get(security_uuid, {}).get("currency") or "EUR"
                )
                .strip()
                .upper(),
            )
            daily_neutral_movements += neutral_val

        date_iso = date_cursor.isoformat()
        # fx_rates already loaded above
        valuations = _build_holdings_valuations(
            holdings.items(),
            securities,
            price_cache,
            fx_rates,
            target_date=date_cursor,
            fx_rates_cache=fx_rates_cache,
            price_cursors=price_cursors,
        )
        (
            price_coverage_ratio,
            fx_coverage_ratio,
            stale_price,
            total_wealth,
            _,
        ) = _aggregate_holdings_metrics(valuations)

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
            SELECT uuid, currency_code, retired, last_price, last_price_date
            FROM securities
            """
        ).fetchall()
    return {
        row["uuid"]: {
            "currency": (row["currency_code"] or "EUR").strip().upper(),
            "retired": bool(row["retired"]),
            "last_price": row["last_price"],
            "last_price_date": row["last_price_date"],
        }
        for row in rows
        if row["uuid"]
    }


def _load_relevant_transactions(
    db_path: Path,
    portfolios: dict[str, dict[str, Any]],
    securities: dict[str, dict[str, Any]],
    until: date | None = None,
) -> list[tuple[date, str, str, float, int, str, int, int, int, float | None]]:
    """
    Return security transactions that affect holdings.

    Returns:
        (date, portfolio, security, shares, amount_cents, currency, type,
         fees_cents, taxes_cents, fx_rate_to_base)

    """
    relevant: list[
        tuple[date, str, str, float, int, str, int, int, int, float | None]
    ] = []

    date_parse_cache: dict[Any, date | None] = {}

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

        raw_date = tx.date
        if raw_date in date_parse_cache:
            parsed_date = date_parse_cache[raw_date]
        else:
            parsed_date = fx_module._parse_date_value(raw_date)  # noqa: SLF001
            date_parse_cache[raw_date] = parsed_date

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
        fees = int(tx.fees or 0)
        taxes = int(tx.taxes or 0)
        currency = tx.currency_code or "EUR"

        relevant.append(
            (
                parsed_date,
                tx.portfolio,
                tx.security,
                shares,
                amount,
                currency,
                tx.type,
                fees,
                taxes,
                tx.fx_rate_to_base,
            )
        )

    # Data is already sorted by date from SQL query
    return relevant


def _group_transaction_adjustments(
    transactions: Iterable[
        tuple[date, str, str, float, int, str, int, int, int, float | None]
    ],
) -> dict[date, list[tuple[str, str, float, int, str, int, int, int, float | None]]]:
    grouped: dict[
        date, list[tuple[str, str, float, int, str, int, int, int, float | None]]
    ] = {}

    current_date: date | None = None
    current_list: list[
        tuple[str, str, float, int, str, int, int, int, float | None]
    ] = []

    for (
        tx_date,
        portfolio_uuid,
        security_uuid,
        delta_shares,
        amount,
        currency,
        tx_type,
        fees,
        taxes,
        fx_rate_to_base,
    ) in transactions:
        # Transactions are pre-sorted by date, so we can avoid setdefault overhead
        if tx_date != current_date:
            if current_date and tx_date < current_date:
                # Should not happen if data is correctly sorted from DB
                _LOGGER.warning(
                    "Transactions not sorted! Date %s appeared after %s",
                    tx_date,
                    current_date,
                )
                # Fallback to safe insertion
                current_list = grouped.setdefault(tx_date, [])
            else:
                current_list = []
                grouped[tx_date] = current_list
            current_date = tx_date

        current_list.append(
            (
                portfolio_uuid,
                security_uuid,
                delta_shares,
                amount,
                currency,
                tx_type,
                fees,
                taxes,
                fx_rate_to_base,
            )
        )
    return grouped


def _load_price_cache(
    db_path: Path,
    until: date | None = None,
    securities: dict[str, dict[str, Any]] | None = None,
) -> dict[str, list[tuple[date, float, str]]]:
    """Load historical prices into a security-sorted list cache."""
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

    date_parse_cache: dict[Any, date | None] = {}

    for row in rows:
        security_uuid = row["security_uuid"]
        raw_date = row["date"]

        if raw_date in date_parse_cache:
            price_date = date_parse_cache[raw_date]
        else:
            price_date = fx_module._parse_date_value(raw_date)  # noqa: SLF001
            date_parse_cache[raw_date] = price_date

        if security_uuid is None or price_date is None:
            continue

        if until and price_date > until:
            continue

        normalized_price = normalize_raw_price(row["close"], decimals=6)
        if normalized_price is None:
            continue
        cache.setdefault(security_uuid, []).append(
            (price_date, normalized_price, str(raw_date))
        )

    # Merge real-time prices from securities if available and more recent
    if securities:
        for sid, sec in securities.items():
            last_price_raw = sec.get("last_price")
            last_price_date_raw = sec.get("last_price_date")
            if last_price_raw is not None and last_price_date_raw is not None:
                lp_date = fx_module._parse_date_value(last_price_date_raw)  # noqa: SLF001
                if lp_date and (not until or lp_date <= until):
                    lp_val = normalize_raw_price(last_price_raw, decimals=6)
                    if lp_val:
                        existing = cache.get(sid, [])
                        if not existing or lp_date > existing[-1][0]:
                            existing.append(
                                (lp_date, lp_val, f"rt:{last_price_date_raw}")
                            )
                            cache[sid] = existing

    # Note: Rows are already sorted by security_uuid and date in the SQL query.
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
    cursor_hint: int | None = None,
) -> tuple[float | None, str | None, date | None, bool, int]:
    """
    Return close price on or before target date, plus stale flag and updated cursor.

    Uses cursor hint for amortized O(1) lookup when processing sequential dates,
    falling back to binary search O(log N) if no cursor is provided.
    """
    entries = price_cache.get(security_uuid)
    if not entries:
        return None, None, None, False, 0

    n = len(entries)
    idx = 0

    # Fast path: use cursor if available
    if cursor_hint is not None and 0 <= cursor_hint < n:
        # Check if we can advance from cursor
        idx = cursor_hint
        # Advance while next entry is still <= target_date
        while idx + 1 < n and entries[idx + 1][0] <= target_date:
            idx += 1

        # If cursor entry is > target_date (e.g. gap in processing), fallback to bisect
        if entries[idx][0] > target_date:
            idx = bisect_right(entries, target_date, key=lambda x: x[0]) - 1
    else:
        # Fallback to binary search
        # We want the rightmost entry where date <= target_date.
        idx = bisect_right(entries, target_date, key=lambda x: x[0]) - 1

    if idx < 0:
        # No entry <= target_date
        return None, None, None, False, 0

    selected_date, selected_price, selected_raw = entries[idx]

    stale = selected_date != target_date
    return (
        selected_price,
        selected_raw or selected_date.isoformat(),
        selected_date,
        stale,
        idx,
    )


def _build_holdings_valuations(
    holdings: Iterable[tuple[tuple[str, str], dict[str, float]]],
    securities: dict[str, dict[str, Any]],
    price_cache: dict[str, list[tuple[date, float, str]]],
    fx_rates: dict[str, float],
    *,
    target_date: date,
    fx_rates_cache: dict[str, dict[str, float]] | None = None,
    price_cursors: dict[str, int] | None = None,
) -> list[HoldingValuation]:
    valuations: list[HoldingValuation] = []
    for (portfolio_uuid, security_uuid), details in holdings:
        shares = details["shares"]
        purchase_value_eur = details.get("purchase_value_eur")
        purchase_value_native = details.get("purchase_value_native")

        security_meta = securities.get(security_uuid, {})
        currency = security_meta.get("currency") or "EUR"

        cursor_hint = (
            price_cursors.get(security_uuid) if price_cursors is not None else None
        )
        (
            price_native,
            price_date_raw,
            price_date_obj,
            stale,
            new_cursor,
        ) = _resolve_price_for_date(
            security_uuid,
            price_cache,
            target_date,
            cursor_hint,
        )
        if price_cursors is not None:
            price_cursors[security_uuid] = new_cursor

        # Determine FX rate:
        # If price is stale and we have coverage, use FX rate from the price date
        # to ensure value/price consistency (avoiding phantom FX volatility).
        fx_rate: float | None = 1.0
        used_fx_for_conversion = False

        if currency == "EUR":
            fx_rate = 1.0
            used_fx_for_conversion = True
        elif stale and price_date_raw and fx_rates_cache:
            # Try to find FX rate for the specific price date
            # Optimization: Use price_date_obj directly to avoid expensive split()
            # on raw string, but fallback if date obj is missing (unlikely).
            date_key = None
            if price_date_obj:
                date_key = price_date_obj.isoformat()
            else:
                # Fallback for defensive coding, check "T" to avoid unnecessary split
                # Only needed if price_date_raw contains 'T' (e.g. ISO timestamp)
                s = str(price_date_raw)
                date_key = s.split("T")[0] if "T" in s else s

            cached_day = fx_rates_cache.get(date_key)
            if cached_day and currency in cached_day:
                fx_rate = cached_day[currency]
                used_fx_for_conversion = True

        if not used_fx_for_conversion:
            # Fallback to current (target_date) FX rate or last known
            fx_rate = fx_rates.get(currency)

        value_eur: float | None = None
        price_eur: float | None = None
        unrealized_price_gains_eur: float | None = None

        if price_native is not None and fx_rate:
            price_eur = round(price_native / fx_rate, 6)
            value_eur = round(shares * price_eur, 6)

            # Calculate Unrealized Gain from Price Movement (Native Delta / FX)
            # This strips out the pure FX gain on the principal.
            if purchase_value_native is not None:
                market_value_native = shares * price_native
                native_gain = market_value_native - purchase_value_native
                unrealized_price_gains_eur = round(native_gain / fx_rate, 6)

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


def _aggregate_holdings_metrics(
    valuations: list[HoldingValuation],
) -> tuple[float, float, bool, float, float]:
    """
    Compute aggregated metrics for a list of valuations in a single pass.

    Returns:
        (price_coverage_ratio, fx_coverage_ratio, stale_price,
         total_wealth_eur, unrealized_price_gains_eur)

    """
    if not valuations:
        return 1.0, 1.0, False, 0.0, 0.0

    count = len(valuations)
    covered_price = 0
    covered_fx = 0
    stale_price = False
    total_wealth = 0.0
    unrealized_price_gains = 0.0

    for v in valuations:
        if v.price_native is not None:
            covered_price += 1

        if v.currency == "EUR" or v.fx_rate:
            covered_fx += 1

        if v.stale_price:
            stale_price = True

        if v.value_eur is not None:
            total_wealth += v.value_eur

        if v.unrealized_price_gains_eur is not None:
            unrealized_price_gains += v.unrealized_price_gains_eur

    return (
        round(covered_price / count, 3),
        round(covered_fx / count, 3),
        stale_price,
        round(total_wealth, 4),
        round(unrealized_price_gains, 4),
    )


def _apply_transaction_update(
    portfolio_uuid: str,
    security_uuid: str,
    delta_shares: float,
    amount: int,
    currency: str,
    tx_type: int,
    fees: int,
    taxes: int,
    fx_rate_to_base: float | None,
    fx_rates: dict[str, float],
    holdings: dict[tuple[str, str], dict[str, Any]],
    tx_date: date,
    security_currency: str = "EUR",
) -> tuple[float, float, float]:
    """
    Apply a single transaction to holdings state.

    Returns (realized_gain_total_eur, realized_gain_price_eur, neutral_movement_eur).
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

    # Resolving value of transaction in EUR and Native
    vals = _resolve_transaction_values(
        amount, currency, fees, taxes, fx_rate_to_base, fx_rates, security_currency
    )
    tx_val_eur, tx_val_native, fees_eur, fees_native, taxes_eur, taxes_native = vals

    neutral_movement = 0.0
    # Accumulate Performance Neutral Movements (Ein-/Auslieferung)
    if tx_type in _NEUTRAL_INBOUND_TYPES or tx_type in _NEUTRAL_OUTBOUND_TYPES:
        # Type 2 (In w/ value) or Type 3 (Out w/ value)
        # Transaction amount is absolute value.
        sign = 1 if tx_type in _NEUTRAL_INBOUND_TYPES else -1
        neutral_movement = tx_val_eur * sign

    realized_gain = 0.0
    realized_price_gain = 0.0

    # FIFO Logic
    if delta_shares > 0:
        # BUY: Use full transaction value (Principal + Fees + Taxes) as cost basis
        # per User instruction ("gross on buy side is the final amount debited").
        # Note: tx_val_eur derived from 'amount' is typically Principal.
        cost_basis_eur = tx_val_eur + fees_eur + taxes_eur
        cost_basis_native = tx_val_native + fees_native + taxes_native

        _process_buy_lots(
            entry, delta_shares, cost_basis_eur, cost_basis_native, tx_date
        )

    else:
        # SELL: Reduce shares, consume lots FIFO
        shares_to_sell = abs(delta_shares)

        # Helper returns total cost basis of the sold shares
        cost_basis_sold_eur, cost_basis_sold_native = _process_sell_lots(
            entry, shares_to_sell
        )

        # Realized Gain = Proceeds (Val in EUR) - Cost Basis (in EUR)
        if tx_type in _REALIZED_GAIN_TYPES:
            # We want Gross Realized Gain: (Net Proceeds + Costs) - Cost Basis
            # Net Proceeds (Cash Credit) = Principal - Fees - Taxes
            # So Principal (Gross Proceeds) = Net Proceeds + Fees + Taxes
            gross_proceeds_eur = tx_val_eur + fees_eur + taxes_eur
            realized_gain = gross_proceeds_eur - cost_basis_sold_eur

            # Price Gain = Gross Proceeds Native - Cost Basis Native, converted at
            # today's rate.
            gross_proceeds_native = tx_val_native + fees_native + taxes_native
            realized_price_gain_native = gross_proceeds_native - cost_basis_sold_native

            # Find current FX rate for conversion of native gain to EUR
            tx_currency = (currency or "EUR").strip().upper()
            fx = _get_effective_fx_rate(tx_currency, fx_rate_to_base, fx_rates)
            if fx:
                realized_price_gain = realized_price_gain_native / fx
            else:
                realized_price_gain = realized_gain

    if entry["shares"] <= _EPSILON:  # Filter dust
        holdings.pop(key, None)

    return realized_gain, realized_price_gain, neutral_movement


def _resolve_transaction_values(
    amount: int,
    currency: str,
    fees: int,
    taxes: int,
    fx_rate_to_base: float | None,
    fx_rates: dict[str, float],
    security_currency: str,
) -> tuple[float, float, float, float, float, float]:
    """Calculate EUR and Native values for transaction components."""
    tx_currency = (currency or "EUR").strip().upper()
    fx = _get_effective_fx_rate(tx_currency, fx_rate_to_base, fx_rates)

    tx_val_eur, tx_val_native = _calculate_transaction_amounts(
        amount, tx_currency, fx, security_currency, fx_rates
    )

    fees_eur, fees_native = _calculate_transaction_amounts(
        fees, tx_currency, fx, security_currency, fx_rates
    )
    taxes_eur, taxes_native = _calculate_transaction_amounts(
        taxes, tx_currency, fx, security_currency, fx_rates
    )

    return tx_val_eur, tx_val_native, fees_eur, fees_native, taxes_eur, taxes_native


def _get_effective_fx_rate(
    tx_currency: str,
    fx_rate_to_base: float | None,
    fx_rates: dict[str, float],
) -> float:
    """Determine the effective exchange rate to EUR."""
    if tx_currency == "EUR":
        return 1.0
    if fx_rate_to_base is not None and fx_rate_to_base > 0:
        return fx_rate_to_base
    return fx_rates.get(tx_currency, 1.0)


def _calculate_transaction_amounts(
    amount: int,
    tx_currency: str,
    fx: float,
    security_currency: str,
    fx_rates: dict[str, float],
) -> tuple[float, float]:
    """Calculate transaction principal in EUR and Native currency."""
    tx_val_eur = 0.0
    tx_val_native = 0.0

    if amount <= 0:
        return tx_val_eur, tx_val_native

    # cent_to_eur helps handling rounding consistency
    tx_val_txn_curr = cent_to_eur(amount) or 0.0

    if fx:
        tx_val_eur = tx_val_txn_curr / fx

    if security_currency == tx_currency:
        tx_val_native = tx_val_txn_curr
    else:
        sec_fx = 1.0
        if security_currency != "EUR":
            sec_fx = fx_rates.get(security_currency, 1.0)
        if sec_fx:
            tx_val_native = tx_val_eur * sec_fx

    return tx_val_eur, tx_val_native


def _calculate_cost_in_eur(cost_cents: int, fx: float) -> float:
    """Convert a cost (fees/taxes) from transaction currency to EUR."""
    if cost_cents <= 0:
        return 0.0
    val_native = cent_to_eur(cost_cents) or 0.0
    if fx:
        return val_native / fx
    return 0.0
