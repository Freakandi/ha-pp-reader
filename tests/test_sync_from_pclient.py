"""Tests for helpers in sync_from_pclient."""

# ruff: noqa: S101 - pytest assertions are expected in tests
from __future__ import annotations

import logging
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import db_schema
from custom_components.pp_reader.data import sync_from_pclient as sync_module
from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.data.sync_from_pclient import (
    _compact_event_data,
    _SyncRunner,
    maybe_field,
)


class _NoPresenceProto:
    """Fake proto message where ``HasField`` raises for scalar attributes."""

    def __init__(self, **values: Any) -> None:
        for key, value in values.items():
            setattr(self, key, value)

    def HasField(self, _name: str) -> bool:  # noqa: N802 - proto compatibility
        message = "Field does not have presence"
        raise ValueError(message)


class _PresenceProto:
    """Fake proto message with explicit presence tracking."""

    def __init__(self, **values: Any) -> None:
        self._values = values
        for key, value in values.items():
            setattr(self, key, value)

    def HasField(self, name: str) -> bool:  # noqa: N802 - proto compatibility
        return name in self._values and self._values[name] is not None


@pytest.mark.parametrize(
    ("message", "field_name", "expected"),
    [
        (_NoPresenceProto(amount=123), "amount", 123),
        (_NoPresenceProto(), "missing", None),
        (_PresenceProto(optional=456), "optional", 456),
        (_PresenceProto(optional=None), "optional", None),
    ],
)
def test_maybe_field_handles_presence(
    message: object,
    field_name: str,
    expected: Any,
) -> None:
    """maybe_field should gracefully handle different presence semantics."""
    assert maybe_field(message, field_name) == expected


class _DummyPortfolio:
    """Minimal portfolio stub exposing attributes accessed by the sync runner."""

    def __init__(self, uuid: str) -> None:
        self.uuid = uuid
        self.name = "Test Portfolio"
        self.note = None
        self.referenceAccount = None
        self.isRetired = False
        self.updatedAt = None

    def HasField(self, name: str) -> bool:  # noqa: N802 - proto compatibility
        return getattr(self, name, None) is not None


class _DummyClient:
    """Provide the minimal client API consumed by ``_SyncRunner``."""

    def __init__(self, portfolios: list[_DummyPortfolio]) -> None:
        self.transactions: list[Any] = []
        self.accounts: list[Any] = []
        self.securities: list[Any] = []
        self.portfolios = portfolios


class _DummyPrice:
    """Simple price stub emulating Portfolio Performance historical prices."""

    def __init__(
        self,
        *,
        date: int,
        close: int,
        high: int | None = None,
        low: int | None = None,
        volume: int | None = None,
    ) -> None:
        self.date = date
        self.close = close
        self.high = high
        self.low = low
        self.volume = volume
        self.DESCRIPTOR = type("Descriptor", (), {"fields_by_name": {}})()


class _DummySecurity:
    """Minimal security stub with historical prices and retire flag."""

    def __init__(
        self,
        *,
        uuid: str,
        name: str,
        currency: str = "EUR",
        retired: bool = False,
        prices: list[_DummyPrice] | None = None,
    ) -> None:
        self.uuid = uuid
        self.name = name
        self.currencyCode = currency
        self.isRetired = retired
        self.prices = prices or []
        self.isin = None
        self.wkn = None
        self.tickerSymbol = None
        self.updatedAt = None

    def HasField(self, name: str) -> bool:  # noqa: N802 - proto compatibility
        return getattr(self, name, None) is not None


class _FakeTimestamp:
    """Simple timestamp stub returning a timezone-aware datetime."""

    def __init__(self, *, seconds: int) -> None:
        self.seconds = seconds

    def ToDatetime(self) -> datetime:
        return datetime.fromtimestamp(self.seconds, tz=UTC)


