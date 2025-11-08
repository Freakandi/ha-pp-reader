"""Integration test covering the CLI smoke test normalization pipeline."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from google.protobuf.timestamp_pb2 import Timestamp

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.models import parsed
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from scripts import enrichment_smoketest as smoketest
from tests.metrics.helpers import install_fx_stubs

pytestmark = pytest.mark.asyncio


def _ts(dt: datetime) -> Timestamp:
    timestamp = Timestamp()
    timestamp.FromDatetime(dt)
    return timestamp


def _build_sample_parsed_client() -> parsed.ParsedClient:
    """Return a minimal ParsedClient with Yahoo-compatible security metadata."""
    client = client_pb2.PClient()
    client.version = 7
    client.baseCurrency = "EUR"

    prop = client.properties.add()
    prop.key = "source"
    prop.value.string = "normalization-smoketest"

    account = client.accounts.add()
    account.uuid = "acc-smoke"
    account.name = "Smoke Brokerage"
    account.currencyCode = "EUR"
    account.updatedAt.CopyFrom(_ts(datetime(2024, 1, 5, tzinfo=UTC)))

    portfolio = client.portfolios.add()
    portfolio.uuid = "port-smoke"
    portfolio.name = "Smoke Portfolio"
    portfolio.referenceAccount = account.uuid
    portfolio.updatedAt.CopyFrom(_ts(datetime(2024, 1, 6, tzinfo=UTC)))

    security = client.securities.add()
    security.uuid = "sec-smoke"
    security.name = "Smoke Equity"
    security.currencyCode = "USD"
    security.feed = "YAHOO"
    security.tickerSymbol = "SMOK"
    security.onlineId = "SMOKE"
    security.updatedAt.CopyFrom(_ts(datetime(2024, 1, 7, tzinfo=UTC)))
    prop = security.properties.add()
    prop.key = "ticker"
    prop.value.string = "SMOKE.DE"

    price = security.prices.add()
    price.date = 20240110
    price.close = 10_00

    latest = client_pb2.PFullHistoricalPrice()
    latest.date = 20240111
    latest.close = 11_00
    security.latest.CopyFrom(latest)

    deposit = client.transactions.add()
    deposit.uuid = "txn-deposit"
    deposit.type = client_pb2.PTransaction.Type.DEPOSIT
    deposit.account = account.uuid
    deposit.currencyCode = "EUR"
    deposit.amount = 1_000_00
    deposit.date.CopyFrom(_ts(datetime(2024, 1, 4, tzinfo=UTC)))
    deposit.updatedAt.CopyFrom(_ts(datetime(2024, 1, 4, 12, tzinfo=UTC)))
    unit = deposit.units.add()
    unit.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit.amount = 1_000_00
    unit.currencyCode = "EUR"

    buy = client.transactions.add()
    buy.uuid = "txn-buy"
    buy.type = client_pb2.PTransaction.Type.BUY
    buy.account = account.uuid
    buy.portfolio = portfolio.uuid
    buy.security = security.uuid
    buy.currencyCode = "EUR"
    buy.amount = 500_00
    buy.shares = 5
    buy.date.CopyFrom(_ts(datetime(2024, 1, 8, tzinfo=UTC)))
    buy.updatedAt.CopyFrom(_ts(datetime(2024, 1, 8, 12, tzinfo=UTC)))
    unit = buy.units.add()
    unit.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit.amount = 500_00
    unit.currencyCode = "EUR"

    return parsed.ParsedClient.from_proto(client)


@pytest.mark.asyncio
async def test_cli_smoketest_generates_normalized_snapshot(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full CLI smoke test stages ingestion, metrics, and normalization payloads."""
    db_path = tmp_path / "smoketest.db"
    portfolio_path = tmp_path / "sample.portfolio"
    portfolio_path.write_text("placeholder")
    initialize_database_schema(db_path)

    parsed_client = _build_sample_parsed_client()

    async def _fake_parse_portfolio(
        hass: Any,
        *,
        path: str,
        writer: Any,
        progress_cb: Any,
    ) -> parsed.ParsedClient:
        assert Path(path) == portfolio_path
        # Simulate parser progress to ensure callback surfaces.
        progress_cb(SimpleNamespace(stage="accounts", processed=1, total=1))
        return parsed_client

    monkeypatch.setattr(
        smoketest.parser_pipeline,
        "async_parse_portfolio",
        _fake_parse_portfolio,
    )

    install_fx_stubs(monkeypatch, rate=1.05)

    monkeypatch.setattr(
        smoketest.fx,
        "discover_active_currencies",
        lambda path: {"USD"},
    )

    async def _fake_ensure_fx(_dates, currencies, _db_path):
        assert currencies == {"USD"}

    monkeypatch.setattr(
        smoketest.fx,
        "ensure_exchange_rates_for_dates",
        _fake_ensure_fx,
    )

    planned: dict[str, Any] = {}

    async def _fake_plan_jobs(
        self,
        targets,
        *,
        lookback_days: int = 365,
        interval: str = "1d",
    ) -> int:
        planned["targets"] = len(targets)
        planned["lookback_days"] = lookback_days
        planned["interval"] = interval
        return len(targets)

    async def _fake_process_jobs(self, *, limit: int) -> dict[str, Any]:
        planned["process_limit"] = limit
        return {}

    monkeypatch.setattr(smoketest.HistoryQueueManager, "plan_jobs", _fake_plan_jobs)
    monkeypatch.setattr(
        smoketest.HistoryQueueManager,
        "process_pending_jobs",
        _fake_process_jobs,
    )

    loop = asyncio.get_running_loop()
    hass = smoketest._SmoketestHass(loop)

    run_id, parsed_result = await smoketest._run_parser(
        hass,
        portfolio_path,
        db_path,
        keep_staging=False,
    )
    assert run_id
    assert parsed_result is parsed_client

    fx_summary = await smoketest._run_fx_refresh(db_path)
    assert fx_summary["status"] == "ok"
    assert fx_summary["currencies"] == ["USD"]
    assert fx_summary["reference"]

    history_summary = await smoketest._run_price_history_jobs(
        parsed_client,
        db_path,
        limit=3,
    )
    assert history_summary["status"] == "completed"
    assert history_summary["targets"] == planned["targets"] == 1
    assert planned["process_limit"] == 3

    metrics_summary = await smoketest._run_metrics(hass, db_path)
    assert metrics_summary["status"] == "completed"
    assert metrics_summary["processed"]["portfolios"] == 1
    assert metrics_summary["processed"]["accounts"] == 1
    assert metrics_summary["run_uuid"]

    normalization_summary = await smoketest._run_normalization_snapshot(
        hass,
        db_path,
        include_positions=True,
    )
    assert normalization_summary["status"] == "ok"
    assert normalization_summary["counts"] == {"accounts": 1, "portfolios": 1}
    assert normalization_summary["payload"]["portfolios"][0]["positions"]

    diagnostics_payload = smoketest._collect_diagnostics(db_path)
    ingestion_counts = diagnostics_payload["ingestion"]
    assert ingestion_counts["ingestion_accounts"] == 1
    assert ingestion_counts["ingestion_portfolios"] == 1
    metrics_counts = diagnostics_payload["metrics"]["records"]
    assert metrics_counts["portfolio_metrics"] == 1
    assert metrics_counts["account_metrics"] == 1
