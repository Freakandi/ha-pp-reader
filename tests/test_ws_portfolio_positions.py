"""Regression tests for websocket portfolio position currency flows."""

from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_access import get_portfolio_positions
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.common import select_performance_metrics
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    round_currency,
    round_price,
)

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
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
async def test_ws_get_portfolio_positions_normalises_currency(
    populated_db: Path,
) -> None:
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

    assert connection.errors == []
    assert len(connection.sent) == 1

    msg_id, payload = connection.sent[0]
    assert msg_id == 7
    assert payload["portfolio_uuid"] == "portfolio-1"
    assert "error" not in payload

    positions = payload["positions"]
    assert len(positions) == 1

    position = positions[0]
    assert position["security_uuid"] == "security-1"
    assert position["name"] == "ACME Corp"

    expected_holdings = round_currency(12.345678, decimals=6, default=0.0) or 0.0
    assert position["current_holdings"] == pytest.approx(expected_holdings)

    expected_purchase_value = (
        round_currency(
            cent_to_eur(123_456, default=0.0),
            default=0.0,
        )
        or 0.0
    )
    expected_current_value = (
        round_currency(
            cent_to_eur(789_012, default=0.0),
            default=0.0,
        )
        or 0.0
    )
    expected_gain_abs = (
        round_currency(expected_current_value - expected_purchase_value, default=0.0)
        or 0.0
    )

    assert position["purchase_value"] == pytest.approx(expected_purchase_value)
    assert position["current_value"] == pytest.approx(expected_current_value)
    assert "gain_abs" not in position
    assert "gain_pct" not in position
    expected_avg_cost_native = round_price(45.678901, decimals=6) or 0.0
    expected_purchase_total_security = round_currency(2345.6789, default=0.0) or 0.0
    expected_purchase_total_account = round_currency(3456.7891, default=0.0) or 0.0
    expected_avg_price_account = round_price(23.456789, decimals=6) or 0.0
    assert "avg_price_account" not in position
    assert "avg_price_security" not in position

    average_cost = position["average_cost"]
    assert average_cost is not None
    expected_avg_cost_security = (
        round_price(
            expected_purchase_total_security / expected_holdings,
            decimals=6,
        )
        if expected_holdings
        else 0.0
    ) or 0.0
    expected_avg_cost_account = expected_avg_price_account
    expected_avg_cost_eur = (
        round_currency(
            expected_purchase_value / expected_holdings if expected_holdings else 0.0,
            decimals=6,
            default=0.0,
        )
        or 0.0
    )
    assert average_cost["native"] == pytest.approx(expected_avg_cost_native)
    assert average_cost["security"] == pytest.approx(expected_avg_cost_security)
    assert average_cost["account"] == pytest.approx(expected_avg_cost_account)
    assert average_cost["eur"] == pytest.approx(expected_avg_cost_eur)
    assert average_cost["source"] == "totals"
    assert average_cost["coverage_ratio"] == pytest.approx(1.0)
    assert average_cost["eur"] == pytest.approx(expected_avg_cost_eur)

    aggregation = position["aggregation"]
    assert aggregation is not None
    expected_aggregation = {
        "total_holdings": expected_holdings,
        "positive_holdings": expected_holdings,
        "purchase_value_cents": 123_456,
        "purchase_value_eur": expected_purchase_value,
        "security_currency_total": expected_purchase_total_security,
        "account_currency_total": expected_purchase_total_account,
        "purchase_total_security": expected_purchase_total_security,
        "purchase_total_account": expected_purchase_total_account,
    }
    assert set(aggregation) == set(expected_aggregation)
    assert "avg_price_security" not in aggregation
    for key, expected_value in expected_aggregation.items():
        actual_value = aggregation.get(key)
        if isinstance(expected_value, (int, float)):
            assert actual_value == pytest.approx(expected_value)
        else:
            assert actual_value == expected_value

    performance_metrics, _ = select_performance_metrics(
        current_value=expected_current_value,
        purchase_value=expected_purchase_value,
        holdings=expected_holdings,
    )
    expected_performance = {
        "gain_abs": performance_metrics.gain_abs,
        "gain_pct": performance_metrics.gain_pct,
        "total_change_eur": performance_metrics.total_change_eur,
        "total_change_pct": performance_metrics.total_change_pct,
        "source": performance_metrics.source,
        "coverage_ratio": performance_metrics.coverage_ratio,
    }

    performance = position["performance"]
    assert performance == expected_performance
    assert performance["gain_abs"] == pytest.approx(expected_gain_abs)

    backend_positions = get_portfolio_positions(populated_db, "portfolio-1")
    assert len(backend_positions) == 1
    backend_position = backend_positions[0]
    backend_aggregation = {
        key: value
        for key, value in backend_position["aggregation"].items()  # type: ignore[arg-type]
        if key in aggregation
    }
    assert backend_aggregation == aggregation
    assert backend_position["average_cost"] == average_cost
    assert backend_position["performance"] == performance
    assert performance["source"] == "calculated"
    assert performance["coverage_ratio"] == pytest.approx(1.0)


def test_normalize_portfolio_positions_uses_average_cost_payload() -> None:
    """Average-cost metrics should be forwarded from the payload without recomputing."""
    normalized = websocket_module._normalize_portfolio_positions(
        [
            {
                "security_uuid": "sec-agg",
                "name": "Aggregated",
                "current_holdings": 5.0,
                "purchase_value": 250.0,
                "current_value": 5678.0,
                "gain_abs": 1357.0,
                "gain_pct": 12.0,
                "purchase_total_security": 222.22,
                "purchase_total_account": 333.33,
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
            "purchase_value": pytest.approx(round_currency(123.45) or 0.0),
            "current_value": pytest.approx(round_currency(5678.0) or 0.0),
            "average_cost": {
                "native": pytest.approx(round_price(3.456789, decimals=6) or 0.0),
                "security": pytest.approx(round_price(11.111111, decimals=6) or 0.0),
                "account": pytest.approx(round_price(22.222222, decimals=6) or 0.0),
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
            "aggregation": {
                "purchase_total_security": pytest.approx(round_currency(999.99) or 0.0),
                "purchase_total_account": pytest.approx(round_currency(888.88) or 0.0),
                "purchase_value_eur": pytest.approx(round_currency(123.45) or 0.0),
            },
        }
    ]

    normalized_entry = normalized[0]
    assert "gain_abs" not in normalized_entry
    assert "gain_pct" not in normalized_entry
    assert "purchase_total_security" not in normalized_entry
    assert "purchase_total_account" not in normalized_entry
    assert "avg_price_security" not in normalized_entry
    aggregation = normalized_entry["aggregation"]
    assert aggregation is not None
    assert "avg_price_security" not in aggregation
    assert "avg_price_account" not in aggregation
