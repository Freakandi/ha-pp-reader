"""Websocket tests for daily wealth retrieval."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_access import (
    DailyWealthRecord,
    DailyWealthScopeRecord,
    upsert_daily_wealth,
    upsert_daily_wealth_scopes,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
)

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
        self.loop = None

    async def async_add_executor_job(self, func, *args):
        return func(*args)


class StubConnection:
    """Capture websocket responses for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


def _seed_daily_wealth(db_path: Path) -> None:
    initialize_database_schema(db_path)
    upsert_daily_wealth(
        db_path,
        [
            DailyWealthRecord(
                date="2024-01-10",
                total_wealth_eur=150.0,
                portfolio_wealth_eur=50.0,
                account_wealth_eur=100.0,
                dividends_eur=5.0,
                interest_eur=2.0,
                inbound_transfers_eur=1.0,
                outbound_transfers_eur=0.5,
                performance_neutral_movements=0.0,
                fees_eur=0.2,
                taxes_eur=0.1,
                fx_coverage_ratio=0.9,
                price_coverage_ratio=0.8,
                stale_price=False,
                provenance="seed-test",
            )
        ],
    )
    upsert_daily_wealth_scopes(
        db_path,
        [
            DailyWealthScopeRecord(
                scope_type="portfolio",
                scope_id="p1",
                scope_name="Main",
                date="2024-01-10",
                total_wealth_eur=50.0,
                portfolio_wealth_eur=50.0,
                account_wealth_eur=0.0,
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
                provenance="seed-test",
            ),
            DailyWealthScopeRecord(
                scope_type="account",
                scope_id="a1",
                scope_name="Cash",
                date="2024-01-10",
                total_wealth_eur=100.0,
                portfolio_wealth_eur=0.0,
                account_wealth_eur=100.0,
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
                provenance="seed-test",
            ),
        ],
    )


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_returns_records_and_scopes(tmp_path: Path) -> None:
    """Handler should return daily wealth and scopes for the requested date."""
    entry_id = "entry-1"
    db_path = tmp_path / "ws_wealth.db"
    _seed_daily_wealth(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "start_date": "2024-01-10",
            "include_scopes": True,
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1
    msg_id, payload = connection.sent[0]
    assert msg_id == 1
    assert payload["records"][0]["total_wealth_eur"] == 150.0
    assert payload["records"][0]["price_coverage_ratio"] == 0.8
    assert payload["records"][0]["provenance"] == "seed-test"
    assert len(payload["scopes"]["portfolios"]) == 1
    assert payload["scopes"]["accounts"][0]["scope_id"] == "a1"


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_validates_range(tmp_path: Path) -> None:
    """Handler should reject oversized date ranges."""
    entry_id = "entry-2"
    db_path = tmp_path / "ws_wealth_range.db"
    _seed_daily_wealth(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 2,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "start_date": "2020-01-01",
            "end_date": "2025-01-01",
        },
    )

    assert connection.sent == []
    assert len(connection.errors) == 1
    msg_id, code, _ = connection.errors[0]
    assert msg_id == 2
    assert code == "range_too_large"
