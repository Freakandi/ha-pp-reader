"""Integration tests for the backdating/metrics pipeline roundtrip."""

from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING, Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.metrics.pipeline import (
    async_refresh_all_with_backdating,
)
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database

if TYPE_CHECKING:
    from pathlib import Path

# Re-use pytest fixtures
pytestmark = pytest.mark.asyncio

DOMAIN = websocket_module.DOMAIN
WS_GET_DAILY_WEALTH = getattr(
    websocket_module.ws_get_daily_wealth,
    "__wrapped__",
    websocket_module.ws_get_daily_wealth,
)


class StubHass:
    """Minimal Home Assistant stub exposing hass.data and basic async methods."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}
        self.loop = None  # Will be set by tests if needed, or ignored

    async def async_add_executor_job(self, func, *args):
        """Simulate executor job by running directly (synchronous for tests)."""
        return func(*args)

    class Bus:
        """Minimal bus stub."""

        @staticmethod
        def async_fire(*args, **kwargs) -> None:
            pass


class StubConnection:
    """Capture websocket responses for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


async def test_roundtrip_metrics_to_api(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """
    Verify that the metrics pipeline populates daily_wealth and the API retrieves it.

    Steps:
    1. Seed DB with valid transactions/holdings.
    2. Run async_refresh_all_with_backdating to calculate history.
    3. Call ws_get_daily_wealth via the websocket handler.
    4. Assert response structure, values, and coverage fields.
    """
    entry_id = "test-entry-roundtrip"
    db_path = tmp_path / "roundtrip.db"

    # 1. Setup Environment
    seed_metrics_database(db_path)
    install_fx_stubs(monkeypatch)

    hass = StubHass(entry_id, db_path)

    # 1b. Seed transactions (required for backdating)
    # Type 0 = Buy (based on holdings.py constants)
    # Type 0 = Buy (based on holdings.py constants)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO transactions (
                uuid, type, date, currency_code, amount, shares, note,
                account, portfolio, security, updated_at
            ) VALUES (
                'tx-1', 0, '2024-01-01T10:00:00Z', 'USD', 10000, 200000000, 'Seed Buy',
                'acct-usd', 'portfolio-main', 'sec-usd', '2024-01-01T10:00:00Z'
            )
            """
        )
        conn.commit()

    # 2. Run Pipeline
    # We trigger the backfill which should process our seeded positions
    # (Portfolio Main: 5x EUR sec @ 105.25 + 2x USD sec @ 95.00 * 1.25 FX)
    # Total ~ 526.25 + 237.5 = 763.75 + Cash (125k + 200k*1.25 + 150k*? no GBP rate?)
    # NOTE: check seed_metrics_database for details.
    #   sec-cur: 105.25 EUR
    #   sec-usd: 95.00 USD -> 118.75 EUR (at 1.25 rate)
    #   Portfolio Main:
    #     5 * sec-eur = 526.25
    #     2 * sec-usd = 237.50
    #     Total Portfolio = 763.75
    #   Accounts:
    #     EUR: 125,000
    #     USD: 200,000 * 1.25 = 250,000
    #     GBP: 150,000 (if no rate, might be skipped or 0 depending on fallback) -> helpers.py only provides USD rate
    #
    # Wait, install_fx_stubs only provided USD. GBP might cause issues or be ignored.
    # Let's see if partial coverage allows the result to return.

    pipeline_result = await async_refresh_all_with_backdating(
        hass,  # type: ignore[arg-type]
        db_path,
        trigger="test",
    )

    assert pipeline_result.metric_run.status == "completed"

    # 3. Invoke API
    connection = StubConnection()
    # Query for the range where we seeded data
    await WS_GET_DAILY_WEALTH(
        hass,  # type: ignore[arg-type]
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {
                "start": "2024-01-01",
                "end": "2024-01-05",
            },
            "include_slices": True,
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1
    payload = connection.sent[0][1]

    records = payload["records"]
    assert len(records) > 0, "Should have calculated at least one day of wealth"

    # Check coverage propagation
    # We expect the first record (Jan 1) to have wealth because we seeded price/fx for that day.
    # Subsequent days might be stale if our stubs/seed don't cover them.
    sample = next((r for r in records if r["total_wealth_eur"] > 0), None)
    assert sample is not None, "Expected at least one day with positive wealth"

    assert "fx_coverage_ratio" in sample
    assert "price_coverage_ratio" in sample

    # 4. Specific assertions on coverage presence
    # Check that we got slices
    assert "slices" in payload
    assert "portfolios" in payload["slices"]
    assert "accounts" in payload["slices"]
    # Ensure at least one known scope is present
    portfolios = payload["slices"]["portfolios"]
    assert any(p["scope_id"] == "portfolio-main" for p in portfolios)