def _prepare_portfolio_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    schema_statements = (
        *db_schema.SECURITY_SCHEMA,
        *db_schema.PORTFOLIO_SCHEMA,
        *db_schema.PORTFOLIO_SECURITIES_SCHEMA,
    )
    for statement in schema_statements:
        conn.executescript(statement)
    conn.commit()
    return conn


def test_sync_portfolios_commits_changes(tmp_path: Path) -> None:
    """Portfolio synchronisation should leave no open transaction."""
    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    original_error = getattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None)
    sync_module._TIMESTAMP_IMPORT_ERROR = None  # Ensure timestamp guard stays inactive
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )

    runner.cursor = conn.cursor()
    try:
        assert not conn.in_transaction
        runner._sync_portfolios()
        assert not conn.in_transaction
    finally:
        sync_module._TIMESTAMP_IMPORT_ERROR = original_error
        runner.cursor.close()
        conn.close()


def test_compact_event_data_trims_portfolio_values_list() -> None:
    """portfolio_values payloads should lose unused keys and get rounded values."""
    raw = [
        {
            "uuid": "pf-1",
            "name": "Long Portfolio Name",
            "count": "3",
            "value": "1234.567",
            "purchase_sum": "1100.0",
            "ignored": True,
        }
    ]

    compacted = _compact_event_data("portfolio_values", raw)

    assert isinstance(compacted, list)
    assert compacted == [
        {
            "uuid": "pf-1",
            "position_count": 3,
            "current_value": 1234.57,
            "purchase_sum": 1100.0,
            "gain_abs": 134.57,
            "gain_pct": 12.23,
        }
    ]


def test_compact_event_data_trims_portfolio_values_mapping() -> None:
    """Mapping payloads should be normalised and drop auxiliary keys."""
    raw = {
        "portfolios": [
            {
                "uuid": "pf-2",
                "position_count": 1,
                "current_value": 200.987,
                "purchase_sum": 199.0,
                "name": "Unused",
            }
        ],
        "changed_portfolios": ["pf-2", "pf-3"],
        "error": None,
    }

    compacted = _compact_event_data("portfolio_values", raw)

    assert set(compacted.keys()) == {"portfolios", "error"}
    assert compacted["portfolios"] == [
        {
            "uuid": "pf-2",
            "position_count": 1,
            "current_value": 200.99,
            "purchase_sum": 199.0,
            "gain_abs": 1.99,
            "gain_pct": pytest.approx(1.0, rel=0, abs=0.01),
        }
    ]


def test_compact_event_data_trims_portfolio_positions() -> None:
    """Position payloads should retain essential fields and rounding."""
    raw = {
        "portfolio_uuid": "pf-3",
        "positions": [
            {
                "security_uuid": "sec-1",
                "name": "Security A",
                "current_holdings": 5,
                "purchase_value": 123.456,
                "current_value": 150.987,
                "gain_abs": 27.531,
                "gain_pct": 22.1234,
                "debug": "ignore",
            },
            "not-a-mapping",
        ],
        "error": None,
    }

    compacted = _compact_event_data("portfolio_positions", raw)

    assert compacted["portfolio_uuid"] == "pf-3"
    assert compacted["positions"] == [
        {
            "security_uuid": "sec-1",
            "name": "Security A",
            "current_holdings": 5,
            "purchase_value": 123.46,
            "current_value": 150.99,
            "gain_abs": 27.53,
            "gain_pct": 22.12,
        }
    ]


def test_emit_updates_skips_transaction_event(monkeypatch, tmp_path: Path) -> None:
    """Transaction changes should not result in websocket events."""
    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = None
    runner.hass = object()
    runner.entry_id = "entry"
    runner.changes.transactions = True
    runner.changes.accounts = False
    runner.changes.portfolios = False
    runner.changes.last_file_update = False
    runner.changes.portfolio_securities = False

    captured: list[str] = []

    def _capture_event(_hass: Any, _entry_id: str, data_type: str, _data: Any) -> None:
        captured.append(data_type)

    monkeypatch.setattr(sync_module, "_push_update", _capture_event)

    runner._emit_updates()

    assert captured == []

    conn.close()


