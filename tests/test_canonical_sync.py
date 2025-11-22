from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data import canonical_sync
from custom_components.pp_reader.data.canonical_sync import _lookup_fx_rate


def test_lookup_fx_rate_falls_back_to_available_future_rate(tmp_path: Path) -> None:
    """Return the earliest available FX rate when no historical match exists."""
    db_path = tmp_path / "fx.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            CREATE TABLE fx_rates (
                date TEXT,
                currency TEXT,
                rate REAL,
                fetched_at TEXT,
                data_source TEXT,
                provider TEXT,
                provenance TEXT
            )
            """
        )
        conn.execute(
            """
            INSERT INTO fx_rates (date, currency, rate)
            VALUES ('2025-11-22', 'JPY', 180.56)
            """
        )
        conn.commit()

        rate = _lookup_fx_rate(conn, "JPY", "2025-09-09T00:00:00+00:00")
        assert rate == 180.56
    finally:
        conn.close()


def test_sync_portfolio_securities_preserves_native_totals_without_fx(
    tmp_path: Path,
) -> None:
    """Ensure native purchase totals remain even if no FX rate is available."""
    db_path = tmp_path / "native.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            CREATE TABLE ingestion_transactions (
                portfolio TEXT,
                security TEXT,
                type INTEGER,
                currency_code TEXT,
                amount INTEGER,
                amount_eur_cents INTEGER,
                shares INTEGER,
                date TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE fx_rates (
                date TEXT,
                currency TEXT,
                rate REAL,
                fetched_at TEXT,
                data_source TEXT,
                provider TEXT,
                provenance TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE portfolio_securities (
                portfolio_uuid TEXT,
                security_uuid TEXT,
                current_holdings INTEGER,
                purchase_value INTEGER,
                avg_price_native REAL,
                avg_price_security REAL,
                avg_price_account REAL,
                security_currency_total REAL,
                account_currency_total REAL,
                current_value INTEGER
            )
            """
        )

        conn.execute(
            """
            INSERT INTO ingestion_transactions (
                portfolio, security, type, currency_code, amount, shares, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "p-1",
                "s-1",
                2,  # PURCHASE
                "HKD",
                10_000,  # cents in native currency
                100,  # shares
                "2024-01-01",
            ),
        )
        conn.commit()

        canonical_sync._sync_portfolio_securities(conn, db_path)

        row = conn.execute("SELECT * FROM portfolio_securities").fetchone()
        assert row is not None
        assert row["purchase_value"] == 0  # EUR value unknown without FX
        assert row["security_currency_total"] > 0
        assert row["account_currency_total"] > 0
    finally:
        conn.close()


def test_sync_portfolio_securities_uses_stored_eur_amounts(tmp_path: Path) -> None:
    """Aggregate EUR purchase totals from staged transactions without FX lookups."""
    db_path = tmp_path / "stored_eur.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            CREATE TABLE ingestion_transactions (
                portfolio TEXT,
                security TEXT,
                type INTEGER,
                currency_code TEXT,
                amount INTEGER,
                amount_eur_cents INTEGER,
                shares INTEGER,
                date TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE portfolio_securities (
                portfolio_uuid TEXT,
                security_uuid TEXT,
                current_holdings INTEGER,
                purchase_value INTEGER,
                avg_price_native REAL,
                avg_price_security REAL,
                avg_price_account REAL,
                security_currency_total REAL,
                account_currency_total REAL,
                current_value INTEGER
            )
            """
        )

        # Two purchases (USD and EUR) with precomputed EUR totals.
        conn.executemany(
            """
            INSERT INTO ingestion_transactions (
                portfolio, security, type, currency_code, amount, amount_eur_cents,
                shares, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "p-1",
                    "s-1",
                    2,  # PURCHASE
                    "USD",
                    20_000,  # cents native
                    18_000,  # EUR cents precomputed
                    100,
                    "2024-02-01",
                ),
                (
                    "p-1",
                    "s-1",
                    2,
                    "EUR",
                    10_000,
                    10_000,
                    50,
                    "2024-02-02",
                ),
            ],
        )
        conn.commit()

        canonical_sync._sync_portfolio_securities(conn, db_path)

        row = conn.execute("SELECT * FROM portfolio_securities").fetchone()
        assert row is not None
        assert row["current_holdings"] == 150
        assert row["purchase_value"] == 28_000
        assert row["security_currency_total"] == pytest.approx(300.0)
        assert row["account_currency_total"] == pytest.approx(300.0)
        assert row["avg_price_security"] == pytest.approx(2.0)
        assert row["avg_price_account"] == pytest.approx(2.0)
    finally:
        conn.close()
