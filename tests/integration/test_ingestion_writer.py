"""Integration tests for the ingestion staging writer."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data.ingestion_writer import (
    IngestionMetadata,
    async_ingestion_session,
)


@dataclass
class DummyAccount:
    uuid: str
    name: str
    currency_code: str
    note: str | None = None
    is_retired: bool = False
    attributes: dict[str, str] = field(default_factory=dict)
    updated_at: datetime | None = None


@dataclass
class DummyPortfolio:
    uuid: str
    name: str
    note: str | None = None
    reference_account: str | None = None
    is_retired: bool = False
    attributes: dict[str, str] = field(default_factory=dict)
    updated_at: datetime | None = None


@dataclass
class DummyHistoricalPrice:
    date: int
    close: int | None
    high: int | None = None
    low: int | None = None
    volume: int | None = None


@dataclass
class DummySecurity:
    uuid: str
    name: str
    currency_code: str
    target_currency_code: str | None = None
    isin: str | None = None
    ticker_symbol: str | None = None
    wkn: str | None = None
    note: str | None = None
    online_id: str | None = None
    feed: str | None = None
    feed_url: str | None = None
    latest_feed: str | None = None
    latest_feed_url: str | None = None
    latest: DummyHistoricalPrice | None = None
    prices: list[DummyHistoricalPrice] = field(default_factory=list)
    is_retired: bool = False
    attributes: dict[str, str] = field(default_factory=dict)
    properties: dict[str, str] = field(default_factory=dict)
    updated_at: datetime | None = None


@dataclass
class DummyTransactionUnit:
    type: int
    amount: int | None
    currency_code: str | None
    fx_amount: int | None = None
    fx_currency_code: str | None = None
    fx_rate_to_base: float | None = None


@dataclass
class DummyTransaction:
    uuid: str
    type: int
    account: str | None = None
    portfolio: str | None = None
    other_account: str | None = None
    other_portfolio: str | None = None
    other_uuid: str | None = None
    other_updated_at: datetime | None = None
    date: datetime | None = None
    currency_code: str | None = None
    amount: int | None = None
    shares: int | None = None
    note: str | None = None
    security: str | None = None
    source: str | None = None
    updated_at: datetime | None = None
    units: list[DummyTransactionUnit] = field(default_factory=list)


def _open_conn(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@pytest.mark.asyncio
async def test_writer_persists_accounts(tmp_path: Path) -> None:
    """Writer should persist account, portfolio, security, and metadata rows."""
    db_path = tmp_path / "stage.db"

    async with async_ingestion_session(db_path, enable_wal=False) as writer:
        account = DummyAccount(
            uuid="acc-1",
            name="Depotkonto",
            currency_code="EUR",
            attributes={"type": "brokerage"},
            updated_at=datetime(2024, 1, 1, tzinfo=UTC),
        )
        portfolio = DummyPortfolio(
            uuid="port-1",
            name="Main Portfolio",
            reference_account="acc-1",
            attributes={"goal": "retirement"},
        )
        security = DummySecurity(
            uuid="sec-1",
            name="ETF World",
            currency_code="EUR",
            latest=DummyHistoricalPrice(date=20240101, close=100_00),
            prices=[DummyHistoricalPrice(date=20240101, close=100_00)],
        )

        writer.write_accounts([account])
        writer.write_portfolios([portfolio])
        writer.write_securities([security])

        run_id = writer.finalize_ingestion(
            IngestionMetadata(
                file_path="fixture.portfolio",
                parsed_at=datetime(2024, 1, 2, tzinfo=UTC),
                pp_version=42,
                base_currency="EUR",
                properties={"build": "test-suite"},
                parsed_client=None,
            )
        )

    conn = _open_conn(db_path)
    try:
        account_row = conn.execute(
            "SELECT uuid, name, currency_code, attributes FROM ingestion_accounts"
        ).fetchone()
        assert account_row == (
            "acc-1",
            "Depotkonto",
            "EUR",
            '{"type":"brokerage"}',
        )

        portfolio_row = conn.execute(
            "SELECT uuid, reference_account FROM ingestion_portfolios"
        ).fetchone()
        assert portfolio_row == ("port-1", "acc-1")

        security_row = conn.execute(
            "SELECT uuid, latest_close FROM ingestion_securities"
        ).fetchone()
        assert security_row == ("sec-1", 10000)

        price_row = conn.execute(
            "SELECT security_uuid, date, close FROM ingestion_historical_prices"
        ).fetchone()
        assert price_row == ("sec-1", 20240101, 10000)

        metadata_row = conn.execute(
            "SELECT run_id, file_path, pp_version, base_currency FROM ingestion_metadata"
        ).fetchone()
        assert metadata_row == (run_id, "fixture.portfolio", 42, "EUR")

        metadata_properties = conn.execute(
            "SELECT properties FROM ingestion_metadata"
        ).fetchone()
        assert metadata_properties == (
            '{"__pp_reader__":{"properties":{"build":"test-suite"}}}',
        )
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_writer_links_transactions_to_units(tmp_path: Path) -> None:
    """Transactions should be persisted with their unit breakdown."""
    db_path = tmp_path / "stage.db"

    txn = DummyTransaction(
        uuid="txn-1",
        type=0,
        account="acc-1",
        portfolio="port-1",
        currency_code="EUR",
        amount=150_00,
        security="sec-1",
        units=[
            DummyTransactionUnit(type=0, amount=150_00, currency_code="EUR"),
            DummyTransactionUnit(type=1, amount=15_00, currency_code="EUR"),
        ],
    )

    async with async_ingestion_session(db_path, enable_wal=False) as writer:
        writer.write_accounts(
            [DummyAccount(uuid="acc-1", name="Account", currency_code="EUR")]
        )
        writer.write_portfolios([DummyPortfolio(uuid="port-1", name="Portfolio")])
        writer.write_securities(
            [DummySecurity(uuid="sec-1", name="Security", currency_code="EUR")]
        )
        writer.write_transactions([txn])

    conn = _open_conn(db_path)
    try:
        txn_rows = conn.execute(
            "SELECT uuid, amount, currency_code FROM ingestion_transactions"
        ).fetchall()
        assert txn_rows == [("txn-1", 15000, "EUR")]

        unit_rows = conn.execute(
            """
            SELECT transaction_uuid, unit_index, type, amount
            FROM ingestion_transaction_units
            ORDER BY unit_index
            """
        ).fetchall()
        assert unit_rows == [
            ("txn-1", 0, 0, 15000),
            ("txn-1", 1, 1, 1500),
        ]
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_writer_populates_amount_eur_cents(tmp_path: Path) -> None:
    """Non-EUR transactions should store EUR cents when FX is available."""
    db_path = tmp_path / "stage.db"

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE fx_rates (
                date TEXT NOT NULL,
                currency TEXT NOT NULL,
                rate REAL NOT NULL,
                fetched_at TEXT,
                data_source TEXT,
                provider TEXT,
                provenance TEXT,
                PRIMARY KEY (date, currency)
            )
            """
        )
        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            ("2024-01-01", "USD", 1.1),
        )
        conn.commit()
    finally:
        conn.close()

    txn = DummyTransaction(
        uuid="txn-2",
        type=0,
        currency_code="USD",
        amount=110_00,
        date=datetime(2024, 1, 1, tzinfo=UTC),
    )

    async with async_ingestion_session(db_path, enable_wal=False) as writer:
        writer.write_transactions([txn])

    conn = _open_conn(db_path)
    try:
        row = conn.execute(
            """
            SELECT amount, amount_eur_cents
            FROM ingestion_transactions
            WHERE uuid = ?
            """,
            ("txn-2",),
        ).fetchone()
        assert row == (11000, 10000)
    finally:
        conn.close()
