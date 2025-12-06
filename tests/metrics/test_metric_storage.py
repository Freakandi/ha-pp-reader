"""Regression tests for metric storage helpers and batch persistence."""

from __future__ import annotations

import sqlite3
from dataclasses import replace
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import (
    AccountMetricRecord,
    PortfolioMetricRecord,
    SecurityMetricRecord,
    upsert_metric_run_metadata,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.metrics.storage import (
    MetricBatch,
    async_create_metric_run,
    async_store_metric_batch,
    load_latest_metric_batch,
    load_metric_batch,
)
from custom_components.pp_reader.util import async_run_executor_job
from tests.metrics.helpers import seed_metrics_database


@pytest.mark.asyncio
async def test_store_metric_batch_persists_rows(hass, tmp_path: Path) -> None:
    """Persisting a batch must write metrics for all entity types."""
    db_path = tmp_path / "metrics.db"
    seed_metrics_database(db_path)

    run = await async_create_metric_run(
        hass,
        db_path,
        status="running",
        trigger="tests",
    )

    batch = MetricBatch(
        portfolios=(
            PortfolioMetricRecord(
                metric_run_uuid=run.run_uuid,
                portfolio_uuid="portfolio-main",
                current_value_cents=400_000,
                purchase_value_cents=300_000,
                gain_abs_cents=100_000,
                gain_pct=33.33,
                total_change_eur_cents=100_000,
                total_change_pct=33.33,
                coverage_ratio=1.0,
                position_count=2,
                missing_value_positions=0,
                source="metrics",
            ),
        ),
        accounts=(
            AccountMetricRecord(
                metric_run_uuid=run.run_uuid,
                account_uuid="acct-eur",
                currency_code="EUR",
                balance_native_cents=125_000,
                balance_eur_cents=125_000,
                fx_rate=None,
                coverage_ratio=1.0,
                provenance="tests",
            ),
        ),
        securities=(
            SecurityMetricRecord(
                metric_run_uuid=run.run_uuid,
                portfolio_uuid="portfolio-main",
                security_uuid="sec-eur",
                security_currency_code="EUR",
                holdings_raw=int(5 * 1e8),
                current_value_cents=250_000,
                purchase_value_cents=200_000,
                gain_abs_cents=50_000,
                gain_pct=25.0,
                total_change_eur_cents=50_000,
                total_change_pct=25.0,
                source="metrics",
                coverage_ratio=1.0,
                day_change_source="tests",
            ),
        ),
    )

    persisted = await async_store_metric_batch(
        hass,
        db_path,
        run=run,
        batch=batch,
    )
    assert persisted.processed_portfolios == 1
    assert persisted.processed_accounts == 1
    assert persisted.processed_securities == 1

    conn = sqlite3.connect(str(db_path))
    try:
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM portfolio_metrics WHERE metric_run_uuid=?",
                (run.run_uuid,),
            ).fetchone()[0]
            == 1
        )
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM account_metrics WHERE metric_run_uuid=?",
                (run.run_uuid,),
            ).fetchone()[0]
            == 1
        )
        assert (
            conn.execute(
                "SELECT COUNT(*) FROM security_metrics WHERE metric_run_uuid=?",
                (run.run_uuid,),
            ).fetchone()[0]
            == 1
        )
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_load_latest_metric_batch_returns_persisted_rows(
    hass,
    tmp_path: Path,
) -> None:
    """Latest metric batch loader should return metadata and records."""
    db_path = tmp_path / "metrics.db"
    seed_metrics_database(db_path)

    run = await async_create_metric_run(hass, db_path, status="running")
    populated_batch = MetricBatch(
        portfolios=(
            PortfolioMetricRecord(
                metric_run_uuid=run.run_uuid,
                portfolio_uuid="portfolio-main",
                current_value_cents=123_000,
            ),
        ),
        accounts=(
            AccountMetricRecord(
                metric_run_uuid=run.run_uuid,
                account_uuid="acct-eur",
                currency_code="EUR",
                balance_native_cents=10_000,
            ),
        ),
        securities=(
            SecurityMetricRecord(
                metric_run_uuid=run.run_uuid,
                portfolio_uuid="portfolio-main",
                security_uuid="sec-eur",
                security_currency_code="EUR",
            ),
        ),
    )
    persisted = await async_store_metric_batch(
        hass,
        db_path,
        run=run,
        batch=populated_batch,
    )
    completed_run = replace(persisted, status="completed")
    await async_run_executor_job(
        hass,
        upsert_metric_run_metadata,
        db_path,
        completed_run,
    )
    run_uuid = completed_run.run_uuid

    metadata, latest_batch = load_latest_metric_batch(db_path)
    assert metadata is not None
    assert metadata.run_uuid == run_uuid
    assert len(latest_batch.portfolios) == 1
    assert len(latest_batch.accounts) == 1
    assert len(latest_batch.securities) == 1

    missing_metadata, empty_batch = load_metric_batch(db_path, "unknown-run")
    assert missing_metadata is None
    assert empty_batch.portfolios == ()
    assert empty_batch.accounts == ()
    assert empty_batch.securities == ()


def test_load_latest_metric_batch_handles_empty_db(tmp_path: Path) -> None:
    """Loader should return empty batch when no runs exist."""
    db_path = tmp_path / "metrics.db"
    initialize_database_schema(db_path)

    metadata, batch = load_latest_metric_batch(db_path)
    assert metadata is None
    assert batch.portfolios == ()
    assert batch.accounts == ()
    assert batch.securities == ()