def test_sync_securities_persists_deduplicated_historical_prices(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Historical Close rows should be deduplicated and ignore retired securities."""
    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    active_security = _DummySecurity(
        uuid="sec-active",
        name="Active",
        prices=[
            _DummyPrice(date=10, close=100),
            _DummyPrice(date=10, close=120),
            _DummyPrice(date=12, close=150),
        ],
    )
    retired_security = _DummySecurity(
        uuid="sec-retired",
        name="Retired",
        retired=True,
        prices=[_DummyPrice(date=8, close=90)],
    )

    runner.client.securities = [active_security, retired_security]

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        runner._sync_securities()
        conn.commit()
        rows = conn.execute(
            """
            SELECT security_uuid, date, close
            FROM historical_prices
            ORDER BY date
            """
        ).fetchall()
    finally:
        runner.cursor.close()
        conn.close()

    assert rows == [
        ("sec-active", 10, 120),
        ("sec-active", 12, 150),
    ]
    assert runner.stats.historical_prices_written == 2
    assert runner.stats.historical_prices_skipped == 2


def test_sync_securities_warns_about_missing_daily_prices(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Missing Tage zwischen zwei Close-Werten sollen Warnungen erzeugen."""
    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    today_epoch_day = int(
        datetime.now(tz=UTC).timestamp() // sync_module.SECONDS_PER_DAY
    )
    start_day = today_epoch_day - 6
    end_day = start_day + 5
    for delta in range(6, 15):
        candidate_start = today_epoch_day - delta
        candidate_end = candidate_start + 5
        business_days = sum(
            datetime.fromtimestamp(
                missing_day * sync_module.SECONDS_PER_DAY, tz=UTC
            ).weekday()
            < 5
            for missing_day in range(candidate_start + 1, candidate_end)
        )
        if business_days >= 4:
            start_day = candidate_start
            end_day = candidate_end
            break

    security_with_gap = _DummySecurity(
        uuid="sec-gap",
        name="Gap Security",
        prices=[
            _DummyPrice(date=start_day, close=100),
            _DummyPrice(date=end_day, close=160),
        ],
    )
    runner.client.securities = [security_with_gap]

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        with caplog.at_level(logging.WARNING):
            runner._sync_securities()
        conn.commit()
    finally:
        runner.cursor.close()
        conn.close()

    gap_logs = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "historische Close" in record.getMessage()
    ]
    assert gap_logs, "Erwarte mindestens eine Warnung für fehlende Tagesdaten"
    assert runner.stats.historical_price_gap_warnings == len(gap_logs)
    assert runner.stats.historical_price_gap_days == 4


def test_sync_securities_ignores_gap_before_first_transaction(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Price gaps before any transaction should not raise warnings."""

    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    today_epoch_day = int(
        datetime.now(tz=UTC).timestamp() // sync_module.SECONDS_PER_DAY
    )
    start_day = today_epoch_day - 40
    end_day = today_epoch_day - 30
    security_with_gap = _DummySecurity(
        uuid="sec-gap-pre-activity",
        name="Gap Ignored",
        prices=[
            _DummyPrice(date=start_day, close=100),
            _DummyPrice(date=end_day, close=110),
        ],
    )
    runner.client.securities = [security_with_gap]

    first_tx_day = end_day + 5
    tx_datetime = datetime.fromtimestamp(
        first_tx_day * sync_module.SECONDS_PER_DAY, tz=UTC
    ).replace(tzinfo=None)
    runner.all_transactions = [
        Transaction(
            uuid="tx-1",
            type=0,
            account=None,
            portfolio=None,
            other_account=None,
            other_portfolio=None,
            date=tx_datetime.isoformat(),
            currency_code="EUR",
            amount=0,
            shares=0,
            security="sec-gap-pre-activity",
        )
    ]
    runner._index_security_activity()

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        with caplog.at_level(logging.WARNING):
            runner._sync_securities()
        conn.commit()
    finally:
        runner.cursor.close()
        conn.close()

    gap_logs = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "historische Close" in record.getMessage()
    ]
    assert not gap_logs
    assert runner.stats.historical_price_gap_warnings == 0
    assert runner.stats.historical_price_gap_days == 0


def test_sync_securities_skips_stale_gap_warnings(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Gaps far in the past should be ignored to avoid log spam."""

    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    stale_security = _DummySecurity(
        uuid="sec-stale",
        name="Stale Gap Security",
        prices=[
            _DummyPrice(date=20, close=100),
            _DummyPrice(date=23, close=160),
        ],
    )
    runner.client.securities = [stale_security]

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        with caplog.at_level(logging.WARNING):
            runner._sync_securities()
        conn.commit()
    finally:
        runner.cursor.close()
        conn.close()

    stale_logs = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "historische Close" in record.getMessage()
    ]
    assert not stale_logs
    assert runner.stats.historical_price_gap_warnings == 0
    assert runner.stats.historical_price_gap_days == 0


