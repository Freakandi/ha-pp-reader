"""Integration-like tests for transaction FX backfill."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data.backfill_fx_tx import (
    backfill_ingestion_transactions,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


def _insert_transaction(
    conn: sqlite3.Connection,
    *,
    uuid: str,
    currency: str,
    amount: int,
    date: str,
) -> None:
    conn.execute(
        """
        INSERT INTO ingestion_transactions (
            uuid, type, date, currency_code, amount
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (uuid, 0, date, currency, amount),
    )


def _insert_fx_rate(
    conn: sqlite3.Connection,
    *,
    date: str,
    currency: str,
    rate: float,
) -> None:
    conn.execute(
        """
        INSERT INTO fx_rates (date, currency, rate)
        VALUES (?, ?, ?)
        """,
        (date, currency, rate),
    )


def test_backfill_populates_eur_amount(tmp_path: Path) -> None:
    """Populates EUR cents when FX is present."""
    db_path = tmp_path / "backfill.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(db_path) as conn:
        _insert_fx_rate(conn, date="2024-01-01", currency="USD", rate=1.1)
        _insert_transaction(
            conn,
            uuid="tx-1",
            currency="USD",
            amount=110_00,
            date="2024-01-01",
        )
        conn.commit()

    summary = backfill_ingestion_transactions(db_path)
    assert summary["updated"] == 1
    assert summary["processed"] == 1
    assert summary["skipped"] == 0

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT amount, amount_eur_cents
            FROM ingestion_transactions
            WHERE uuid = ?
            """,
            ("tx-1",),
        ).fetchone()
    assert row == (11000, 10000)


def test_backfill_skips_missing_rate(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Leaves EUR amount NULL when no FX rate exists and logs once."""
    db_path = tmp_path / "missing.db"
    initialize_database_schema(db_path)

    # Avoid real FX fetching during test.
    monkeypatch.setattr(
        "custom_components.pp_reader.data.backfill_fx_tx.ensure_exchange_rates_for_dates_sync",
        lambda dates, currencies, db_path: None,
    )

    with sqlite3.connect(db_path) as conn:
        _insert_transaction(
            conn,
            uuid="tx-2",
            currency="JPY",
            amount=1_000,
            date=datetime(2024, 1, 1, tzinfo=UTC).isoformat(),
        )
        conn.commit()

    summary = backfill_ingestion_transactions(db_path)
    assert summary["updated"] == 0
    assert summary["skipped"] == 1

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT amount_eur_cents
            FROM ingestion_transactions
            WHERE uuid = ?
            """,
            ("tx-2",),
        ).fetchone()
    assert row == (None,)
