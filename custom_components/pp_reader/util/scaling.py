"""Scaling helpers for 10^-8 integer precision conversions."""

from __future__ import annotations

from decimal import ROUND_HALF_EVEN, Decimal

SCALE = Decimal("1e8")

__all__ = ["SCALE", "from_scaled_int", "to_scaled_int"]

DecimalLike = Decimal | float | int | str


def _to_decimal(value: DecimalLike) -> Decimal:
    """Normalise supported inputs into a Decimal instance."""
    if isinstance(value, Decimal):
        return value

    if isinstance(value, int) and not isinstance(value, bool):
        return Decimal(value)

    if isinstance(value, str):
        return Decimal(value)

    if isinstance(value, float):
        return Decimal(repr(value))

    message = f"Unsupported type for scaling: {type(value)!r}"
    raise TypeError(message)


def to_scaled_int(value: DecimalLike) -> int:
    """Convert a Decimal-like value into a 10^-8 scaled integer."""
    decimal_value = _to_decimal(value)
    scaled = decimal_value * SCALE
    return int(scaled.to_integral_value(rounding=ROUND_HALF_EVEN))


def from_scaled_int(value: int) -> Decimal:
    """Convert a 10^-8 scaled integer back into a Decimal value."""
    if isinstance(value, bool):
        message = "Boolean values are not valid scaled integers"
        raise TypeError(message)

    return Decimal(value) / SCALE
