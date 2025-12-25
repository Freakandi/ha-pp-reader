"""Currency normalization helpers for Portfolio Performance Reader."""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from datetime import datetime
from math import isfinite
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.currencies import fx

if TYPE_CHECKING:
    import sqlite3
    from collections.abc import Iterable, Mapping
    from pathlib import Path

__all__ = [
    "CENT_IN_EURO",
    "CURRENCY_DECIMALS",
    "MAX_FALLBACK_DAYS_WITHOUT_WARNING",
    "PRICE_DECIMALS",
    "PRICE_SCALE",
    "cent_to_eur",
    "ensure_exchange_rates_for_dates_sync",
    "eur_to_cent",
    "get_closest_rate_sync",
    "load_cached_rate_records_sync",
    "normalize_price_to_eur_sync",
    "normalize_raw_price",
    "round_currency",
    "round_price",
]

_LOGGER = logging.getLogger("custom_components.pp_reader.util.currency")

CENT_IN_EURO = 100.0
CURRENCY_DECIMALS = 2
PRICE_DECIMALS = 4
PRICE_SCALE = 10**8


def cent_to_eur(
    value: float | None,
    *,
    decimals: int = CURRENCY_DECIMALS,
    default: float | None = None,
) -> float | None:
    """Convert a cent-denominated value into EUR with consistent rounding."""
    if value in (None, ""):
        return default

    try:
        euros = float(value) / CENT_IN_EURO
    except (TypeError, ValueError):
        return default

    if not isfinite(euros):
        return default

    return round(euros, decimals)


def round_currency(
    value: float | None,
    *,
    decimals: int = CURRENCY_DECIMALS,
    default: float | None = None,
) -> float | None:
    """Round a currency amount while gracefully handling missing values."""
    if value in (None, ""):
        return default

    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return default

    if not isfinite(numeric_value):
        return default

    return round(numeric_value, decimals)


def eur_to_cent(
    value: float | None,
    *,
    default: int | None = None,
) -> int | None:
    """Convert a EUR amount to integer cents using canonical rounding."""
    rounded = round_currency(value, default=None)
    if rounded is None:
        return default

    return round(rounded * CENT_IN_EURO)


def round_price(
    value: float | None,
    *,
    decimals: int = PRICE_DECIMALS,
    default: float | None = None,
) -> float | None:
    """Round a price to the expected precision (4 decimal places)."""
    if value in (None, ""):
        return default

    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return default

    if not isfinite(numeric_value):
        return default

    return round(numeric_value, decimals)


def normalize_raw_price(
    raw_price: float | None,
    *,
    decimals: int = PRICE_DECIMALS,
    default: float | None = None,
) -> float | None:
    """Convert an 8-decimal fixed-point price into a float."""
    if not raw_price:
        return default

    try:
        normalized = float(raw_price) / PRICE_SCALE
    except (TypeError, ValueError):
        return default

    if not isfinite(normalized):
        return default

    return round_price(normalized, decimals=decimals, default=default)


# Track warned deep fallbacks to avoid spamming the log once per row
_DEEP_FALLBACK_WARNED: set[tuple[str, str]] = set()


MAX_FALLBACK_DAYS_WITHOUT_WARNING = 5


def _resolve_fallback_rate(
    db_path: Path,
    currency_code: str,
    reference_date: datetime,
) -> float | None:
    """Resolve a fallback exchange rate using the closest available record."""
    fallback = get_closest_rate_sync(
        db_path,
        currency_code,
        reference_date.strftime("%Y-%m-%d"),
    )
    if not fallback:
        _LOGGER.debug(
            "Kein Wechselkurs für %s (%s) und kein Fallback gefunden",
            currency_code,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    rate_val, date_str = fallback

    # Check age
    fallback_date = datetime.fromisoformat(date_str).date()
    if isinstance(reference_date, datetime):
        ref_date = reference_date.date()
    else:
        ref_date = reference_date
    age_days = (ref_date - fallback_date).days

    if age_days > MAX_FALLBACK_DAYS_WITHOUT_WARNING:
        warn_key = (currency_code, date_str)
        if warn_key not in _DEEP_FALLBACK_WARNED:
            _DEEP_FALLBACK_WARNED.add(warn_key)
            _LOGGER.warning(
                "Veralteter Wechselkurs für %s: %s genutzt. Datum %s "
                "(%d Tage alt > %d)",
                currency_code,
                date_str,
                reference_date.strftime("%Y-%m-%d"),
                age_days,
                MAX_FALLBACK_DAYS_WITHOUT_WARNING,
            )
    return rate_val


def normalize_price_to_eur_sync(
    raw_price: float | None,
    currency_code: str,
    reference_date: datetime,
    db_path: Path,
    *,
    decimals: int = PRICE_DECIMALS,
) -> float | None:
    """Normalize a raw price to EUR using synchronous FX helpers."""
    price_native = normalize_raw_price(raw_price, decimals=decimals)
    if price_native is None:
        return None

    normalized_currency = (currency_code or "EUR").upper()
    if normalized_currency == "EUR":
        return price_native

    # Try exact match first
    try:
        # Note: allow_fetch defaults to False in the implementation, so this is safe
        ensure_exchange_rates_for_dates_sync(
            [reference_date], {normalized_currency}, db_path
        )
        fx_records = load_cached_rate_records_sync(reference_date, db_path)
    except Exception:  # pragma: no cover - defensive
        _LOGGER.exception("Fehler beim Laden der Wechselkurse für %s", currency_code)
        return None

    rate = None
    record = fx_records.get(normalized_currency)

    if record:
        rate = float(record.rate)
    else:
        rate = _resolve_fallback_rate(db_path, normalized_currency, reference_date)

    if not rate:
        return None

    try:
        normalized = price_native / rate
    except (TypeError, ValueError, ZeroDivisionError):
        _LOGGER.warning(
            "Ungültiger Wechselkurs für %s (%s)",
            normalized_currency,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    return round_price(normalized, decimals=decimals)


def get_closest_rate_sync(
    db_path: Path,
    currency: str,
    target_date: str,
) -> tuple[float, str] | None:
    """Proxy to fx.get_closest_rate_sync."""
    helper = _load_fx_helper("get_closest_rate_sync")
    return helper(db_path, currency, target_date)


CACHED_FX_HELPERS: dict[str, Any] = {}


def _load_fx_helper(name: str) -> Any:
    """Dynamically import FX helper functions on first access."""
    if name not in CACHED_FX_HELPERS:
        CACHED_FX_HELPERS[name] = getattr(fx, name)
    return CACHED_FX_HELPERS[name]


def ensure_exchange_rates_for_dates_sync(
    dates: Iterable[datetime],
    currencies: set[str],
    db_path: Path,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Proxy to the FX helper without importing it at module import time."""
    helper = _load_fx_helper("ensure_exchange_rates_for_dates_sync")
    # Default behavior: allow_fetch=False
    result = helper(dates, currencies, db_path, conn=conn)
    if asyncio.iscoroutine(result):
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(result)
        finally:
            asyncio.set_event_loop(None)
            with suppress(Exception):
                loop.close()


def load_cached_rate_records_sync(
    reference_date: datetime, db_path: Path
) -> Mapping[str, Any]:
    """Proxy to the FX cache reader while avoiding circular imports."""
    helper = _load_fx_helper("load_cached_rate_records_sync")
    return helper(reference_date, db_path)
