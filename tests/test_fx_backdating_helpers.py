"""FX helper tests for backdating schedules and coverage."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.currencies import fx as fx_module
from custom_components.pp_reader.data.db_access import load_fx_rates_for_date
from custom_components.pp_reader.data.db_init import initialize_database_schema


class MockNetwork:
    """Mock the network integration."""

    @property
    def adapters(self):
        return []


def test_discover_currency_date_bounds_parses_mixed_dates(tmp_path):
    """Currency bounds should normalize ISO and YYYYMMDD date formats."""
    db_path = tmp_path / "fx_bounds.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, currency_code, date)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("tx-eur", 1, "EUR", "2024-01-01"),
                ("tx-usd-1", 1, "usd", "2024-01-02"),
                ("tx-usd-2", 1, "USD", 20240105),
                ("tx-gbp", 1, "GBP", "2024-02-01T12:30:00Z"),
                ("tx-empty", 1, "", "2024-03-01"),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    bounds = fx_module.discover_currency_date_bounds(db_path)
    assert bounds == {
        "USD": (date(2024, 1, 2), date(2024, 1, 5)),
        "GBP": (date(2024, 2, 1), date(2024, 2, 1)),
    }


@pytest.mark.asyncio
async def test_async_ensure_exchange_rates_for_schedule_uses_range_queries(
    hass, tmp_path, monkeypatch
):
    """Schedule-based fetch should use range queries per currency."""
    db_path = tmp_path / "fx_schedule.db"
    initialize_database_schema(db_path)

    schedule = {
        date(2024, 1, 2): {"USD", "GBP"},
        date(2024, 1, 3): {"USD"},
    }

    calls: list[tuple[str, str, str]] = []

    async def _fake_fetch_range(
        session: object, currency: str, start_date: str, end_date: str
    ) -> dict[str, float]:
        calls.append((currency, start_date, end_date))
        rates: dict[str, float] = {}
        if currency == "GBP":
            if start_date == "2024-01-02" and end_date == "2024-01-02":
                rates["2024-01-02"] = 1.0
        elif currency == "USD":
            if start_date == "2024-01-02" and end_date == "2024-01-03":
                rates["2024-01-02"] = 2.0
                rates["2024-01-03"] = 1.0  # Mimic old test's expectation
        return rates

    monkeypatch.setattr(
        fx_module, "_fetch_exchange_rates_range_aiohttp", _fake_fetch_range, raising=True
    )

    coverage = await fx_module.async_ensure_exchange_rates_for_schedule(
        hass,
        db_path,
        schedule,
    )

    # Sort calls for deterministic testing
    sorted_calls = sorted(calls)
    assert sorted_calls == [
        ("GBP", "2024-01-02", "2024-01-02"),
        ("USD", "2024-01-02", "2024-01-03"),
    ]

    assert coverage == {
        "2024-01-02": 1.0,
        "2024-01-03": 1.0,
    }

    rates_d2 = load_fx_rates_for_date(db_path, "2024-01-02")
    assert {(rec.currency, rec.rate) for rec in rates_d2} == {
        ("GBP", 1.0),
        ("USD", 2.0),
    }

    rates_d3 = load_fx_rates_for_date(db_path, "2024-01-03")
    assert {(rec.currency, rec.rate) for rec in rates_d3} == {("USD", 1.0)}


@pytest.mark.asyncio
async def test_async_prepare_exchange_rates_for_backdating_uses_bounds(
    hass, tmp_path, monkeypatch
):
    """End-to-end helper should derive bounds and ensure per-day coverage."""
    db_path = tmp_path / "fx_backdating.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, currency_code, date)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("tx-1", 1, "USD", "2024-01-02"),
                ("tx-2", 1, "USD", "2024-01-05"),
                ("tx-3", 1, "GBP", "2024-01-04"),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    async def _fake_fetch(
        date_str: str, currencies: set[str], **_: object
    ) -> dict[str, float]:
        return dict.fromkeys(currencies, 1.0)

    monkeypatch.setattr(
        fx_module, "_fetch_exchange_rates_with_retry", _fake_fetch, raising=True
    )

    coverage = await fx_module.async_prepare_exchange_rates_for_backdating(
        hass,
        db_path,
        until=date(2024, 1, 5),
    )

    assert coverage["2024-01-02"] == 1.0
    assert coverage["2024-01-03"] == 1.0
    assert coverage["2024-01-04"] == 1.0
    assert coverage["2024-01-05"] == 1.0
