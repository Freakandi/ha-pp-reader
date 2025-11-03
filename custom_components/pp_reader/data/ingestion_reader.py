"""Helpers for loading staging data from the ingestion pipeline."""

from __future__ import annotations

import json
import sqlite3  # noqa: TC003
from collections.abc import Iterable, Sequence  # noqa: TC003
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from custom_components.pp_reader.models import parsed

try:  # pragma: no cover - optional dependency
    from google.protobuf.timestamp_pb2 import Timestamp as _ProtoTimestamp
except ModuleNotFoundError:  # pragma: no cover - protobuf optional
    _ProtoTimestamp = None

try:  # pragma: no cover - optional dependency
    from custom_components.pp_reader.name.abuchen.portfolio import (
        client_pb2 as _client_pb2,
    )
except ModuleNotFoundError:  # pragma: no cover - protobuf optional
    _client_pb2 = None

SqliteRow = tuple[Any, ...]
PriceRow = tuple[int, int | None, int | None, int | None, int | None]
UnitRow = tuple[int, int, int | None, str | None, int | None, str | None, float | None]


@dataclass(slots=True)
class IngestionSnapshot:
    """Aggregated ingestion payload constructed from staging tables."""

    metadata: dict[str, Any]
    client: parsed.ParsedClient

    @property
    def run_id(self) -> str | None:
        """Return the staging run identifier if available."""
        return self.metadata.get("run_id")

    @property
    def parsed_at(self) -> datetime | None:
        """Return the timestamp of the ingestion run."""
        return self.metadata.get("parsed_at")

    @property
    def base_currency(self) -> str | None:
        """Shortcut to the parsed client's base currency."""
        return self.client.base_currency


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _load_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    if isinstance(data, dict):
        return data
    return {}


def load_metadata(conn: sqlite3.Connection) -> dict[str, Any]:
    """Return the latest ingestion metadata row."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT run_id, file_path, parsed_at, pp_version, base_currency, properties
        FROM ingestion_metadata
        ORDER BY parsed_at DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    if not row:
        return {}

    run_id, file_path, parsed_at, pp_version, base_currency, properties = row
    return {
        "run_id": run_id,
        "file_path": file_path,
        "parsed_at": _parse_datetime(parsed_at),
        "pp_version": int(pp_version) if pp_version is not None else None,
        "base_currency": base_currency,
        "properties": _load_json(properties),
    }


def load_accounts(conn: sqlite3.Connection) -> list[parsed.ParsedAccount]:
    """Load all accounts from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, currency_code, note, is_retired, attributes, updated_at
        FROM ingestion_accounts
        ORDER BY rowid
        """
    )

    accounts: list[parsed.ParsedAccount] = []
    for row in cursor.fetchall():
        uuid, name, currency_code, note, is_retired, attributes, updated_at = row
        accounts.append(
            parsed.ParsedAccount(
                uuid=uuid,
                name=name or "",
                currency_code=currency_code,
                note=note,
                is_retired=bool(is_retired),
                attributes=_load_json(attributes),
                updated_at=_parse_datetime(updated_at),
            )
        )
    return accounts


def load_portfolios(conn: sqlite3.Connection) -> list[parsed.ParsedPortfolio]:
    """Load all portfolios from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, note, reference_account, is_retired, attributes, updated_at
        FROM ingestion_portfolios
        ORDER BY rowid
        """
    )

    portfolios: list[parsed.ParsedPortfolio] = []
    for row in cursor.fetchall():
        (
            uuid,
            name,
            note,
            reference_account,
            is_retired,
            attributes,
            updated_at,
        ) = row
        portfolios.append(
            parsed.ParsedPortfolio(
                uuid=uuid,
                name=name or "",
                note=note,
                reference_account=reference_account,
                is_retired=bool(is_retired),
                attributes=_load_json(attributes),
                updated_at=_parse_datetime(updated_at),
            )
        )
    return portfolios


def _load_price_rows(conn: sqlite3.Connection) -> dict[str, list[SqliteRow]]:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT security_uuid, date, close, high, low, volume
        FROM ingestion_historical_prices
        ORDER BY security_uuid, date
        """
    )

    price_rows: dict[str, list[SqliteRow]] = {}
    for row in cursor.fetchall():
        security_uuid = row[0]
        price_rows.setdefault(security_uuid, []).append(row)
    return price_rows


