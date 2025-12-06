"""Tests for Yahoo price history queue helpers."""

from __future__ import annotations

# ruff: noqa: PLC0415
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import custom_components.pp_reader.prices.history_ingest as history_ingest

from custom_components.pp_reader.prices.history_ingest import (
    _handle_yahoo_dns_error as history_handle_dns_error,
)
from custom_components.pp_reader.prices.history_queue import (
    HistoryCandle,
    SecurityHistoryTarget,
    _epoch_day,
    _persist_candles,
    build_history_targets_from_parsed,
)
from custom_components.pp_reader.prices.yahooquery_provider import (
    _handle_yahoo_dns_error as quotes_handle_dns_error,
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


def test_persist_candles_writes_historical_prices(tmp_path) -> None:
    """Fetched candles should be persisted into the canonical history store."""
    db_path = tmp_path / "history.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE historical_prices (
            security_uuid TEXT,
            date INTEGER,
            close INTEGER,
            high INTEGER,
            low INTEGER,
            volume INTEGER,
            fetched_at TEXT,
            data_source TEXT,
            provider TEXT,
            provenance TEXT,
            PRIMARY KEY (security_uuid, date)
        )
        """
    )
    conn.commit()
    conn.close()

    candle = HistoryCandle(
        symbol="BABA",
        timestamp=datetime(2024, 1, 3, 15, 30, tzinfo=UTC),
        close=12.34,
        high=12.5,
        low=12.0,
        volume=1234,
        data_source="yahoo",
    )

    _persist_candles(db_path, "sec-history", [candle])

    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            """
            SELECT security_uuid, date, close, high, low, volume, fetched_at, data_source, provider, provenance
            FROM historical_prices
            """
        ).fetchone()
        assert row is not None
        assert row[0] == "sec-history"
        assert row[1] == _epoch_day(candle.timestamp)
        assert row[2] == round(12.34 * 1e8)
        assert row[3] == round(12.5 * 1e8)
        assert row[4] == round(12.0 * 1e8)
        assert row[5] == 1234
        assert row[6].endswith("Z")
        assert row[7] == "yahoo"
        assert row[8] == "yahoo"
        assert '"BABA"' in row[9]
    finally:
        conn.close()


def test_yahoo_history_fetcher_requests_inclusive_end(monkeypatch) -> None:
    """Yahoo history requests should cover the target end date (inclusive)."""
    captured: dict[str, Any] = {}

    class _StubTicker:
        def __init__(self, symbol: str, *, asynchronous: bool = False, session: Any | None = None) -> None:
            captured["symbol"] = symbol
            captured["async"] = asynchronous
            captured["session"] = session

        def history(self, *, interval: str, start: str, end: str) -> dict:
            captured["interval"] = interval
            captured["start"] = start
            captured["end"] = end
            return {
                "BABA": {
                    "close": 10.0,
                    "date": "2025-12-05",
                    "high": 10.5,
                    "low": 9.5,
                    "open": 9.9,
                    "volume": 1234,
                }
            }

    class _StubModule:
        def __init__(self) -> None:
            self.Ticker = _StubTicker

    monkeypatch.setattr(history_ingest, "_YAHOOQUERY_IMPORT_ERROR", False)
    monkeypatch.setattr(history_ingest, "import_module", lambda name: _StubModule())

    fetcher = history_ingest.YahooHistoryFetcher()
    job = history_ingest.HistoryJob(
        symbol="BABA",
        start=datetime(2025, 12, 1, tzinfo=UTC),
        end=datetime(2025, 12, 5, tzinfo=UTC),
        interval="1d",
    )

    candles = fetcher._fetch_blocking(job)  # type: ignore[attr-defined]

    assert captured["start"] == "2025-12-01"
    assert captured["end"] == "2025-12-06", "end date should be extended to include the target day"
    assert candles, "expected fetched candles to be normalized"


def test_dns_error_handlers_disable_yahoo_fetch(monkeypatch) -> None:
    """DNS resolution errors should flip the import error guard."""
    # history handler
    monkeypatch.setattr(
        "custom_components.pp_reader.prices.history_ingest._YAHOOQUERY_IMPORT_ERROR",
        False,
    )
    assert history_handle_dns_error(Exception("Could not resolve host: guce.yahoo.com"))
    from custom_components.pp_reader.prices import (
        history_ingest as hist_mod,
    )

    assert hist_mod._YAHOOQUERY_IMPORT_ERROR is False

    # quotes handler
    monkeypatch.setattr(
        "custom_components.pp_reader.prices.yahooquery_provider._YAHOOQUERY_IMPORT_ERROR",
        False,
    )
    assert quotes_handle_dns_error(Exception("Could not resolve host: guce.yahoo.com"))
    from custom_components.pp_reader.prices import (
        yahooquery_provider as quotes_mod,
    )

    assert quotes_mod._YAHOOQUERY_IMPORT_ERROR is False
