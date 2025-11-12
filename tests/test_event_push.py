from __future__ import annotations

from dataclasses import dataclass

from custom_components.pp_reader.data.event_push import _compact_event_data


def test_compact_event_data_preserves_portfolio_values_payload() -> None:
    raw = [
        {
            "uuid": "portfolio-1",
            "name": "Alpha Portfolio",
            "position_count": 3,
            "current_value": 123.45,
            "purchase_sum": 234.56,
            "performance": {
                "gain_abs": 345.67,
                "gain_pct": 8.9,
                "total_change_eur": 345.67,
                "total_change_pct": 8.9,
                "source": "calculated",
                "coverage_ratio": 1.0,
                "day_change": {
                    "price_change_native": None,
                    "price_change_eur": None,
                    "change_pct": None,
                    "source": "unavailable",
                    "coverage_ratio": 0.0,
                },
            },
            "missing_value_positions": 0,
            "data_state": {"status": "ok"},
        },
        {
            "uuid": "portfolio-2",
            "count": 1,
            "current_value": 10.0,
            "purchase_sum": 5.0,
            "coverage_ratio": 0.5,
            "provenance": "metrics",
        },
    ]

    compacted = _compact_event_data("portfolio_values", raw)

    assert isinstance(compacted, list)
    assert compacted == raw


def test_compact_event_data_serializes_dataclass_positions() -> None:
    @dataclass
    class Position:
        security_uuid: str
        name: str
        current_holdings: float
        purchase_value: float
        current_value: float
        aggregation: dict[str, float]

    payload = {
        "portfolio_uuid": "portfolio-1",
        "positions": [
            Position(
                security_uuid="sec-1",
                name="Security A",
                current_holdings=2.0,
                purchase_value=123.45,
                current_value=456.78,
                aggregation={
                    "total_holdings": 2.0,
                    "purchase_value_eur": 123.45,
                },
            )
        ],
        "metadata": {"source": "tests"},
    }

    compacted = _compact_event_data("portfolio_positions", payload)
    assert isinstance(compacted, dict)
    assert compacted["metadata"] == {"source": "tests"}
    assert compacted["portfolio_uuid"] == "portfolio-1"

    positions = compacted["positions"]
    assert isinstance(positions, list)
    assert positions[0]["security_uuid"] == "sec-1"
    assert positions[0]["aggregation"]["total_holdings"] == 2.0


def test_compact_event_data_keeps_data_state() -> None:
    payload = {
        "portfolio_uuid": "portfolio-1",
        "positions": [],
        "data_state": {
            "status": "warning",
            "message": "missing coverage",
        },
    }

    compacted = _compact_event_data("portfolio_positions", payload)
    assert compacted["data_state"] == {
        "status": "warning",
        "message": "missing coverage",
    }
