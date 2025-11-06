"""Utility helpers for metrics engine tests using datamodel-aligned fixtures."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.db_access import FxRateRecord
from custom_components.pp_reader.data.db_init import initialize_database_schema

FX_TEST_RATE = 1.25
FX_TEST_SOURCE = "metrics-test"


def seed_metrics_database(db_path: Path) -> None:
    """Initialise the database with metric-ready sample data."""
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT INTO portfolios (uuid, name)
            VALUES (?, ?)
            """,
            [
                ("portfolio-main", "Main Depot"),
                ("portfolio-empty", "Leerstand Depot"),
            ],
        )
        conn.executemany(
            """
            INSERT INTO accounts (
                uuid,
                name,
                currency_code,
                note,
                is_retired,
                updated_at,
                balance
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("acct-eur", "Bar EUR", "EUR", None, 0, None, 125_000),
                ("acct-usd", "Cash USD", "USD", None, 0, None, 200_000),
                ("acct-gbp", "Cash GBP", "GBP", None, 0, None, 150_000),
            ],
        )
        conn.executemany(
            """
            INSERT INTO securities (
                uuid,
                name,
                ticker_symbol,
                currency_code,
                retired,
                last_price,
                last_price_date
            )
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            [
                (
                    "sec-eur",
                    "Euro Equity",
                    "EUEQ",
                    "EUR",
                    int(round(105.25 * 1e8)),
                    1_696_601_600,
                ),
                (
                    "sec-usd",
                    "US Tech",
                    "USTK",
                    "USD",
                    int(round(100.00 * 1e8)),
                    1_696_601_600,
                ),
            ],
        )
        conn.executemany(
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
            [
                (
                    "portfolio-main",
                    "sec-eur",
                    5.0,
                    200_000,
                    None,
                    None,
                    250_000,
                ),
                (
                    "portfolio-main",
                    "sec-usd",
                    2.0,
                    100_000,
                    int(round(95.0 * 1e8)),
                    None,
                    150_000,
                ),
            ],
        )
        conn.executemany(
            """
            INSERT INTO historical_prices (security_uuid, date, close)
            VALUES (?, ?, ?)
            """,
            [
                ("sec-usd", 20240101, int(round(95.00 * 1e8))),
            ],
        )
        conn.commit()
    finally:
        conn.close()


def install_fx_stubs(monkeypatch: Any, *, rate: float = FX_TEST_RATE) -> None:
    """Provide synchronous and asynchronous FX helpers returning deterministic data."""

    def _build_record(reference_date: datetime) -> FxRateRecord:
        date_str = reference_date.astimezone(UTC).strftime("%Y-%m-%d")
        return FxRateRecord(
            date=date_str,
            currency="USD",
            rate=rate,
            fetched_at=f"{date_str}T00:00:00Z",
            data_source=FX_TEST_SOURCE,
            provider=FX_TEST_SOURCE,
            provenance='{"source":"tests"}',
        )

    async def _ensure_async(_dates, _currencies, _db_path) -> None:
        return None

    async def _load_async(reference_date, _db_path):
        return {"USD": _build_record(reference_date)}

    monkeypatch.setattr(
        "custom_components.pp_reader.metrics.accounts.ensure_exchange_rates_for_dates",
        _ensure_async,
    )
    monkeypatch.setattr(
        "custom_components.pp_reader.metrics.accounts.load_cached_rate_records",
        _load_async,
    )

    def _ensure_sync(_dates, _currencies, _db_path) -> None:
        return None

    def _load_sync(reference_date, _db_path):
        return {"USD": _build_record(reference_date)}

    monkeypatch.setattr(
        "custom_components.pp_reader.util.currency.ensure_exchange_rates_for_dates_sync",
        _ensure_sync,
    )
    monkeypatch.setattr(
        "custom_components.pp_reader.util.currency.load_cached_rate_records_sync",
        _load_sync,
    )
