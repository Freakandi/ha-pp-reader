"""Typed dataclasses for parsed Portfolio Performance payloads."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Iterable, Mapping

    from google.protobuf.timestamp_pb2 import Timestamp

    from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
else:  # pragma: no cover - runtime fallbacks to avoid import errors
    Iterable = Mapping = Any  # type: ignore[assignment]
    client_pb2 = Any  # type: ignore[assignment]
    Timestamp = Any  # type: ignore[assignment]

UTC = timezone.utc  # noqa: UP017 - compatible with Python <3.11

__all__ = [
    "ParsedAccount",
    "ParsedClient",
    "ParsedHistoricalPrice",
    "ParsedPortfolio",
    "ParsedSecurity",
    "ParsedTransaction",
    "ParsedTransactionUnit",
]


def _timestamp_to_datetime(ts: Timestamp | None) -> datetime | None:
    """Convert a protobuf timestamp into a timezone-aware datetime."""
    if ts is None:
        return None
    if ts.seconds == 0 and ts.nanos == 0:
        return None
    return ts.ToDatetime().replace(tzinfo=UTC)


def _maybe_field(message: Any, field_name: str) -> Any:
    """Return an optional protobuf attribute if presence is set."""
    if not hasattr(message, field_name):
        return None

    value = getattr(message, field_name)
    has_field = getattr(message, "HasField", None)
    if callable(has_field):
        try:
            if has_field(field_name):
                return value
        except ValueError:
            return value
        return None
    return value


def _parse_decimal_value(pdecimal: client_pb2.PDecimalValue | None) -> float | None:
    """Convert a protobuf decimal helper into a floating-point number."""
    if pdecimal is None:
        return None

    has_field = getattr(pdecimal, "HasField", None)
    if callable(has_field):
        try:
            if not has_field("value"):
                return None
        except ValueError:
            if not pdecimal.value:
                return None
    elif not getattr(pdecimal, "value", None):
        return None

    value = int.from_bytes(pdecimal.value, byteorder="little", signed=True)
    return value / (10**pdecimal.scale)


def _parse_any_value(value: client_pb2.PAnyValue | None) -> Any:
    """Deserialize a polymorphic PAnyValue message into primitives."""
    if value is None:
        return None

    kind = value.WhichOneof("value")
    if kind is None or kind == "null":
        return None
    if kind == "map":
        return _parse_map(value.map)

    attr_map = {
        "string": value.string,
        "int32": int(value.int32),
        "int64": int(value.int64),
        "double": float(value.double),
        "bool": bool(value.bool),
    }
    return attr_map.get(kind)


def _parse_key_value_entries(entries: Iterable[client_pb2.PKeyValue]) -> dict[str, Any]:
    """Convert repeated key/value entries into a Python dictionary."""
    result: dict[str, Any] = {}
    for entry in entries:
        result[entry.key] = _parse_any_value(_maybe_field(entry, "value"))
    return result


def _parse_map(value: client_pb2.PMap | None) -> dict[str, Any]:
    """Convert a protobuf map helper message to a dictionary."""
    if value is None:
        return {}
    return _parse_key_value_entries(value.entries)


@dataclass(slots=True)
class ParsedTransactionUnit:
    """Representation of a PTransactionUnit message."""

    type: int
    amount: int | None
    currency_code: str | None
    fx_amount: int | None = None
    fx_currency_code: str | None = None
    fx_rate_to_base: float | None = None

    @classmethod
    def from_proto(cls, unit: client_pb2.PTransactionUnit) -> ParsedTransactionUnit:
        """Build a transaction unit from the protobuf representation."""
        return cls(
            type=int(unit.type),
            amount=_maybe_field(unit, "amount"),
            currency_code=_maybe_field(unit, "currencyCode"),
            fx_amount=_maybe_field(unit, "fxAmount"),
            fx_currency_code=_maybe_field(unit, "fxCurrencyCode"),
            fx_rate_to_base=_parse_decimal_value(_maybe_field(unit, "fxRateToBase")),
        )


@dataclass(slots=True)
class ParsedHistoricalPrice:
    """Historical price point captured in the portfolio export."""

    date: int
    close: int | None
    high: int | None = None
    low: int | None = None
    volume: int | None = None

    @classmethod
    def from_proto(
        cls,
        message: client_pb2.PHistoricalPrice | client_pb2.PFullHistoricalPrice,
    ) -> ParsedHistoricalPrice:
        """Build a historical price from protobuf data."""
        return cls(
            date=int(getattr(message, "date", 0)),
            close=_maybe_field(message, "close"),
            high=_maybe_field(message, "high"),
            low=_maybe_field(message, "low"),
            volume=_maybe_field(message, "volume"),
        )


@dataclass(slots=True)
class ParsedAccount:
    """Account metadata from the portfolio export."""

    uuid: str
    name: str
    currency_code: str | None
    note: str | None
    is_retired: bool
    attributes: dict[str, Any] = field(default_factory=dict)
    updated_at: datetime | None = None

    @classmethod
    def from_proto(cls, account: client_pb2.PAccount) -> ParsedAccount:
        """Build an account model from the protobuf representation."""
        return cls(
            uuid=account.uuid,
            name=account.name,
            currency_code=account.currencyCode or None,
            note=_maybe_field(account, "note"),
            is_retired=bool(account.isRetired),
            attributes=_parse_key_value_entries(account.attributes),
            updated_at=_timestamp_to_datetime(_maybe_field(account, "updatedAt")),
        )


@dataclass(slots=True)
class ParsedPortfolio:
    """Portfolio metadata from the portfolio export."""

    uuid: str
    name: str
    note: str | None
    is_retired: bool
    reference_account: str | None
    attributes: dict[str, Any] = field(default_factory=dict)
    updated_at: datetime | None = None

    @classmethod
    def from_proto(cls, portfolio: client_pb2.PPortfolio) -> ParsedPortfolio:
        """Build a portfolio model from the protobuf representation."""
        return cls(
            uuid=portfolio.uuid,
            name=portfolio.name,
            note=_maybe_field(portfolio, "note"),
            is_retired=bool(portfolio.isRetired),
            reference_account=_maybe_field(portfolio, "referenceAccount"),
            attributes=_parse_key_value_entries(portfolio.attributes),
            updated_at=_timestamp_to_datetime(_maybe_field(portfolio, "updatedAt")),
        )


@dataclass(slots=True)
class ParsedSecurity:
    """Security metadata including historical pricing."""

    uuid: str
    name: str
    currency_code: str | None
    target_currency_code: str | None
    isin: str | None
    ticker_symbol: str | None
    wkn: str | None
    note: str | None
    online_id: str | None
    feed: str | None
    feed_url: str | None
    latest_feed: str | None
    latest_feed_url: str | None
    is_retired: bool
    attributes: dict[str, Any] = field(default_factory=dict)
    properties: dict[str, Any] = field(default_factory=dict)
    prices: list[ParsedHistoricalPrice] = field(default_factory=list)
    latest: ParsedHistoricalPrice | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_proto(cls, security: client_pb2.PSecurity) -> ParsedSecurity:
        """Build a security model from the protobuf representation."""
        latest_price = None
        if security.HasField("latest"):
            latest_price = ParsedHistoricalPrice.from_proto(security.latest)

        return cls(
            uuid=security.uuid,
            name=security.name,
            currency_code=_maybe_field(security, "currencyCode"),
            target_currency_code=_maybe_field(security, "targetCurrencyCode"),
            isin=_maybe_field(security, "isin"),
            ticker_symbol=_maybe_field(security, "tickerSymbol"),
            wkn=_maybe_field(security, "wkn"),
            note=_maybe_field(security, "note"),
            online_id=_maybe_field(security, "onlineId"),
            feed=_maybe_field(security, "feed"),
            feed_url=_maybe_field(security, "feedURL"),
            latest_feed=_maybe_field(security, "latestFeed"),
            latest_feed_url=_maybe_field(security, "latestFeedURL"),
            is_retired=bool(security.isRetired),
            attributes=_parse_key_value_entries(security.attributes),
            properties=_parse_key_value_entries(security.properties),
            prices=[
                ParsedHistoricalPrice.from_proto(price) for price in security.prices
            ],
            latest=latest_price,
            updated_at=_timestamp_to_datetime(_maybe_field(security, "updatedAt")),
        )


@dataclass(slots=True)
class ParsedTransaction:
    """Transaction data emitted by the portfolio export."""

    uuid: str
    type: int
    account: str | None
    portfolio: str | None
    other_account: str | None
    other_portfolio: str | None
    other_uuid: str | None
    other_updated_at: datetime | None
    date: datetime | None
    currency_code: str | None
    amount: int | None
    shares: int | None
    note: str | None
    security: str | None
    source: str | None
    updated_at: datetime | None
    units: list[ParsedTransactionUnit] = field(default_factory=list)

    @classmethod
    def from_proto(cls, transaction: client_pb2.PTransaction) -> ParsedTransaction:
        """Build a transaction model from the protobuf representation."""
        return cls(
            uuid=transaction.uuid,
            type=int(transaction.type),
            account=_maybe_field(transaction, "account"),
            portfolio=_maybe_field(transaction, "portfolio"),
            other_account=_maybe_field(transaction, "otherAccount"),
            other_portfolio=_maybe_field(transaction, "otherPortfolio"),
            other_uuid=_maybe_field(transaction, "otherUuid"),
            other_updated_at=_timestamp_to_datetime(
                _maybe_field(transaction, "otherUpdatedAt")
            ),
            date=_timestamp_to_datetime(_maybe_field(transaction, "date")),
            currency_code=_maybe_field(transaction, "currencyCode"),
            amount=_maybe_field(transaction, "amount"),
            shares=_maybe_field(transaction, "shares"),
            note=_maybe_field(transaction, "note"),
            security=_maybe_field(transaction, "security"),
            source=_maybe_field(transaction, "source"),
            updated_at=_timestamp_to_datetime(_maybe_field(transaction, "updatedAt")),
            units=[
                ParsedTransactionUnit.from_proto(unit) for unit in transaction.units
            ],
        )


@dataclass(slots=True)
class ParsedClient:
    """Container aggregating parsed portfolio performance data."""

    version: int
    base_currency: str | None
    accounts: list[ParsedAccount] = field(default_factory=list)
    portfolios: list[ParsedPortfolio] = field(default_factory=list)
    securities: list[ParsedSecurity] = field(default_factory=list)
    transactions: list[ParsedTransaction] = field(default_factory=list)
    properties: Mapping[str, str] = field(default_factory=dict)

    @classmethod
    def from_proto(cls, client: client_pb2.PClient) -> ParsedClient:
        """Build the parsed client container from a protobuf message."""
        properties: Mapping[str, str]
        try:
            properties = dict(client.properties)
        except TypeError:
            properties = {}

        return cls(
            version=int(client.version),
            base_currency=client.baseCurrency or None,
            accounts=[ParsedAccount.from_proto(account) for account in client.accounts],
            portfolios=[
                ParsedPortfolio.from_proto(portfolio) for portfolio in client.portfolios
            ],
            securities=[
                ParsedSecurity.from_proto(security) for security in client.securities
            ],
            transactions=[
                ParsedTransaction.from_proto(transaction)
                for transaction in client.transactions
            ],
            properties=properties,
        )
