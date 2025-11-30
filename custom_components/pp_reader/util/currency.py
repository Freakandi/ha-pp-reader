"""Currency normalization helpers for Portfolio Performance Reader."""

from __future__ import annotations

import logging
from math import isfinite
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import sqlite3
    from collections.abc import Iterable, Mapping
    from datetime import datetime
    from pathlib import Path

__all__ = [
    "CENT_IN_EURO",
    "CURRENCY_DECIMALS",
    "PRICE_DECIMALS",
    "cent_to_eur",
    "ensure_exchange_rates_for_dates_sync",
    "eur_to_cent",
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

    try:
        ensure_exchange_rates_for_dates_sync(
            [reference_date], {normalized_currency}, db_path
        )
        fx_records = load_cached_rate_records_sync(reference_date, db_path)
    except Exception:  # pragma: no cover - defensive
        _LOGGER.exception("Fehler beim Laden der Wechselkurse für %s", currency_code)
        return None

    record = fx_records.get(normalized_currency)
    if record is None:
        _LOGGER.warning(
            "Kein Wechselkurs für %s (%s)",
            normalized_currency,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    try:
        normalized = price_native / float(record.rate)
    except (TypeError, ValueError, ZeroDivisionError):
        _LOGGER.warning(
            "Ungültiger Wechselkurs für %s (%s)",
            normalized_currency,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    return round_price(normalized, decimals=decimals)


CACHED_FX_HELPERS: dict[str, Any] = {}


def _load_fx_helper(name: str) -> Any:
    """Dynamically import FX helper functions on first access."""
    if name not in CACHED_FX_HELPERS:
        from custom_components.pp_reader.currencies import fx

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
    helper(dates, currencies, db_path, conn=conn)


def load_cached_rate_records_sync(
    reference_date: datetime, db_path: Path
) -> Mapping[str, Any]:
    """Proxy to the FX cache reader while avoiding circular imports."""
    helper = _load_fx_helper("load_cached_rate_records_sync")
    return helper(reference_date, db_path)
