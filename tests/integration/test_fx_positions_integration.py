"""Integration test covering FX backfill to positions with native + EUR averages."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data import canonical_sync
from custom_components.pp_reader.data.backfill_fx_tx import (
    backfill_ingestion_transactions,
)
from custom_components.pp_reader.data.db_access import Security, get_securities
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.normalization_pipeline import (
    _load_position_snapshots,
)
from custom_components.pp_reader.metrics import securities as metric_securities


def _insert_fx_rate(
    conn: sqlite3.Connection, *, date: str, currency: str, rate: float
) -> None:
    conn.execute(
        """
        INSERT INTO fx_rates (date, currency, rate)
        VALUES (?, ?, ?)
        """,
        (date, currency, rate),
    )


def _insert_security(
    conn: sqlite3.Connection, *, uuid: str, name: str, currency: str
) -> None:
    conn.execute(
        """
        INSERT INTO securities (uuid, name, currency_code)
        VALUES (?, ?, ?)
        """,
        (uuid, name, currency),
    )


def _insert_ingestion_tx(
    conn: sqlite3.Connection,
    *,
    uuid: str,
    portfolio: str,
    security: str,
    currency: str,
    amount: int,
    shares: int,
    date: str,
) -> None:
    conn.execute(
        """
        INSERT INTO ingestion_transactions (
            uuid, portfolio, security, type, currency_code, amount, amount_eur_cents,
            shares, date
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        """,
        (uuid, portfolio, security, 2, currency, amount, shares, date),
    )


def test_fx_backfill_flows_into_positions(tmp_path: Path) -> None:
    """Backfilled EUR amounts should surface in normalized positions with native averages."""
    db_path = tmp_path / "fx_positions.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(db_path) as conn:
        # Seed FX for non-EUR purchase.
        _insert_fx_rate(conn, date="2024-02-01", currency="HKD", rate=10.0)

        # Minimal security + transactions (HKD + EUR) for one position.
        _insert_security(conn, uuid="sec-hkd", name="HKD Equity", currency="HKD")
        _insert_ingestion_tx(
            conn,
            uuid="tx-hkd",
            portfolio="port-1",
            security="sec-hkd",
            currency="HKD",
            amount=20_000,  # 200 HKD
            shares=100 * 10**8,
            date="2024-02-01",
        )
        _insert_ingestion_tx(
            conn,
            uuid="tx-eur",
            portfolio="port-1",
            security="sec-hkd",
            currency="EUR",
            amount=10_000,  # 100 EUR
            shares=50 * 10**8,
            date="2024-02-02",
        )
        conn.commit()

    # Fill missing EUR amounts.
    summary = backfill_ingestion_transactions(db_path)
    assert summary["updated"] == 2
    assert summary["processed"] == 2

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rate_row = conn.execute(
            "SELECT rate FROM fx_rates WHERE currency='HKD' AND date='2024-02-01'"
        ).fetchone()
        assert rate_row is not None and rate_row[0] == 10.0
        rows = conn.execute(
            """
            SELECT amount_eur_cents
            FROM ingestion_transactions
            ORDER BY date
            """
        ).fetchall()
        assert [tuple(row) for row in rows] == [(2000,), (10000,)]
        canonical_sync._sync_portfolio_securities(conn, db_path)

    # Compute security metrics using precomputed EUR purchase totals.
    metric_records = metric_securities._compute_security_metrics_sync(  # type: ignore[attr-defined]
        db_path=db_path,
        run_uuid="run-1",
    )
    assert metric_records, "expected at least one metric record"

    # Build position snapshots from metrics to validate average_cost payloads.
    securities_map = get_securities(db_path)
    assert isinstance(securities_map.get("sec-hkd"), Security)
    positions = list(
        _load_position_snapshots(
            db_path=db_path,
            portfolio_uuid="port-1",
            metric_rows=metric_records,
            securities=securities_map,
        )
    )
    assert positions, "expected at least one position snapshot"

    position = positions[0]
    assert position.purchase_value == pytest.approx(120.0)
    assert position.average_cost["eur"] == pytest.approx(120.0 / 150)
    assert position.average_cost["account"] == pytest.approx(300.0 / 150)
    assert position.average_cost["security"] == pytest.approx(1200.0 / 150)
    assert position.aggregation["purchase_total_account"] == pytest.approx(300.0)
    assert position.aggregation["purchase_total_security"] == pytest.approx(1200.0)
