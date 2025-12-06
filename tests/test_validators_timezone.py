"""Regression tests for timezone handling in validators."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pytest

from custom_components.pp_reader.logic import validators


class DummyProtoDate:
    """Minimal protobuf-like date wrapper exposing seconds."""

    def __init__(self, seconds: int) -> None:
        """Store the provided timestamp."""
        self.seconds = seconds


class DummyProtoTransaction:
    """Mimic the interface used by PPDataValidator."""

    def __init__(self, *, seconds: int) -> None:
        """Initialise transaction metadata for validation."""
        self.type = 0
        self.uuid = "uuid-1"
        self.date = DummyProtoDate(seconds)

    def HasField(self, name: str) -> bool:
        """Replicate protobuf HasField behaviour for specific fields."""
        return name in {"uuid", "date"}


def test_validate_proto_transaction_accepts_current_timestamp(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Transactions with current timestamps validate without timezone errors."""
    monkeypatch.setattr(validators, "client_pb2", object())

    validator = validators.PPDataValidator()

    now_seconds = int(datetime.now(tz=timezone.utc).timestamp())  # noqa: UP017
    tx = DummyProtoTransaction(seconds=now_seconds)

    result = validator._validate_proto_transaction(tx)

    assert result.is_valid
    assert result.message == "PTransaction valid"
