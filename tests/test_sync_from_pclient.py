"""Tests for helpers in sync_from_pclient."""

# ruff: noqa: S101 - pytest assertions are expected in tests
from __future__ import annotations

from typing import Any

import pytest

from custom_components.pp_reader.data.sync_from_pclient import maybe_field


class _NoPresenceProto:
    """Fake proto message where ``HasField`` raises for scalar attributes."""

    def __init__(self, **values: Any) -> None:
        for key, value in values.items():
            setattr(self, key, value)

    def HasField(self, _name: str) -> bool:  # noqa: N802 - proto compatibility
        message = "Field does not have presence"
        raise ValueError(message)


class _PresenceProto:
    """Fake proto message with explicit presence tracking."""

    def __init__(self, **values: Any) -> None:
        self._values = values
        for key, value in values.items():
            setattr(self, key, value)

    def HasField(self, name: str) -> bool:  # noqa: N802 - proto compatibility
        return name in self._values and self._values[name] is not None


@pytest.mark.parametrize(
    ("message", "field_name", "expected"),
    [
        (_NoPresenceProto(amount=123), "amount", 123),
        (_NoPresenceProto(), "missing", None),
        (_PresenceProto(optional=456), "optional", 456),
        (_PresenceProto(optional=None), "optional", None),
    ],
)
def test_maybe_field_handles_presence(
    message: object,
    field_name: str,
    expected: Any,
) -> None:
    """maybe_field should gracefully handle different presence semantics."""
    assert maybe_field(message, field_name) == expected
