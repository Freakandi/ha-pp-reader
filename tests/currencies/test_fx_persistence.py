"""Tests for FX persistence bulk/chunked upserts."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime, timedelta

import pytest

from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    load_fx_rates_for_date,
    upsert_fx_rates_bulk,
    upsert_fx_rates_chunked,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


def _make_record(currency: str, date_str: str, rate: float) -> FxRateRecord:
    fetched_at = datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return FxRateRecord(
        date=date_str,
        currency=currency,
        rate=rate,
        fetched_at=fetched_at,
        data_source="frankfurter",
        provider="frankfurter.app",
        provenance='{"currencies":["%s"]}' % currency,
    )


def test_upsert_fx_rates_bulk_idempotent(tmp_path: pytest.TempPathFactory) -> None:
    """Bulk upsert replaces existing rows on conflict."""
    db_path = tmp_path / "fx_bulk.db"
    initialize_database_schema(db_path)

    initial = [
        _make_record("USD", "2024-03-01", 1.1),
        _make_record("CHF", "2024-03-01", 0.95),
    ]
    upsert_fx_rates_bulk(db_path, initial)

    stored = load_fx_rates_for_date(db_path, "2024-03-01")
    assert {r.currency for r in stored} == {"USD", "CHF"}

    # Update USD rate; CHF unchanged
    updated = [
        _make_record("USD", "2024-03-01", 1.2),
        _make_record("CHF", "2024-03-01", 0.95),
    ]
    upsert_fx_rates_bulk(db_path, updated)

    stored_after = load_fx_rates_for_date(db_path, "2024-03-01")
    rates = {r.currency: float(r.rate) for r in stored_after}
    assert rates["USD"] == pytest.approx(1.2)
    assert rates["CHF"] == pytest.approx(0.95)

    with sqlite3.connect(str(db_path)) as conn:
        row_count = conn.execute("SELECT COUNT(*) FROM fx_rates").fetchone()[0]
    assert row_count == 2


def test_upsert_fx_rates_chunked_inserts_all(tmp_path: pytest.TempPathFactory) -> None:
    """Chunked upsert persists all rows and updates existing ones."""
    db_path = tmp_path / "fx_chunk.db"
    initialize_database_schema(db_path)

    start_date = datetime(2024, 4, 1, tzinfo=UTC).date()
    records = [
        _make_record("USD", (start_date + timedelta(days=offset)).isoformat(), 1.0 + offset * 0.01)
        for offset in range(10)
    ]
    # Duplicate last element with changed rate to exercise conflict update
    records.append(_make_record("USD", (start_date + timedelta(days=5)).isoformat(), 2.5))

    upsert_fx_rates_chunked(db_path, records, chunk_size=3)

    with sqlite3.connect(str(db_path)) as conn:
        count = conn.execute("SELECT COUNT(*) FROM fx_rates").fetchone()[0]
        assert count == 10
        updated_rate = conn.execute(
            "SELECT rate FROM fx_rates WHERE currency = ? AND date = ?",
            ("USD", (start_date + timedelta(days=5)).isoformat()),
        ).fetchone()[0]
        assert float(updated_rate) == pytest.approx(2.5)
