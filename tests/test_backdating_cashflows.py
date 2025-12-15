"""Cashflow bucket derivation tests for backdating."""

from __future__ import annotations

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.backdating.cashflows import (
    _compute_daily_cashflows_sync,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_cashflow_buckets_with_internal_transfer_and_fx(tmp_path):
    """Cashflow buckets should exclude internal transfers and apply FX when available."""
    db_path = tmp_path / "cashflows.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            "INSERT INTO accounts (uuid, name, currency_code, is_retired) VALUES (?, ?, ?, ?)",
            [
                ("acct-eur", "EUR Cash", "EUR", 0),
                ("acct-usd", "USD Cash", "USD", 0),
            ],
        )
        conn.executemany(
            """
            INSERT INTO transactions (
                uuid, type, account, other_account, date, amount, currency_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("tx-div", 9, "acct-eur", None, "2024-01-02", 500, "EUR"),
                ("tx-int", 8, "acct-usd", None, "2024-01-02", 1000, "USD"),
                ("tx-fee", 13, "acct-eur", None, "2024-01-03", 200, "EUR"),
                ("tx-tax", 11, "acct-usd", None, "2024-01-03", 300, "USD"),
                ("tx-dep", 6, "acct-usd", None, "2024-01-03", 1000, "USD"),
                ("tx-wd", 7, "acct-eur", None, "2024-01-03", 800, "EUR"),
                (
                    "tx-int-transfer",
                    5,
                    "acct-eur",
                    "acct-usd",
                    "2024-01-03",
                    1000,
                    "EUR",
                ),
            ],
        )
        conn.executemany(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            [
                ("2024-01-02", "USD", 2.0),
                ("2024-01-03", "USD", 2.0),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    snapshots = _compute_daily_cashflows_sync(
        db_path,
        date(2024, 1, 2),
        date(2024, 1, 3),
    )

    day1 = snapshots[0]
    assert day1.date == "2024-01-02"
    assert day1.dividends_eur == 5.0
    assert day1.interest_eur == pytest.approx(5.0)  # 1000 cents / 2.0
    assert day1.fees_eur == 0.0
    assert day1.taxes_eur == 0.0
    assert day1.fx_coverage_ratio == 1.0

    day2 = snapshots[1]
    assert day2.date == "2024-01-03"
    assert day2.fees_eur == 2.0
    assert day2.taxes_eur == pytest.approx(1.5)
    assert day2.inbound_transfers_eur == pytest.approx(5.0)  # 1000 cents / 2.0
    assert day2.outbound_transfers_eur == 8.0
    # Internal transfer should be excluded from totals
    assert day2.fx_coverage_ratio == 1.0


@pytest.mark.asyncio
async def test_cashflow_missing_fx_lowers_coverage_and_skips_values(tmp_path):
    """Missing FX should reduce coverage and omit non-EUR amounts."""
    db_path = tmp_path / "cashflows_missing_fx.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            "INSERT INTO accounts (uuid, name, currency_code, is_retired) VALUES (?, ?, ?, ?)",
            [
                ("acct-eur", "EUR Cash", "EUR", 0),
                ("acct-gbp", "GBP Cash", "GBP", 0),
            ],
        )
        conn.executemany(
            """
            INSERT INTO transactions (uuid, type, account, date, amount, currency_code)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("tx1", 4, "acct-gbp", "2024-02-01", 1000, "GBP"),
                ("tx2", 4, "acct-eur", "2024-02-01", 2000, "EUR"),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    snapshots = _compute_daily_cashflows_sync(
        db_path,
        date(2024, 2, 1),
        date(2024, 2, 1),
    )

    day1 = snapshots[0]
    # GBP dividend excluded due to missing FX, EUR included
    assert day1.dividends_eur == 20.0
    assert day1.fx_coverage_ratio == 0.0
