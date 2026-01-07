"""Test UI consistency for websocket responses."""

from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING, Any
from unittest.mock import patch

import pytest

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.calculator import PerformanceMetrics

if TYPE_CHECKING:
    from pathlib import Path


WS_GET_DAILY_WEALTH = getattr(
    websocket_module.ws_get_daily_wealth,
    "__wrapped__",
    websocket_module.ws_get_daily_wealth,
)


class StubHass:
    """Minimal Home Assistant stub exposing hass.data."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        """Initialize the stub."""
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}
        self.loop = None

    async def async_add_executor_job(self, func, *args: Any) -> Any:
        """Run a job in the executor."""
        return func(*args)


class StubConnection:
    """Capture websocket responses for assertions."""

    def __init__(self) -> None:
        """Initialize the stub."""
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        """Send a result."""
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        """Send an error."""
        self.errors.append((msg_id, code, message))


def _seed_minimal_data(db_path: Path) -> None:
    """Populate a database with minimal data for the handler to run."""
    initialize_database_schema(db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO daily_wealth (date, scope_uuid, scope_type, total_wealth_cents, total_invested_cents) VALUES (?, ?, ?, ?, ?)",
            ("2024-01-10", "all", "all", 100000, 80000),
        )
        conn.commit()
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_waterfall_completeness(tmp_path: Path) -> None:
    """
    Verify `ws_get_daily_wealth` returns the full `metrics` object.

    This ensures the UI waterfall chart has all necessary data from the
    `PerformanceEngine`.
    """
    entry_id = "entry-1"
    db_path = tmp_path / "test.db"
    _seed_minimal_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    # Define the expected metrics payload
    mock_metrics = PerformanceMetrics(
        start_wealth=1000.0,
        end_wealth=1255.0,
        absolute_performance=255.0,
        realized_gains=50.0,
        unrealized_gains=150.0,
        fx_gains_cash=10.0,
        dividends=20.0,
        fees=5.0,
        taxes=10.0,
        interest=15.0,
        net_transfers=25.0,
        twr=0.12,
        irr=0.11,
    )

    with patch(
        "custom_components.pp_reader.data.websocket.PerformanceEngine"
    ) as mock_engine_cls:
        mock_engine_instance = mock_engine_cls.return_value
        mock_engine_instance.calculate_period_performance.return_value = mock_metrics

        await WS_GET_DAILY_WEALTH(
            hass,
            connection,
            {
                "id": 1,
                "type": "pp_reader/get_daily_wealth",
                "entry_id": entry_id,
                "range": {"start": "2024-01-10", "end": "2024-01-10"},
                "metrics_start": "2024-01-10",
            },
        )

    assert not connection.errors
    assert len(connection.sent) == 1
    _, payload = connection.sent[0]

    assert "metrics" in payload
    metrics_response = payload["metrics"]

    # Verify that all fields from the mocked object are present and correct
    assert metrics_response["start_wealth"] == mock_metrics.start_wealth
    assert metrics_response["end_wealth"] == mock_metrics.end_wealth
    assert metrics_response["absolute_performance"] == mock_metrics.absolute_performance
    assert metrics_response["realized_gains"] == mock_metrics.realized_gains
    assert metrics_response["unrealized_gains"] == mock_metrics.unrealized_gains
    assert metrics_response["fx_gains_cash"] == mock_metrics.fx_gains_cash
    assert metrics_response["dividends"] == mock_metrics.dividends
    assert metrics_response["fees"] == mock_metrics.fees
    assert metrics_response["taxes"] == mock_metrics.taxes
    assert metrics_response["interest"] == mock_metrics.interest
    assert metrics_response["net_transfers"] == mock_metrics.net_transfers
    assert metrics_response["twr"] == mock_metrics.twr
    assert metrics_response["irr"] == mock_metrics.irr
