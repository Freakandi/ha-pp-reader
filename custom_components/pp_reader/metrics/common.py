"""Shared performance metric helpers for Portfolio Performance Reader."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

from custom_components.pp_reader.util.currency import round_currency, round_price

__all__ = [
    "DayChangeMetrics",
    "PerformanceMetrics",
    "compose_performance_payload",
    "select_performance_metrics",
]

_PERCENTAGE_DECIMALS = Decimal("0.01")


def _to_float(value: float | str | None) -> float | None:
    """Best-effort conversion of arbitrary numeric inputs to float."""
    if value in (None, ""):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round_percentage(value: float | None) -> float | None:
    """Round a percentage value to two decimals using half-up semantics."""
    if value is None:
        return None

    try:
        return float(
            Decimal(str(value)).quantize(_PERCENTAGE_DECIMALS, rounding=ROUND_HALF_UP)
        )
    except (InvalidOperation, ValueError, TypeError):
        return None


def _coverage_ratio(values: Iterable[float | None]) -> float | None:
    """Return the ratio of available values within the provided iterable."""
    prepared = list(values)
    total = len(prepared)
    if total == 0:
        return None

    available = sum(1 for value in prepared if value is not None)
    if available == 0:
        return 0.0

    return round(available / total, 4)


@dataclass(slots=True)
class PerformanceMetrics:
    """Container describing aggregated gain and change metrics."""

    gain_abs: float
    gain_pct: float
    total_change_eur: float
    total_change_pct: float
    source: str
    coverage_ratio: float | None


@dataclass(slots=True)
class DayChangeMetrics:
    """Container describing day-over-day price deltas."""

    price_change_native: float | None
    price_change_eur: float | None
    change_pct: float | None
    source: str
    coverage_ratio: float | None


def select_performance_metrics(  # noqa: PLR0913
    *,
    current_value: float | str | None,
    purchase_value: float | str | None,
    holdings: float | str | None = None,
    last_price_native: float | str | None = None,
    last_close_native: float | str | None = None,
    fx_rate: float | str | None = None,
) -> tuple[PerformanceMetrics, DayChangeMetrics]:
    """Calculate performance and day-change metrics for a security or portfolio."""
    current_raw = _to_float(current_value)
    purchase_raw = _to_float(purchase_value)
    current = current_raw if current_raw is not None else 0.0
    purchase = purchase_raw if purchase_raw is not None else 0.0
    holdings_value = _to_float(holdings)

    gain_abs_unrounded = current - purchase
    gain_abs = round_currency(gain_abs_unrounded, default=0.0) or 0.0

    gain_pct_unrounded = (gain_abs_unrounded / purchase * 100) if purchase else 0.0
    gain_pct = _round_percentage(gain_pct_unrounded) or 0.0

    performance_source = (
        "calculated"
        if (current_value is not None or purchase_value is not None)
        else "defaulted"
    )
    performance_coverage = _coverage_ratio((current_raw, purchase_raw, holdings_value))

    native_price = _to_float(last_price_native)
    native_close = _to_float(last_close_native)
    fx_value = _to_float(fx_rate)

    price_change_native_unrounded = None
    price_change_native = None
    if native_price is not None and native_close is not None:
        price_change_native_unrounded = native_price - native_close
        price_change_native = round_price(price_change_native_unrounded, decimals=4)

    price_change_eur = None
    if price_change_native_unrounded is not None and fx_value not in (None, 0.0):
        try:
            price_change_eur = round_price(
                price_change_native_unrounded / fx_value, decimals=4
            )
        except (TypeError, ValueError, ZeroDivisionError):
            price_change_eur = None

    change_pct = None
    if price_change_native_unrounded is not None and native_close not in (None, 0.0):
        change_pct = _round_percentage(
            (price_change_native_unrounded / native_close) * 100
        )

    day_source = (
        "native"
        if price_change_native is not None
        else ("eur" if price_change_eur is not None else "unavailable")
    )
    day_coverage = _coverage_ratio((native_price, native_close))

    performance = PerformanceMetrics(
        gain_abs=gain_abs,
        gain_pct=gain_pct,
        total_change_eur=gain_abs,
        total_change_pct=gain_pct,
        source=performance_source,
        coverage_ratio=performance_coverage,
    )

    day_change = DayChangeMetrics(
        price_change_native=price_change_native,
        price_change_eur=price_change_eur,
        change_pct=change_pct,
        source=day_source,
        coverage_ratio=day_coverage,
    )

    return performance, day_change


def compose_performance_payload(
    raw: Mapping[str, Any] | None,
    *,
    metrics: PerformanceMetrics,
    day_change: DayChangeMetrics,
) -> dict[str, Any]:
    """Merge raw payload overrides with calculated performance metrics."""
    payload: dict[str, Any] = asdict(metrics)
    payload["day_change"] = asdict(day_change)

    if raw is None:
        merged = dict(payload)
    else:
        merged = dict(payload)
        for key, value in raw.items():
            if key == "day_change":
                if isinstance(value, Mapping):
                    base_day_change = merged.get("day_change")
                    base_mapping = (
                        base_day_change if isinstance(base_day_change, dict) else {}
                    )
                    merged["day_change"] = {**base_mapping, **dict(value)}
                else:
                    merged["day_change"] = value
                continue

            merged[key] = value

    day_change_payload = merged.get("day_change")
    if isinstance(day_change_payload, dict):
        has_metrics = any(
            day_change_payload.get(field) not in (None, "")
            for field in ("price_change_native", "price_change_eur", "change_pct")
        )
        if not has_metrics:
            merged.pop("day_change", None)
    elif day_change_payload is None:
        merged.pop("day_change", None)

    return merged

