"""Tests for the canonical diagnostics dump helper."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import (
    AccountMetricRecord,
    MetricRunMetadata,
    PortfolioMetricRecord,
    upsert_account_metrics,
    upsert_metric_run_metadata,
    upsert_portfolio_metrics,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.normalization_pipeline import (
    AccountSnapshot,
    NormalizationResult,
    PortfolioSnapshot,
    serialize_account_snapshot,
    serialize_portfolio_snapshot,
)
from custom_components.pp_reader.data.snapshot_writer import (
    persist_normalization_result,
)
from scripts import diagnostics_dump


@pytest.mark.asyncio
async def test_async_collect_canonical_diagnostics_reports_missing(
    tmp_path: Path,
) -> None:
    """Missing SQLite files should surface the `missing` status."""
    missing_path = tmp_path / "does-not-exist.db"
    summary = await diagnostics_dump.async_collect_canonical_diagnostics(missing_path)

    assert summary["snapshots"]["status"] == "missing"
    assert summary["metrics"]["status"] == "missing"


@pytest.mark.asyncio
async def test_async_collect_canonical_diagnostics_returns_preview(
    tmp_path: Path,
) -> None:
    """Snapshot + metric previews should reflect persisted canonical tables."""
    db_path = tmp_path / "diag.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("acct-1", "Cash EUR", "EUR"),
        )
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("port-1", "Main Depot"),
        )
        conn.commit()
    finally:
        conn.close()

    run_uuid = "run-preview"
    metric_run = MetricRunMetadata(
        run_uuid=run_uuid,
        status="completed",
        trigger="tests",
        started_at="2024-04-01T12:00:00Z",
        finished_at="2024-04-01T12:05:00Z",
        processed_accounts=1,
        processed_portfolios=1,
    )
    upsert_metric_run_metadata(db_path, metric_run)

    account_snapshot = AccountSnapshot(
        uuid="acct-1",
        name="Cash EUR",
        currency_code="EUR",
        orig_balance=1000.0,
        balance=1000.0,
    )
    portfolio_snapshot = PortfolioSnapshot(
        uuid="port-1",
        name="Main Depot",
        current_value=1500.0,
        purchase_value=1000.0,
        position_count=2,
        missing_value_positions=0,
        performance={"gain_abs": 500.0, "gain_pct": 50.0},
        day_change_abs=None,
        day_change_pct=None,
    )
    result = NormalizationResult(
        generated_at="2024-04-01T12:05:00Z",
        metric_run_uuid=run_uuid,
        accounts=(account_snapshot,),
        portfolios=(portfolio_snapshot,),
    )
    persist_normalization_result(
        db_path,
        result,
        account_serializer=serialize_account_snapshot,
        portfolio_serializer=serialize_portfolio_snapshot,
    )

    upsert_account_metrics(
        db_path,
        [
            AccountMetricRecord(
                metric_run_uuid=run_uuid,
                account_uuid="acct-1",
                currency_code="EUR",
                balance_native_cents=100_000,
                balance_eur_cents=100_000,
                coverage_ratio=1.0,
            )
        ],
    )
    upsert_portfolio_metrics(
        db_path,
        [
            PortfolioMetricRecord(
                metric_run_uuid=run_uuid,
                portfolio_uuid="port-1",
                current_value_cents=150_000,
                purchase_value_cents=100_000,
                gain_abs_cents=50_000,
                gain_pct=50.0,
                coverage_ratio=1.0,
                position_count=2,
                missing_value_positions=0,
            )
        ],
    )

    summary = await diagnostics_dump.async_collect_canonical_diagnostics(
        db_path,
        preview_limit=1,
    )

    snapshot_section = summary["snapshots"]
    assert snapshot_section["status"] == "ok"
    assert snapshot_section["metric_run_uuid"] == run_uuid
    table_accounts = snapshot_section["table_stats"]["accounts"]
    assert table_accounts["total"] == 1
    assert table_accounts["preview"][0]["uuid"] == "acct-1"
    payload_preview = snapshot_section["payload_preview"]["portfolios"]
    assert payload_preview[0]["uuid"] == "port-1"

    metric_section = summary["metrics"]
    assert metric_section["status"] == "ok"
    assert metric_section["run"]["run_uuid"] == run_uuid
    assert metric_section["preview"]["portfolios"][0]["portfolio_uuid"] == "port-1"
