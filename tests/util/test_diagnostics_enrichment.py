"""Diagnostics unit tests for enrichment & normalization metadata exposure."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data import db_schema
from custom_components.pp_reader.util import diagnostics


def _apply_schema(conn: sqlite3.Connection, statements: list[str]) -> None:
    """Execute schema statements sequentially for the test database."""
    for statement in statements:
        conn.execute(statement)


def _create_enrichment_db(db_path: Path) -> None:
    """Create a sqlite database populated with minimal ingestion/enrichment data."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        # Core ingestion tables so diagnostics can query metadata and counts.
        _apply_schema(conn, db_schema.INGESTION_SCHEMA)

        # Enrichment tables required by diagnostics.
        _apply_schema(conn, db_schema.FX_SCHEMA)
        _apply_schema(conn, db_schema.PRICE_HISTORY_QUEUE_SCHEMA)

        conn.execute(
            """
            INSERT INTO ingestion_metadata (
                run_id,
                file_path,
                parsed_at,
                pp_version,
                base_currency,
                properties
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                "run-123",
                "import.xml",
                "2024-01-01T00:00:00Z",
                1,
                "EUR",
                '{"source":"test"}',
            ),
        )

        conn.executemany(
            """
            INSERT INTO fx_rates (
                date,
                currency,
                rate,
                fetched_at,
                data_source,
                provider,
                provenance
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "2024-01-05",
                    "USD",
                    1_070_000_000,
                    "2024-01-05T10:00:00Z",
                    "frankfurter",
                    "frankfurter.api",
                    '{"quality":"fresh"}',
                ),
                (
                    "2024-01-06",
                    "USD",
                    1_060_000_000,
                    "2024-01-06T10:00:00Z",
                    "frankfurter",
                    "frankfurter.api",
                    '{"quality":"fresh"}',
                ),
            ],
        )

        conn.executemany(
            """
            INSERT INTO price_history_queue (
                security_uuid,
                requested_date,
                status,
                priority,
                attempts,
                scheduled_at,
                started_at,
                finished_at,
                last_error,
                data_source,
                provenance,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "sec-pending",
                    19700,
                    "pending",
                    0,
                    0,
                    "2024-01-06T00:00:00Z",
                    None,
                    None,
                    None,
                    "yahoo",
                    None,
                    "2024-01-05T00:00:00Z",
                    "2024-01-05T00:00:00Z",
                ),
                (
                    "sec-processing",
                    19701,
                    "processing",
                    1,
                    1,
                    "2024-01-06T01:00:00Z",
                    "2024-01-06T01:05:00Z",
                    None,
                    None,
                    "yahoo",
                    None,
                    "2024-01-05T01:00:00Z",
                    "2024-01-06T01:05:00Z",
                ),
                (
                    "sec-failed",
                    19702,
                    "failed",
                    2,
                    3,
                    "2024-01-06T02:00:00Z",
                    "2024-01-06T02:05:00Z",
                    None,
                    "network down",
                    "yahoo",
                    None,
                    "2024-01-05T02:00:00Z",
                    "2024-01-06T02:10:00Z",
                ),
            ],
        )

        conn.commit()
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_diagnostics_missing_database_returns_unavailable() -> None:
    hass = MagicMock()
    hass.data = {}

    result = await diagnostics.async_get_parser_diagnostics(
        hass,
        "/non/existent/path.db",
        entry_id="entry",
    )

    enrichment = result["enrichment"]
    assert enrichment["available"] is False
    assert enrichment["feature_flags"] == {}
    assert enrichment["fx"]["last_refresh"] is None

    metrics = result["metrics"]
    assert metrics["available"] is False
    assert metrics["latest_run"] is None
    normalized = result["normalized_payload"]
    assert normalized["available"] is False
    assert normalized["reason"] == "database_not_found"


@pytest.mark.asyncio
async def test_diagnostics_enrichment_payload_from_database(tmp_path, monkeypatch: Any) -> None:
    db_path = tmp_path / "enrichment.db"
    _create_enrichment_db(db_path)

    hass = MagicMock()
    hass.data = {
        DOMAIN: {
            "entry": {
                "fx_last_refresh": datetime(2024, 1, 5, tzinfo=UTC),
            }
        }
    }
    hass.async_add_executor_job = AsyncMock(side_effect=lambda func: func())

    flag_snapshot = {"enrichment_pipeline": True, "enqueue_prices": True}
    monkeypatch.setattr(
        diagnostics,
        "feature_flag_snapshot",
        MagicMock(return_value=flag_snapshot),
    )

    result = await diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
        entry_id="entry",
    )

    hass.async_add_executor_job.assert_awaited()
    ingestion = result["ingestion"]
    assert ingestion["available"] is True
    assert ingestion["run_id"] == "run-123"
    assert ingestion["base_currency"] == "EUR"

    enrichment = result["enrichment"]
    assert enrichment["available"] is True
    assert enrichment["feature_flags"] == flag_snapshot
    normalized = result["normalized_payload"]
    assert normalized["available"] is False
    assert normalized["reason"] == "feature_flag_disabled"


@pytest.mark.asyncio
async def test_diagnostics_exposes_normalized_payload(tmp_path, monkeypatch: Any) -> None:
    """Normalized payload should be included when the feature flag is enabled."""
    db_path = tmp_path / "diagnostics_norm.db"
    _create_enrichment_db(db_path)

    hass = MagicMock()
    hass.data = {DOMAIN: {"entry": {}}}
    hass.async_add_executor_job = AsyncMock(side_effect=lambda func: func())

    flag_snapshot = {
        "enrichment_pipeline": True,
        "enqueue_prices": True,
        "normalized_pipeline": True,
    }
    monkeypatch.setattr(
        diagnostics,
        "feature_flag_snapshot",
        MagicMock(return_value=flag_snapshot),
    )

    class DummyPipeline:
        """Stub normalization pipeline for diagnostics tests."""

        @staticmethod
        async def async_normalize_snapshot(_hass, db_path_arg, *, include_positions: bool) -> Any:
            assert Path(db_path_arg) == db_path
            assert include_positions is False
            return SimpleNamespace(
                generated_at="2024-03-01T00:00:00Z",
                metric_run_uuid="metric-99",
            )

        @staticmethod
        def serialize_normalization_result(snapshot) -> dict[str, Any]:
            return {
                "generated_at": snapshot.generated_at,
                "metric_run_uuid": snapshot.metric_run_uuid,
                "accounts": [{"uuid": "acct-1"}],
                "portfolios": [{"uuid": "portfolio-1"}],
                "diagnostics": {"rate_lookup_failures": []},
            }

    monkeypatch.setattr(diagnostics, "_get_normalization_module", lambda: DummyPipeline)

    result = await diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
        entry_id="entry",
    )

    normalized = result["normalized_payload"]
    assert normalized["available"] is True
    assert normalized["metric_run_uuid"] == "metric-99"
    assert normalized["account_count"] == 1
    assert normalized["portfolio_count"] == 1


def test_collect_enrichment_payload_without_tables(tmp_path) -> None:
    db_path = tmp_path / "missing_queue.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        # Only create the FX table so the rate query succeeds while queue table is absent.
        _apply_schema(conn, db_schema.FX_SCHEMA)
        conn.commit()
    finally:
        conn.close()

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        payload = diagnostics._collect_enrichment_payload(
            conn,
            flag_snapshot={"enrichment_pipeline": False},
            fx_last_refresh="2024-01-05T00:00:00+00:00",
        )
    finally:
        conn.close()

    assert payload["available"] is False
    assert payload["price_history_queue"]["summary"] is None
    assert payload["price_history_queue"]["recent_failures"] is None
