"""Backend regression tests for the normalization pipeline."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data import normalization_pipeline as pipeline
from custom_components.pp_reader.data.db_access import (
    Account,
    AccountMetricRecord,
    MetricRunMetadata,
    Portfolio,
    PortfolioMetricRecord,
    Security,
    SecurityMetricRecord,
)
from custom_components.pp_reader.metrics.storage import MetricBatch


def _shares_raw(value: float) -> int:
    """Convert share counts to the stored 10^-8 representation."""
    return int(round(value * 10**8))


def _price_raw(value: float) -> int:
    """Convert prices to the stored 10^-8 representation."""
    return int(round(value * 10**8))


def _purchase_total(value: float) -> float:
    """Return a purchase total in its native currency units."""
    return float(value)


def test_load_position_snapshots_preserves_purchase_totals(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Purchase totals must not be downscaled when hydrating position snapshots."""
    metric_rows = [
        SecurityMetricRecord(
            metric_run_uuid="run-totals",
            portfolio_uuid="portfolio-gold",
            security_uuid="sec-gold",
            security_currency_code="USD",
            holdings_raw=_shares_raw(4.0),
            current_value_cents=1_416_493,
            purchase_value_cents=743_500,
            purchase_security_value_raw=7_435,
            purchase_account_value_cents=7_435,
            gain_abs_cents=672_993,
            gain_pct=90.52,
            total_change_eur_cents=672_993,
            total_change_pct=90.52,
            source="calculated",
            coverage_ratio=1.0,
        )
    ]

    # Avoid FX lookups during the test run
    monkeypatch.setattr(
        pipeline, "normalize_price_to_eur_sync", lambda *args, **kwargs: None
    )

    snapshots = tuple(
        pipeline._load_position_snapshots(  # type: ignore[attr-defined]
            db_path=tmp_path / "positions.db",
            portfolio_uuid="portfolio-gold",
            metric_rows=metric_rows,
            securities={
                "sec-gold": Security(
                    uuid="sec-gold",
                    name="GOLD Physisch",
                    currency_code="USD",
                )
            },
            reference_date=datetime(2024, 3, 1, tzinfo=UTC),
        )
    )

    assert len(snapshots) == 1
    position = snapshots[0]

    assert position.aggregation["purchase_total_account"] == pytest.approx(7_435.0)
    assert position.aggregation["purchase_total_security"] == pytest.approx(7_435.0)
    assert position.average_cost["account"] == pytest.approx(1_858.75)
    assert position.average_cost["security"] == pytest.approx(1_858.75)


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
            purchase_security_value_raw=_purchase_total(2_100.0),
            purchase_account_value_cents=_purchase_total(2_050.0),
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
            purchase_security_value_raw=_purchase_total(1_100.0),
            purchase_account_value_cents=_purchase_total(950.0),
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

    metric_run = MetricRunMetadata(
        run_uuid=run_uuid,
        status="completed",
        started_at="2024-03-01T00:00:00Z",
        finished_at="2024-03-01T00:10:00Z",
    )
    metric_batch = MetricBatch(
        portfolios=tuple(portfolio_metrics),
        accounts=tuple(account_metrics),
        securities=tuple(security_metrics),
    )

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
        "load_latest_metric_batch",
        lambda path: (
            (metric_run if path == db_path else None),
            metric_batch,
        ),
    )
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
    assert alpha.day_change_abs is None
    assert alpha.day_change_pct is None
    assert (
        "day_change" not in alpha.performance or alpha.performance["day_change"] is None
    )
    assert alpha.data_state.status == "ok"
    assert len(alpha.positions) == 1

    alpha_position = alpha.positions[0]
    assert alpha_position.security_uuid == "sec-1"
    assert alpha_position.current_value == pytest.approx(2500.0)
    assert alpha_position.average_cost["eur"] == pytest.approx(363.64)
    assert alpha_position.average_cost["security"] == pytest.approx(
        381.818182, rel=1e-6
    )
    assert (
        "day_change" not in alpha_position.performance
        or alpha_position.performance["day_change"] is None
    )

    assert zeta.uuid == "portfolio-a"
    assert zeta.data_state.status == "error"
    assert zeta.data_state.message
    assert len(zeta.positions) == 1

    zeta_position = zeta.positions[0]
    assert zeta_position.currency_code == "USD"
    assert zeta_position.last_price_native == pytest.approx(77.5)
    assert zeta_position.last_price_eur == pytest.approx(69.75)
    assert zeta_position.last_close_eur is None


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
        "load_latest_metric_batch",
        lambda _path: (None, MetricBatch()),
    )
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

    def failing_loader(path: Path):
        if path == db_path:
            raise RuntimeError("security metrics unavailable")
        return (None, MetricBatch())

    def failing_securities(_path: Path):
        raise RuntimeError("securities unavailable")

    monkeypatch.setattr(pipeline, "load_latest_metric_batch", failing_loader)
    monkeypatch.setattr(pipeline, "get_securities", failing_securities)

    snapshots = pipeline.load_portfolio_position_snapshots(db_path, portfolio_ids)

    assert set(snapshots) == set(portfolio_ids)
    assert all(value == () for value in snapshots.values())
