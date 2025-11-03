"""Streaming ingestion writer persisting parsed portfolio data to staging tables."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from collections.abc import Mapping, Sequence
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from .db_init import clear_ingestion_stage, ensure_ingestion_tables

if TYPE_CHECKING:
    from custom_components.pp_reader.models import parsed as parsed_models
else:
    parsed_models = None


def _to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat()
    return dt.astimezone(datetime.UTC).isoformat()


def _json_dump(value: Mapping[str, Any] | None) -> str | None:
    if not value:
        return None
    if not isinstance(value, Mapping):  # Defensive: allow mapping-like inputs
        value = dict(value)
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


class IngestionWriter:
    """Persist parsed portfolio entities into staging tables."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        """Store connection reference for subsequent writes."""
        self._conn = conn

    def write_accounts(
        self, accounts: Sequence[parsed_models.ParsedAccount]
    ) -> None:
        """Persist parsed accounts into the staging layer."""
        if not accounts:
            return
        rows = [
            (
                account.uuid,
                account.name,
                account.currency_code,
                account.note,
                int(account.is_retired),
                _json_dump(account.attributes),
                _to_iso(account.updated_at),
            )
            for account in accounts
        ]
        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_accounts (
                uuid, name, currency_code, note, is_retired, attributes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_portfolios(
        self, portfolios: Sequence[parsed_models.ParsedPortfolio]
    ) -> None:
        """Persist parsed portfolios into the staging layer."""
        if not portfolios:
            return
        rows = [
            (
                portfolio.uuid,
                portfolio.name,
                portfolio.note,
                portfolio.reference_account,
                int(portfolio.is_retired),
                _json_dump(portfolio.attributes),
                _to_iso(portfolio.updated_at),
            )
            for portfolio in portfolios
        ]
        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_portfolios (
                uuid, name, note, reference_account, is_retired, attributes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_securities(
        self, securities: Sequence[parsed_models.ParsedSecurity]
    ) -> None:
        """Persist parsed securities and their price payloads."""
        if not securities:
            return

        security_rows: list[tuple[Any, ...]] = []
        price_payload: list[
            tuple[str, Sequence[parsed_models.ParsedHistoricalPrice]]
        ] = []

        for security in securities:
            latest = security.latest
            security_rows.append(
                (
                    security.uuid,
                    security.name,
                    security.currency_code,
                    security.target_currency_code,
                    security.isin,
                    security.ticker_symbol,
                    security.wkn,
                    security.note,
                    security.online_id,
                    security.feed,
                    security.feed_url,
                    security.latest_feed,
                    security.latest_feed_url,
                    latest.date if latest else None,
                    latest.close if latest else None,
                    latest.high if latest else None,
                    latest.low if latest else None,
                    latest.volume if latest else None,
                    int(security.is_retired),
                    _json_dump(security.attributes),
                    _json_dump(security.properties),
                    _to_iso(security.updated_at),
                )
            )
            if security.prices:
                price_payload.append((security.uuid, security.prices))

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_securities (
                uuid, name, currency_code, target_currency_code, isin, ticker_symbol,
                wkn, note, online_id, feed, feed_url, latest_feed, latest_feed_url,
                latest_date, latest_close, latest_high, latest_low, latest_volume,
                is_retired, attributes, properties, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            security_rows,
        )

        if price_payload:
            self.write_historical_prices(price_payload)

    def write_transactions(
        self, transactions: Sequence[parsed_models.ParsedTransaction]
    ) -> None:
        """Persist parsed transactions and associated unit details."""
        if not transactions:
            return

        txn_rows: list[tuple[Any, ...]] = []
        unit_payload: list[
            tuple[str, Sequence[parsed_models.ParsedTransactionUnit]]
        ] = []

        for txn in transactions:
            txn_rows.append(
                (
                    txn.uuid,
                    txn.type,
                    txn.account,
                    txn.portfolio,
                    txn.other_account,
                    txn.other_portfolio,
                    txn.other_uuid,
                    _to_iso(txn.other_updated_at),
                    _to_iso(txn.date),
                    txn.currency_code,
                    txn.amount,
                    txn.shares,
                    txn.note,
                    txn.security,
                    txn.source,
                    _to_iso(txn.updated_at),
                )
            )
            if txn.units:
                unit_payload.append((txn.uuid, txn.units))

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_transactions (
                uuid, type, account, portfolio, other_account, other_portfolio,
                other_uuid, other_updated_at, date, currency_code, amount, shares,
                note, security, source, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            txn_rows,
        )

        if unit_payload:
            self.write_transaction_units(unit_payload)

    def write_transaction_units(
        self,
        payload: Sequence[tuple[str, Sequence[parsed_models.ParsedTransactionUnit]]],
    ) -> None:
        """Persist transaction unit records linked to their parent transaction."""
        rows: list[tuple[Any, ...]] = []
        for txn_uuid, units in payload:
            for idx, unit in enumerate(units):
                rows.append(
                    (
                        txn_uuid,
                        idx,
                        unit.type,
                        unit.amount,
                        unit.currency_code,
                        unit.fx_amount,
                        unit.fx_currency_code,
                        unit.fx_rate_to_base,
                    )
                )

        if not rows:
            return

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_transaction_units (
                transaction_uuid, unit_index, type, amount, currency_code,
                fx_amount, fx_currency_code, fx_rate_to_base
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def write_historical_prices(
        self,
        payload: Sequence[tuple[str, Sequence[parsed_models.ParsedHistoricalPrice]]],
    ) -> None:
        """Persist historical price series for provided securities."""
        rows = [
            (
                security_uuid,
                price.date,
                price.close,
                price.high,
                price.low,
                price.volume,
            )
            for security_uuid, prices in payload
            for price in prices
        ]

        if not rows:
            return

        self._conn.executemany(
            """
            INSERT OR REPLACE INTO ingestion_historical_prices (
                security_uuid, date, close, high, low, volume
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    def finalize_ingestion(
        self,
        *,
        file_path: str | None,
        parsed_at: datetime | None,
        pp_version: int | None,
        base_currency: str | None,
        properties: Mapping[str, str] | None,
    ) -> str:
        """Insert ingestion metadata and return the generated run identifier."""
        run_id = uuid4().hex
        self._conn.execute(
            """
            INSERT OR REPLACE INTO ingestion_metadata (
                run_id, file_path, parsed_at, pp_version, base_currency, properties
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                file_path,
                _to_iso(parsed_at),
                pp_version,
                base_currency,
                _json_dump(properties),
            ),
        )
        return run_id


@asynccontextmanager
async def async_ingestion_session(
    db_path: str | Path,
    *,
    enable_wal: bool = True,
    reset_stage: bool = True,
) -> IngestionWriter:
    """Async context manager yielding an ingestion writer on a SQLite connection."""
    db_path = Path(db_path)

    def _open_connection() -> sqlite3.Connection:
        conn = sqlite3.connect(str(db_path), check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        if enable_wal:
            conn.execute("PRAGMA journal_mode=WAL")
        return conn

    conn = await asyncio.to_thread(_open_connection)
    try:
        await asyncio.to_thread(ensure_ingestion_tables, conn)
        await asyncio.to_thread(conn.execute, "BEGIN")
        if reset_stage:
            await asyncio.to_thread(clear_ingestion_stage, conn)

        writer = IngestionWriter(conn)
        try:
            yield writer
            await asyncio.to_thread(conn.commit)
        except Exception:
            await asyncio.to_thread(conn.rollback)
            raise
    finally:
        await asyncio.to_thread(conn.close)
