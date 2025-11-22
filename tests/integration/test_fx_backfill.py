"""Integration-like test for FX backfill filling missing dates."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.data.canonical_sync import _lookup_fx_rate
from custom_components.pp_reader.data.db_access import FxRateRecord
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.fx_backfill import backfill_fx
from custom_components.pp_reader.util import fx as fx_util


def _insert_ingestion_transaction(conn: sqlite3.Connection, currency: str, tx_date: str) -> None:
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
async def test_backfill_fills_missing_fx_and_lookup_uses_nearest(tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch) -> None:
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

    monkeypatch.setattr(fx_util, "fetch_fx_range", _fake_fetch_fx_range)

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
