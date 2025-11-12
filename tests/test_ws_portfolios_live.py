"""WebSocket tests for on-demand portfolio aggregation."""

import asyncio
import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.normalization_pipeline import (
    NormalizationResult,
    PortfolioSnapshot,
    SnapshotDataState,
)
from custom_components.pp_reader.data.websocket import DOMAIN, ws_get_portfolio_data

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for module imports"
)


@pytest.fixture
def initialized_db(tmp_path: Path) -> Path:
    """Create a minimal portfolio dataset for WebSocket integration tests."""
    db_path = tmp_path / "portfolio_ws.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        portfolios = [
            ("p1", "Alpha Depot"),
            ("p2", "Beta Depot"),
            ("p3", "Gamma Depot"),
        ]
        conn.executemany(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)", portfolios
        )

        securities = [
            ("p1", "s1", 5.0, 150_000_000, 175_000_000),
            ("p2", "s3", 10.0, 500_000_000, 620_000_000),
        ]
        conn.executemany(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid, security_uuid, current_holdings,
                purchase_value, current_value
            ) VALUES (?, ?, ?, ?, ?)
            """,
            securities,
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


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

    def async_create_background_task(
        self,
        coro,
        _task_name=None,
        *,
        eager_start: bool = False,
    ):
        del eager_start
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)


@pytest.mark.asyncio
async def test_ws_get_portfolio_data_returns_live_values(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """The WebSocket handler should return normalization payloads as-is."""
    entry_id = "entry-1"
    db_path = tmp_path / "portfolio_ws.db"
    initialize_database_schema(db_path)
    hass = StubHass(db_path, entry_id)
    connection = StubConnection()

    snapshot = NormalizationResult(
        generated_at="2024-01-01T00:00:00Z",
        metric_run_uuid="metric-1",
        accounts=(),
        portfolios=(
            PortfolioSnapshot(
                uuid="p1",
                name="Alpha Depot",
                current_value=1750000.0,
                purchase_value=1500000.0,
                position_count=1,
                missing_value_positions=0,
                performance={
                    "gain_abs": 250000.0,
                    "gain_pct": 16.6667,
                    "total_change_eur": 250000.0,
                    "total_change_pct": 16.6667,
                    "source": "metrics",
                    "coverage_ratio": 1.0,
                },
            ),
            PortfolioSnapshot(
                uuid="p2",
                name="Beta Depot",
                current_value=6200000.0,
                purchase_value=5000000.0,
                position_count=1,
                missing_value_positions=0,
                performance={
                    "gain_abs": 1200000.0,
                    "gain_pct": 24.0,
                    "total_change_eur": 1200000.0,
                    "total_change_pct": 24.0,
                    "source": "metrics",
                    "coverage_ratio": 0.75,
                },
            ),
            PortfolioSnapshot(
                uuid="p3",
                name="Gamma Depot",
                current_value=0.0,
                purchase_value=0.0,
                position_count=0,
                missing_value_positions=0,
                performance={
                    "gain_abs": 0.0,
                    "gain_pct": None,
                    "total_change_eur": 0.0,
                    "total_change_pct": None,
                    "source": "metrics",
                    "coverage_ratio": None,
                },
            ),
        ),
        diagnostics=None,
    )

    called = {"value": False}

    async def fake_snapshot(
        hass_arg, db_path_arg, *, include_positions: bool = False
    ):
        called["value"] = True
        return snapshot

    monkeypatch.setattr(websocket_module, "async_normalize_snapshot", fake_snapshot)

    await ws_get_portfolio_data(
        hass,
        connection,
        {"id": 1, "type": "pp_reader/get_portfolio_data", "entry_id": entry_id},
    )

    assert called["value"] is True
    assert connection.errors == []
    assert len(connection.sent) == 1
    _, payload = connection.sent[0]

    portfolios = {item["uuid"]: item for item in payload["portfolios"]}
    assert portfolios["p1"]["current_value"] == pytest.approx(1_750_000.0)
    assert portfolios["p1"]["purchase_sum"] == pytest.approx(1_500_000.0)
    assert portfolios["p1"]["performance"]["gain_abs"] == pytest.approx(250_000.0)
    assert portfolios["p2"]["performance"]["coverage_ratio"] == pytest.approx(0.75)
    assert portfolios["p3"]["performance"]["gain_abs"] == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_ws_get_portfolio_data_includes_data_state(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Portfolios should forward SnapshotDataState metadata."""
    db_path = tmp_path / "state.db"
    initialize_database_schema(db_path)
    entry_id = "entry-state"
    hass = StubHass(db_path, entry_id)
    connection = StubConnection()

    snapshot = NormalizationResult(
        generated_at="2024-02-01T00:00:00Z",
        metric_run_uuid="metric-42",
        accounts=(),
        portfolios=(
            PortfolioSnapshot(
                uuid="portfolio-state",
                name="State Depot",
                current_value=100.0,
                purchase_value=80.0,
                position_count=1,
                missing_value_positions=1,
                performance={
                    "gain_abs": 20.0,
                    "gain_pct": 25.0,
                    "total_change_eur": 20.0,
                    "total_change_pct": 25.0,
                    "source": "metrics",
                    "coverage_ratio": None,
                },
                coverage_ratio=None,
                provenance="metrics",
                metric_run_uuid="metric-42",
                positions=(),
                data_state=SnapshotDataState(
                    status="warning",
                    message="Portfolio enthält Positionen ohne Bewertung.",
                ),
            ),
        ),
        diagnostics=None,
    )

    called = {"value": False}

    async def fake_snapshot(
        hass_arg, db_path_arg, *, include_positions: bool = False
    ):
        called["value"] = True
        return snapshot

    monkeypatch.setattr(websocket_module, "async_normalize_snapshot", fake_snapshot)

    await ws_get_portfolio_data(
        hass,
        connection,
        {"id": 99, "type": "pp_reader/get_portfolio_data", "entry_id": entry_id},
    )

    assert called["value"] is True
    assert called["value"] is True
    assert connection.errors == []
    assert len(connection.sent) == 1
    _, payload = connection.sent[0]
    portfolio_payload = payload["portfolios"][0]
    assert portfolio_payload["uuid"] == "portfolio-state"
    assert portfolio_payload["purchase_sum"] == pytest.approx(80.0)
    assert portfolio_payload["data_state"] == {
        "status": "warning",
        "message": "Portfolio enthält Positionen ohne Bewertung.",
    }
