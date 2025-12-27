"""Integration-like test for FX backfill filling missing dates."""

from __future__ import annotations

import sqlite3
from datetime import date, timedelta

import pytest

from custom_components.pp_reader.currencies import fx
from custom_components.pp_reader.data.canonical_sync import _lookup_fx_rate
from custom_components.pp_reader.data.db_access import FxRateRecord
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.fx_backfill import backfill_fx


def _insert_ingestion_transaction(
    conn: sqlite3.Connection, currency: str, tx_date: str
) -> None:
    conn.execute(
        """
        INSERT INTO ingestion_transactions (
            uuid, type, date, currency_code
        ) VALUES (?, ?, ?, ?)
        """,
        ("tx-" + tx_date, 0, tx_date, currency),
    )


def _insert_fx_rate(conn: sqlite3.Connection, record: FxRateRecord) -> None:
    conn.execute(
        """
        INSERT INTO fx_rates (date, currency, rate, fetched_at, data_source, provider, provenance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record.date,
            record.currency,
            record.rate,
            record.fetched_at,
            record.data_source,
            record.provider,
            record.provenance,
        ),
    )


@pytest.mark.asyncio
async def test_backfill_fills_missing_fx_and_lookup_uses_nearest(
    tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Backfill inserts missing FX rows and lookup uses nearest-on-or-before."""
    db_path = tmp_path / "fx_backfill.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        _insert_ingestion_transaction(conn, "USD", "2024-03-01")
        _insert_ingestion_transaction(conn, "USD", "2024-03-03")
        _insert_fx_rate(
            conn,
            FxRateRecord(
                date="2024-03-01",
                currency="USD",
                rate=1.1,
                fetched_at="2024-03-01T10:00:00Z",
                data_source="frankfurter",
                provider="frankfurter.app",
                provenance='{"currencies":["USD"]}',
            ),
        )
        conn.commit()

    async def _fake_fetch_fx_range(currency: str, start_date: date, end_date: date):
        assert currency == "USD"
        assert start_date.isoformat() == "2024-03-02"
        assert end_date.isoformat() == "2024-03-03"
        return [
            FxRateRecord(
                date="2024-03-02",
                currency="USD",
                rate=1.2,
                fetched_at="2024-03-02T00:00:00Z",
                data_source="frankfurter",
                provider="frankfurter.app",
                provenance='{"currencies":["USD"]}',
            ),
            FxRateRecord(
                date="2024-03-03",
                currency="USD",
                rate=1.3,
                fetched_at="2024-03-03T00:00:00Z",
                data_source="frankfurter",
                provider="frankfurter.app",
                provenance='{"currencies":["USD"]}',
            ),
        ]

    # Use 'custom_components.pp_reader.currencies.fx' or 'fx_backfill.fetch_fx_range'
    # Since fx_backfill imports it, we can patch where it is imported.
    # But patching the source is cleaner if possible.
    # The original test patched 'fx_backfill.fetch_fx_range', but now fx_backfill imports it from 'currencies.fx'.
    # If we patch 'currencies.fx.fetch_fx_range', it will work if we patch it before import or on the module.
    # But since fx_backfill does `from ... import fetch_fx_range`, we must patch `fx_backfill.fetch_fx_range`.
    # Wait, if `backfill_fx` uses the imported name, patching `fx_backfill.fetch_fx_range` still works.

    # However, since we refactored, let's verify if `fx_backfill` uses `fetch_fx_range` or `currencies.fx.fetch_fx_range`.
    # It does `from custom_components.pp_reader.currencies.fx import fetch_fx_range`.
    # So `monkeypatch.setattr(fx_backfill, "fetch_fx_range", ...)` works.

    # But wait, `fx_backfill` code:
    # `from custom_components.pp_reader.currencies.fx import fetch_fx_range`
    # ...
    # `records = await fetch_fx_range(currency, desired_start, fetch_end)`

    # So patching `fx_backfill.fetch_fx_range` is correct.
    # But I see in the previous test file content: `monkeypatch.setattr(fx_backfill, "fetch_fx_range", _fake_fetch_fx_range)`
    # So actually I don't need to change anything if `fx_backfill` exposes the name.
    # BUT `fx_backfill` imports it from a DIFFERENT location now (`currencies.fx` instead of `util.fx`).
    # Monkeypatching the name in `fx_backfill` module still works regardless of where it came from.

    # So the only change needed is imports if I use them in test setup.
    # The test imports `backfill_fx` from `fx_backfill`.

    monkeypatch.setattr(fx, "fetch_fx_range", _fake_fetch_fx_range)
    # Actually, patch the SOURCE of truth is safer if we want to be sure,
    # but since fx_backfill imports the function, patching fx_backfill.fetch_fx_range is what effectively mocks it for that module scope.
    # Wait, `from X import Y` binds Y in the importing module.
    # `monkeypatch.setattr(fx_backfill, "fetch_fx_range", ...)` patches the bound name in `fx_backfill`.
    # This remains correct.

    # However, I should update the test to be aware of the new structure if needed.
    # But functionally, `monkeypatch` targeting `fx_backfill` is correct.

    # BUT, I'll switch to patching the source `currencies.fx.fetch_fx_range` and ensure `fx_backfill` picks it up?
    # No, if `fx_backfill` already imported it, patching source won't affect `fx_backfill` unless I patch BEFORE import (which is hard in pytest) or patch the name in `fx_backfill`.

    # I will patch `fx_backfill.fetch_fx_range` as before.
    monkeypatch.setattr(
        "custom_components.pp_reader.data.fx_backfill.fetch_fx_range",
        _fake_fetch_fx_range,
    )

    summary = await backfill_fx(
        db_path=db_path,
        end="2024-03-03",
    )

    assert summary.get("USD") == 2

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rate_on_2023 = _lookup_fx_rate(conn, "USD", "2024-03-02")
        rate_after = _lookup_fx_rate(conn, "USD", "2024-03-04")

    assert rate_on_2023 == pytest.approx(1.2)
    assert rate_after == pytest.approx(1.3)


@pytest.mark.asyncio
async def test_backfill_fetches_from_latest_fx_date_onward(
    tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Backfill only fetches from the day after the newest cached rate."""
    db_path = tmp_path / "fx_backfill_tail.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        for day in range(1, 6):
            _insert_ingestion_transaction(conn, "USD", f"2024-06-0{day}")
        _insert_fx_rate(
            conn,
            FxRateRecord(
                date="2024-06-02",
                currency="USD",
                rate=1.1,
                fetched_at="2024-06-02T00:00:00Z",
                data_source="frankfurter",
                provider="frankfurter.app",
                provenance='{"currencies":["USD"]}',
            ),
        )
        _insert_fx_rate(
            conn,
            FxRateRecord(
                date="2024-06-04",
                currency="USD",
                rate=1.2,
                fetched_at="2024-06-04T00:00:00Z",
                data_source="frankfurter",
                provider="frankfurter.app",
                provenance='{"currencies":["USD"]}',
            ),
        )
        conn.commit()

    calls: list[tuple[str, str]] = []

    async def _fake_fetch_fx_range(currency: str, start_date: date, end_date: date):
        calls.append((start_date.isoformat(), end_date.isoformat()))
        records: list[FxRateRecord] = []
        current = start_date
        while current <= end_date:
            records.append(
                FxRateRecord(
                    date=current.isoformat(),
                    currency=currency,
                    rate=round(1.5 + len(records), 4),
                    fetched_at="2024-06-06T00:00:00Z",
                    data_source="frankfurter",
                    provider="frankfurter.app",
                    provenance='{"currencies":["USD"]}',
                )
            )
            current += timedelta(days=1)
        return records

    monkeypatch.setattr(
        "custom_components.pp_reader.data.fx_backfill.fetch_fx_range",
        _fake_fetch_fx_range,
    )

    summary = await backfill_fx(
        db_path=db_path,
        end="2024-06-05",
    )

    assert summary.get("USD") == 1
    assert calls == [("2024-06-05", "2024-06-05")]

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        record_count = conn.execute(
            "SELECT COUNT(*) FROM fx_rates WHERE currency = 'USD'"
        ).fetchone()

    assert record_count is not None
    assert record_count[0] == 3
