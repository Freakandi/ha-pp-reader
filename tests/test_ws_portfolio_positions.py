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
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    round_currency,
    round_price,
)

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

    expected_holdings = round_currency(12.345678, decimals=6, default=0.0) or 0.0
    assert position["current_holdings"] == pytest.approx(expected_holdings)  # noqa: S101

    expected_purchase_value = round_currency(
        cent_to_eur(123_456, default=0.0),
        default=0.0,
    ) or 0.0
    expected_current_value = round_currency(
        cent_to_eur(789_012, default=0.0),
        default=0.0,
    ) or 0.0
    expected_gain_abs = (
        round_currency(expected_current_value - expected_purchase_value, default=0.0)
        or 0.0
    )
    gain_pct_input = (
        (expected_gain_abs / expected_purchase_value) * 100
        if expected_purchase_value
        else 0.0
    )
    expected_gain_pct = round_currency(gain_pct_input, default=0.0) or 0.0

    assert position["purchase_value"] == pytest.approx(expected_purchase_value)  # noqa: S101
    assert position["current_value"] == pytest.approx(expected_current_value)  # noqa: S101
    assert position["gain_abs"] == pytest.approx(expected_gain_abs)  # noqa: S101
    assert position["gain_pct"] == pytest.approx(expected_gain_pct)  # noqa: S101
    expected_avg_price_native = round_price(45.678901, decimals=6) or 0.0
    assert position["average_purchase_price_native"] == pytest.approx(
        expected_avg_price_native
    )  # noqa: S101
    expected_purchase_total_security = (
        round_currency(2345.6789, default=0.0) or 0.0
    )
    expected_purchase_total_account = (
        round_currency(3456.7891, default=0.0) or 0.0
    )

    assert position["purchase_total_security"] == pytest.approx(
        expected_purchase_total_security
    )  # noqa: S101
    assert position["purchase_total_account"] == pytest.approx(
        expected_purchase_total_account
    )  # noqa: S101
    expected_avg_price_security = round_price(12.345678, decimals=6) or 0.0
    expected_avg_price_account = round_price(23.456789, decimals=6) or 0.0
    assert position["avg_price_security"] == pytest.approx(
        expected_avg_price_security
    )  # noqa: S101
    assert position["avg_price_account"] == pytest.approx(
        expected_avg_price_account
    )  # noqa: S101

    average_cost = position["average_cost"]
    expected_avg_cost_native = expected_avg_price_native
    expected_avg_cost_security = expected_avg_price_security
    expected_avg_cost_account = expected_avg_price_account
    expected_avg_cost_eur = round_currency(99.999368, decimals=6) or 0.0
    assert average_cost["native"] == pytest.approx(
        expected_avg_cost_native
    )  # noqa: S101
    assert average_cost["security"] == pytest.approx(
        expected_avg_cost_security
    )  # noqa: S101
    assert average_cost["account"] == pytest.approx(
        expected_avg_cost_account
    )  # noqa: S101
    assert average_cost["eur"] == pytest.approx(expected_avg_cost_eur)  # noqa: S101
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
            "current_holdings": pytest.approx(
                round_currency(5.0, decimals=6, default=0.0) or 0.0
            ),
            "purchase_value": pytest.approx(round_currency(250.0) or 0.0),
            "current_value": pytest.approx(round_currency(5678.0) or 0.0),
            "gain_abs": pytest.approx(round_currency(1357.0) or 0.0),
            "gain_pct": pytest.approx(round_currency(12.0) or 0.0),
            "average_purchase_price_native": pytest.approx(
                round_price(3.456789, decimals=6) or 0.0
            ),
            "purchase_total_security": pytest.approx(
                round_currency(222.22) or 0.0
            ),
            "purchase_total_account": pytest.approx(
                round_currency(333.33) or 0.0
            ),
            "avg_price_security": pytest.approx(
                round_price(11.111111, decimals=6) or 0.0
            ),
            "avg_price_account": pytest.approx(
                round_price(22.222222, decimals=6) or 0.0
            ),
            "average_cost": {
                "native": pytest.approx(
                    round_price(3.456789, decimals=6) or 0.0
                ),
                "security": pytest.approx(
                    round_price(11.111111, decimals=6) or 0.0
                ),
                "account": pytest.approx(
                    round_price(22.222222, decimals=6) or 0.0
                ),
                "eur": pytest.approx(round_currency(50.0) or 0.0),
                "source": "totals",
                "coverage_ratio": pytest.approx(round_currency(1.0) or 0.0),
            },
            "performance": {
                "gain_abs": pytest.approx(round_currency(1357.0) or 0.0),
                "gain_pct": pytest.approx(round_currency(12.0) or 0.0),
                "total_change_eur": pytest.approx(round_currency(1357.0) or 0.0),
                "total_change_pct": pytest.approx(round_currency(12.0) or 0.0),
                "source": "calculated",
                "coverage_ratio": pytest.approx(round_currency(0.75) or 0.0),
            },
        }
    ]