def load_securities(conn: sqlite3.Connection) -> list[parsed.ParsedSecurity]:
    """Load all securities (including price history) from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT uuid, name, currency_code, target_currency_code, isin, ticker_symbol,
               wkn, note, online_id, feed, feed_url, latest_feed, latest_feed_url,
               latest_date, latest_close, latest_high, latest_low, latest_volume,
               is_retired, attributes, properties, updated_at
        FROM ingestion_securities
        ORDER BY rowid
        """
    )

    price_rows = _load_price_rows(conn)
    securities: list[parsed.ParsedSecurity] = []

    for row in cursor.fetchall():
        (
            uuid,
            name,
            currency_code,
            target_currency_code,
            isin,
            ticker_symbol,
            wkn,
            note,
            online_id,
            feed,
            feed_url,
            latest_feed,
            latest_feed_url,
            latest_date,
            latest_close,
            latest_high,
            latest_low,
            latest_volume,
            is_retired,
            attributes,
            properties,
            updated_at,
        ) = row

        latest_price = None
        if latest_date is not None:
            latest_price = parsed.ParsedHistoricalPrice(
                date=int(latest_date),
                close=int(latest_close) if latest_close is not None else None,
                high=int(latest_high) if latest_high is not None else None,
                low=int(latest_low) if latest_low is not None else None,
                volume=int(latest_volume) if latest_volume is not None else None,
            )

        prices: list[parsed.ParsedHistoricalPrice] = []
        for _, date, close, high, low, volume in price_rows.get(uuid, []):
            prices.append(
                parsed.ParsedHistoricalPrice(
                    date=int(date),
                    close=int(close) if close is not None else None,
                    high=int(high) if high is not None else None,
                    low=int(low) if low is not None else None,
                    volume=int(volume) if volume is not None else None,
                )
            )

        securities.append(
            parsed.ParsedSecurity(
                uuid=uuid,
                name=name or "",
                currency_code=currency_code,
                target_currency_code=target_currency_code,
                isin=isin,
                ticker_symbol=ticker_symbol,
                wkn=wkn,
                note=note,
                online_id=online_id,
                feed=feed,
                feed_url=feed_url,
                latest_feed=latest_feed,
                latest_feed_url=latest_feed_url,
                prices=prices,
                latest=latest_price,
                is_retired=bool(is_retired),
                attributes=_load_json(attributes),
                properties=_load_json(properties),
                updated_at=_parse_datetime(updated_at),
            )
        )

    return securities


def _load_transaction_units(
    rows: Iterable[SqliteRow],
) -> dict[str, list[parsed.ParsedTransactionUnit]]:
    unit_map: dict[str, list[parsed.ParsedTransactionUnit]] = {}
    for (
        txn_uuid,
        unit_index,
        unit_type,
        amount,
        currency_code,
        fx_amount,
        fx_currency_code,
        fx_rate,
    ) in rows:
        unit = parsed.ParsedTransactionUnit(
            type=int(unit_type),
            amount=int(amount) if amount is not None else None,
            currency_code=currency_code,
            fx_amount=int(fx_amount) if fx_amount is not None else None,
            fx_currency_code=fx_currency_code,
            fx_rate_to_base=fx_rate if fx_rate is not None else None,
        )
        unit_map.setdefault(txn_uuid, []).append((int(unit_index), unit))

    ordered: dict[str, list[parsed.ParsedTransactionUnit]] = {}
    for txn_uuid, entries in unit_map.items():
        ordered[txn_uuid] = [
            unit for _, unit in sorted(entries, key=lambda item: item[0])
        ]
    return ordered


