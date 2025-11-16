from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import pytest
from homeassistant.const import EVENT_PANELS_UPDATED

from custom_components.pp_reader.data import event_push
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


class _StubLoop:
    """Record thread-safe loop invocations."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def call_soon_threadsafe(self, callback, *args) -> None:
        self.calls.append((callback, args))
        callback(*args)


class _StubBus:
    """Capture fired events."""

    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def fire(self, event_type: str, payload: dict) -> None:
        self.events.append((event_type, payload))


class _StubHass:
    """Minimal hass-like object for event push testing."""

    def __init__(self) -> None:
        self.loop = _StubLoop()
        self.bus = _StubBus()


def test_push_update_emits_canonical_event(monkeypatch: pytest.MonkeyPatch) -> None:
    """_push_update should compact payloads and emit recorder-safe events."""
    hass = _StubHass()
    now = datetime(2024, 3, 1, 12, 0, tzinfo=UTC)
    monkeypatch.setattr(event_push.dt_util, "utcnow", lambda: now)

    payload = [
        {
            "uuid": "portfolio-1",
            "current_value": 1234.5,
            "positions": (),
        },
    ]
    expected_data = [
        {
            "uuid": "portfolio-1",
            "current_value": 1234.5,
            "positions": [],
        },
    ]

    event_push._push_update(
        hass,
        entry_id="entry-1",
        data_type="portfolio_values",
        data=payload,
    )

    # loop should schedule exactly one fire call, executed immediately by the stub
    assert len(hass.loop.calls) == 1
    assert len(hass.bus.events) == 1

    event_type, event_payload = hass.bus.events[0]
    assert event_type == EVENT_PANELS_UPDATED
    assert event_payload["domain"] == "pp_reader"
    assert event_payload["entry_id"] == "entry-1"
    assert event_payload["data_type"] == "portfolio_values"
    assert event_payload["data"] == expected_data
    assert event_payload["synced_at"] == "2024-03-01T12:00:00+00:00"
