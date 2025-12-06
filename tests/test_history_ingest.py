"""Tests for history ingestion helpers."""

from __future__ import annotations

from datetime import UTC, date

from custom_components.pp_reader.prices import history_ingest


def test_coerce_timestamp_accepts_date_objects() -> None:
    """Ensure yahoo date payloads (datetime.date) are converted deterministically."""
    sample = date(2025, 10, 20)

    ts = history_ingest._coerce_timestamp(sample)

    assert ts.year == sample.year
    assert ts.month == sample.month
    assert ts.day == sample.day
    assert ts.tzinfo == UTC
    # Repeated calls must be stable (no fallback to now()).
    assert ts == history_ingest._coerce_timestamp(sample)
