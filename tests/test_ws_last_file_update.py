"""WebSocket tests for the last file update handler."""

import asyncio
import sqlite3
import sys
import types
from pathlib import Path

import pytest

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for module imports"
)
import google.protobuf.duration_pb2
import google.protobuf.struct_pb2
import google.protobuf.timestamp_pb2
import google.protobuf.wrappers_pb2  # noqa: F401 - register dependency

# Provide a minimal stub for the optional pp_reader package used by sync imports.
if "pp_reader" not in sys.modules:
    pp_reader_pkg = types.ModuleType("pp_reader")
    pp_reader_pkg.__path__ = []  # type: ignore[attr-defined]
    sys.modules["pp_reader"] = pp_reader_pkg

if "pp_reader.currencies" not in sys.modules:
    currencies_pkg = types.ModuleType("pp_reader.currencies")
    currencies_pkg.__path__ = []  # type: ignore[attr-defined]
    sys.modules["pp_reader.currencies"] = currencies_pkg
    sys.modules["pp_reader"].currencies = currencies_pkg

if "pp_reader.currencies.fx" not in sys.modules:
    fx_module = types.ModuleType("pp_reader.currencies.fx")
    fx_module.ensure_exchange_rates_for_dates = None  # type: ignore[attr-defined]
    fx_module.load_latest_rates = None  # type: ignore[attr-defined]
    fx_module.ensure_exchange_rates_for_dates_sync = (  # type: ignore[attr-defined]
        lambda *args, **kwargs: None
    )
    fx_module.load_latest_rates_sync = (  # type: ignore[attr-defined]
        lambda *args, **kwargs: {}
    )
    sys.modules["pp_reader.currencies.fx"] = fx_module
    sys.modules["pp_reader.currencies"].fx = fx_module

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.data.websocket import DOMAIN, ws_get_last_file_update

WS_LAST_FILE_UPDATE = ws_get_last_file_update.__wrapped__


class StubConnection:
    """Capture WebSocket responses for verification."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, str]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id, payload):
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id, code, message):
        self.errors.append((msg_id, code, message))


class StubHass:
    """Minimal hass stub with data mapping and executor shim."""

    def __init__(self, entries: dict[str, dict[str, object]]) -> None:
        self.data = {DOMAIN: entries}

    async def async_add_executor_job(self, func, *args):
        return func(*args)

    def async_create_background_task(self, coro, _task_name=None, *, eager_start=False):
        del eager_start
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)


def _set_last_file_update(db_path: Path, value: str) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            "INSERT OR REPLACE INTO metadata (key, date) VALUES ('last_file_update', ?)",
            (value,),
        )
        conn.commit()
    finally:
        conn.close()


def test_ws_last_file_update_formats_timestamp(initialized_db: Path) -> None:
    """Handler should format ISO timestamps as localized strings."""
    _set_last_file_update(initialized_db, "2024-12-31T17:12:00")

    hass = StubHass({"entry-1": {"db_path": initialized_db}})
    connection = StubConnection()

    asyncio.run(
        WS_LAST_FILE_UPDATE(
            hass,
            connection,
            {"id": 1, "type": "pp_reader/get_last_file_update", "entry_id": "entry-1"},
        )
    )

    assert connection.errors == []
    assert connection.sent == [
        (1, {"last_file_update": "31.12.2024, 17:12"}),
    ]


def test_ws_last_file_update_uses_single_entry_default(initialized_db: Path) -> None:
    """Missing entry_id falls back to the only registered config entry."""
    _set_last_file_update(initialized_db, "2023-01-02T03:04:05")

    hass = StubHass({"entry-1": {"db_path": initialized_db}})
    connection = StubConnection()

    asyncio.run(
        WS_LAST_FILE_UPDATE(
            hass,
            connection,
            {"id": 2, "type": "pp_reader/get_last_file_update"},
        )
    )

    assert connection.errors == []
    assert connection.sent == [
        (2, {"last_file_update": "02.01.2023, 03:04"}),
    ]


def test_ws_last_file_update_requires_entry_for_multiple_entries(
    initialized_db: Path,
) -> None:
    """When multiple config entries exist, entry_id is mandatory."""
    hass = StubHass(
        {
            "entry-1": {"db_path": initialized_db},
            "entry-2": {"db_path": initialized_db},
        }
    )
    connection = StubConnection()

    asyncio.run(
        WS_LAST_FILE_UPDATE(
            hass,
            connection,
            {"id": 3, "type": "pp_reader/get_last_file_update"},
        )
    )

    assert connection.sent == []
    assert connection.errors == [
        (
            3,
            "not_found",
            "entry_id erforderlich, wenn mehrere Config Entries aktiv sind",
        ),
    ]


@pytest.fixture
def initialized_db(tmp_path: Path) -> Path:
    """Create a minimal database with the metadata table populated."""
    db_path = tmp_path / "portfolio.db"
    initialize_database_schema(db_path)
    return db_path
