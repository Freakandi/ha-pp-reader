"""Tests covering Frankfurter FX async helpers."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.currencies import fx
from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    load_fx_rates_for_date,
    upsert_fx_rate,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_fetch_exchange_rates_with_retry_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure retries stop once data is returned."""
    attempts: list[int] = []

    async def _fake_fetch(date: str, currencies: set[str]) -> dict[str, float]:
        attempts.append(1)
        if len(attempts) == 1:
            return {}
        return {"USD": 1.2345}

    monkeypatch.setattr(fx, "_fetch_exchange_rates", _fake_fetch)

    result = await fx._fetch_exchange_rates_with_retry(  # pylint: disable=protected-access
        "2024-03-01",
        {"USD"},
        retries=3,
        initial_delay=0,
    )

    assert result == {"USD": 1.2345}
    assert len(attempts) == 2


@pytest.mark.asyncio
async def test_fetch_exchange_rates_with_retry_exhausts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return empty dict when retries are exhausted."""
    attempts: list[int] = []

    async def _fake_fetch(date: str, currencies: set[str]) -> dict[str, float]:
        attempts.append(1)
        return {}

    monkeypatch.setattr(fx, "_fetch_exchange_rates", _fake_fetch)

    result = await fx._fetch_exchange_rates_with_retry(  # pylint: disable=protected-access
        "2024-03-01",
        {"USD"},
        retries=2,
        initial_delay=0,
    )

    assert result == {}
    assert len(attempts) == 2


@pytest.mark.asyncio
async def test_ensure_exchange_rates_persists_metadata(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Rates fetched via ensure_exchange_rates_for_dates persist with provenance."""
    db_path = tmp_path / "fx_meta.db"
    initialize_database_schema(db_path)

    async def _fake_fetch(
        date: str,
        currencies: set[str],
        *,
        retries: int,
        initial_delay: float,
    ) -> dict[str, float]:
        assert date == "2024-03-05"
        assert currencies == {"USD"}
        assert retries == fx.FETCH_RETRIES
        assert initial_delay == fx.FETCH_BACKOFF_SECONDS
        return {"USD": 1.1111}

    monkeypatch.setattr(fx, "_fetch_exchange_rates_with_retry", _fake_fetch)

    await fx.ensure_exchange_rates_for_dates(
        [datetime(2024, 3, 5, tzinfo=UTC)],
        {"USD"},
        db_path,
    )

    stored = load_fx_rates_for_date(db_path, "2024-03-05")
    assert len(stored) == 1
    record = stored[0]
    assert record.currency == "USD"
    assert float(record.rate) == pytest.approx(1.1111)
    assert record.data_source == fx.FRANKFURTER_SOURCE
    assert record.provider == fx.FRANKFURTER_PROVIDER
    assert record.provenance and "currencies" in record.provenance


def test_discover_active_currencies(tmp_path: Path) -> None:
    """Detect active non-EUR currencies across accounts and securities."""
    db_path = tmp_path / "currencies.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("sec-usd", "USD Sec", "usd"),
        )
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("acct-chf", "CHF Account", " CHF "),
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("sec-eur", "EUR Sec", "EUR"),
        )
        conn.commit()

    discovered = fx.discover_active_currencies(db_path)
    assert discovered == {"USD", "CHF"}



def test_load_cached_rate_records_sync(tmp_path):
    db_path = tmp_path / "fx_cached.db"
    initialize_database_schema(db_path)

    record = FxRateRecord(
        date="2024-03-01",
        currency="USD",
        rate=1.2345,
        fetched_at="2024-03-01T10:00:00Z",
        data_source="frankfurter",
        provider="frankfurter.app",
        provenance='{"currencies":["USD"]}',
    )
    upsert_fx_rate(db_path, record)

    records = fx.load_cached_rate_records_sync(datetime(2024, 3, 1, tzinfo=UTC), db_path)
    assert "USD" in records
    cached = records["USD"]
    assert cached.fetched_at == "2024-03-01T10:00:00Z"
    assert cached.rate == 1.2345
    assert cached.data_source == "frankfurter"
