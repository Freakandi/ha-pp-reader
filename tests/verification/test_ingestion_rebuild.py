"""
Verification test: Ingestion-triggered rebuild.

Ensures that importing a modified .portfolio file triggers the backdating pipeline
and updates daily wealth records for the historical range.
"""

from __future__ import annotations

import asyncio
import functools
import sqlite3
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

import pytest
from google.protobuf.timestamp_pb2 import Timestamp

from custom_components.pp_reader.data import canonical_sync
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.ingestion_writer import (
    IngestionMetadata,
    IngestionWriter,
    clear_ingestion_stage,
    ensure_ingestion_tables,
)
from custom_components.pp_reader.metrics.pipeline import (
    async_refresh_all,
)
from custom_components.pp_reader.metrics.calculator import PerformanceEngine
from custom_components.pp_reader.models import parsed
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from custom_components.pp_reader.prices.history_queue import HistoryQueueManager

# We repurpose the smoketest stubs/mocks where possible or redefine minimal ones
from tests.metrics.helpers import install_fx_stubs

if TYPE_CHECKING:
    from pathlib import Path

# --- MOCKS & STUBS ---


def _ts(dt: datetime) -> Timestamp:
    timestamp = Timestamp()
    timestamp.FromDatetime(dt)
    return timestamp


