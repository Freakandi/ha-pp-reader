"""Integration tests for coordinating enrichment scheduling hooks."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from custom_components.pp_reader.const import (
    DOMAIN,
    EVENT_ENRICHMENT_PROGRESS,
    SIGNAL_ENRICHMENT_COMPLETED,
)
from custom_components.pp_reader.data.coordinator import PPReaderCoordinator

pytestmark = pytest.mark.asyncio


async def _create_coordinator(hass, tmp_path) -> PPReaderCoordinator:
    db_path = tmp_path / "enrichment.db"
    db_path.touch()
    file_path = tmp_path / "portfolio.xml"
    file_path.write_text("dummy")
    return PPReaderCoordinator(
        hass,
        db_path=db_path,
        file_path=file_path,
        entry_id="entry",
    )


async def test_enrichment_pipeline_runs_stages(hass, tmp_path, monkeypatch) -> None:
    """Both enrichment stages run and emit telemetry when enabled."""
    coordinator = await _create_coordinator(hass, tmp_path)

    hass.data.setdefault(DOMAIN, {})["entry"] = {
        "feature_flags": {
            "enrichment_pipeline": True,
            "enrichment_fx_refresh": True,
            "enrichment_history_jobs": True,
        }
    }

    progress_events: list[dict[str, Any]] = []
    completed_payloads: list[dict[str, Any]] = []

    def _capture_event(event) -> None:
        progress_events.append(event.data)

    unsub_event = hass.bus.async_listen(EVENT_ENRICHMENT_PROGRESS, _capture_event)
    unsub_completed = async_dispatcher_connect(
        hass,
        SIGNAL_ENRICHMENT_COMPLETED,
        completed_payloads.append,
    )

    async def _fake_fx(self) -> dict[str, Any]:
        self._emit_enrichment_progress("fx_stub")
        return {"fx_status": "stubbed"}

    async def _fake_history(self, _parsed_client) -> dict[str, Any]:
        self._emit_enrichment_progress("history_stub")
        return {"history_status": "stubbed", "history_jobs_enqueued": 2}

    monkeypatch.setattr(PPReaderCoordinator, "_schedule_fx_refresh", _fake_fx)
    monkeypatch.setattr(
        PPReaderCoordinator,
        "_schedule_price_history_jobs",
        _fake_history,
    )

    parsed_client = SimpleNamespace(securities=["sec-001"])
    await coordinator._schedule_enrichment_jobs(parsed_client)
    await hass.async_block_till_done()

    unsub_event()
    unsub_completed()

    stages = [event["stage"] for event in progress_events]
    assert stages == ["start", "fx_stub", "history_stub", "completed"]

    assert completed_payloads, "completion signal not emitted"
    summary = completed_payloads[-1].get("summary", {})
    assert summary["fx_status"] == "stubbed"
    assert summary["history_status"] == "stubbed"
    assert summary["history_jobs_enqueued"] == 2


async def test_enrichment_pipeline_respects_stage_flags(
    hass, tmp_path, monkeypatch
) -> None:
    """Disabled stage flags skip their scheduling hooks."""
    coordinator = await _create_coordinator(hass, tmp_path)

    hass.data.setdefault(DOMAIN, {})["entry"] = {
        "feature_flags": {
            "enrichment_pipeline": True,
            "enrichment_fx_refresh": False,
            "enrichment_history_jobs": True,
        }
    }

    progress_events: list[dict[str, Any]] = []

    def _capture_event(event) -> None:
        progress_events.append(event.data)

    unsub_event = hass.bus.async_listen(EVENT_ENRICHMENT_PROGRESS, _capture_event)

    async def _fail_fx(self) -> dict[str, Any]:  # pragma: no cover - safety net
        raise AssertionError("fx refresh should not run when disabled")

    async def _fake_history(self, _parsed_client) -> dict[str, Any]:
        self._emit_enrichment_progress("history_stub")
        return {"history_status": "stubbed", "history_jobs_enqueued": 1}

    monkeypatch.setattr(PPReaderCoordinator, "_schedule_fx_refresh", _fail_fx)
    monkeypatch.setattr(
        PPReaderCoordinator,
        "_schedule_price_history_jobs",
        _fake_history,
    )

    parsed_client = SimpleNamespace(securities=["sec-001"])
    await coordinator._schedule_enrichment_jobs(parsed_client)
    await hass.async_block_till_done()

    unsub_event()

    stages = [event["stage"] for event in progress_events]
    assert stages == ["start", "fx_skipped_disabled", "history_stub", "completed"]
    summary = progress_events[-1]["summary"]
    assert summary["fx_status"] == "disabled"
    assert summary["history_jobs_enqueued"] == 1


async def test_enrichment_pipeline_notifies_on_repeated_failures(
    hass, tmp_path, monkeypatch
) -> None:
    """Persistent notification is raised after repeated enrichment failures."""
    coordinator = await _create_coordinator(hass, tmp_path)

    hass.data.setdefault(DOMAIN, {})["entry"] = {
        "feature_flags": {
            "enrichment_pipeline": True,
            "enrichment_fx_refresh": True,
            "enrichment_history_jobs": True,
        }
    }

    notifications: list[dict[str, Any]] = []

    async def _capture_notification(**kwargs: Any) -> None:
        notifications.append(kwargs)

    monkeypatch.setattr(
        "custom_components.pp_reader.util.notifications.async_create_enrichment_failure_notification",
        _capture_notification,
    )

    async def _fx_ok(self) -> dict[str, Any]:
        return {"fx_status": "scheduled"}

    async def _history_fail(self, _parsed_client) -> dict[str, Any]:
        return {"history_status": "failed"}

    monkeypatch.setattr(PPReaderCoordinator, "_schedule_fx_refresh", _fx_ok)
    monkeypatch.setattr(
        PPReaderCoordinator,
        "_schedule_price_history_jobs",
        _history_fail,
    )

    parsed_client = SimpleNamespace(securities=["sec-001"])

    await coordinator._schedule_enrichment_jobs(parsed_client)
    await hass.async_block_till_done()
    assert notifications == []

    await coordinator._schedule_enrichment_jobs(parsed_client)
    await hass.async_block_till_done()

    assert len(notifications) == 1
    notification = notifications[0]
    assert notification["entry_id"] == "entry"
    assert "Enrichment" in notification["title"]
    assert "Price history job scheduling failed" in notification["message"]
