"""Backend regression tests for the normalization pipeline."""

from __future__ import annotations

from pathlib import Path

import pytest

from custom_components.pp_reader.data import normalization_pipeline as pipeline
from custom_components.pp_reader.data.db_access import (
    Account,
    AccountMetricRecord,
    Portfolio,
    PortfolioMetricRecord,
    Security,
    SecurityMetricRecord,
)


def _shares_raw(value: float) -> int:
    """Convert share counts to the stored 10^-8 representation."""
    return int(round(value * 10**8))


def _price_raw(value: float) -> int:
    """Convert price totals to the stored 10^-8 representation."""
    return int(round(value * 10**8))


def test_normalize_snapshot_compiles_multi_portfolio_payload(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Ensure the pipeline merges metric runs, accounts, and positions."""
    run_uuid = "run-123"
    db_path = tmp_path / "portfolio.db"

    accounts = [
        Account(uuid="acct-eur", name="Cash EUR", currency_code="EUR", balance=12_300),
        Account(uuid="acct-usd", name="Cash USD", currency_code="USD", balance=0),
    ]
    account_metrics = [
        AccountMetricRecord(
            metric_run_uuid=run_uuid,
            account_uuid="acct-eur",
            currency_code="EUR",
            balance_eur_cents=15_000,
            fx_rate=None,
            fx_rate_source=None,
            coverage_ratio=1.0,
        ),
        AccountMetricRecord(
            metric_run_uuid=run_uuid,
            account_uuid="acct-usd",
            currency_code="USD",
            balance_eur_cents=27_500,
            fx_rate=1.1,
            fx_rate_source="ecb",
            fx_rate_timestamp="2024-02-29T12:00:00Z",
            coverage_ratio=0.9,
        ),
    ]

    portfolios = [
        Portfolio(uuid="portfolio-a", name="Zeta Portfolio"),
        Portfolio(uuid="portfolio-b", name="Alpha Portfolio"),
    ]
    portfolio_metrics = [
        PortfolioMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="portfolio-a",
            current_value_cents=150_000,
            purchase_value_cents=100_000,
            gain_abs_cents=50_000,
            gain_pct=50.0,
            total_change_eur_cents=50_000,
            total_change_pct=50.0,
            coverage_ratio=0.75,
            position_count=1,
            missing_value_positions=1,
            provenance="metrics",
        ),
        PortfolioMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="portfolio-b",
            current_value_cents=250_000,
            purchase_value_cents=200_000,
            gain_abs_cents=50_000,
            gain_pct=25.0,
            total_change_eur_cents=50_000,
            total_change_pct=25.0,
            coverage_ratio=0.9,
            position_count=1,
            missing_value_positions=0,
            provenance="metrics",
        ),
    ]

    security_metrics = [
        SecurityMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="portfolio-b",
            security_uuid="sec-1",
            security_currency_code="EUR",
            holdings_raw=_shares_raw(5.5),
            current_value_cents=250_000,
            purchase_value_cents=200_000,
            purchase_security_value_raw=_price_raw(2_100.0),
            purchase_account_value_cents=205_000,
            gain_abs_cents=50_000,
            gain_pct=25.0,
            total_change_eur_cents=50_000,
            total_change_pct=25.0,
            source="metrics",
            coverage_ratio=0.95,
            day_change_native=0.12,
            day_change_eur=0.11,
            day_change_pct=0.5,
            day_change_source="yesterday",
            day_change_coverage=0.8,
            last_price_native_raw=_price_raw(52.1234),
            last_close_native_raw=_price_raw(51.5),
            provenance="snapshot",
        ),
        SecurityMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid="portfolio-a",
            security_uuid="sec-2",
            security_currency_code="USD",
            holdings_raw=_shares_raw(2.0),
            current_value_cents=150_000,
            purchase_value_cents=100_000,
            purchase_security_value_raw=_price_raw(1_100.0),
            purchase_account_value_cents=95_000,
            gain_abs_cents=50_000,
            gain_pct=50.0,
            total_change_eur_cents=50_000,
            total_change_pct=50.0,
            source="metrics",
            coverage_ratio=0.7,
            last_price_native_raw=_price_raw(77.5),
            last_close_native_raw=_price_raw(70.0),
        ),
    ]

    securities = {
        "sec-1": Security(uuid="sec-1", name="ACME Europe", currency_code="EUR"),
        "sec-2": Security(uuid="sec-2", name="ACME USA", currency_code="USD"),
    }
    diagnostics = {"missing_rates": []}

    def fake_load_run(path: Path) -> str:
        assert path == db_path
        return run_uuid

    def fake_fetch_portfolio_metrics(path: Path, run: str):
        assert path == db_path
        assert run == run_uuid
        return portfolio_metrics

    def fake_fetch_account_metrics(path: Path, run: str):
        assert path == db_path
        assert run == run_uuid
        return account_metrics

    def fake_fetch_security_metrics(path: Path, run: str):
        assert path == db_path
        assert run == run_uuid
        return security_metrics

    def fake_price_to_eur(
        raw_price,
        currency_code: str,
        reference_date,
        db_path_arg: Path,
        *,
        decimals: int = 4,
    ) -> float | None:
        native = pipeline.normalize_raw_price(raw_price, decimals=decimals)
        if native is None:
            return None
        currency = (currency_code or "EUR").upper()
        if currency == "EUR":
            return native
        return round(native * 0.9, decimals)

    monkeypatch.setattr(
        pipeline,
        "load_latest_completed_metric_run_uuid",
        fake_load_run,
    )
    monkeypatch.setattr(pipeline, "fetch_portfolio_metrics", fake_fetch_portfolio_metrics)
    monkeypatch.setattr(pipeline, "fetch_account_metrics", fake_fetch_account_metrics)
    monkeypatch.setattr(pipeline, "fetch_security_metrics", fake_fetch_security_metrics)
    monkeypatch.setattr(pipeline, "get_accounts", lambda _: accounts)
    monkeypatch.setattr(pipeline, "get_portfolios", lambda _: portfolios)
    monkeypatch.setattr(pipeline, "get_securities", lambda _: securities)
    monkeypatch.setattr(pipeline, "get_missing_fx_diagnostics", lambda: diagnostics)
    monkeypatch.setattr(pipeline, "_utc_now_isoformat", lambda: "2024-03-01T00:00:00Z")
    monkeypatch.setattr(pipeline, "normalize_price_to_eur_sync", fake_price_to_eur)

    result = pipeline._normalize_snapshot_sync(
        db_path,
        include_positions=True,
    )

    assert result.metric_run_uuid == run_uuid
    assert result.generated_at == "2024-03-01T00:00:00Z"
    assert result.diagnostics == diagnostics

    account_order = [account.uuid for account in result.accounts]
    assert account_order == ["acct-eur", "acct-usd"]

    eur_account, usd_account = result.accounts
    assert eur_account.balance == pytest.approx(150.0)
    assert eur_account.orig_balance == pytest.approx(123.0)
    assert usd_account.balance == pytest.approx(275.0)
    assert usd_account.fx_rate == pytest.approx(1.1)
    assert usd_account.fx_unavailable is False

    portfolio_names = [snapshot.name for snapshot in result.portfolios]
    assert portfolio_names == ["Alpha Portfolio", "Zeta Portfolio"]

    alpha, zeta = result.portfolios
    assert alpha.uuid == "portfolio-b"
    assert alpha.current_value == pytest.approx(2500.0)
    assert alpha.performance["gain_abs"] == pytest.approx(500.0)
    assert alpha.data_state.status == "ok"
    assert len(alpha.positions) == 1

    alpha_position = alpha.positions[0]
    assert alpha_position.security_uuid == "sec-1"
    assert alpha_position.current_value == pytest.approx(2500.0)
    assert alpha_position.average_cost["eur"] == pytest.approx(363.64)
    assert alpha_position.average_cost["security"] == pytest.approx(381.818182, rel=1e-6)
    assert alpha_position.performance["day_change"]["price_change_eur"] == pytest.approx(0.11)

    assert zeta.uuid == "portfolio-a"
    assert zeta.data_state.status == "error"
    assert zeta.data_state.message
    assert len(zeta.positions) == 1

    zeta_position = zeta.positions[0]
    assert zeta_position.currency_code == "USD"
    assert zeta_position.last_price_native == pytest.approx(77.5)
    assert zeta_position.last_price_eur == pytest.approx(69.75)
    assert zeta_position.last_close_eur == pytest.approx(63.0)


def test_normalize_snapshot_handles_missing_metric_run(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Verify the pipeline emits fallback payloads without metric runs."""
    db_path = tmp_path / "missing.db"

    accounts = [
        Account(uuid="acct-eur", name="Cash EUR", currency_code="EUR", balance=50_000),
        Account(uuid="acct-usd", name="Cash USD", currency_code="USD", balance=75_000),
    ]
    portfolios = [Portfolio(uuid="portfolio-1", name="Solo Portfolio")]

    monkeypatch.setattr(
        pipeline,
        "load_latest_completed_metric_run_uuid",
        lambda _path: None,
    )

    def unexpected(*_args, **_kwargs):
        raise AssertionError("metric loaders must not run without a completed run")

    monkeypatch.setattr(pipeline, "fetch_portfolio_metrics", unexpected)
    monkeypatch.setattr(pipeline, "fetch_account_metrics", unexpected)
    monkeypatch.setattr(pipeline, "fetch_security_metrics", unexpected)
    monkeypatch.setattr(pipeline, "get_accounts", lambda _: accounts)
    monkeypatch.setattr(pipeline, "get_portfolios", lambda _: portfolios)
    monkeypatch.setattr(pipeline, "get_missing_fx_diagnostics", lambda: None)

    result = pipeline._normalize_snapshot_sync(
        db_path,
        include_positions=False,
    )

    assert result.metric_run_uuid is None
    assert len(result.accounts) == 2

    eur_account, usd_account = result.accounts
    assert eur_account.balance == pytest.approx(500.0)
    assert usd_account.balance is None
    assert usd_account.fx_unavailable is True

    assert len(result.portfolios) == 1
    portfolio = result.portfolios[0]
    assert portfolio.current_value == pytest.approx(0.0)
    assert portfolio.performance["gain_pct"] is None
    assert portfolio.data_state.status == "ok"


def test_load_portfolio_position_snapshots_handles_loader_errors(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """load_portfolio_position_snapshots must ignore failing DB readers."""
    db_path = tmp_path / "positions.db"
    portfolio_ids = ["portfolio-a", "portfolio-b"]

    monkeypatch.setattr(
        pipeline,
        "load_latest_completed_metric_run_uuid",
        lambda path: "run-error" if path == db_path else None,
    )

    def failing_fetch(_path: Path, _run: str):
        raise RuntimeError("security metrics unavailable")

    def failing_securities(_path: Path):
        raise RuntimeError("securities unavailable")

    monkeypatch.setattr(pipeline, "fetch_security_metrics", failing_fetch)
    monkeypatch.setattr(pipeline, "get_securities", failing_securities)

    snapshots = pipeline.load_portfolio_position_snapshots(db_path, portfolio_ids)

    assert set(snapshots) == set(portfolio_ids)
    assert all(value == () for value in snapshots.values())
