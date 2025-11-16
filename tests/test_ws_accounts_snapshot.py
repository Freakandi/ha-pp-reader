"""Websocket tests ensuring accounts are loaded from canonical snapshots."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.normalized_store import SnapshotBundle

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
)

WS_GET_ACCOUNTS = getattr(
    websocket_module.ws_get_accounts,
    "__wrapped__",
    websocket_module.ws_get_accounts,
)
DOMAIN = websocket_module.DOMAIN


class StubHass:
    """Minimal Home Assistant stub exposing hass.data."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}


class StubConnection:
    """Capture websocket responses for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


def _snapshot_bundle() -> SnapshotBundle:
    accounts = (
        {
            "uuid": "acc-1",
            "name": "Tagesgeld",
            "currency_code": "EUR",
            "orig_balance": 120.5,
            "balance": 120.5,
        },
        {
            "uuid": "acc-2",
            "name": "USD Broker",
            "currency_code": "USD",
            "orig_balance": 99.0,
            "balance": 101.23,
            "fx_rate": 1.1,
            "fx_rate_source": "metrics",
            "fx_rate_timestamp": "2024-01-01T00:00:00Z",
        },
    )
    return SnapshotBundle(
        metric_run_uuid="run-1",
        snapshot_at="2024-01-01T12:00:00Z",
        accounts=accounts,
        portfolios=(),
    )


@pytest.mark.asyncio
async def test_ws_get_accounts_returns_snapshot_payload(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Accounts handler should return canonical snapshots with metadata."""
    entry_id = "entry-1"
    db_path = tmp_path / "ws_accounts.db"
    db_path.write_text("stub", encoding="utf-8")
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()
    bundle = _snapshot_bundle()

    async def fake_bundle_loader(hass_arg, db_path_arg):
        assert Path(db_path_arg) == db_path
        return bundle

    monkeypatch.setattr(
        websocket_module,
        "async_load_latest_snapshot_bundle",
        fake_bundle_loader,
    )

    await WS_GET_ACCOUNTS(
        hass,
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_accounts",
            "entry_id": entry_id,
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1
    msg_id, payload = connection.sent[0]
    assert msg_id == 1
    assert payload["accounts"] == list(bundle.accounts)
    assert payload["normalized_payload"]["metric_run_uuid"] == "run-1"
    assert payload["normalized_payload"]["generated_at"] == "2024-01-01T12:00:00Z"


@pytest.mark.asyncio
async def test_ws_get_accounts_reports_missing_snapshots(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Handlers should emit an error when no canonical snapshot has been stored."""
    entry_id = "entry-1"
    db_path = tmp_path / "ws_accounts.db"
    db_path.write_text("stub", encoding="utf-8")
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    async def fake_bundle_loader(hass_arg, db_path_arg):
        return SnapshotBundle(
            metric_run_uuid=None, snapshot_at=None, accounts=(), portfolios=()
        )

    monkeypatch.setattr(
        websocket_module,
        "async_load_latest_snapshot_bundle",
        fake_bundle_loader,
    )

    await WS_GET_ACCOUNTS(
        hass,
        connection,
        {
            "id": 2,
            "type": "pp_reader/get_accounts",
            "entry_id": entry_id,
        },
    )

    assert connection.sent == []
    assert connection.errors == [
        (2, "data_unavailable", "Es liegen noch keine Normalisierungssnapshots vor.")
    ]
