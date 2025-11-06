"""Tests for the enrichment smoke test helpers."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_init import initialize_database_schema
from scripts import enrichment_smoketest as smoketest
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database


def test_collect_diagnostics_without_metrics(tmp_path: Path) -> None:
    """Diagnostics payload should include empty metrics information for fresh databases."""
    db_path = tmp_path / "empty.db"
    initialize_database_schema(db_path)

    payload = smoketest._collect_diagnostics(db_path)
    metrics = payload["metrics"]
    assert metrics["runs"]["count"] == 0
    assert metrics["runs"]["latest"] is None
    assert metrics["records"]["portfolio_metrics"] == 0


@pytest.mark.asyncio
async def test_run_metrics_stage_and_diagnostics(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Metrics stage should complete and diagnostics should report stored runs."""
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

    payload = smoketest._collect_diagnostics(db_path)
    metrics = payload["metrics"]
    assert metrics["runs"]["count"] >= 1
    latest = metrics["runs"]["latest"]
    assert latest is not None
    assert latest["run_uuid"] == summary["run_uuid"]
    assert metrics["records"]["portfolio_metrics"] >= 1