def load_transactions(conn: sqlite3.Connection) -> list[parsed.ParsedTransaction]:
    """Load transactions (including units) from the staging layer."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT transaction_uuid, unit_index, type, amount, currency_code,
               fx_amount, fx_currency_code, fx_rate_to_base
        FROM ingestion_transaction_units
        ORDER BY transaction_uuid, unit_index
        """
    )
    unit_map = _load_transaction_units(cursor.fetchall())

    cursor.execute(
        """
        SELECT uuid, type, account, portfolio, other_account, other_portfolio,
               other_uuid, other_updated_at, date, currency_code, amount, shares,
               note, security, source, updated_at
        FROM ingestion_transactions
        ORDER BY rowid
        """
    )

    transactions: list[parsed.ParsedTransaction] = []
    for row in cursor.fetchall():
        (
            uuid,
            txn_type,
            account,
            portfolio,
            other_account,
            other_portfolio,
            other_uuid,
            other_updated_at,
            date_value,
            currency_code,
            amount,
            shares,
            note,
            security,
            source,
            updated_at,
        ) = row

        transactions.append(
            parsed.ParsedTransaction(
                uuid=uuid,
                type=int(txn_type),
                account=account,
                portfolio=portfolio,
                other_account=other_account,
                other_portfolio=other_portfolio,
                other_uuid=other_uuid,
                other_updated_at=_parse_datetime(other_updated_at),
                date=_parse_datetime(date_value),
                currency_code=currency_code,
                amount=int(amount) if amount is not None else None,
                shares=int(shares) if shares is not None else None,
                note=note,
                security=security,
                source=source,
                updated_at=_parse_datetime(updated_at),
                units=unit_map.get(uuid, []),
            )
        )

    return transactions


def load_ingestion_snapshot(conn: sqlite3.Connection) -> IngestionSnapshot | None:
    """Return a parsed snapshot containing metadata and entity dataclasses."""
    metadata = load_metadata(conn)
    if not metadata:
        return None

    accounts = load_accounts(conn)
    portfolios = load_portfolios(conn)
    securities = load_securities(conn)
    transactions = load_transactions(conn)

    client = parsed.ParsedClient(
        version=metadata.get("pp_version") or 0,
        base_currency=metadata.get("base_currency"),
        accounts=accounts,
        portfolios=portfolios,
        securities=securities,
        transactions=transactions,
        properties=metadata.get("properties") or {},
    )
    return IngestionSnapshot(metadata=metadata, client=client)


def _copy_timestamp(destination: Any, value: datetime | None) -> None:
    if _ProtoTimestamp is None or value is None:
        return
    proto_ts = _ProtoTimestamp()
    proto_ts.FromDatetime(value)
    destination.CopyFrom(proto_ts)


def _copy_any_map(container: Any, data: dict[str, Any]) -> None:
    for key, value in data.items():
        entry = container.add()
        entry.key = str(key)
        entry.value.string = str(value)


def _apply_accounts_proto(
    client: Any, accounts: Sequence[parsed.ParsedAccount]
) -> None:
    for account in accounts:
        dest = client.accounts.add()
        dest.uuid = account.uuid
        dest.name = account.name
        if account.currency_code:
            dest.currencyCode = account.currency_code
        if account.note:
            dest.note = account.note
        dest.isRetired = account.is_retired
        _copy_any_map(dest.attributes, account.attributes)
        _copy_timestamp(dest.updatedAt, account.updated_at)


def _apply_portfolios_proto(
    client: Any, portfolios: Sequence[parsed.ParsedPortfolio]
) -> None:
    for portfolio in portfolios:
        dest = client.portfolios.add()
        dest.uuid = portfolio.uuid
        dest.name = portfolio.name
        if portfolio.note:
            dest.note = portfolio.note
        if portfolio.reference_account:
            dest.referenceAccount = portfolio.reference_account
        dest.isRetired = portfolio.is_retired
        _copy_any_map(dest.attributes, portfolio.attributes)
        _copy_timestamp(dest.updatedAt, portfolio.updated_at)