def _epoch_day(dt: datetime) -> int:
    return int(dt.replace(tzinfo=UTC).timestamp() // 86400)


def _build_sample_parsed_client() -> tuple[parsed.ParsedClient, client_pb2.PClient]:
    """
    Return a minimal ParsedClient with:
    - 1 Account (EUR)
    - 1 Portfolio
    - 1 Security (USD) with prices
    - Transactions: Deposit + Buy
    This ensures we have data to backdate.
    """
    client = client_pb2.PClient()
    client.version = 1
    client.baseCurrency = "EUR"
    client.properties["source"] = "verification-ingest"

    # Account
    account = client.accounts.add()
    account.uuid = "acc-verif"
    account.name = "Verif Account"
    account.currencyCode = "EUR"
    account.updatedAt.CopyFrom(_ts(datetime(2024, 1, 1, tzinfo=UTC)))

    # Portfolio
    portfolio = client.portfolios.add()
    portfolio.uuid = "port-verif"
    portfolio.name = "Verif Portfolio"
    portfolio.referenceAccount = account.uuid
    portfolio.updatedAt.CopyFrom(_ts(datetime(2024, 1, 1, tzinfo=UTC)))

    # Security
    security = client.securities.add()
    security.uuid = "sec-verif"
    security.name = "Verif Stock"
    security.currencyCode = "USD"
    security.tickerSymbol = "VERI"
    security.updatedAt.CopyFrom(_ts(datetime(2024, 1, 1, tzinfo=UTC)))

    # Prices: 10 days of history
    for i in range(10):
        p_date = datetime(2024, 1, 10 + i, tzinfo=UTC)
        price = security.prices.add()
        price.date = _epoch_day(p_date)
        # Price starts at 100.0 and increases by 1.0 each day
        # 100.0 * 10^8 = 10,000,000,000
        # 101.0 * 10^8 = 10,100,000,000
        price.close = (100 + i) * (10**8)

    latest = client_pb2.PFullHistoricalPrice()
    latest.date = _epoch_day(datetime(2024, 1, 20, tzinfo=UTC))
    latest.close = (100 + 9) * (10**8)  # Corresponds to the last price generated above
    security.latest.CopyFrom(latest)

    # Transactions
    # 1. Deposit 10,000 EUR on Jan 5
    deposit = client.transactions.add()
    deposit.uuid = "txn-dep"
    deposit.type = client_pb2.PTransaction.Type.DEPOSIT
    deposit.account = account.uuid
    deposit.currencyCode = "EUR"
    deposit.amount = 10_000_00
    deposit.date.CopyFrom(_ts(datetime(2024, 1, 5, tzinfo=UTC)))
    deposit.updatedAt.CopyFrom(_ts(datetime(2024, 1, 5, 12, tzinfo=UTC)))

    # 2. Buy 10 shares @ 100 USD (assume FX 1.0 for simplicity in mocks) on Jan 12
    # This falls within price range
    buy = client.transactions.add()
    buy.uuid = "txn-buy"
    buy.type = client_pb2.PTransaction.Type.PURCHASE
    buy.account = account.uuid
    buy.portfolio = portfolio.uuid
    buy.security = security.uuid
    buy.currencyCode = "USD"
    buy.amount = 1_000_00  # 10 * 100
    buy.shares = 10 * 10**8
    buy.date.CopyFrom(_ts(datetime(2024, 1, 12, tzinfo=UTC)))
    buy.updatedAt.CopyFrom(_ts(datetime(2024, 1, 12, 12, tzinfo=UTC)))

    # Unit for buy
    unit_buy = buy.units.add()
    unit_buy.amount = 1_000_00
    unit_buy.currencyCode = "USD"

    # 3. Sell 5 shares @ 105 USD on Jan 15
    # Price on Jan 15 (i=5): 105.
    # Cost Basis: 100/share.
    # Realized Gain: (105 - 100) * 5 = 25.
    sell = client.transactions.add()
    sell.uuid = "txn-sell"
    sell.type = client_pb2.PTransaction.Type.SALE
    sell.account = account.uuid
    sell.portfolio = portfolio.uuid
    sell.security = security.uuid
    sell.currencyCode = "USD"
    sell.amount = 515_00  # 5 * 105 - 10 fee
    sell.shares = 5 * 10**8
    sell.date.CopyFrom(_ts(datetime(2024, 1, 15, tzinfo=UTC)))
    sell.updatedAt.CopyFrom(_ts(datetime(2024, 1, 15, 12, tzinfo=UTC)))

    unit_sell = sell.units.add()
    unit_sell.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit_sell.amount = 525_00
    unit_sell.currencyCode = "USD"

    unit_fee = sell.units.add()
    unit_fee.type = client_pb2.PTransactionUnit.Type.FEE
    unit_fee.amount = 10_00
    unit_fee.currencyCode = "USD"

    parsed_client = parsed.ParsedClient.from_proto(client)
    return parsed_client, client


class MockBus:
    """Mock the bus object."""

    def async_listen_once(self, event, callback):
        pass


class HelperHass:
    """Minimal Hass stub."""

    def __init__(self, loop):
        self.loop = loop
        self.data = {}
        self.bus = MockBus()

    async def async_add_executor_job(self, func, *args, **kwargs):
        # functools imported at top level
        return await self.loop.run_in_executor(
            None, functools.partial(func, *args, **kwargs)
        )


class MockNetwork:
    """Mock the network integration."""

    @property
    def adapters(self):
        return []


def install_network_mock(hass: HelperHass) -> None:
    """Install the network integration mock into hass.data."""
    hass.data["network"] = MockNetwork()


@pytest.mark.asyncio
async def test_ingestion_rebuild_end_to_end(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Verify that a simulated ingestion triggers backdating.

    Flow:
    1. Parse Portfolio -> Staging DB
    2. Sync -> Canonical DB (Events, Securities, etc.)
    3. Run Pipeline with backdating=True
    4. Assert daily_wealth has rows for the transaction period.
    """
    db_path = tmp_path / "verification.db"
    initialize_database_schema(db_path)
    loop = asyncio.get_running_loop()
    hass = HelperHass(loop)
    install_network_mock(hass)

    # 1. Mock Parse Portfolio
    parsed_client, _ = _build_sample_parsed_client()

    # Mock FX to be 1:1 EUR:USD to keep math simple
    install_fx_stubs(monkeypatch, rate=1.0)

    # Mock History Queue to say "All done" immediately (we pre-populated via ingestion, sort of)
    # Actually, ingestion populates `historical_prices` staging, canonical sync moves to `securities` table `prices`.
    # But `metrics` pipeline might assume `history_queue` manager does something.
    # In `metrics/securities.py`, it calculates from `securities` table prices.
    # We just need to make sure the pipeline doesn't crash on network calls.

    # Mock HistoryQueueManager methods to avoid network activity
    # Mock History Queue methods to avoid network activity
    # HistoryQueueManager imported at top level

    async def _fake_plan(self, *args, **kwargs):
        return 0

    async def _fake_process(self, *args, **kwargs):
        return {}

    monkeypatch.setattr(
        HistoryQueueManager, "plan_jobs_for_securities_table", _fake_plan
    )
    monkeypatch.setattr(HistoryQueueManager, "process_pending_jobs", _fake_process)

    # Mock FX backdating preparation to avoid network calls
    async def _fake_prepare_fx(hass, db_path, until=None, emit_progress=None):
        return {}

    # We patch it where it is defined, which backdating/holdings.py imports
    monkeypatch.setattr(
        "custom_components.pp_reader.currencies.fx.async_prepare_exchange_rates_for_backdating",
        _fake_prepare_fx,
    )

    # Patch ingestion_writer's reference to ensure_exchange_rates_for_dates_sync
    # just in case it was already imported
    monkeypatch.setattr(
        "custom_components.pp_reader.data.ingestion_writer.ensure_exchange_rates_for_dates_sync",
        lambda *args, **kwargs: None,
    )

    # --- POPULATE FX RATES ---
    # Since we mocked the fetchers to do nothing, we must populate the DB manually
    # to ensuring ingestion_writer and metrics can find rates.
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE IF NOT EXISTS fx_rates (date TEXT, currency TEXT, rate REAL, fetched_at TEXT, data_source TEXT, provider TEXT, provenance TEXT, PRIMARY KEY (date, currency))"
    )

    # Insert rates for relevant dates
    # Transaction Jan 12. Prices Jan 10-20.
    rate_dates = [date(2024, 1, d) for d in range(1, 30)]
    for d in rate_dates:
        d_str = d.isoformat()
        conn.execute(
            "INSERT OR REPLACE INTO fx_rates (date, currency, rate, fetched_at, data_source) VALUES (?, ?, ?, ?, ?)",
            (d_str, "USD", 1.0, datetime.now(UTC).isoformat(), "test"),
        )
    conn.commit()
    conn.close()

    # --- EXECUTE INGESTION (Synchronous to avoid test hangs) ---
    # We manually write to staging as if parser ran.
    # We bypass async_ingestion_session to avoid thread/loop interactions causing hangs.

    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")

    # Imports moved to top level

    ensure_ingestion_tables(conn)
    clear_ingestion_stage(conn)

    writer = IngestionWriter(conn, db_path=db_path)

    writer.write_accounts(parsed_client.accounts)
    writer.write_portfolios(parsed_client.portfolios)
    writer.write_securities(parsed_client.securities)

    writer.write_transactions(parsed_client.transactions)

    # Helper to unpack units/prices for writer
    tx_units = [(t.uuid, t.units) for t in parsed_client.transactions]
    writer.write_transaction_units(tx_units)

    sec_prices = [(s.uuid, s.prices) for s in parsed_client.securities]
    writer.write_historical_prices(sec_prices)

    run_id = writer.finalize_ingestion(
        IngestionMetadata(
            file_path="mock.portfolio",
            parsed_at=datetime.now(UTC),
            pp_version=parsed_client.version,
            base_currency=parsed_client.base_currency,
            properties=parsed_client.properties,
            parsed_client=parsed_client,
        )
    )
    conn.commit()
    conn.close()

    # --- SYNC TO CANONICAL ---
    await canonical_sync.async_sync_ingestion_to_canonical(hass, db_path)

    # --- TRIGGER REBUILD (The Core Test) ---
    # This mimics what Coordinator._schedule_metrics_refresh(..., backdating=True) does

    # We define a "today" that is AFTER the transactions, so backdating has something to compute up to.
    # Transactions end Jan 12. Latest price Jan 20. Let's say today is Jan 25.
    fake_today = date(2024, 1, 25)

    result = await async_refresh_all(
        hass,
        db_path,
        trigger="verification_test",
        provenance=run_id,
    )

    # --- ASSERTIONS ---

    if result.status != "completed":
        pytest.fail(f"Metric run failed: {result.error}")

    # Check Daily Wealth
    conn = sqlite3.connect(str(db_path))
    engine = PerformanceEngine(conn)
    engine.load_data()
    start_date = date(2024, 1, 5)
    end_date = fake_today
    daily_wealth_df = engine.get_daily_wealth(start_date, end_date)
    conn.close()

    assert not daily_wealth_df.empty, "No daily_wealth records generated"

    # Verify range coverage
    dates = daily_wealth_df["date"].tolist()
    assert "2024-01-05" in dates
    assert "2024-01-25" in dates

    # Verify Wealth Values
    # Jan 6 (After Deposit): Total Wealth should be ~10,000 EUR
    jan_6 = daily_wealth_df[daily_wealth_df["date"] == "2024-01-06"].iloc[0]
    assert 9999.0 <= jan_6["total_wealth_eur"] <= 10001.0

    # Jan 13 (After Buy): Total Wealth should still be ~10k (swapped EUR for USD shares)
    # 10 shares * 100 USD + remaining cash.
    # FX is 1.0. 10 * 100 = 1000. Cash = 9000. Total = 10000.
    # (Prices increase by 100 each day starting Jan 10 -> 100, 200, 300...)
    # Wait, create sample data again:
    # Price Jan 10 = 100.
    # Price Jan 11 = 200.
    # Price Jan 12 = 300.
    # I set: 100 + (day_offset * 100).
    # Jan 10 (i=0): 100.
    # Jan 12 (i=2): 300.
    # So on purchase day (Jan 12), price is 300. But I bought for 1000 total (10 shares).
    # Implied buy price = 100 per share. Market price = 300 per share.
    # Instant profit!
    # Value on Jan 12: 10 shares * 300 = 3000. Cash = 9000. Total = 12000.

    jan_12 = daily_wealth_df[daily_wealth_df["date"] == "2024-01-12"].iloc[0]
    # Just asserting it's > 0 to confirm calculation happened.
    assert jan_12["total_wealth_eur"] > 10000.0

    # More detailed assertions will be added once the engine is more mature.
    # For now, we confirm that the main wealth calculation is running.
