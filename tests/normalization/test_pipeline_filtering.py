"""Tests for filtering logic in the normalization pipeline using mocks."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import Mock

from custom_components.pp_reader.data import normalization_pipeline as pipeline
from custom_components.pp_reader.data.db_access import (
    Account,
    MetricRunMetadata,
    Portfolio,
    PortfolioMetricRecord,
)
from custom_components.pp_reader.metrics.storage import MetricBatch

if TYPE_CHECKING:
    from pathlib import Path

    import pytest


def test_normalize_snapshot_repects_portfolio_filter(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Verify that only the requested portfolio is included in the snapshot."""
    run_uuid = "run-filter-test"
    db_path = tmp_path / "filter.db"

    # Setup 2 Portfolios
    portfolios = [
        Portfolio(uuid="port-1", name="Portfolio 1"),
        Portfolio(uuid="port-2", name="Portfolio 2"),
    ]
    portfolio_metrics = [
        PortfolioMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="port-1",
            current_value_cents=100_000,
            purchase_value_cents=50_000,
            gain_abs_cents=50_000,
            gain_pct=100.0,
            total_change_eur_cents=50_000,
            total_change_pct=100.0,
            coverage_ratio=1.0,
            position_count=1,
            missing_value_positions=0,
            provenance="metrics",
        ),
        PortfolioMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="port-2",
            current_value_cents=200_000,
            purchase_value_cents=100_000,
            gain_abs_cents=100_000,
            gain_pct=100.0,
            total_change_eur_cents=100_000,
            total_change_pct=100.0,
            coverage_ratio=1.0,
            position_count=0,
            missing_value_positions=0,
            provenance="metrics",
        ),
    ]

    accounts = [Account(uuid="acct-1", name="Cash", currency_code="EUR", balance=0)]
    account_metrics = []

    metric_run = MetricRunMetadata(
        run_uuid=run_uuid,
        status="completed",
        started_at="2024-03-01T00:00:00Z",
        finished_at="2024-03-01T00:10:00Z",
    )
    metric_batch = MetricBatch(
        portfolios=tuple(portfolio_metrics),
        accounts=tuple(account_metrics),
        securities=(),
    )

    # Mock Data Access
    monkeypatch.setattr(
        pipeline,
        "load_latest_metric_batch",
        lambda path: (metric_run, metric_batch),
    )
    monkeypatch.setattr(pipeline, "get_accounts", lambda _: accounts)
    monkeypatch.setattr(pipeline, "get_portfolios", lambda _: portfolios)
    monkeypatch.setattr(pipeline, "get_securities", lambda _: {})
    monkeypatch.setattr(pipeline, "_load_security_price_dates", lambda _: {})
    monkeypatch.setattr(pipeline, "get_missing_fx_diagnostics", lambda: {"missing": []})
    monkeypatch.setattr(pipeline, "_utc_now_isoformat", lambda: "2024-03-01T00:00:00Z")

    # Mock Persistence to verify it is NOT called
    mock_persist = Mock()
    monkeypatch.setattr(pipeline, "persist_normalization_result", mock_persist)

    # --- Test 1: Full Snapshot (No Filter) ---
    result_full = pipeline._normalize_snapshot_sync(
        db_path,
        include_positions=False,
        portfolio_uids=None,
    )

    assert len(result_full.portfolios) == 2
    mock_persist.assert_called_once()
    mock_persist.reset_mock()

    # --- Test 2: Filtered Snapshot (Only port-1) ---
    result_filtered = pipeline._normalize_snapshot_sync(
        db_path,
        include_positions=False,
        portfolio_uids=["port-1"],
    )

    assert len(result_filtered.portfolios) == 1
    assert result_filtered.portfolios[0].uuid == "port-1"

    # CRITICAL: Persistence must be skipped for partial updates
    mock_persist.assert_not_called()

    # --- Test 3: Filtered Snapshot (Only port-2) ---
    result_filtered_2 = pipeline._normalize_snapshot_sync(
        db_path,
        include_positions=False,
        portfolio_uids=["port-2"],
    )

    assert len(result_filtered_2.portfolios) == 1
    assert result_filtered_2.portfolios[0].uuid == "port-2"
    mock_persist.assert_not_called()
