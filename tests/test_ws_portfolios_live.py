"""WebSocket tests for on-demand portfolio aggregation."""

import asyncio
from pathlib import Path

import pytest

from custom_components.pp_reader.data.websocket import (
    DOMAIN,
    ws_get_portfolio_data,
)


class StubConnection:
    """Collects WebSocket responses for assertions."""

    def __init__(self) -> None:
        self.sent = []
        self.errors = []

    def send_result(self, msg_id, payload):
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id, code, message):
        self.errors.append((msg_id, code, message))


class StubCoordinator:
    """Provides a mismatching snapshot to prove live aggregation is used."""

    def __init__(self) -> None:
        self.data = {
            "portfolios": [
                {
                    "uuid": "p1",
                    "name": "Fallback",
                    "current_value": 999,
                    "purchase_sum": 999,
                    "position_count": 99,
                }
            ]
        }


class StubHass:
    """Minimal hass stub supporting async_add_executor_job and data store."""

    def __init__(self, db_path: Path, entry_id: str) -> None:
        self.data = {
            DOMAIN: {
                entry_id: {
                    "db_path": db_path,
                    "coordinator": StubCoordinator(),
                }
            }
        }

    async def async_add_executor_job(self, func, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, func, *args)


@pytest.mark.asyncio
async def test_ws_get_portfolio_data_returns_live_values(initialized_db: Path) -> None:
    """The WebSocket handler should return DB aggregated values, not coordinator fallback."""
    entry_id = "entry-1"
    hass = StubHass(initialized_db, entry_id)
    connection = StubConnection()

    msg = {"id": 1, "type": "pp_reader/get_portfolio_data", "entry_id": entry_id}

    await ws_get_portfolio_data(hass, connection, msg)

    assert connection.errors == []
    assert len(connection.sent) == 1
    _, payload = connection.sent[0]

    portfolios = {item["uuid"]: item for item in payload["portfolios"]}

    assert portfolios["p1"]["current_value"] == 175_000_000
    assert portfolios["p1"]["purchase_sum"] == 150_000_000
    assert portfolios["p1"]["position_count"] == 1

    assert portfolios["p2"]["current_value"] == 620_000_000
    assert portfolios["p2"]["purchase_sum"] == 500_000_000
    assert portfolios["p2"]["position_count"] == 1

    assert portfolios["p3"]["current_value"] == 0
    assert portfolios["p3"]["purchase_sum"] == 0
    assert portfolios["p3"]["position_count"] == 0
