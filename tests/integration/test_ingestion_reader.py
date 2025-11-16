"""Integration tests for reading ingestion staging data."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data.ingestion_reader import (
    load_accounts,
    load_ingestion_snapshot,
    load_metadata,
    load_portfolios,
    load_securities,
    load_transactions,
)
from custom_components.pp_reader.data.ingestion_writer import (
    IngestionMetadata,
    async_ingestion_session,
)
from tests.integration.test_ingestion_writer import (
    DummyAccount,
    DummyHistoricalPrice,
    DummyPortfolio,
    DummySecurity,
    DummyTransaction,
    DummyTransactionUnit,
)


def _open_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@pytest.mark.asyncio
async def test_load_ingestion_snapshot_returns_dataclasses(tmp_path: Path) -> None:
    """Snapshot reader should return parsed dataclasses for staging rows."""
    db_path = tmp_path / "stage.db"

    async with async_ingestion_session(db_path, enable_wal=False) as writer:
        writer.write_accounts(
            [
                DummyAccount(
                    uuid="acc-1",
                    name="Depotkonto",
                    currency_code="EUR",
                    attributes={"type": "brokerage"},
                    updated_at=datetime(2024, 1, 1, tzinfo=UTC),
                )
            ]
        )
        writer.write_portfolios(
            [
                DummyPortfolio(
                    uuid="port-1",
                    name="Main Portfolio",
                    reference_account="acc-1",
                    attributes={"goal": "retirement"},
                )
            ]
        )
        writer.write_securities(
            [
                DummySecurity(
                    uuid="sec-1",
                    name="ETF World",
                    currency_code="EUR",
                    latest=DummyHistoricalPrice(date=20240101, close=100_00),
                    prices=[DummyHistoricalPrice(date=20240101, close=100_00)],
                )
            ]
        )
        writer.write_transactions(
            [
                DummyTransaction(
                    uuid="txn-1",
                    type=0,
                    account="acc-1",
                    portfolio="port-1",
                    currency_code="EUR",
                    amount=150_00,
                    security="sec-1",
                    units=[
                        DummyTransactionUnit(
                            type=0, amount=150_00, currency_code="EUR"
                        ),
                        DummyTransactionUnit(type=1, amount=15_00, currency_code="EUR"),
                    ],
                )
            ]
        )
        writer.finalize_ingestion(
            IngestionMetadata(
                file_path="fixture.portfolio",
                parsed_at=datetime(2024, 1, 2, tzinfo=UTC),
                pp_version=42,
                base_currency="EUR",
                properties={"build": "test-suite"},
                parsed_client=None,
            )
        )

    conn = _open_connection(db_path)
    try:
        metadata = load_metadata(conn)
        assert metadata["base_currency"] == "EUR"
        assert metadata["pp_version"] == 42

        accounts = load_accounts(conn)
        assert len(accounts) == 1
        assert accounts[0].name == "Depotkonto"
        assert accounts[0].attributes["type"] == "brokerage"

        portfolios = load_portfolios(conn)
        assert portfolios[0].reference_account == "acc-1"

        securities = load_securities(conn)
        assert securities[0].latest and securities[0].latest.close == 100_00

        transactions = load_transactions(conn)
        assert transactions[0].units[1].amount == 15_00

        snapshot = load_ingestion_snapshot(conn)
        assert snapshot is not None
        assert snapshot.base_currency == "EUR"
        assert snapshot.parsed_at is not None
        assert snapshot.client.version == 42
        assert snapshot.client.accounts[0].name == "Depotkonto"
        assert snapshot.metadata["file_path"] == "fixture.portfolio"
    finally:
        conn.close()
