"""Tests for helpers in sync_from_pclient."""

# ruff: noqa: S101 - pytest assertions are expected in tests
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import db_schema
from custom_components.pp_reader.data import sync_from_pclient as sync_module
from custom_components.pp_reader.data.sync_from_pclient import _SyncRunner, maybe_field


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


class _DummyPortfolio:
    """Minimal portfolio stub exposing attributes accessed by the sync runner."""

    def __init__(self, uuid: str) -> None:
        self.uuid = uuid
        self.name = "Test Portfolio"
        self.note = None
        self.referenceAccount = None
        self.isRetired = False
        self.updatedAt = None

    def HasField(self, name: str) -> bool:  # noqa: N802 - proto compatibility
        return getattr(self, name, None) is not None


class _DummyClient:
    """Provide the minimal client API consumed by ``_SyncRunner``."""

    def __init__(self, portfolios: list[_DummyPortfolio]) -> None:
        self.transactions: list[Any] = []
        self.accounts: list[Any] = []
        self.securities: list[Any] = []
        self.portfolios = portfolios


def _prepare_portfolio_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    for statement in db_schema.PORTFOLIO_SCHEMA:
        conn.executescript(statement)
    conn.commit()
    return conn


def test_sync_portfolios_commits_changes(tmp_path: Path) -> None:
    """Portfolio synchronisation should leave no open transaction."""
    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    original_error = getattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None)
    sync_module._TIMESTAMP_IMPORT_ERROR = None  # Ensure timestamp guard stays inactive
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )

    runner.cursor = conn.cursor()
    try:
        assert not conn.in_transaction
        runner._sync_portfolios()
        assert not conn.in_transaction
    finally:
        sync_module._TIMESTAMP_IMPORT_ERROR = original_error
        runner.cursor.close()
        conn.close()