def _apply_securities_proto(  # noqa: PLR0912
    client: Any, securities: Sequence[parsed.ParsedSecurity]
) -> None:
    for security in securities:
        dest = client.securities.add()
        dest.uuid = security.uuid
        dest.name = security.name
        if security.currency_code:
            dest.currencyCode = security.currency_code
        if security.target_currency_code:
            dest.targetCurrencyCode = security.target_currency_code
        if security.isin:
            dest.isin = security.isin
        if security.ticker_symbol:
            dest.tickerSymbol = security.ticker_symbol
        if security.wkn:
            dest.wkn = security.wkn
        if security.note:
            dest.note = security.note
        if security.online_id:
            dest.onlineId = security.online_id
        if security.feed:
            dest.feed = security.feed
        if security.feed_url:
            dest.feedURL = security.feed_url
        if security.latest_feed:
            dest.latestFeed = security.latest_feed
        if security.latest_feed_url:
            dest.latestFeedURL = security.latest_feed_url
        dest.isRetired = security.is_retired
        _copy_any_map(dest.attributes, security.attributes)
        _copy_any_map(dest.properties, security.properties)
        _copy_timestamp(dest.updatedAt, security.updated_at)

        if security.latest:
            latest = dest.latest
            latest.date = int(security.latest.date)
            if security.latest.close is not None:
                latest.close = int(security.latest.close)
            if security.latest.high is not None:
                latest.high = int(security.latest.high)
            if security.latest.low is not None:
                latest.low = int(security.latest.low)
            if security.latest.volume is not None:
                latest.volume = int(security.latest.volume)

        for price in security.prices:
            price_proto = dest.prices.add()
            price_proto.date = int(price.date)
            if price.close is not None:
                price_proto.close = int(price.close)
            if price.high is not None:
                price_proto.high = int(price.high)
            if price.low is not None:
                price_proto.low = int(price.low)
            if price.volume is not None:
                price_proto.volume = int(price.volume)


def _apply_transactions_proto(  # noqa: PLR0912
    client: Any, transactions: Sequence[parsed.ParsedTransaction]
) -> None:
    for transaction in transactions:
        dest = client.transactions.add()
        dest.uuid = transaction.uuid
        dest.type = int(transaction.type)
        if transaction.account:
            dest.account = transaction.account
        if transaction.portfolio:
            dest.portfolio = transaction.portfolio
        if transaction.other_account:
            dest.otherAccount = transaction.other_account
        if transaction.other_portfolio:
            dest.otherPortfolio = transaction.other_portfolio
        if transaction.other_uuid:
            dest.otherUuid = transaction.other_uuid
        _copy_timestamp(dest.otherUpdatedAt, transaction.other_updated_at)
        _copy_timestamp(dest.date, transaction.date)
        if transaction.currency_code:
            dest.currencyCode = transaction.currency_code
        if transaction.amount is not None:
            dest.amount = int(transaction.amount)
        if transaction.shares is not None:
            dest.shares = int(transaction.shares)
        if transaction.note:
            dest.note = transaction.note
        if transaction.security:
            dest.security = transaction.security
        if transaction.source:
            dest.source = transaction.source
        _copy_timestamp(dest.updatedAt, transaction.updated_at)

        for unit in transaction.units:
            unit_proto = dest.units.add()
            unit_proto.type = int(unit.type)
            if unit.amount is not None:
                unit_proto.amount = int(unit.amount)
            if unit.currency_code:
                unit_proto.currencyCode = unit.currency_code
            if unit.fx_amount is not None:
                unit_proto.fxAmount = int(unit.fx_amount)
            if unit.fx_currency_code:
                unit_proto.fxCurrencyCode = unit.fx_currency_code
            if unit.fx_rate_to_base is not None:
                rate = abs(unit.fx_rate_to_base)
                decimal = unit_proto.fxRateToBase
                scale = 8
                scaled_value = round(rate * (10**scale))
                decimal.scale = scale
                decimal.precision = 0
                decimal.value = int(scaled_value).to_bytes(
                    8, byteorder="little", signed=True
                )
def load_proto_snapshot(conn: sqlite3.Connection) -> Any | None:
    """Return a protobuf PClient constructed from staging data."""
    if _client_pb2 is None:
        return None

    snapshot = load_ingestion_snapshot(conn)
    if snapshot is None:
        return None

    parsed_client = snapshot.client

    client = _client_pb2.PClient()
    if parsed_client.base_currency:
        client.baseCurrency = parsed_client.base_currency
    if parsed_client.version:
        client.version = int(parsed_client.version)

    _copy_any_map(client.properties, parsed_client.properties)
    _apply_accounts_proto(client, parsed_client.accounts)
    _apply_portfolios_proto(client, parsed_client.portfolios)
    _apply_securities_proto(client, parsed_client.securities)
    _apply_transactions_proto(client, parsed_client.transactions)

    return client
