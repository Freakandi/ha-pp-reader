"""Tests for parser dataclasses created from Portfolio Performance protos."""

from __future__ import annotations

import sys
import types
from datetime import UTC, datetime

from google.protobuf.timestamp_pb2 import Timestamp

# Minimal Home Assistant stub so the integration package can be imported.
if "homeassistant" not in sys.modules:  # pragma: no cover - test bootstrap
    homeassistant_module = types.ModuleType("homeassistant")
    components_module = types.ModuleType("homeassistant.components")
    websocket_module = types.ModuleType("homeassistant.components.websocket_api")
    components_module.websocket_api = websocket_module
    homeassistant_module.components = components_module
    sys.modules["homeassistant"] = homeassistant_module
    sys.modules["homeassistant.components"] = components_module
    sys.modules["homeassistant.components.websocket_api"] = websocket_module

from custom_components.pp_reader.models import parsed
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2


def _ts(dt: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts


def test_parsed_client_from_proto_accounts() -> None:
    client = client_pb2.PClient()
    client.version = 7
    client.baseCurrency = "EUR"

    account = client.accounts.add()
    account.uuid = "acct-uuid"
    account.name = "Brokerage"
    account.currencyCode = "EUR"
    account.note = "Primary account"
    account.isRetired = False
    account.updatedAt.CopyFrom(_ts(datetime(2024, 2, 3, 10, 5, tzinfo=UTC)))

    attr = account.attributes.add()
    attr.key = "category"
    attr.value.string = "broker"

    parsed_client = parsed.ParsedClient.from_proto(client)

    assert parsed_client.version == 7
    assert parsed_client.base_currency == "EUR"
    assert len(parsed_client.accounts) == 1

    parsed_account = parsed_client.accounts[0]
    assert parsed_account.uuid == "acct-uuid"
    assert parsed_account.name == "Brokerage"
    assert parsed_account.currency_code == "EUR"
    assert parsed_account.note == "Primary account"
    assert parsed_account.attributes == {"category": "broker"}
    assert parsed_account.updated_at == datetime(2024, 2, 3, 10, 5, tzinfo=UTC)


def test_parsed_client_from_proto_securities() -> None:
    client = client_pb2.PClient()

    security = client.securities.add()
    security.uuid = "sec-uuid"
    security.name = "ETF Sample"
    security.currencyCode = "USD"
    security.targetCurrencyCode = "EUR"
    security.isin = "US0000000001"
    security.tickerSymbol = "ETF"
    security.wkn = "WKN123"
    security.note = "Long term"
    security.onlineId = "online-1"
    security.feed = "YAHOO"
    security.feedURL = "https://prices.example/feed"
    security.latestFeed = "YAHOO"
    security.latestFeedURL = "https://prices.example/latest"
    security.isRetired = False
    security.updatedAt.CopyFrom(_ts(datetime(2024, 3, 1, tzinfo=UTC)))

    attr = security.attributes.add()
    attr.key = "category"
    attr.value.string = "Equity"

    prop = security.properties.add()
    prop.key = "expense_ratio"
    prop.value.double = 0.12

    price = security.prices.add()
    price.date = 20240301
    price.close = 12345
    price.high = 13000
    price.low = 12000
    price.volume = 500

    latest = client_pb2.PFullHistoricalPrice()
    latest.date = 20240302
    latest.close = 13000
    security.latest.CopyFrom(latest)

    parsed_client = parsed.ParsedClient.from_proto(client)
    parsed_security = parsed_client.securities[0]

    assert parsed_security.uuid == "sec-uuid"
    assert parsed_security.currency_code == "USD"
    assert parsed_security.target_currency_code == "EUR"
    assert parsed_security.isin == "US0000000001"
    assert parsed_security.ticker_symbol == "ETF"
    assert parsed_security.attributes == {"category": "Equity"}
    assert parsed_security.properties == {"expense_ratio": 0.12}
    assert parsed_security.updated_at == datetime(2024, 3, 1, tzinfo=UTC)
    assert len(parsed_security.prices) == 1
    assert parsed_security.prices[0].close == 12345
    assert parsed_security.latest is not None
    assert parsed_security.latest.close == 13000


def test_parsed_client_from_proto_transactions() -> None:
    client = client_pb2.PClient()

    transaction = client.transactions.add()
    transaction.uuid = "txn-uuid"
    transaction.type = client_pb2.PTransaction.Type.BUY
    transaction.account = "acct-uuid"
    transaction.currencyCode = "EUR"
    transaction.amount = 25000
    transaction.shares = 5
    transaction.note = "Initial buy"
    transaction.security = "sec-uuid"
    transaction.source = "manual"
    transaction.date.CopyFrom(_ts(datetime(2024, 4, 1, 9, tzinfo=UTC)))
    transaction.updatedAt.CopyFrom(_ts(datetime(2024, 4, 2, tzinfo=UTC)))

    unit = transaction.units.add()
    unit.type = client_pb2.PTransactionUnit.Type.GROSS_VALUE
    unit.amount = 25000
    unit.currencyCode = "EUR"
    unit.fxAmount = 27000
    unit.fxCurrencyCode = "USD"
    unit.fxRateToBase.scale = 4
    unit.fxRateToBase.value = (-13500).to_bytes(8, byteorder="little", signed=True)

    parsed_client = parsed.ParsedClient.from_proto(client)
    parsed_transaction = parsed_client.transactions[0]

    assert parsed_transaction.uuid == "txn-uuid"
    assert parsed_transaction.account == "acct-uuid"
    assert parsed_transaction.amount == 25000
    assert parsed_transaction.shares == 5
    assert parsed_transaction.note == "Initial buy"
    assert parsed_transaction.security == "sec-uuid"
    assert parsed_transaction.source == "manual"
    assert parsed_transaction.date == datetime(2024, 4, 1, 9, tzinfo=UTC)
    assert parsed_transaction.updated_at == datetime(2024, 4, 2, tzinfo=UTC)
    assert len(parsed_transaction.units) == 1

    parsed_unit = parsed_transaction.units[0]
    assert parsed_unit.amount == 25000
    assert parsed_unit.fx_amount == 27000
    assert parsed_unit.fx_currency_code == "USD"
    assert parsed_unit.fx_rate_to_base == (-13500) / (10 ** 4)
