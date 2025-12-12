"""Contract tests for daily wealth API payload shape."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_access import (
    DailyWealthRecord,
    DailyWealthScopeRecord,
)

# Access the wrapped handler to bypass decoration if needed, though we test the full stack here.
WS_GET_DAILY_WEALTH = getattr(
    websocket_module.ws_get_daily_wealth,
    "__wrapped__",
    websocket_module.ws_get_daily_wealth,
)
DOMAIN = websocket_module.DOMAIN


class StubHass:
    """Minimal Home Assistant stub exposing hass.data."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}

    def async_create_background_task(self, _target, _name: str, **_kwargs) -> MagicMock:
        """Create a stub for background task creation."""
        # For testing purposes, we can just return a mock or await it if needed.
        # But usually in these tests we just want to avoid the crash.
        # We can try to just return a MagicMock which acts like a Task.
        return MagicMock()


class StubConnection:
    """Capture websocket responses for assertion."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


@pytest.fixture
def mock_db_access(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Mock database access functions."""
    mock = MagicMock()
    monkeypatch.setattr(websocket_module, "fetch_daily_wealth", mock.fetch_daily_wealth)
    monkeypatch.setattr(
        websocket_module, "fetch_daily_wealth_scopes", mock.fetch_daily_wealth_scopes
    )
    return mock


def _make_daily_record(date_str: str, base_val: float) -> DailyWealthRecord:
    """Create a populated DailyWealthRecord."""
    return DailyWealthRecord(
        date=date_str,
        total_wealth_eur=base_val,
        portfolio_wealth_eur=base_val * 0.8,
        account_wealth_eur=base_val * 0.2,
        dividends_eur=5.0,
        interest_eur=1.0,
        inbound_transfers_eur=100.0,
        outbound_transfers_eur=50.0,
        performance_neutral_movements=50.0,
        fees_eur=2.0,
        taxes_eur=1.0,
        fx_coverage_ratio=1.0,
        price_coverage_ratio=1.0,
        stale_price=False,
        provenance="test_mock",
    )


def _make_scope_record(
    scope_type: str, scope_id: str, date_str: str, base_val: float
) -> DailyWealthScopeRecord:
    """Create a populated DailyWealthScopeRecord."""
    return DailyWealthScopeRecord(
        scope_type=scope_type,
        scope_id=scope_id,
        date=date_str,
        scope_name=f"Name {scope_id}",
        total_wealth_eur=base_val,
        portfolio_wealth_eur=base_val if scope_type == "portfolio" else 0.0,
        account_wealth_eur=base_val if scope_type == "account" else 0.0,
        dividends_eur=0.0,
        interest_eur=0.0,
        inbound_transfers_eur=0.0,
        outbound_transfers_eur=0.0,
        performance_neutral_movements=0.0,
        fees_eur=0.0,
        taxes_eur=0.0,
        fx_coverage_ratio=1.0,
        price_coverage_ratio=1.0,
        stale_price=False,
        provenance="test_mock",
    )


