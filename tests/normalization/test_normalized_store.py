"""Tests for normalized_store loader helpers."""

from __future__ import annotations

import sqlite3
from dataclasses import replace
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_access import upsert_metric_run_metadata
from custom_components.pp_reader.data.db_schema import ALL_SCHEMAS
from custom_components.pp_reader.data.normalization_pipeline import (
    AccountSnapshot,
    NormalizationResult,
    PortfolioSnapshot,
    serialize_account_snapshot,
    serialize_portfolio_snapshot,
)
from custom_components.pp_reader.data.normalized_store import (
    SnapshotBundle,
    async_load_latest_snapshot_bundle,
    async_load_metric_summary,
)
from custom_components.pp_reader.data.snapshot_writer import (
    persist_normalization_result,
)
from custom_components.pp_reader.metrics.storage import (
    MetricBatch,
    async_create_metric_run,
    async_store_metric_batch,
)
from custom_components.pp_reader.util import async_run_executor_job


@pytest.fixture
def seeded_db(tmp_path: Path) -> Path:
    """Initialise a SQLite database with accounts and portfolios seeded."""
    db_path = tmp_path / "normalized.db"
    conn = sqlite3.connect(str(db_path))
    try:
        for ddl in ALL_SCHEMAS:
            conn.execute(ddl)
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES ('acct-1', 'Account', 'EUR')"
        )
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES ('port-1', 'Portfolio')"
        )
        conn.commit()
    finally:
        conn.close()
    return db_path


@pytest.mark.asyncio
async def test_async_load_latest_snapshot_bundle_returns_decoded_payloads(
    hass,
    seeded_db: Path,
) -> None:
    """Snapshot store should return decoded JSON payloads from the latest run."""
    run = await async_create_metric_run(hass, seeded_db, status="running")
    persisted_run = await async_store_metric_batch(
        hass,
        seeded_db,
        run=run,
        batch=MetricBatch(),
    )
    completed_run = replace(persisted_run, status="completed")
    await async_run_executor_job(
        hass,
        upsert_metric_run_metadata,
        seeded_db,
        completed_run,
    )

    account = AccountSnapshot(
        uuid="acct-1",
        name="Account",
        currency_code="EUR",
        orig_balance=100.0,
        balance=100.0,
    )
    portfolio = PortfolioSnapshot(
        uuid="port-1",
        name="Portfolio",
        current_value=1000.0,
        purchase_value=900.0,
        position_count=1,
        missing_value_positions=0,
        performance={"gain_abs": 100.0, "source": "metrics"},
        day_change_abs=None,
        day_change_pct=None,
    )
    result = NormalizationResult(
        generated_at="2024-03-01T00:00:00Z",
        metric_run_uuid=run.run_uuid,
        accounts=(account,),
        portfolios=(portfolio,),
    )
    persist_normalization_result(
        seeded_db,
        result,
        account_serializer=serialize_account_snapshot,
        portfolio_serializer=serialize_portfolio_snapshot,
    )

    bundle = await async_load_latest_snapshot_bundle(hass, seeded_db)
    assert isinstance(bundle, SnapshotBundle)
    assert bundle.metric_run_uuid == run.run_uuid
    assert bundle.snapshot_at == "2024-03-01T00:00:00Z"
    assert len(bundle.accounts) == 1
    assert bundle.accounts[0]["uuid"] == "acct-1"
    assert len(bundle.portfolios) == 1
    assert bundle.portfolios[0]["uuid"] == "port-1"


@pytest.mark.asyncio
async def test_async_load_metric_summary_returns_latest_run(
    hass,
    seeded_db: Path,
) -> None:
    """Metric summary helper should expose the most recent run metadata."""
    run = await async_create_metric_run(hass, seeded_db, status="running")
    batch = MetricBatch()
    persisted = await async_store_metric_batch(
        hass,
        seeded_db,
        run=run,
        batch=batch,
    )
    completed_run = replace(persisted, status="completed")
    await async_run_executor_job(
        hass,
        upsert_metric_run_metadata,
        seeded_db,
        completed_run,
    )

    summary = await async_load_metric_summary(hass, seeded_db)
    assert summary.run is not None
    assert summary.run.run_uuid == completed_run.run_uuid
    assert summary.batch == batch
