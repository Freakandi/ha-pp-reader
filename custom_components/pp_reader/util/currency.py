"""Currency normalization helpers for Portfolio Performance Reader."""

from __future__ import annotations

import logging
from math import isfinite

__all__ = [
    "CENT_IN_EURO",
    "CURRENCY_DECIMALS",
    "PRICE_DECIMALS",
    "PRICE_SCALE",
    "cent_to_eur",
    "eur_to_cent",
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