@pytest.mark.asyncio
async def test_daily_wealth_schema_basic(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Verify standard response shape for a basic range request."""
    entry_id = "entry-1"
    db_path = tmp_path / "test.db"
    db_path.touch()
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    # Mock DB return
    records = [
        _make_daily_record("2024-01-01", 1000.0),
        _make_daily_record("2024-01-02", 1050.0),
    ]

    def mock_fetch_daily_wealth(*args, **kwargs):
        return records

    # We need to mock the util async_run_executor_job as well since the handler calls it
    async def mock_async_run_executor_job(hass, target, *args):
        if callable(target):
            return target(*args)
        return target

    monkeypatch.setattr(
        websocket_module, "async_run_executor_job", mock_async_run_executor_job
    )

    # We mock the wrapped fetch_daily_wealth function inside the lambda in the handler
    # Actually, simpler to mock the module function in db_access if imported there,
    # but the handler imports it from db_access. Let's look at imports.
    # The handler uses: from custom_components.pp_reader.data.db_access import fetch_daily_wealth
    # So we patch usage in websocket module.
    monkeypatch.setattr(websocket_module, "fetch_daily_wealth", mock_fetch_daily_wealth)

    msg = {
        "id": 1,
        "type": "pp_reader/get_daily_wealth",
        "entry_id": entry_id,
        "range": {"start": "2024-01-01", "end": "2024-01-02"},
        "include_slices": False,
    }

    await WS_GET_DAILY_WEALTH(hass, connection, msg)

    assert not connection.errors
    assert len(connection.sent) == 1
    msg_id, payload = connection.sent[0]
    assert msg_id == 1

    # Contract Assertions
    assert "range" in payload
    assert payload["range"] == {"start": "2024-01-01", "end": "2024-01-02"}
    assert "records" in payload
    assert len(payload["records"]) == 2
    assert "slices" not in payload  # Not requested

    first = payload["records"][0]
    expected_keys = {
        "date",
        "total_wealth_eur",
        "portfolio_wealth_eur",
        "account_wealth_eur",
        "dividends_eur",
        "interest_eur",
        "inbound_transfers_eur",
        "outbound_transfers_eur",
        "performance_neutral_movements",
        "fees_eur",
        "taxes_eur",
        "fx_coverage_ratio",
        "price_coverage_ratio",
        "stale_price",
        "provenance",
    }
    assert set(first.keys()) == expected_keys
    assert first["date"] == "2024-01-01"
    assert first["total_wealth_eur"] == 1000.0


@pytest.mark.asyncio
async def test_daily_wealth_schema_with_slices(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Verify response shape when slices are requested."""
    entry_id = "entry-1"
    db_path = tmp_path / "test.db"
    db_path.touch()
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    # Mock DB returns
    records = [_make_daily_record("2024-01-01", 1000.0)]
    acc_slices = [_make_scope_record("account", "acc-1", "2024-01-01", 200.0)]
    port_slices = [_make_scope_record("portfolio", "port-1", "2024-01-01", 800.0)]

    async def mock_async_run_executor_job(hass, target, *args):
        if callable(target):
            return target(*args)
        return target

    monkeypatch.setattr(
        websocket_module, "async_run_executor_job", mock_async_run_executor_job
    )
    monkeypatch.setattr(
        websocket_module, "fetch_daily_wealth", lambda *a, **kw: records
    )

    # The handler calls fetch_daily_wealth_scopes inside a lambda passed to executor
    # We patch the function itself in websocket module
    def mock_fetch_scopes(
        db_path, scope_type, scope_ids=None, start_date=None, end_date=None
    ):
        if scope_type == "account":
            return acc_slices
        return port_slices

    monkeypatch.setattr(
        websocket_module, "fetch_daily_wealth_scopes", mock_fetch_scopes
    )

    msg = {
        "id": 2,
        "type": "pp_reader/get_daily_wealth",
        "entry_id": entry_id,
        "date": "2024-01-01",
        "include_slices": True,
    }

    await WS_GET_DAILY_WEALTH(hass, connection, msg)

    assert not connection.errors
    _msg_id, payload = connection.sent[0]

    assert "slices" in payload
    slices = payload["slices"]
    assert "accounts" in slices
    assert "portfolios" in slices
    assert len(slices["accounts"]) == 1
    assert len(slices["portfolios"]) == 1

    acc_record = slices["accounts"][0]
    assert acc_record["scope_type"] == "account"
    assert acc_record["scope_id"] == "acc-1"
    assert acc_record["total_wealth_eur"] == 200.0
    # Additional scope field check
    assert "scope_name" in acc_record


@pytest.mark.asyncio
async def test_daily_wealth_backward_compatibility(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Ensure older calls without include_slices receive clean basic payload."""
    entry_id = "entry-1"
    db_path = tmp_path / "test.db"
    db_path.touch()
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    async def mock_async_run_executor_job(hass, target, *args):
        return target(*args) if callable(target) else target

    monkeypatch.setattr(
        websocket_module, "async_run_executor_job", mock_async_run_executor_job
    )
    monkeypatch.setattr(
        websocket_module,
        "fetch_daily_wealth",
        lambda *a, **kw: [_make_daily_record("2024-01-01", 500.0)],
    )

    msg = {
        "id": 3,
        "type": "pp_reader/get_daily_wealth",
        "entry_id": entry_id,
        "date": "2024-01-01",
        # Explicitly omitting include_slices, forcing default=False
    }

    await WS_GET_DAILY_WEALTH(hass, connection, msg)

    assert not connection.errors
    _, payload = connection.sent[0]

    assert "slices" not in payload
    assert len(payload["records"]) == 1
    # Check that extra fields didn't leak into the record serialization
    # daily wealth record should not have scope_id/scope_type
    record = payload["records"][0]
    assert "scope_id" not in record
    assert "scope_type" not in record
