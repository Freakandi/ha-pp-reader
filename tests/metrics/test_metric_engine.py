"""Unit tests for metric computation helpers based on datamodel scenarios."""

from __future__ import annotations

import pytest

from custom_components.pp_reader.metrics.accounts import async_compute_account_metrics
from custom_components.pp_reader.metrics.portfolio import (
    async_compute_portfolio_metrics,
)
from custom_components.pp_reader.metrics.securities import (
    async_compute_security_metrics,
)
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database


@pytest.fixture
def metrics_db(tmp_path):
    """Create a seeded SQLite database aligned with backend datamodel examples."""
    db_path = tmp_path / "metrics.db"
    seed_metrics_database(db_path)
    return db_path


@pytest.mark.asyncio
async def test_portfolio_metrics_aggregate_values(hass, metrics_db, monkeypatch):
    """Portfolio metric computation should aggregate gains and coverage correctly."""
    install_fx_stubs(monkeypatch)

    records = await async_compute_portfolio_metrics(hass, metrics_db, "run-001")
    records_by_portfolio = {record.portfolio_uuid: record for record in records}

    assert set(records_by_portfolio) == {"portfolio-main", "portfolio-empty"}

    main_metrics = records_by_portfolio["portfolio-main"]
    assert main_metrics.metric_run_uuid == "run-001"
    assert main_metrics.current_value_cents == 400_000
    assert main_metrics.purchase_value_cents == 300_000
    assert main_metrics.gain_abs_cents == 100_000
    assert main_metrics.gain_pct == pytest.approx(33.33, rel=0, abs=1e-2)
    assert main_metrics.total_change_pct == pytest.approx(33.33, rel=0, abs=1e-2)
    assert main_metrics.coverage_ratio == pytest.approx(1.0)
    assert main_metrics.position_count == 2
    assert main_metrics.missing_value_positions == 0

    empty_metrics = records_by_portfolio["portfolio-empty"]
    assert empty_metrics.metric_run_uuid == "run-001"
    assert empty_metrics.current_value_cents == 0
    assert empty_metrics.purchase_value_cents == 0
    assert empty_metrics.gain_abs_cents == 0
    assert empty_metrics.gain_pct == pytest.approx(0.0)
    assert empty_metrics.coverage_ratio == pytest.approx(1.0)
    assert empty_metrics.position_count == 0
    assert empty_metrics.missing_value_positions == 0


@pytest.mark.asyncio
async def test_account_metrics_apply_fx_and_report_coverage(hass, metrics_db, monkeypatch):
    """Account metrics must convert non-EUR balances and expose coverage metadata."""
    install_fx_stubs(monkeypatch)

    records = await async_compute_account_metrics(hass, metrics_db, "run-002")
    by_account = {record.account_uuid: record for record in records}

    assert set(by_account) == {"acct-eur", "acct-usd", "acct-gbp"}

    eur_account = by_account["acct-eur"]
    assert eur_account.balance_native_cents == 125_000
    assert eur_account.balance_eur_cents == 125_000
    assert eur_account.coverage_ratio == pytest.approx(1.0)
    assert eur_account.fx_rate is None

    usd_account = by_account["acct-usd"]
    assert usd_account.balance_native_cents == 200_000
    assert usd_account.balance_eur_cents == 160_000
    assert usd_account.fx_rate == pytest.approx(1.25)
    assert usd_account.coverage_ratio == pytest.approx(1.0)
    assert usd_account.fx_rate_source == "metrics-test"
    assert usd_account.provenance == '{"source":"tests"}'

    gbp_account = by_account["acct-gbp"]
    assert gbp_account.balance_native_cents == 150_000
    assert gbp_account.balance_eur_cents is None
    assert gbp_account.coverage_ratio == pytest.approx(0.0)
    assert gbp_account.fx_rate is None


@pytest.mark.asyncio
async def test_security_metrics_include_day_change_and_fx(hass, metrics_db, monkeypatch):
    """Security metrics should report performance deltas, FX-derived values, and coverage."""
    install_fx_stubs(monkeypatch)

    records = await async_compute_security_metrics(hass, metrics_db, "run-003")
    by_security = {(record.portfolio_uuid, record.security_uuid): record for record in records}

    assert set(by_security) == {
        ("portfolio-main", "sec-eur"),
        ("portfolio-main", "sec-usd"),
    }

    eur_metrics = by_security[("portfolio-main", "sec-eur")]
    assert eur_metrics.current_value_cents == 250_000
    assert eur_metrics.purchase_value_cents == 200_000
    assert eur_metrics.gain_abs_cents == 50_000
    assert eur_metrics.gain_pct == pytest.approx(25.0)
    assert eur_metrics.coverage_ratio == pytest.approx(1.0)
    assert eur_metrics.day_change_source == "unavailable"
    assert eur_metrics.day_change_coverage == pytest.approx(0.5)

    usd_metrics = by_security[("portfolio-main", "sec-usd")]
    assert usd_metrics.current_value_cents == 150_000
    assert usd_metrics.purchase_value_cents == 100_000
    assert usd_metrics.gain_abs_cents == 50_000
    assert usd_metrics.gain_pct == pytest.approx(50.0)
    assert usd_metrics.coverage_ratio == pytest.approx(1.0)
    assert usd_metrics.day_change_native == pytest.approx(5.0)
    assert usd_metrics.day_change_eur == pytest.approx(4.0)
    assert usd_metrics.day_change_pct == pytest.approx(5.26, rel=0, abs=1e-2)
    assert usd_metrics.day_change_source == "native"
    assert usd_metrics.day_change_coverage == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_metric_computation_requires_run_uuid(hass, metrics_db):
    """Blank run identifiers must be rejected to avoid inconsistent persistence."""
    with pytest.raises(ValueError):
        await async_compute_portfolio_metrics(hass, metrics_db, "")
    with pytest.raises(ValueError):
        await async_compute_account_metrics(hass, metrics_db, "")
    with pytest.raises(ValueError):
        await async_compute_security_metrics(hass, metrics_db, "")
