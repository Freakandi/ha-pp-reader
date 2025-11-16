"""Integration test covering the CLI smoke test normalization pipeline."""

from __future__ import annotations

import asyncio
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from google.protobuf.timestamp_pb2 import Timestamp

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.models import parsed
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from custom_components.pp_reader.util import diagnostics
from scripts import enrichment_smoketest as smoketest
from tests.metrics.helpers import install_fx_stubs

pytestmark = pytest.mark.asyncio


def _ts(dt: datetime) -> Timestamp:
    timestamp = Timestamp()
    timestamp.FromDatetime(dt)
    return timestamp


def _epoch_day(dt: datetime) -> int:
    """Return the epoch day index expected by PP ingestion (days since 1970-01-01)."""
    return int(dt.replace(tzinfo=UTC).timestamp() // 86400)


def _build_sample_parsed_client() -> tuple[parsed.ParsedClient, client_pb2.PClient]:
    """Return a minimal ParsedClient (and proto) with Yahoo-compatible metadata."""
    client = client_pb2.PClient()
    client.version = 7
    client.baseCurrency = "EUR"

    client.properties["source"] = "normalization-smoketest"

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
    price.date = _epoch_day(datetime(2024, 1, 10, tzinfo=UTC))
    price.close = 10_00

    latest = client_pb2.PFullHistoricalPrice()
    latest.date = _epoch_day(datetime(2024, 1, 11, tzinfo=UTC))
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
    buy.type = client_pb2.PTransaction.Type.PURCHASE
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

    parsed_client = parsed.ParsedClient.from_proto(client)
    return parsed_client, client


def _seed_canonical_tables(db_path: Path, parsed_client: parsed.ParsedClient) -> None:
    """Populate canonical account/portfolio tables for metrics evaluation."""
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("DELETE FROM accounts")
        conn.execute("DELETE FROM portfolios")
        conn.execute("DELETE FROM portfolio_securities")

        for account in parsed_client.accounts:
            conn.execute(
                """
                INSERT INTO accounts (uuid, name, currency_code, note, is_retired, balance)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (
                    account.uuid,
                    account.name,
                    getattr(account, "currency_code", None) or "EUR",
                    getattr(account, "note", None),
                    getattr(account, "balance", None) or 0,
                ),
            )

        for portfolio in parsed_client.portfolios:
            conn.execute(
                """
                INSERT INTO portfolios (uuid, name, note, reference_account, is_retired)
                VALUES (?, ?, ?, ?, 0)
                """,
                (
                    portfolio.uuid,
                    portfolio.name,
                    getattr(portfolio, "note", None),
                    getattr(portfolio, "reference_account", None),
                ),
            )

        if parsed_client.portfolios and parsed_client.securities:
            portfolio = parsed_client.portfolios[0]
            security = parsed_client.securities[0]
            holdings = getattr(security, "shares", None) or 5
            current_holdings = int(holdings * 10**8)
            purchase_value = 500_00
            conn.execute(
                """
                INSERT INTO portfolio_securities (
                    portfolio_uuid,
                    security_uuid,
                    current_holdings,
                    purchase_value,
                    avg_price_native,
                    avg_price_security,
                    avg_price_account,
                    security_currency_total,
                    account_currency_total,
                    current_value
                ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0, 0, NULL)
                """,
                (
                    portfolio.uuid,
                    security.uuid,
                    current_holdings,
                    purchase_value,
                ),
            )
        conn.commit()
    finally:
        conn.close()


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

    parsed_client, _sample_proto = _build_sample_parsed_client()

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
        writer.write_accounts(parsed_client.accounts)
        writer.write_portfolios(parsed_client.portfolios)
        writer.write_securities(parsed_client.securities)
        writer.write_transactions(parsed_client.transactions)
        writer.write_transaction_units(
            [
                (transaction.uuid, transaction.units)
                for transaction in parsed_client.transactions
            ]
        )
        writer.write_historical_prices(
            [
                (security.uuid, security.prices)
                for security in parsed_client.securities
                if security.prices
            ]
        )
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
    _seed_canonical_tables(db_path, parsed_client)

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
    portfolio_payload = normalization_summary["payload"]["portfolios"][0]
    assert portfolio_payload["uuid"] == "port-smoke"

    canonical_summary = await smoketest._load_canonical_snapshots(hass, db_path)
    assert canonical_summary["status"] == "ok"
    assert canonical_summary["counts"]["accounts"] == 1
    assert canonical_summary["counts"]["portfolios"] == 1

    diagnostics_payload = await diagnostics.async_get_parser_diagnostics(
        hass,
        db_path,
    )
    ingestion_counts = diagnostics_payload["ingestion"]["processed_entities"]
    assert ingestion_counts["accounts"] == 1
    assert ingestion_counts["portfolios"] == 1
    metrics_snapshot = diagnostics_payload["metrics"]
    assert metrics_snapshot["latest_run"]["run_uuid"] == metrics_summary["run_uuid"]
    normalized_meta = diagnostics_payload["normalized_payload"]
    assert normalized_meta["available"] is True
    assert normalized_meta["account_count"] == 1
    assert normalized_meta["portfolio_count"] == 1


@pytest.mark.asyncio
async def test_cli_smoketest_exit_code_pending_snapshot(tmp_path: Path) -> None:
    """Pending canonical snapshots should map to the dedicated exit code."""
    db_path = tmp_path / "pending.db"
    initialize_database_schema(db_path)

    loop = asyncio.get_running_loop()
    hass = smoketest._SmoketestHass(loop)

    canonical_summary = await smoketest._load_canonical_snapshots(hass, db_path)
    assert canonical_summary["status"] == "pending"
    assert smoketest._snapshot_status_to_exit_code(canonical_summary["status"]) == 6
    assert smoketest._snapshot_status_to_exit_code("failed") == 7
