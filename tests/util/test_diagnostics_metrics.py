"""Diagnostics unit tests focusing on metrics metadata exposure."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data import db_schema
from custom_components.pp_reader.util import diagnostics


def _apply_schema(conn: sqlite3.Connection, statements: list[str]) -> None:
    for statement in statements:
        conn.execute(statement)


def _create_metrics_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        # Create ingestion tables so diagnostics can query metadata counters.
        _apply_schema(conn, db_schema.INGESTION_SCHEMA)
        _apply_schema(conn, db_schema.METRICS_SCHEMA)

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
                provenance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "run-complete",
                "completed",
                "coordinator",
                "2024-02-01T10:00:00Z",
                "2024-02-01T10:00:06Z",
                6000,
                7,
                2,
                3,
                2,
                None,
                '{"source":"tests"}',
            ),
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
                provenance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "run-failed",
                "failed",
                "manual",
                "2024-01-31T12:00:00Z",
                "2024-01-31T12:00:03Z",
                3000,
                5,
                2,
                2,
                1,
                "boom",
                '{"source":"tests"}',
            ),
        )

        conn.executemany(
            """
            INSERT INTO portfolio_metrics (
                metric_run_uuid,
                portfolio_uuid,
                current_value_cents,
                purchase_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                coverage_ratio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "run-complete",
                    "portfolio-main",
                    400_000,
                    300_000,
                    100_000,
                    33.33,
                    100_000,
                    33.33,
                    1.0,
                ),
                (
                    "run-complete",
                    "portfolio-empty",
                    0,
                    0,
                    0,
                    0.0,
                    0,
                    0.0,
                    None,
                ),
            ],
        )

        conn.executemany(
            """
            INSERT INTO account_metrics (
                metric_run_uuid,
                account_uuid,
                currency_code,
                balance_native_cents,
                balance_eur_cents,
                coverage_ratio
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("run-complete", "acct-eur", "EUR", 125_000, 125_000, 1.0),
                ("run-complete", "acct-usd", "USD", 200_000, 160_000, 1.0),
                ("run-complete", "acct-gbp", "GBP", 150_000, None, None),
            ],
        )

        conn.executemany(
            """
            INSERT INTO security_metrics (
                metric_run_uuid,
                portfolio_uuid,
                security_uuid,
                valuation_currency,
                security_currency_code,
                current_value_cents,
                purchase_value_cents,
                gain_abs_cents,
                gain_pct,
                total_change_eur_cents,
                total_change_pct,
                coverage_ratio,
                day_change_native,
                day_change_eur,
                day_change_pct
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "run-complete",
                    "portfolio-main",
                    "sec-eur",
                    "EUR",
                    "EUR",
                    250_000,
                    200_000,
                    50_000,
                    25.0,
                    50_000,
                    25.0,
                    1.0,
                    None,
                    None,
                    None,
                ),
                (
                    "run-complete",
                    "portfolio-main",
                    "sec-usd",
                    "EUR",
                    "USD",
                    150_000,
                    100_000,
                    50_000,
                    50.0,
                    50_000,
                    50.0,
                    0.8,
                    5.0,
                    4.0,
                    5.26,
                ),
            ],
        )

        conn.commit()
    finally:
        conn.close()


def test_collect_metrics_payload_with_data(tmp_path) -> None:
    db_path = tmp_path / "metrics.db"
    _create_metrics_db(db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        payload = diagnostics._collect_metrics_payload(conn)
    finally:
        conn.close()

    assert payload["available"] is True
    latest_run = payload["latest_run"]
    assert latest_run["run_uuid"] == "run-complete"
    assert latest_run["duration_ms"] == 6000
    assert latest_run["processed_accounts"] == 3

    coverage = payload["coverage"]
    assert coverage["portfolios"]["avg_coverage"] == pytest.approx(1.0)
    assert coverage["portfolios"]["with_coverage"] == 1
    assert coverage["accounts"]["with_coverage"] == 2
    assert coverage["accounts"]["avg_coverage"] == pytest.approx(1.0)
    assert coverage["securities"]["avg_coverage"] == pytest.approx(0.9, rel=0, abs=1e-4)

    recent_runs = payload["recent_runs"]
    assert len(recent_runs) == 2
    assert recent_runs[1]["status"] == "failed"
    assert recent_runs[1]["error_message"] == "boom"


@pytest.mark.asyncio
async def test_async_get_parser_diagnostics_includes_metrics(tmp_path) -> None:
    db_path = tmp_path / "metrics_full.db"
    _create_metrics_db(db_path)

    hass = MagicMock()
    hass.data = {DOMAIN: {}}
    hass.async_add_executor_job = AsyncMock(side_effect=lambda func: func())

    result = await diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
        entry_id=None,
    )

    hass.async_add_executor_job.assert_awaited()

    metrics = result["metrics"]
    assert metrics["available"] is True
    assert metrics["latest_run"]["run_uuid"] == "run-complete"
    assert metrics["latest_run"]["duration_ms"] == 6000
    assert metrics["coverage"]["accounts"]["with_coverage"] == 2


def test_collect_metrics_payload_without_tables(tmp_path) -> None:
    db_path = tmp_path / "missing_metrics.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        payload = diagnostics._collect_metrics_payload(conn)
    finally:
        conn.close()

    assert payload["available"] is False
    assert payload["latest_run"] is None
    assert payload["reason"] == "metric_runs table not accessible"
