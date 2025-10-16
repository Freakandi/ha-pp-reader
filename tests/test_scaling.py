"""Unit tests for 10^-8 scaling helpers."""

from __future__ import annotations

from decimal import Decimal

import pytest

from custom_components.pp_reader.util.scaling import from_scaled_int, to_scaled_int


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (Decimal("1.23456789"), 123_456_789),
        ("0.00000001", 1),
        (1, 100_000_000),
        (Decimal("-2.5"), -250_000_000),
    ],
)
def test_to_scaled_int_supports_decimal_like_inputs(value, expected):
    """Verify supported inputs convert to scaled integers."""
    assert to_scaled_int(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (Decimal("1.234567895"), 123_456_790),
        (Decimal("1.234567885"), 123_456_788),
        (Decimal("-1.234567895"), -123_456_790),
        (Decimal("-1.234567885"), -123_456_788),
    ],
)
def test_to_scaled_int_uses_round_half_even(value, expected):
    """Ensure scaling applies bankers rounding for midpoint values."""
    assert to_scaled_int(value) == expected


@pytest.mark.parametrize("value", [True, False, object(), None])
def test_to_scaled_int_rejects_unsupported_types(value):
    """Unsupported inputs raise TypeError."""
    with pytest.raises(TypeError):
        to_scaled_int(value)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0, Decimal(0)),
        (123_456_789, Decimal("1.23456789")),
        (-123_456_789, Decimal("-1.23456789")),
    ],
)
def test_from_scaled_int_returns_decimal(value, expected):
    """Scaled integers convert back to Decimal values."""
    assert from_scaled_int(value) == expected


@pytest.mark.parametrize("value", [True, False])
def test_from_scaled_int_rejects_bool(value):
    """Booleans are not valid scaled integers."""
    with pytest.raises(TypeError):
        from_scaled_int(value)
