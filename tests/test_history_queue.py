"""Tests for history queue planning logic."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.prices import history_queue
from custom_components.pp_reader.prices.history_queue import (
    HistoryQueueManager,
    SecurityHistoryTarget,
)


class _FixedDateTime(datetime):
    """Helper to freeze datetime.now for deterministic scheduling."""

    _now = datetime(2025, 11, 23, tzinfo=UTC)

    @classmethod
    def now(cls, tz: Any | None = None) -> datetime:  # pragma: no cover - trivial
        if tz is None:
            return cls._now.replace(tzinfo=None)
        return cls._now.astimezone(tz)


async def test_plan_jobs_overlap_backfills_recent_history(monkeypatch, tmp_path):
    """Jobs overlap the latest date to refill recent gaps."""
    monkeypatch.setattr(history_queue, "datetime", _FixedDateTime)
    monkeypatch.setattr(
        history_queue, "_load_latest_history_epoch", lambda conn, uuid: 20378
    )
    monkeypatch.setattr(
        history_queue, "price_history_job_exists", lambda *args, **kwargs: False
    )

    recorded: list[history_queue.NewPriceHistoryJob] = []

    def _capture_enqueue(
        db_path: Path, job: history_queue.NewPriceHistoryJob, *, conn=None
    ):
        recorded.append(job)
        return 1

    monkeypatch.setattr(history_queue, "enqueue_price_history_job", _capture_enqueue)

    target = SecurityHistoryTarget(
        security_uuid="sec-1",
        feed="YAHOO",
        ticker_symbol="ALV.DE",
        online_id=None,
        properties={},
        name="Allianz",
    )

    manager = HistoryQueueManager(tmp_path / "history.db")
    enqueued = await manager.plan_jobs([target], lookback_days=365, interval="1d")

    assert enqueued == 1
    assert recorded, "enqueue should have been called"
    provenance = json.loads(recorded[0].provenance)
    # Latest existing date (20378 -> 2025-10-17) should backfill the last 30 days.
    assert provenance["start"].startswith("2025-09-18T00:00:00")
    assert provenance["end"].startswith("2025-11-22T00:00:00")
    expected_requested_date = history_queue._epoch_day(
        _FixedDateTime._now - history_queue.timedelta(days=1)
    )
    assert recorded[0].requested_date == expected_requested_date


async def test_plan_jobs_skips_when_start_after_end(monkeypatch, tmp_path):
    """Forward-dated latest history should not queue a run that would end in the past."""
    monkeypatch.setattr(history_queue, "datetime", _FixedDateTime)
    future_epoch = history_queue._epoch_day(
        history_queue.datetime(2025, 12, 5, tzinfo=UTC)
    )
    monkeypatch.setattr(
        history_queue, "_load_latest_history_epoch", lambda conn, uuid: future_epoch
    )
    monkeypatch.setattr(
        history_queue, "price_history_job_exists", lambda *args, **kwargs: False
    )

    recorded: list[history_queue.NewPriceHistoryJob] = []

    def _capture_enqueue(
        db_path: Path, job: history_queue.NewPriceHistoryJob, *, conn=None
    ):
        recorded.append(job)
        return 1

    monkeypatch.setattr(history_queue, "enqueue_price_history_job", _capture_enqueue)

    target = SecurityHistoryTarget(
        security_uuid="sec-1",
        feed="YAHOO",
        ticker_symbol="ALV.DE",
        online_id=None,
        properties={},
        name="Allianz",
    )

    manager = HistoryQueueManager(tmp_path / "history.db")
    enqueued = await manager.plan_jobs([target], lookback_days=1, interval="1d")

    assert enqueued == 0
    assert recorded == []
