"""Regression tests for websocket portfolio position payload formatting."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.normalization_pipeline import (
    NormalizationResult,
    PortfolioSnapshot,
    PositionSnapshot,
    SnapshotDataState,
)
from custom_components.pp_reader.metrics.common import select_performance_metrics
from custom_components.pp_reader.util.currency import round_currency, round_price

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
)

WS_GET_PORTFOLIO_POSITIONS = getattr(
    websocket_module.ws_get_portfolio_positions,
    "__wrapped__",
    websocket_module.ws_get_portfolio_positions,
)


class StubHass:
    """Minimal Home Assistant stub exposing entry metadata."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {websocket_module.DOMAIN: {entry_id: {"db_path": str(db_path)}}}


class StubConnection:
    """Collect websocket replies for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


def _make_position_snapshot() -> PositionSnapshot:
    """Return a reusable PositionSnapshot for tests."""
    holdings = 12.345678
    purchase_value = 1234.56
    current_value = 1789.01
    gain_abs = current_value - purchase_value

    average_cost = {
        "native": 45.678901,
        "security": 11.111111,
        "account": 22.222222,
        "eur": purchase_value / holdings,
        "source": "totals",
        "coverage_ratio": 1.0,
    }
    aggregation = {
        "total_holdings": holdings,
        "purchase_value_eur": purchase_value,
        "purchase_total_security": 2345.6789,
        "purchase_total_account": 3456.7891,
    }
    performance = {
        "gain_abs": gain_abs,
        "gain_pct": (gain_abs / purchase_value) * 100,
        "total_change_eur": gain_abs,
        "total_change_pct": (gain_abs / purchase_value) * 100,
        "source": "calculated",
        "coverage_ratio": 1.0,
    }

    return PositionSnapshot(
        portfolio_uuid="portfolio-1",
        security_uuid="security-1",
        name="ACME Corp",
        currency_code="EUR",
        current_holdings=holdings,
        purchase_value=purchase_value,
        current_value=current_value,
        average_cost=average_cost,
        performance=performance,
        aggregation=aggregation,
        coverage_ratio=0.75,
        provenance="metrics",
        metric_run_uuid="metric-1",
        last_price_native=91.234567,
        last_price_eur=92.345678,
        last_close_native=90.0,
        last_close_eur=91.0,
        data_state=SnapshotDataState(status="warning", message="stale coverage"),
    )


def _make_portfolio_snapshot(*, include_positions: bool) -> PortfolioSnapshot:
    """Create a PortfolioSnapshot that optionally carries positions."""
    position = _make_position_snapshot()
    positions = (position,) if include_positions else ()
    return PortfolioSnapshot(
        uuid="portfolio-1",
        name="Alpha Depot",
        current_value=position.current_value,
        purchase_value=position.purchase_value,
        position_count=len(positions) or 1,
        missing_value_positions=0,
        performance={
            "gain_abs": position.performance["gain_abs"],
            "gain_pct": position.performance["gain_pct"],
            "total_change_eur": position.performance["total_change_eur"],
            "total_change_pct": position.performance["total_change_pct"],
            "source": "calculated",
            "coverage_ratio": 1.0,
        },
        positions=positions,
        data_state=SnapshotDataState(),
    )


def _fake_normalization_result(*, include_positions: bool) -> NormalizationResult:
    """Fabricate a NormalizationResult for websocket tests."""
    return NormalizationResult(
        generated_at="2024-01-01T00:00:00Z",
        metric_run_uuid="metric-1",
        accounts=(),
        portfolios=(_make_portfolio_snapshot(include_positions=include_positions),),
        diagnostics=None,
    )


@pytest.mark.asyncio
async def test_ws_get_portfolio_positions_normalises_currency(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Ensure websocket payload applies shared currency helpers end-to-end."""
    entry_id = "entry-42"
    db_path = tmp_path / "positions.db"
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    async def fake_snapshot(
        hass_arg,
        db_path_arg,
        *,
        include_positions: bool,
    ) -> NormalizationResult:
        assert Path(db_path_arg) == db_path
        assert include_positions is True
        return _fake_normalization_result(include_positions=include_positions)

    monkeypatch.setattr(websocket_module, "async_normalize_snapshot", fake_snapshot)

    await WS_GET_PORTFOLIO_POSITIONS(
        hass,
        connection,
        {
            "id": 7,
            "type": "pp_reader/get_portfolio_positions",
            "entry_id": entry_id,
            "portfolio_uuid": "portfolio-1",
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1

    msg_id, payload = connection.sent[0]
    assert msg_id == 7
    assert payload["portfolio_uuid"] == "portfolio-1"

    positions = payload["positions"]
    assert len(positions) == 1

    position = positions[0]
    assert position["security_uuid"] == "security-1"
    assert position["name"] == "ACME Corp"

    expected_holdings = round_currency(12.345678, decimals=6, default=0.0) or 0.0
    assert position["current_holdings"] == pytest.approx(expected_holdings)

    expected_purchase_value = round_currency(1234.56, default=0.0) or 0.0
    expected_current_value = round_currency(1789.01, default=0.0) or 0.0
    expected_gain_abs = expected_current_value - expected_purchase_value

    assert position["purchase_value"] == pytest.approx(expected_purchase_value)
    assert position["current_value"] == pytest.approx(expected_current_value)

    expected_position = _make_portfolio_snapshot(include_positions=True).positions[0]
    average_cost = position["average_cost"]
    assert average_cost["eur"] == pytest.approx(expected_position.average_cost["eur"])
    assert average_cost["security"] == pytest.approx(
        round_price(expected_position.average_cost["security"], decimals=6) or 0.0
    )
    assert average_cost["account"] == pytest.approx(
        round_price(expected_position.average_cost["account"], decimals=6) or 0.0
    )
    assert average_cost["source"] == expected_position.average_cost["source"]

    aggregation = position["aggregation"]
    assert aggregation["purchase_total_security"] == pytest.approx(
        round_currency(2345.6789, default=0.0) or 0.0
    )
    assert aggregation["purchase_total_account"] == pytest.approx(
        round_currency(3456.7891, default=0.0) or 0.0
    )

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
    actual_performance = position["performance"]
    for key, value in expected_performance.items():
        if value is None:
            assert actual_performance[key] is None
        elif isinstance(value, (int, float)):
            assert actual_performance[key] == pytest.approx(value, rel=1e-4)
        else:
            assert actual_performance[key] == value
    assert actual_performance["gain_abs"] == pytest.approx(expected_gain_abs)
    assert position["coverage_ratio"] == pytest.approx(0.75)
    assert position["provenance"] == "metrics"
    assert position["metric_run_uuid"] == "metric-1"
    assert position["last_price_native"] == pytest.approx(
        round_price(91.234567, decimals=6) or 0.0
    )
    assert position["last_price_eur"] == pytest.approx(
        round_price(92.345678, decimals=6) or 0.0
    )
    assert position["last_close_native"] == pytest.approx(
        round_price(90.0, decimals=6) or 0.0
    )
    assert position["last_close_eur"] == pytest.approx(
        round_price(91.0, decimals=6) or 0.0
    )
    assert position["data_state"] == {
        "status": "warning",
        "message": "stale coverage",
    }


def test_positions_payload_preserves_average_cost() -> None:
    """Average-cost metrics should be forwarded without recomputation."""
    portfolio = _make_portfolio_snapshot(include_positions=True)
    payload = websocket_module._positions_payload(portfolio)

    assert len(payload) == 1
    entry = payload[0]

    expected_average_cost = portfolio.positions[0].average_cost
    assert entry["average_cost"]["eur"] == pytest.approx(expected_average_cost["eur"])
    assert entry["average_cost"]["security"] == pytest.approx(
        round_price(expected_average_cost["security"], decimals=6) or 0.0
    )
    assert entry["average_cost"]["account"] == pytest.approx(
        round_price(expected_average_cost["account"], decimals=6) or 0.0
    )
    assert entry["average_cost"]["source"] == expected_average_cost["source"]
