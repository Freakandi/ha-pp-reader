"""Regression tests for websocket portfolio position currency flows."""

from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path

import pytest

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
)

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_init import initialize_database_schema

WS_GET_PORTFOLIO_POSITIONS = getattr(
    websocket_module.ws_get_portfolio_positions,
    "__wrapped__",
    websocket_module.ws_get_portfolio_positions,
)


class StubConfigEntry:
    """Minimal stand-in for a Home Assistant config entry."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.entry_id = entry_id
        self.data = {"db_path": str(db_path)}


class StubConfigEntries:
    """Provide async_get_entry lookups for tests."""

    def __init__(self, entry: StubConfigEntry) -> None:
        self._entry = entry

    def async_get_entry(self, entry_id: str) -> StubConfigEntry | None:
        if entry_id == self._entry.entry_id:
            return self._entry
        return None


class StubHass:
    """Minimal Home Assistant stub for websocket handler tests."""

    def __init__(self, entry: StubConfigEntry) -> None:
        self.config_entries = StubConfigEntries(entry)

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


class StubConnection:
    """Collect websocket replies for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, object]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, object]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


@pytest.fixture
def populated_db(tmp_path: Path) -> Path:
    """Create a SQLite database with one portfolio position."""

    db_path = tmp_path / "positions.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("portfolio-1", "Alpha Depot"),
        )
        conn.execute(
            "INSERT INTO securities (uuid, name) VALUES (?, ?)",
            ("security-1", "ACME Corp"),
        )
        conn.execute(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                current_value,
                avg_price_native,
                security_currency_total,
                account_currency_total,
                avg_price_security,
                avg_price_account
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "portfolio-1",
                "security-1",
                12.345678,
                123_456,
                789_012,
                45.678901,
                2345.6789,
                3456.7891,
                12.345678,
                23.456789,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


@pytest.mark.asyncio
async def test_ws_get_portfolio_positions_normalises_currency(populated_db: Path) -> None:
    """Ensure websocket payload applies shared currency helpers end-to-end."""

    entry = StubConfigEntry("entry-42", populated_db)
    hass = StubHass(entry)
    connection = StubConnection()

    await WS_GET_PORTFOLIO_POSITIONS(
        hass,
        connection,
        {
            "id": 7,
            "type": "pp_reader/get_portfolio_positions",
            "entry_id": entry.entry_id,
            "portfolio_uuid": "portfolio-1",
        },
    )

    assert connection.errors == []  # noqa: S101
    assert len(connection.sent) == 1  # noqa: S101

    msg_id, payload = connection.sent[0]
    assert msg_id == 7  # noqa: S101
    assert payload["portfolio_uuid"] == "portfolio-1"  # noqa: S101
    assert "error" not in payload  # noqa: S101

    positions = payload["positions"]
    assert len(positions) == 1  # noqa: S101

    position = positions[0]
    assert position["security_uuid"] == "security-1"  # noqa: S101
    assert position["name"] == "ACME Corp"  # noqa: S101
    assert position["current_holdings"] == pytest.approx(12.345678)  # noqa: S101
    assert position["purchase_value"] == pytest.approx(1234.56)  # noqa: S101
    assert position["current_value"] == pytest.approx(7890.12)  # noqa: S101
    assert position["gain_abs"] == pytest.approx(6655.56)  # noqa: S101
    assert position["gain_pct"] == pytest.approx(539.1)  # noqa: S101
    assert position["average_purchase_price_native"] == pytest.approx(45.678901)  # noqa: S101
    assert position["purchase_total_security"] == pytest.approx(2345.68)  # noqa: S101
    assert position["purchase_total_account"] == pytest.approx(3456.79)  # noqa: S101
    assert position["avg_price_security"] == pytest.approx(12.345678)  # noqa: S101
    assert position["avg_price_account"] == pytest.approx(23.456789)  # noqa: S101

    average_cost = position["average_cost"]
    assert average_cost["native"] == pytest.approx(45.678901)  # noqa: S101
    assert average_cost["security"] == pytest.approx(12.345678)  # noqa: S101
    assert average_cost["account"] == pytest.approx(23.456789)  # noqa: S101
    assert average_cost["eur"] == pytest.approx(99.999368)  # noqa: S101
    assert average_cost["source"] == "totals"  # noqa: S101
    assert average_cost["coverage_ratio"] == pytest.approx(1.0)  # noqa: S101
    assert average_cost["native"] == position["average_purchase_price_native"]  # noqa: S101
    assert average_cost["security"] == position["avg_price_security"]  # noqa: S101
    assert average_cost["account"] == position["avg_price_account"]  # noqa: S101
    assert average_cost["eur"] == pytest.approx(  # noqa: S101
        position["purchase_value"] / position["current_holdings"]
    )

    performance = position["performance"]
    assert set(performance) == {
        "gain_abs",
        "gain_pct",
        "total_change_eur",
        "total_change_pct",
        "source",
        "coverage_ratio",
    }  # noqa: S101
    assert performance["gain_abs"] == pytest.approx(position["gain_abs"])  # noqa: S101
    assert performance["gain_pct"] == pytest.approx(position["gain_pct"])  # noqa: S101
    assert performance["total_change_eur"] == pytest.approx(position["gain_abs"])  # noqa: S101
    assert performance["total_change_pct"] == pytest.approx(position["gain_pct"])  # noqa: S101
    assert performance["source"] == "calculated"  # noqa: S101
    assert performance["coverage_ratio"] == pytest.approx(1.0)  # noqa: S101


def test_normalize_portfolio_positions_uses_average_cost_payload() -> None:
    """Average-cost metrics should be forwarded from the payload without recomputing."""

    normalized = websocket_module._normalize_portfolio_positions(  # noqa: SLF001
        [
            {
                "security_uuid": "sec-agg",
                "name": "Aggregated",
                "current_holdings": 5.0,
                "purchase_value": 250.0,
                "current_value": 5678.0,
                "gain_abs": 1357.0,
                "gain_pct": 12.0,
                "average_purchase_price_native": 3.456789,
                "purchase_total_security": 222.22,
                "purchase_total_account": 333.33,
                "avg_price_security": 11.111111,
                "avg_price_account": 22.222222,
                "average_cost": {
                    "native": 3.456789,
                    "security": 11.111111,
                    "account": 22.222222,
                    "eur": 50.0,
                    "source": "totals",
                    "coverage_ratio": 1.0,
                },
                "performance": {
                    "gain_abs": 1357.0,
                    "gain_pct": 12.0,
                    "total_change_eur": 1357.0,
                    "total_change_pct": 12.0,
                    "source": "calculated",
                    "coverage_ratio": 0.75,
                },
                "aggregation": {
                    "purchase_total_security": 999.99,
                    "purchase_total_account": 888.88,
                    "avg_price_security": 99.999999,
                    "avg_price_account": 88.888888,
                    "average_purchase_price_native": 77.777777,
                    "purchase_value_eur": 123.45,
                },
            }
        ]
    )

    assert normalized == [
        {
            "security_uuid": "sec-agg",
            "name": "Aggregated",
            "current_holdings": pytest.approx(5.0),
            "purchase_value": pytest.approx(250.0),
            "current_value": pytest.approx(5678.0),
            "gain_abs": pytest.approx(1357.0),
            "gain_pct": pytest.approx(12.0),
            "average_purchase_price_native": pytest.approx(3.456789),
            "purchase_total_security": pytest.approx(222.22),
            "purchase_total_account": pytest.approx(333.33),
            "avg_price_security": pytest.approx(11.111111),
            "avg_price_account": pytest.approx(22.222222),
            "average_cost": {
                "native": pytest.approx(3.456789),
                "security": pytest.approx(11.111111),
                "account": pytest.approx(22.222222),
                "eur": pytest.approx(50.0),
                "source": "totals",
                "coverage_ratio": pytest.approx(1.0),
            },
            "performance": {
                "gain_abs": pytest.approx(1357.0),
                "gain_pct": pytest.approx(12.0),
                "total_change_eur": pytest.approx(1357.0),
                "total_change_pct": pytest.approx(12.0),
                "source": "calculated",
                "coverage_ratio": pytest.approx(0.75),
            },
        }
    ]
