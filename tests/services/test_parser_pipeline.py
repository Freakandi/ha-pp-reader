"""Tests for the streaming parser pipeline helpers."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.pp_reader.services import parser_pipeline


class _StubMessage:
    """Lightweight protobuf-style stub providing HasField semantics."""

    def HasField(self, name: str) -> bool:
        value = getattr(self, name, None)
        if isinstance(value, list):
            raise TypeError("repeated field does not support HasField in stub")
        return value is not None


class _StubAccount(_StubMessage):
    def __init__(self) -> None:
        self.uuid = "acc-1"
        self.name = "Main Account"
        self.currencyCode = "EUR"
        self.note = None
        self.isRetired = False
        self.attributes: list[Any] = []
        self.updatedAt = None


class _StubPortfolio(_StubMessage):
    def __init__(self) -> None:
        self.uuid = "port-1"
        self.name = "Growth"
        self.note = None
        self.isRetired = False
        self.referenceAccount = "acc-1"
        self.attributes: list[Any] = []
        self.updatedAt = None


class _StubSecurity(_StubMessage):
    def __init__(self) -> None:
        self.uuid = "sec-1"
        self.name = "ETF World"
        self.currencyCode = "EUR"
        self.targetCurrencyCode = None
        self.isin = "IE00B4L5Y983"
        self.tickerSymbol = "EUNL"
        self.wkn = "A0HGV0"
        self.note = None
        self.onlineId = None
        self.feed = None
        self.feedURL = None
        self.prices: list[Any] = []
        self.latestFeed = None
        self.latestFeedURL = None
        self.latest = None
        self.attributes: list[Any] = []
        self.events: list[Any] = []
        self.properties: list[Any] = []
        self.isRetired = False
        self.updatedAt = None


class _StubTransactionUnit(_StubMessage):
    def __init__(self, type_code: int, amount: int) -> None:
        self.type = type_code
        self.amount = amount
        self.currencyCode = "EUR"
        self.fxAmount = None
        self.fxCurrencyCode = None
        self.fxRateToBase = None


class _StubTransaction(_StubMessage):
    def __init__(self) -> None:
        self.uuid = "txn-1"
        self.type = 0
        self.account = "acc-1"
        self.portfolio = "port-1"
        self.otherAccount = None
        self.otherPortfolio = None
        self.otherUuid = None
        self.otherUpdatedAt = None
        self.date = None
        self.currencyCode = "EUR"
        self.amount = 100_00
        self.shares = None
        self.note = None
        self.security = "sec-1"
        self.source = None
        self.updatedAt = None
        self.units = [
            _StubTransactionUnit(0, 100_00),
            _StubTransactionUnit(1, 15_00),
        ]


class _StubClientModule:
    """client_pb2-style namespace exposing PClient."""

    class PClient(_StubMessage):
        def ParseFromString(self, _payload: bytes) -> None:
            self.version = 1
            self.baseCurrency = "EUR"
            self.accounts = [_StubAccount()]
            self.portfolios = [_StubPortfolio()]
            self.securities = [_StubSecurity()]
            self.transactions = [_StubTransaction()]
            self.properties = {"build": "test-suite"}


class _StubProtobufModule:
    class DecodeError(Exception):
        """Mirror google.protobuf.message.DecodeError."""


@dataclass(slots=True)
class _RecorderWriter:
    """Writer collecting batch invocations for assertions."""

    calls: list[tuple[str, Sequence[Any]]]  # stage -> payload snapshot

    def __init__(self) -> None:
        self.calls = []

    def write_accounts(self, batch: Sequence[Any]) -> None:
        self.calls.append(("accounts", tuple(batch)))

    def write_portfolios(self, batch: Sequence[Any]) -> None:
        self.calls.append(("portfolios", tuple(batch)))

    def write_securities(self, batch: Sequence[Any]) -> None:
        self.calls.append(("securities", tuple(batch)))

    def write_transactions(self, batch: Sequence[Any]) -> None:
        self.calls.append(("transactions", tuple(batch)))

    def finalize(
        self, *, version: int, base_currency: str | None, properties: dict[str, Any]
    ) -> None:
        self.calls.append(
            (
                "finalize",
                (version, base_currency, dict(properties)),
            )
        )


@pytest.mark.asyncio
async def test_async_parse_portfolio_emits_progress(hass, monkeypatch) -> None:
    """Ensure the streaming parser updates writer, callback, and event bus."""
    monkeypatch.setattr(
        parser_pipeline,
        "_get_proto_runtime",
        lambda: (_StubClientModule, _StubProtobufModule),
    )
    monkeypatch.setattr(
        parser_pipeline,
        "async_read_portfolio_bytes",
        AsyncMock(return_value=b"stub"),
    )

    events: list[Any] = []
    hass.bus.async_listen("pp_reader_parser_progress", events.append)

    progress_updates: list[parser_pipeline.ParseProgress] = []

    async def progress_cb(update: parser_pipeline.ParseProgress) -> None:
        progress_updates.append(update)

    writer = _RecorderWriter()

    parsed_client = await parser_pipeline.async_parse_portfolio(
        hass,
        path="fixture.portfolio",
        writer=writer,
        progress_cb=progress_cb,
    )
    await hass.async_block_till_done()

    assert [stage for stage, _ in writer.calls[:4]] == [
        "accounts",
        "portfolios",
        "securities",
        "transactions",
    ]
    finalize_payload = writer.calls[-1]
    assert finalize_payload[0] == "finalize"
    assert finalize_payload[1][0] == 1
    assert finalize_payload[1][1] == "EUR"
    assert finalize_payload[1][2] == {"build": "test-suite"}

    assert [update.stage for update in progress_updates] == [
        "accounts",
        "portfolios",
        "securities",
        "transactions",
    ]
    assert all(update.processed == 1 and update.total == 1 for update in progress_updates)

    assert [event.data["stage"] for event in events] == [
        "accounts",
        "portfolios",
        "securities",
        "transactions",
    ]
    assert all(event.data["total"] == 1 for event in events)

    assert parsed_client.version == 1
    assert parsed_client.base_currency == "EUR"
    assert len(parsed_client.accounts) == 1
    assert len(parsed_client.portfolios) == 1
    assert len(parsed_client.securities) == 1
    assert len(parsed_client.transactions) == 1
