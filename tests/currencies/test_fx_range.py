"""Tests for range-capable FX Frankfurter client."""

from __future__ import annotations

from datetime import date
from typing import Any, Self

import pytest

from custom_components.pp_reader.util import fx


class _FakeResponse:
    def __init__(self, payload: dict[str, Any], status: int = 200) -> None:
        self._payload = payload
        self.status = status

    async def json(self) -> dict[str, Any]:
        return self._payload

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None


class _FakeSession:
    def __init__(self, payload: dict[str, Any], status: int = 200) -> None:
        self._payload = payload
        self._status = status

    def get(self, url: str) -> _FakeResponse:  # noqa: ARG002 - interface parity
        return _FakeResponse(self._payload, status=self._status)

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        return None


@pytest.mark.asyncio
async def test_fetch_fx_range_logs_missing_days(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """Missing dates are logged but do not raise errors."""
    payload = {
        "rates": {
            "2024-03-01": {"USD": 1.1},
            "2024-03-04": {"USD": 1.2},
        }
    }

    monkeypatch.setattr(
        fx.aiohttp,
        "ClientSession",
        lambda *args, **kwargs: _FakeSession(payload),
    )

    records = await fx.fetch_fx_range("usd", date(2024, 3, 1), date(2024, 3, 4))

    assert len(records) == 2
    assert records[0].date == "2024-03-01"
    assert records[1].date == "2024-03-04"
    assert records[0].currency == "USD"
    assert records[1].rate == pytest.approx(1.2)

    missing_logs = [
        msg for msg in caplog.messages if "missing" in msg and "FX range for USD" in msg
    ]
    assert missing_logs, "Expected missing-day log entry"


@pytest.mark.asyncio
async def test_fetch_fx_range_handles_non_200(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Non-200 responses return an empty list."""
    monkeypatch.setattr(
        fx.aiohttp, "ClientSession", lambda *args, **kwargs: _FakeSession({}, status=500)
    )

    records = await fx.fetch_fx_range("usd", "2024-04-01", "2024-04-02")

    assert records == []


@pytest.mark.asyncio
async def test_fetch_fx_range_weekend_gap(monkeypatch: pytest.MonkeyPatch) -> None:
    """Weekend-only range yields no records and does not raise."""
    payload: dict[str, Any] = {"rates": {}}

    monkeypatch.setattr(
        fx.aiohttp,
        "ClientSession",
        lambda *args, **kwargs: _FakeSession(payload, status=200),
    )

    records = await fx.fetch_fx_range("usd", "2024-04-06", "2024-04-07")

    assert records == []