def test_sync_securities_ignores_weekend_gaps(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Warnungen sollten bei fehlenden Wochenendpreisen unterdrückt werden."""

    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    friday = int(datetime(2024, 1, 5, tzinfo=UTC).timestamp() // 86400)
    monday = int(datetime(2024, 1, 8, tzinfo=UTC).timestamp() // 86400)

    weekend_security = _DummySecurity(
        uuid="sec-weekend",
        name="Weekend Gap Security",
        prices=[
            _DummyPrice(date=friday, close=100),
            _DummyPrice(date=monday, close=110),
        ],
    )
    runner.client.securities = [weekend_security]

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        with caplog.at_level(logging.WARNING):
            runner._sync_securities()
        conn.commit()
        rows = conn.execute(
            "SELECT security_uuid, date FROM historical_prices ORDER BY date"
        ).fetchall()
    finally:
        runner.cursor.close()
        conn.close()

    weekend_logs = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "historische Close" in record.getMessage()
    ]
    assert not weekend_logs
    assert rows == [("sec-weekend", friday), ("sec-weekend", monday)]
    assert runner.stats.historical_price_gap_warnings == 0
    assert runner.stats.historical_price_gap_days == 0


def test_sync_securities_ignores_short_holiday_gaps(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Kurzfristige Feiertagslücken sollen nicht zu Warnungen führen."""

    db_path = tmp_path / "portfolio.db"
    conn = _prepare_portfolio_db(db_path)
    runner = _SyncRunner(
        client=_DummyClient([_DummyPortfolio("portfolio-1")]),
        conn=conn,
        hass=None,
        entry_id=None,
        last_file_update=None,
        db_path=db_path,
    )
    runner.cursor = conn.cursor()

    start = int(datetime(2024, 12, 23, tzinfo=UTC).timestamp() // 86400)
    end = int(datetime(2024, 12, 27, tzinfo=UTC).timestamp() // 86400)

    holiday_security = _DummySecurity(
        uuid="sec-holiday",
        name="Holiday Gap Security",
        prices=[
            _DummyPrice(date=start, close=100),
            _DummyPrice(date=end, close=120),
        ],
    )
    runner.client.securities = [holiday_security]

    monkeypatch.setattr(sync_module, "_TIMESTAMP_IMPORT_ERROR", None, raising=False)
    monkeypatch.setattr(sync_module, "Timestamp", _FakeTimestamp, raising=False)

    try:
        with caplog.at_level(logging.WARNING):
            runner._sync_securities()
        conn.commit()
        rows = conn.execute(
            "SELECT security_uuid, date FROM historical_prices ORDER BY date"
        ).fetchall()
    finally:
        runner.cursor.close()
        conn.close()

    holiday_logs = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "historische Close" in record.getMessage()
    ]
    assert not holiday_logs
    assert rows == [("sec-holiday", start), ("sec-holiday", end)]
    assert runner.stats.historical_price_gap_warnings == 0
    assert runner.stats.historical_price_gap_days == 0
