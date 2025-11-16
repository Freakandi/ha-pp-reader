"""Tests for the enrichment smoke test helpers."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_init import initialize_database_schema
from scripts import enrichment_smoketest as smoketest
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database


@pytest.mark.asyncio
async def test_run_metrics_stage_updates_diagnostics(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Metrics stage should complete and diagnostics should surface the run metadata."""
    db_path = tmp_path / "metrics.db"
    seed_metrics_database(db_path)

    loop = asyncio.get_running_loop()
    hass = smoketest._SmoketestHass(loop)
    install_fx_stubs(monkeypatch)

    summary = await smoketest._run_metrics(hass, db_path)
    assert summary["status"] == "completed"
    assert summary["run_uuid"]
    assert summary["processed"]["portfolios"] >= 1
    assert summary["processed"]["accounts"] >= 1

    diagnostics_payload = await smoketest.diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
    )
    metrics = diagnostics_payload["metrics"]
    assert metrics["available"] is True
    latest = metrics["latest_run"]
    assert latest is not None
    assert latest["run_uuid"] == summary["run_uuid"]


@pytest.mark.asyncio
async def test_load_canonical_snapshots_pending_when_empty(tmp_path: Path) -> None:
    """Snapshot helper should report pending until normalization persists data."""
    db_path = tmp_path / "canon.db"
    initialize_database_schema(db_path)

    loop = asyncio.get_running_loop()
    hass = smoketest._SmoketestHass(loop)

    summary = await smoketest._load_canonical_snapshots(hass, db_path)
    assert summary["status"] == "pending"
    assert "counts" not in summary


@pytest.mark.asyncio
async def test_load_canonical_snapshots_returns_payload(tmp_path: Path) -> None:
    """Snapshot helper should expose the persisted accounts and portfolios."""
    db_path = tmp_path / "canon_payload.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO account_snapshots (
                metric_run_uuid,
                account_uuid,
                snapshot_at,
                name,
                currency_code,
                orig_balance,
                balance,
                fx_unavailable,
                fx_rate,
                fx_rate_source,
                fx_rate_timestamp,
                coverage_ratio,
                provenance,
                payload,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "run-1",
                "acct-1",
                "2024-03-01T00:00:00Z",
                "Cash",
                "EUR",
                100.0,
                100.0,
                0,
                None,
                None,
                None,
                None,
                None,
                json.dumps({"uuid": "acct-1"}),
                "2024-03-01T00:00:00Z",
                "2024-03-01T00:00:00Z",
            ),
        )
        conn.execute(
            """
            INSERT INTO portfolio_snapshots (
                metric_run_uuid,
                portfolio_uuid,
                snapshot_at,
                name,
                currency_code,
                current_value,
                purchase_sum,
                gain_abs,
                gain_pct,
                total_change_eur,
                total_change_pct,
                position_count,
                missing_value_positions,
                has_current_value,
                coverage_ratio,
                performance_source,
                performance_provenance,
                provenance,
                payload,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "run-1",
                "portfolio-1",
                "2024-03-01T00:00:00Z",
                "Depot",
                "EUR",
                200.0,
                150.0,
                50.0,
                0.1,
                10.0,
                0.05,
                1,
                0,
                1,
                1.0,
                None,
                None,
                None,
                json.dumps({"uuid": "portfolio-1"}),
                "2024-03-01T00:00:00Z",
                "2024-03-01T00:00:00Z",
            ),
        )
        conn.commit()
    finally:
        conn.close()

    loop = asyncio.get_running_loop()
    hass = smoketest._SmoketestHass(loop)
    summary = await smoketest._load_canonical_snapshots(hass, db_path)

    assert summary["status"] == "ok"
    assert summary["metric_run_uuid"] == "run-1"
    assert summary["counts"]["accounts"] == 1
    assert summary["counts"]["portfolios"] == 1
    assert summary["accounts"][0]["uuid"] == "acct-1"
    assert summary["portfolios"][0]["uuid"] == "portfolio-1"
