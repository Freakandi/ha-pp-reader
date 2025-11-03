"""Regression tests ensuring staging fallback matches legacy sync events."""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from google.protobuf.timestamp_pb2 import Timestamp

from custom_components.pp_reader.data import sync_from_pclient as sync_module
from custom_components.pp_reader.data.db_init import (
    clear_ingestion_stage,
    initialize_database_schema,
)
from custom_components.pp_reader.data.ingestion_writer import IngestionWriter
from custom_components.pp_reader.models import parsed
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2


def _ts(dt: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts


def _build_sample_client() -> client_pb2.PClient:
    client = client_pb2.PClient()
    client.version = 7
    client.baseCurrency = "EUR"

    prop = client.properties.add()
    prop.key = "build"
    prop.value.string = "regression"

    account = client.accounts.add()
    account.uuid = "acc-001"
    account.name = "Brokerage"
    account.currencyCode = "EUR"
    account.updatedAt.CopyFrom(_ts(datetime(2024, 1, 1, tzinfo=UTC)))

    portfolio = client.portfolios.add()
    portfolio.uuid = "port-001"
    portfolio.name = "Retirement"
    portfolio.referenceAccount = "acc-001"
    portfolio.updatedAt.CopyFrom(_ts(datetime(2024, 1, 2, tzinfo=UTC)))

    security = client.securities.add()
    security.uuid = "sec-001"
    security.name = "Global ETF"
    security.currencyCode = "EUR"
    security.updatedAt.CopyFrom(_ts(datetime(2024, 1, 3, tzinfo=UTC)))

    latest_price = client_pb2.PFullHistoricalPrice()
    latest_price.date = 20240115
    latest_price.close = 102_00
    security.latest.CopyFrom(latest_price)

    price = security.prices.add()
    price.date = 20240110
    price.close = 101_00

    deposit = client.transactions.add()
    deposit.uuid = "txn-deposit"
    deposit.type = client_pb2.PTransaction.Type.DEPOSIT
    deposit.account = "acc-001"
    deposit.currencyCode = "EUR"
    deposit.amount = 100_00
    deposit.date.CopyFrom(_ts(datetime(2024, 1, 4, tzinfo=UTC)))
    deposit.updatedAt.CopyFrom(_ts(datetime(2024, 1, 4, 12, tzinfo=UTC)))
    unit = deposit.units.add()
    unit.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit.amount = 100_00
    unit.currencyCode = "EUR"

    buy = client.transactions.add()
    buy.uuid = "txn-buy"
    buy.type = client_pb2.PTransaction.Type.BUY
    buy.account = "acc-001"
    buy.portfolio = "port-001"
    buy.currencyCode = "EUR"
    buy.amount = 50_00
    buy.shares = 10
    buy.security = "sec-001"
    buy.date.CopyFrom(_ts(datetime(2024, 1, 5, tzinfo=UTC)))
    buy.updatedAt.CopyFrom(_ts(datetime(2024, 1, 5, 18, tzinfo=UTC)))
    unit = buy.units.add()
    unit.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit.amount = 50_00
    unit.currencyCode = "EUR"

    return client


def _stage_parsed_client(db_path: Path, client: client_pb2.PClient) -> None:
    parsed_client = parsed.ParsedClient.from_proto(client)
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        clear_ingestion_stage(conn)
        writer = IngestionWriter(conn)
        writer.write_accounts(parsed_client.accounts)
        writer.write_portfolios(parsed_client.portfolios)
        writer.write_securities(parsed_client.securities)
        writer.write_transactions(parsed_client.transactions)
        writer.finalize_ingestion(
            file_path="sample.portfolio",
            parsed_at=datetime(2024, 1, 6, tzinfo=UTC),
            pp_version=parsed_client.version,
            base_currency=parsed_client.base_currency,
            properties=dict(parsed_client.properties),
        )
        conn.commit()
    finally:
        conn.close()


def _run_sync_capture(
    monkeypatch: pytest.MonkeyPatch,
    db_path: Path,
    client: client_pb2.PClient,
) -> dict[str, list[Any]]:
    captured: dict[str, list[Any]] = defaultdict(list)

    def _capture(_hass: Any, _entry_id: str, data_type: str, data: Any) -> None:
        captured[data_type].append(deepcopy(data))

    monkeypatch.setattr(sync_module, "_push_update", _capture)
    monkeypatch.setattr(
        sync_module,
        "ensure_exchange_rates_for_dates_sync",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        sync_module,
        "load_latest_rates_sync",
        lambda *_args, **_kwargs: {},
    )

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        sync_module.sync_from_pclient(
            client=client,
            conn=conn,
            hass=object(),
            entry_id="entry",
            last_file_update="2024-01-07T00:00:00",
            db_path=db_path,
        )
    finally:
        conn.close()

    return dict(captured)


def test_sync_from_staging_matches_legacy_events(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Staging-derived client should emit identical push payloads as direct proto."""
    sample_client = _build_sample_client()

    direct_db = tmp_path / "direct.db"
    staging_db = tmp_path / "staging.db"
    initialize_database_schema(direct_db)
    initialize_database_schema(staging_db)

    direct_events = _run_sync_capture(monkeypatch, direct_db, sample_client)

    _stage_parsed_client(staging_db, sample_client)
    staging_events = _run_sync_capture(monkeypatch, staging_db, client_pb2.PClient())

    for key in ("accounts", "portfolio_values", "portfolio_positions"):
        assert key in direct_events, f"missing {key} event in direct path"
        assert key in staging_events, f"missing {key} event in staging path"
        assert staging_events[key] == direct_events[key]
