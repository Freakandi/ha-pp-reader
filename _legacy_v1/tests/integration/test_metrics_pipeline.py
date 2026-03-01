"""Integration tests covering the end-to-end metrics pipeline persistence."""

from __future__ import annotations

import sqlite3
from unittest.mock import AsyncMock

import pytest

from custom_components.pp_reader.metrics.pipeline import async_refresh_all
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database


@pytest.mark.asyncio
async def test_async_refresh_all_persists_metric_batches(hass, tmp_path, monkeypatch):
    """Pipeline run should compute metrics, store them, and update run metadata."""
    db_path = tmp_path / "metrics.db"
    seed_metrics_database(db_path)
    install_fx_stubs(monkeypatch)

    progress_events: list[tuple[str, dict]] = []

    def _capture(stage: str, payload: dict) -> None:
        progress_events.append((stage, dict(payload)))

    run = await async_refresh_all(
        hass,
        db_path,
        trigger="test-suite",
        provenance="integration-test",
        emit_progress=_capture,
    )

    assert run.status == "completed"
    assert run.trigger == "test-suite"
    assert run.provenance == "integration-test"
    assert run.processed_portfolios == 2
    assert run.processed_accounts == 3
    assert run.processed_securities == 2
    assert run.total_entities == 7
    assert run.duration_ms is not None

    stages = [stage for stage, _ in progress_events]
    assert stages[:2] == ["start", "portfolios_computed"]
    assert "completed" in stages

    conn = sqlite3.connect(str(db_path))
    try:
        portfolio_rows = conn.execute(
            """
            SELECT metric_run_uuid, portfolio_uuid, gain_abs_cents, coverage_ratio
            FROM portfolio_metrics
            ORDER BY portfolio_uuid
            """
        ).fetchall()
        assert [(row[1], row[2], row[3]) for row in portfolio_rows] == [
            ("portfolio-empty", 0, 1.0),
            ("portfolio-main", 100_000, 1.0),
        ]

        account_rows = conn.execute(
            """
            SELECT account_uuid, balance_native_cents, balance_eur_cents, coverage_ratio
            FROM account_metrics
            ORDER BY account_uuid
            """
        ).fetchall()
        assert account_rows == [
            ("acct-eur", 125_000, 125_000, 1.0),
            ("acct-gbp", 150_000, None, 0.0),
            ("acct-usd", 200_000, 160_000, 1.0),
        ]

        security_rows = conn.execute(
            """
            SELECT security_uuid, gain_abs_cents, day_change_native, day_change_eur, day_change_coverage
            FROM security_metrics
            ORDER BY security_uuid
            """
        ).fetchall()
        assert security_rows == [
            ("sec-eur", 50_000, None, None, 0.5),
            ("sec-usd", 50_000, 5.0, 4.0, 1.0),
        ]

        run_row = conn.execute(
            """
            SELECT status, processed_portfolios, processed_accounts, processed_securities, error_message
            FROM metric_runs
            WHERE run_uuid = ?
            """,
            (run.run_uuid,),
        ).fetchone()
        assert run_row == ("completed", 2, 3, 2, None)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_async_refresh_all_marks_failed_run(hass, tmp_path, monkeypatch):
    """Pipeline should mark the metric run as failed when a computation errors."""
    db_path = tmp_path / "metrics_failure.db"
    seed_metrics_database(db_path)
    install_fx_stubs(monkeypatch)

    async_mock = AsyncMock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(
        "custom_components.pp_reader.metrics.portfolio.async_compute_portfolio_metrics",
        async_mock,
    )

    with pytest.raises(RuntimeError, match="boom"):
        await async_refresh_all(
            hass,
            db_path,
            trigger="failure-case",
            provenance="integration-test",
        )

    conn = sqlite3.connect(str(db_path))
    try:
        run_row = conn.execute(
            """
            SELECT status, error_message
            FROM metric_runs
            ORDER BY created_at DESC
            LIMIT 1
            """
        ).fetchone()
        assert run_row == ("failed", "boom")
    finally:
        conn.close()
