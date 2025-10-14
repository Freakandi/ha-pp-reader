"""WebSocket tests for on-demand portfolio aggregation."""

import asyncio
from pathlib import Path

import pytest

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for module imports"
)

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.performance import select_performance_metrics
from custom_components.pp_reader.data.websocket import DOMAIN, ws_get_portfolio_data
from custom_components.pp_reader.util.currency import cent_to_eur, round_currency


@pytest.fixture
def initialized_db(tmp_path: Path) -> Path:
    """Create a minimal portfolio dataset for WebSocket integration tests."""
    db_path = tmp_path / "portfolio_ws.db"
    initialize_database_schema(db_path)

    import sqlite3

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
    expected_performance_keys = {
        "gain_abs",
        "gain_pct",
        "total_change_eur",
        "total_change_pct",
        "source",
        "coverage_ratio",
    }

    expected_p1_current = round_currency(
        cent_to_eur(175_000_000, default=0.0),
        default=0.0,
    )
    expected_p1_purchase = round_currency(
        cent_to_eur(150_000_000, default=0.0),
        default=0.0,
    )
    assert portfolios["p1"]["current_value"] == expected_p1_current
    assert portfolios["p1"]["purchase_sum"] == expected_p1_purchase
    assert portfolios["p1"]["position_count"] == 1
    performance_p1, _ = select_performance_metrics(
        current_value=expected_p1_current,
        purchase_value=expected_p1_purchase,
        holdings=1,
    )
    assert "gain_abs" not in portfolios["p1"]
    assert "gain_pct" not in portfolios["p1"]
    performance_payload_p1 = portfolios["p1"].get("performance")
    assert performance_payload_p1 is not None
    assert set(performance_payload_p1) == expected_performance_keys
    assert performance_payload_p1["gain_abs"] == pytest.approx(performance_p1.gain_abs)
    assert performance_payload_p1["gain_pct"] == pytest.approx(performance_p1.gain_pct)
    assert performance_payload_p1["total_change_eur"] == pytest.approx(
        performance_p1.total_change_eur
    )
    assert performance_payload_p1["total_change_pct"] == pytest.approx(
        performance_p1.total_change_pct
    )
    assert performance_payload_p1["source"] == performance_p1.source
    coverage_ratio_p1 = performance_p1.coverage_ratio
    if coverage_ratio_p1 is None:
        assert performance_payload_p1["coverage_ratio"] is None
    else:
        assert performance_payload_p1["coverage_ratio"] == pytest.approx(
            coverage_ratio_p1
        )

    expected_p2_current = round_currency(
        cent_to_eur(620_000_000, default=0.0),
        default=0.0,
    )
    expected_p2_purchase = round_currency(
        cent_to_eur(500_000_000, default=0.0),
        default=0.0,
    )
    assert portfolios["p2"]["current_value"] == expected_p2_current
    assert portfolios["p2"]["purchase_sum"] == expected_p2_purchase
    assert portfolios["p2"]["position_count"] == 1
    performance_p2, _ = select_performance_metrics(
        current_value=expected_p2_current,
        purchase_value=expected_p2_purchase,
        holdings=1,
    )
    assert "gain_abs" not in portfolios["p2"]
    assert "gain_pct" not in portfolios["p2"]
    performance_payload_p2 = portfolios["p2"].get("performance")
    assert performance_payload_p2 is not None
    assert set(performance_payload_p2) == expected_performance_keys
    assert performance_payload_p2["gain_abs"] == pytest.approx(performance_p2.gain_abs)
    assert performance_payload_p2["gain_pct"] == pytest.approx(performance_p2.gain_pct)
    assert performance_payload_p2["total_change_eur"] == pytest.approx(
        performance_p2.total_change_eur
    )
    assert performance_payload_p2["total_change_pct"] == pytest.approx(
        performance_p2.total_change_pct
    )
    assert performance_payload_p2["source"] == performance_p2.source
    coverage_ratio_p2 = performance_p2.coverage_ratio
    if coverage_ratio_p2 is None:
        assert performance_payload_p2["coverage_ratio"] is None
    else:
        assert performance_payload_p2["coverage_ratio"] == pytest.approx(
            coverage_ratio_p2
        )

    assert portfolios["p3"]["current_value"] == 0.0
    assert portfolios["p3"]["purchase_sum"] == 0.0
    assert portfolios["p3"]["position_count"] == 0
    performance_p3, _ = select_performance_metrics(
        current_value=0.0,
        purchase_value=0.0,
        holdings=0,
    )
    assert "gain_abs" not in portfolios["p3"]
    assert "gain_pct" not in portfolios["p3"]
    performance_payload_p3 = portfolios["p3"].get("performance")
    assert performance_payload_p3 is not None
    assert set(performance_payload_p3) == expected_performance_keys
    assert performance_payload_p3["gain_abs"] == pytest.approx(performance_p3.gain_abs)
    assert performance_payload_p3["gain_pct"] == pytest.approx(performance_p3.gain_pct)
    assert performance_payload_p3["total_change_eur"] == pytest.approx(
        performance_p3.total_change_eur
    )
    assert performance_payload_p3["total_change_pct"] == pytest.approx(
        performance_p3.total_change_pct
    )
    assert performance_payload_p3["source"] == performance_p3.source
    coverage_ratio_p3 = performance_p3.coverage_ratio
    if coverage_ratio_p3 is None:
        assert performance_payload_p3["coverage_ratio"] is None
    else:
        assert performance_payload_p3["coverage_ratio"] == pytest.approx(
            coverage_ratio_p3
        )
