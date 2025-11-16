"""Regression tests for persisting normalization snapshots into SQLite."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data import snapshot_writer
from custom_components.pp_reader.data.db_schema import ALL_SCHEMAS
from custom_components.pp_reader.data.normalization_pipeline import (
    AccountSnapshot,
    NormalizationResult,
    PortfolioSnapshot,
    SnapshotDataState,
    serialize_account_snapshot,
    serialize_portfolio_snapshot,
)
from custom_components.pp_reader.data.snapshot_writer import (
    persist_normalization_result,
)


def _init_db(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        for ddl in ALL_SCHEMAS:
            conn.execute(ddl)
        conn.commit()
    finally:
        conn.close()


def _fetch_all(conn: sqlite3.Connection, table: str) -> list[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(f"SELECT * FROM {table}")
    return cursor.fetchall()


def _seed_entities(
    db_path: Path,
    account_uuid: str,
    portfolio_uuid: str,
    run_uuid: str,
) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            (account_uuid, "Test Account", "EUR"),
        )
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            (portfolio_uuid, "Test Portfolio"),
        )
        conn.execute(
            """
            INSERT INTO metric_runs (
                run_uuid,
                status,
                trigger,
                started_at,
                finished_at,
                duration_ms,
                total_entities,
                processed_portfolios,
                processed_accounts,
                processed_securities,
                error_message,
                provenance,
                created_at,
                updated_at
            ) VALUES (?, 'completed', NULL, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
            """,
            (
                run_uuid,
                "2024-03-01T00:00:00Z",
                "2024-03-01T00:00:00Z",
                "2024-03-01T00:00:00Z",
                "2024-03-01T00:00:00Z",
            ),
        )
        conn.commit()
    finally:
        conn.close()


def test_persist_normalization_result_writes_account_and_portfolio_rows(
    tmp_path: Path,
) -> None:
    """Ensure snapshot persistence writes canonical payloads into SQLite."""
    db_path = tmp_path / "snapshots.db"
    _init_db(db_path)
    _seed_entities(db_path, "acct-1", "portfolio-1", "run-1")

    account = AccountSnapshot(
        uuid="acct-1",
        name="Cash Depot",
        currency_code="EUR",
        orig_balance=1234.5,
        balance=1200.0,
        fx_rate=1.0,
        fx_rate_source="ecb",
        coverage_ratio=0.95,
        provenance="metrics",
    )
    portfolio = PortfolioSnapshot(
        uuid="portfolio-1",
        name="Alpha",
        current_value=5000.0,
        purchase_value=3200.0,
        position_count=3,
        missing_value_positions=1,
        performance={
            "gain_abs": 1800.0,
            "gain_pct": 56.25,
            "total_change_eur": 1800.0,
            "total_change_pct": 56.25,
            "source": "metrics",
            "coverage_ratio": 0.85,
            "provenance": "metrics",
        },
        coverage_ratio=0.85,
        provenance="metrics",
        metric_run_uuid="run-1",
        positions=(),
        data_state=SnapshotDataState(status="error", message="missing"),
    )
    result = NormalizationResult(
        generated_at="2024-03-01T00:00:00Z",
        metric_run_uuid="run-1",
        accounts=(account,),
        portfolios=(portfolio,),
        diagnostics={"fx": []},
    )

    assert persist_normalization_result(
        db_path,
        result,
        account_serializer=serialize_account_snapshot,
        portfolio_serializer=serialize_portfolio_snapshot,
    )

    conn = sqlite3.connect(str(db_path))
    try:
        account_rows = _fetch_all(conn, "account_snapshots")
        portfolio_rows = _fetch_all(conn, "portfolio_snapshots")
    finally:
        conn.close()

    assert len(account_rows) == 1
    assert len(portfolio_rows) == 1

    account_row = account_rows[0]
    assert account_row["account_uuid"] == "acct-1"
    assert account_row["orig_balance"] == pytest.approx(1234.5)
    assert account_row["balance"] == pytest.approx(1200.0)
    payload = json.loads(account_row["payload"])
    assert payload["uuid"] == "acct-1"
    assert payload["fx_rate_source"] == "ecb"

    portfolio_row = portfolio_rows[0]
    assert portfolio_row["portfolio_uuid"] == "portfolio-1"
    assert portfolio_row["missing_value_positions"] == 1
    assert portfolio_row["has_current_value"] == 0
    assert portfolio_row["performance_source"] == "metrics"
    portfolio_payload = json.loads(portfolio_row["payload"])
    assert portfolio_payload["performance"]["gain_abs"] == pytest.approx(1800.0)
    assert portfolio_payload["data_state"]["status"] == "error"


def test_persist_normalization_result_updates_existing_entries(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify ON CONFLICT updates rows for repeated runs."""
    db_path = tmp_path / "snapshots.db"
    _init_db(db_path)
    _seed_entities(db_path, "acct-1", "portfolio-1", "run-2")

    timestamps = iter(
        [
            "2024-03-01T00:00:00Z",
            "2024-03-01T01:00:00Z",
            "2024-03-02T00:00:00Z",
            "2024-03-02T01:00:00Z",
        ]
    )
    monkeypatch.setattr(
        snapshot_writer,
        "_utc_now_isoformat",
        lambda: next(timestamps),
    )

    account = AccountSnapshot(
        uuid="acct-1",
        name="Cash Depot",
        currency_code="EUR",
        orig_balance=1000.0,
        balance=900.0,
    )
    portfolio = PortfolioSnapshot(
        uuid="portfolio-1",
        name="Alpha",
        current_value=5000.0,
        purchase_value=4500.0,
        position_count=2,
        missing_value_positions=0,
        performance={
            "gain_abs": 500.0,
            "gain_pct": 11.11,
            "total_change_eur": 500.0,
            "total_change_pct": 11.11,
            "source": "metrics",
        },
    )

    result_v1 = NormalizationResult(
        generated_at="2024-03-01T10:00:00Z",
        metric_run_uuid="run-2",
        accounts=(account,),
        portfolios=(portfolio,),
    )
    persist_normalization_result(
        db_path,
        result_v1,
        account_serializer=serialize_account_snapshot,
        portfolio_serializer=serialize_portfolio_snapshot,
    )

    updated_account = AccountSnapshot(
        uuid="acct-1",
        name="Cash Depot",
        currency_code="EUR",
        orig_balance=1100.0,
        balance=1050.0,
    )
    updated_portfolio = PortfolioSnapshot(
        uuid="portfolio-1",
        name="Alpha",
        current_value=6200.0,
        purchase_value=4500.0,
        position_count=2,
        missing_value_positions=0,
        performance={
            "gain_abs": 1700.0,
            "gain_pct": 37.77,
            "total_change_eur": 1700.0,
            "total_change_pct": 37.77,
            "source": "metrics",
        },
    )
    result_v2 = NormalizationResult(
        generated_at="2024-03-02T10:00:00Z",
        metric_run_uuid="run-2",
        accounts=(updated_account,),
        portfolios=(updated_portfolio,),
    )
    persist_normalization_result(
        db_path,
        result_v2,
        account_serializer=serialize_account_snapshot,
        portfolio_serializer=serialize_portfolio_snapshot,
    )

    conn = sqlite3.connect(str(db_path))
    try:
        conn.row_factory = sqlite3.Row
        account_row = conn.execute(
            "SELECT orig_balance, balance FROM account_snapshots WHERE account_uuid=?",
            ("acct-1",),
        ).fetchone()
        portfolio_row = conn.execute(
            "SELECT current_value, gain_abs FROM portfolio_snapshots WHERE portfolio_uuid=?",
            ("portfolio-1",),
        ).fetchone()
    finally:
        conn.close()

    assert account_row["orig_balance"] == pytest.approx(1100.0)
    assert account_row["balance"] == pytest.approx(1050.0)
    assert portfolio_row["current_value"] == pytest.approx(6200.0)
    assert portfolio_row["gain_abs"] == pytest.approx(1700.0)


def test_persist_normalization_result_skips_without_run_uuid(
    tmp_path: Path,
) -> None:
    """Ensure persistence exits early when the metric run is missing."""
    db_path = tmp_path / "snapshots.db"
    _init_db(db_path)

    result = NormalizationResult(
        generated_at="2024-03-01T12:00:00Z",
        metric_run_uuid=None,
        accounts=(),
        portfolios=(),
    )
    assert (
        persist_normalization_result(
            db_path,
            result,
            account_serializer=serialize_account_snapshot,
            portfolio_serializer=serialize_portfolio_snapshot,
        )
        is False
    )

    conn = sqlite3.connect(str(db_path))
    try:
        account_rows = _fetch_all(conn, "account_snapshots")
        portfolio_rows = _fetch_all(conn, "portfolio_snapshots")
    finally:
        conn.close()

    assert account_rows == []
    assert portfolio_rows == []
