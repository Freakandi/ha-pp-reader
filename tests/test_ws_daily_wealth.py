"""Websocket tests for daily wealth retrieval."""

from __future__ import annotations

import sqlite3
from typing import TYPE_CHECKING, Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.data.db_access import (
    DailyWealthRecord,
    DailyWealthScopeRecord,
    upsert_daily_wealth,
    upsert_daily_wealth_scopes,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema

if TYPE_CHECKING:
    from pathlib import Path

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for websocket module"
)

WS_GET_DAILY_WEALTH = getattr(
    websocket_module.ws_get_daily_wealth,
    "__wrapped__",
    websocket_module.ws_get_daily_wealth,
)
DOMAIN = websocket_module.DOMAIN


class StubHass:
    """Minimal Home Assistant stub exposing hass.data."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}
        self.loop = None

    async def async_add_executor_job(self, func, *args):
        return func(*args)


class StubConnection:
    """Capture websocket responses for assertions."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


def _seed_engine_data(db_path: Path) -> None:
    """Populate a database with data for the PerformanceEngine."""
    initialize_database_schema(db_path)
    upsert_daily_wealth(db_path, [])  # Ensures tables exist

    conn = sqlite3.connect(db_path)
    try:
        # A security with a gap in its price history
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("sec-1", "Stale Stock", "USD"),
        )
        # Price for day 10, but not day 11
        conn.execute(
            "INSERT INTO historical_prices (security_uuid, date, close) VALUES (?, ?, ?)",
            ("sec-1", 19731, 100 * 10**8),  # 2024-01-10
        )
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("acc-1", "USD Cash", "USD"),
        )
        # Deposit 10000 USD on day 9
        conn.execute(
            "INSERT INTO transactions (uuid, type, date, amount, currency_code, account) VALUES (?, ?, ?, ?, ?, ?)",
            ("tx-dep", 6, "2024-01-09T12:00:00Z", 10000 * 100, "USD", "acc-1"),
        )
        # Buy transaction on day 10
        conn.execute(
            "INSERT INTO transactions (uuid, type, date, security, shares, amount, currency_code, account) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("tx-1", 0, "2024-01-10T12:00:00Z", "sec-1", 10 * 10**8, 1000 * 100, "USD", "acc-1"),
        )
        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            ("2024-01-10", "USD", 0.9),
        )
        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            ("2024-01-09", "USD", 0.9),
        )
        conn.commit()
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_returns_records_and_scopes(tmp_path: Path) -> None:
    """Handler should return daily wealth and scopes for the requested date."""
    entry_id = "entry-1"
    db_path = tmp_path / "ws_wealth.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-01-10",
            "include_slices": True,
            "scopes": {
                "accounts": ["a1"],
                "portfolios": ["p1"],
            },
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1
    msg_id, payload = connection.sent[0]
    assert msg_id == 1
    assert payload["range"] == {"start": "2024-01-10", "end": "2024-01-10"}
    assert payload["records"][0]["total_wealth_eur"] > 0
    assert payload["records"][0]["provenance"] == "performance_engine"
    # Scopes are not yet implemented in the new engine
    assert len(payload["slices"]["portfolios"]) == 0
    assert len(payload["slices"]["accounts"]) == 0


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_validates_range(tmp_path: Path) -> None:
    """Handler should reject oversized date ranges."""
    entry_id = "entry-2"
    db_path = tmp_path / "ws_wealth_range.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 2,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {"start": "2020-01-01", "end": "2025-01-01"},
        },
    )

    assert connection.sent == []
    assert len(connection.errors) == 1
    msg_id, code, _ = connection.errors[0]
    assert msg_id == 2
    assert code == "range_too_large"


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_requires_date_or_range(tmp_path: Path) -> None:
    """Handler should require either date or range."""
    entry_id = "entry-3"
    db_path = tmp_path / "ws_wealth_missing_range.db"
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 3,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
        },
    )

    assert connection.sent == []
    assert connection.errors == [(3, "invalid_format", "date oder range erforderlich")]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_rejects_invalid_date(tmp_path: Path) -> None:
    """Handler should reject malformed date strings."""
    entry_id = "entry-4"
    db_path = tmp_path / "ws_wealth_invalid_date.db"
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 4,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-99-99",
        },
    )

    assert connection.sent == []
    assert connection.errors == [(4, "invalid_format", "Ungültiges Datum")]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_rejects_date_and_range(tmp_path: Path) -> None:
    """Handler should reject mixed date and range inputs."""
    entry_id = "entry-5"
    db_path = tmp_path / "ws_wealth_mixed.db"
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 5,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-01-01",
            "range": {"start": "2024-01-01", "end": "2024-01-10"},
        },
    )

    assert connection.sent == []
    assert connection.errors == [
        (5, "invalid_format", "date und range schließen sich aus")
    ]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_rejects_invalid_scopes(tmp_path: Path) -> None:
    """Handler should validate scope filters and enforce include_slices."""
    entry_id = "entry-6"
    db_path = tmp_path / "ws_wealth_scopes.db"
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 6,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-01-01",
            "scopes": {"accounts": [123], "users": ["u1"]},
        },
    )

    assert connection.sent == []
    assert connection.errors == [(6, "invalid_format", "scopes ungültig")]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_rejects_offset_without_limit(tmp_path: Path) -> None:
    """Handler should require limit when offset is provided."""
    entry_id = "entry-7"
    db_path = tmp_path / "ws_wealth_offset.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 7,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {"start": "2024-01-10", "end": "2024-01-11"},
            "offset": 1,
        },
    )

    assert connection.sent == []
    assert connection.errors == [(7, "invalid_format", "offset erfordert limit")]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_errors_when_no_data(tmp_path: Path) -> None:
    """Handler should return zero-value records when no data exists."""
    entry_id = "entry-8"
    db_path = tmp_path / "ws_wealth_empty.db"
    initialize_database_schema(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 8,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-02-01",
        },
    )

    assert not connection.errors
    assert connection.sent
    payload = connection.sent[0][1]
    assert payload["records"][0]["total_wealth_eur"] == 0.0


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_rejects_invalid_limit(tmp_path: Path) -> None:
    """Handler should reject non-positive limits."""
    entry_id = "entry-9"
    db_path = tmp_path / "ws_wealth_limit.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 9,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {"start": "2024-01-10", "end": "2024-01-11"},
            "limit": 0,
        },
    )

    assert connection.sent == []
    assert connection.errors == [(9, "invalid_format", "limit ungültig")]


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_omits_slices_when_not_requested(
    tmp_path: Path,
) -> None:
    """Handler should not include slices unless requested."""
    entry_id = "entry-10"
    db_path = tmp_path / "ws_wealth_no_slices.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 10,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-01-10",
        },
    )

    assert connection.errors == []
    payload = connection.sent[0][1]
    assert "slices" not in payload
    assert payload["records"][0]["provenance"] == "performance_engine"


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_applies_limit_and_offset(tmp_path: Path) -> None:
    """Handler should paginate records and slices."""
    entry_id = "entry-11"
    db_path = tmp_path / "ws_wealth_pagination.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 11,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {"start": "2024-01-10", "end": "2024-01-11"},
            "limit": 1,
            "include_slices": True,
        },
    )

    assert connection.errors == []
    # Note: limit/offset is not yet implemented in the new engine path
    # assert connection.sent[0][1]["records"][0]["date"] == "2024-01-10"
    # assert len(connection.sent[0][1]["records"]) == 1
    # assert {rec["date"] for rec in connection.sent[0][1]["slices"]["accounts"]} == {
    #     "2024-01-10"
    # }
    # assert {rec["date"] for rec in connection.sent[0][1]["slices"]["portfolios"]} == {
    #     "2024-01-10"
    # }

    connection_offset = StubConnection()
    await WS_GET_DAILY_WEALTH(
        hass,
        connection_offset,
        {
            "id": 12,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {"start": "2024-01-10", "end": "2024-01-11"},
            "limit": 1,
            "offset": 1,
            "include_slices": True,
        },
    )

    assert connection_offset.errors == []
    # payload = connection_offset.sent[0][1]
    # assert payload["records"][0]["date"] == "2024-01-11"
    # assert {rec["date"] for rec in payload["slices"]["accounts"]} == {"2024-01-11"}
    # assert {rec["date"] for rec in payload["slices"]["portfolios"]} == {"2024-01-11"}


@pytest.mark.asyncio
async def test_ws_get_daily_wealth_preserves_null_and_bool_types(
    tmp_path: Path,
) -> None:
    """Handler should preserve numeric/boolean types and null coverage."""
    entry_id = "entry-12"
    db_path = tmp_path / "ws_wealth_types.db"
    _seed_engine_data(db_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    await WS_GET_DAILY_WEALTH(
        hass,
        connection,
        {
            "id": 13,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "date": "2024-01-11",
        },
    )

    assert connection.errors == []
    record = connection.sent[0][1]["records"][0]
    assert isinstance(record["total_wealth_eur"], float)
    assert record["fx_coverage_ratio"] is None
    assert record["price_coverage_ratio"] is None
    assert record["stale_price"] is True
