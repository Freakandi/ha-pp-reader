"""Validate security metric day-change selection uses the market timestamp."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.securities import (
    async_compute_security_metrics,
)


@pytest.mark.asyncio
async def test_previous_close_uses_price_date(hass, tmp_path, monkeypatch):
    """If price date is Friday, previous close resolves to Thursday."""

    class _FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):  # type: ignore[override]
            return datetime(2025, 12, 6, tzinfo=tz or UTC)

    monkeypatch.setattr(
        "custom_components.pp_reader.metrics.securities.datetime", _FixedDatetime
    )

    db_path: Path = tmp_path / "metrics.db"
    initialize_database_schema(db_path)

    friday_ts = int(datetime(2025, 12, 5, 21, 0, 1, tzinfo=UTC).timestamp())

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("pf1", "Main"),
        )
        conn.execute(
            """
            INSERT INTO securities (
                uuid, name, ticker_symbol, currency_code, retired, last_price,
                last_price_date
            )
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            (
                "sec1",
                "Sample",
                "SMP",
                "EUR",
                int(round(95.0 * 1e8)),
                friday_ts,
            ),
        )
        conn.execute(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                security_currency_total,
                account_currency_total,
                current_value
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("pf1", "sec1", 1.0, 9_000, None, None, 9_500),
        )
        conn.executemany(
            """
            INSERT INTO historical_prices (security_uuid, date, close)
            VALUES (?, ?, ?)
            """,
            [
                ("sec1", 20251205, int(round(95.0 * 1e8))),  # Friday close
                ("sec1", 20251204, int(round(90.0 * 1e8))),  # Thursday close
            ],
        )
        conn.commit()

    records = await async_compute_security_metrics(hass, db_path, "run-weekend")
    record = next(r for r in records if r.security_uuid == "sec1")

    assert record.day_change_native == pytest.approx(5.0)
    assert record.day_change_eur == pytest.approx(5.0)
    assert record.day_change_pct == pytest.approx(5.56, rel=0, abs=1e-2)
