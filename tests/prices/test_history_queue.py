"""Tests for Yahoo price history queue helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from custom_components.pp_reader.prices.history_queue import (
    SecurityHistoryTarget,
    build_history_targets_from_parsed,
)


@dataclass
class _StubSecurity:
    uuid: str
    feed: str | None
    ticker_symbol: str | None
    online_id: str | None
    properties: dict[str, Any]
    name: str | None = None


def test_build_history_targets_filters_and_normalises_symbols() -> None:
    securities = [
        _StubSecurity(
            uuid="sec-yahoo",
            feed="YAHOO",
            ticker_symbol=None,
            online_id=None,
            properties={"yahoo.symbol": " yahoo:usd#usd "},
        ),
        _StubSecurity(
            uuid="sec-other",
            feed="MANUAL",
            ticker_symbol="MAN",
            online_id=None,
            properties={},
        ),
        _StubSecurity(
            uuid="sec-fallback",
            feed=None,
            ticker_symbol=" msft ",
            online_id=None,
            properties={},
        ),
    ]

    targets = build_history_targets_from_parsed(securities)
    assert [target.security_uuid for target in targets] == ["sec-yahoo", "sec-fallback"]

    symbol, source = targets[0].resolve_symbol()
    assert symbol == "USD"
    assert source == "property:yahoo.symbol"

    symbol, source = targets[1].resolve_symbol()
    assert symbol == "MSFT"
    assert source == "ticker_symbol"


def test_security_history_target_resolve_symbol_prefers_online_id() -> None:
    target = SecurityHistoryTarget(
        security_uuid="sec-id",
        feed="YAHOO",
        ticker_symbol="ALT",
        online_id="feed:XYZ",
        properties={},
    )

    symbol, source = target.resolve_symbol()
    assert symbol == "XYZ"
    assert source == "online_id"
