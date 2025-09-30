"""Tests for the historical price WebSocket handler."""

from __future__ import annotations

import asyncio
import importlib.util
import sqlite3
import sys
import types
from datetime import date, timedelta
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent


def _ensure_minimal_homeassistant_stubs() -> None:
    """Register lightweight Home Assistant modules for websocket imports."""
    if "homeassistant" in sys.modules:
        return

    ha_module = types.ModuleType("homeassistant")
    components_module = types.ModuleType("homeassistant.components")
    websocket_api_module = types.ModuleType("homeassistant.components.websocket_api")
    core_module = types.ModuleType("homeassistant.core")

    class HomeAssistant:
        """Stub HomeAssistant core object."""

        def __init__(self) -> None:
            self.data: dict[str, object] = {}
            self.loop: asyncio.AbstractEventLoop | None = None

        async def async_add_executor_job(self, func, *args):
            return func(*args)

        def async_create_background_task(
            self,
            coro,
            _task_name=None,
            *,
            eager_start: bool = False,
        ):
            del eager_start
            loop = asyncio.get_running_loop()
            return loop.create_task(coro)

    class ActiveConnection:
        """Stub ActiveConnection placeholder."""


    def websocket_command(_schema):
        def decorator(func):
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)

            wrapper.__wrapped__ = func  # type: ignore[attr-defined]
            return wrapper

        return decorator

    def async_response(func):
        func.__wrapped__ = func  # type: ignore[attr-defined]
        return func

    def async_register_command(*_args, **_kwargs):
        return None

    websocket_api_module.websocket_command = websocket_command
    websocket_api_module.async_response = async_response
    websocket_api_module.async_register_command = async_register_command
    websocket_api_module.ActiveConnection = ActiveConnection

    core_module.HomeAssistant = HomeAssistant

    ha_module.components = components_module
    ha_module.core = core_module

    components_module.websocket_api = websocket_api_module

    sys.modules["homeassistant"] = ha_module
    sys.modules["homeassistant.components"] = components_module
    sys.modules["homeassistant.components.websocket_api"] = websocket_api_module
    sys.modules["homeassistant.core"] = core_module


_ensure_minimal_homeassistant_stubs()

if "voluptuous" not in sys.modules:
    vol_module = types.ModuleType("voluptuous")

    def _identity(value):
        return value

    def _any(*_args, **_kwargs):
        return None

    def _coerce(target_type):
        def _convert(value):
            return target_type(value)

        return _convert

    vol_module.Required = _identity  # type: ignore[attr-defined]
    vol_module.Optional = _identity  # type: ignore[attr-defined]
    vol_module.Any = _any  # type: ignore[attr-defined]
    vol_module.Coerce = _coerce  # type: ignore[attr-defined]

    sys.modules["voluptuous"] = vol_module

custom_components_pkg = types.ModuleType("custom_components")
custom_components_pkg.__path__ = [str(REPO_ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components_pkg)

pp_reader_pkg = types.ModuleType("custom_components.pp_reader")
pp_reader_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader")]
sys.modules.setdefault("custom_components.pp_reader", pp_reader_pkg)

data_pkg = types.ModuleType("custom_components.pp_reader.data")
data_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader" / "data")]
sys.modules.setdefault("custom_components.pp_reader.data", data_pkg)

db_init_spec = importlib.util.spec_from_file_location(
    "custom_components.pp_reader.data.db_init",
    REPO_ROOT / "custom_components" / "pp_reader" / "data" / "db_init.py",
)
if (
    db_init_spec is None or db_init_spec.loader is None
):  # pragma: no cover - defensive guard
    error_message = "Unable to load db_init module spec"
    raise ImportError(error_message)
_db_init_module = importlib.util.module_from_spec(db_init_spec)
db_init_spec.loader.exec_module(_db_init_module)
initialize_database_schema = _db_init_module.initialize_database_schema

SPEC = importlib.util.spec_from_file_location(
    "custom_components.pp_reader.data.websocket",
    REPO_ROOT / "custom_components" / "pp_reader" / "data" / "websocket.py",
)
if SPEC is None or SPEC.loader is None:  # pragma: no cover - defensive guard
    error_message = "Unable to load websocket module spec"
    raise ImportError(error_message)
_websocket_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(_websocket_module)

DOMAIN = _websocket_module.DOMAIN
WS_GET_SECURITY_HISTORY = _websocket_module.ws_get_security_history
WS_GET_SECURITY_SNAPSHOT = _websocket_module.ws_get_security_snapshot


class StubConnection:
    """Capture WebSocket responses for verification."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, object]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, object]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


class StubHass:
    """Minimal Home Assistant stub for executing blocking helpers."""

    def __init__(self, store: dict[str, object]) -> None:
        self.data = store
        self.loop: asyncio.AbstractEventLoop | None = None

    async def async_add_executor_job(self, func, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, func, *args)

    def async_create_background_task(
        self,
        coro,
        _task_name=None,
        *,
        eager_start: bool = False,
    ):
        del eager_start
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)


def _run_ws_handler(handler, *args, **kwargs) -> None:
    """Execute the given websocket handler inside a dedicated event loop."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        hass = args[0] if args else None
        if isinstance(hass, StubHass):
            hass.loop = loop
        handler(*args, **kwargs)
        pending = asyncio.all_tasks(loop)
        if pending:
            loop.run_until_complete(asyncio.gather(*pending))
        loop.run_until_complete(loop.shutdown_asyncgens())
    finally:
        asyncio.set_event_loop(None)
        loop.close()


def _run_ws_get_security_history(*args, **kwargs) -> None:
    """Execute the history websocket handler."""
    _run_ws_handler(WS_GET_SECURITY_HISTORY, *args, **kwargs)


def _run_ws_get_security_snapshot(*args, **kwargs) -> None:
    """Execute the snapshot websocket handler."""
    _run_ws_handler(WS_GET_SECURITY_SNAPSHOT, *args, **kwargs)


def _epoch_day_to_date(value: int) -> date:
    """Convert an integer YYYYMMDD representation into a date object."""
    year = value // 10_000
    month = (value % 10_000) // 100
    day = value % 100
    return date(year, month, day)


def _date_to_epoch_day(value: date) -> int:
    """Convert a date object into its YYYYMMDD integer representation."""
    return value.year * 10_000 + value.month * 100 + value.day


@pytest.fixture
def seeded_history_db(tmp_path: Path) -> Path:
    """Create a temporary database populated with historical prices."""
    db_path = tmp_path / "history.db"
    initialize_database_schema(db_path)

    price_rows = [
        ("sec-1", 20240101, 10_000, None, None, None),
        ("sec-1", 20240102, 10_500, None, None, None),
        ("sec-1", 20240103, 10_750, None, None, None),
        ("sec-2", 20240103, 99_999, None, None, None),
    ]

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT INTO historical_prices (
                security_uuid,
                date,
                close,
                high,
                low,
                volume
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            price_rows,
        )
        conn.executemany(
            """
            INSERT INTO securities (uuid, name, currency_code, last_price)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("sec-1", "Acme Corp", "EUR", 1_250_000_000),
                ("sec-2", "Globex Inc", "EUR", 9_999_000_000),
            ],
        )
        conn.executemany(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                current_value
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("portfolio-1", "sec-1", 1.5, 0, 0),
                ("portfolio-2", "sec-1", 2.0, 0, 0),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


def test_ws_get_security_history_returns_filtered_prices(
    seeded_history_db: Path,
) -> None:
    """Handler should stream filtered close prices when enabled."""
    entry_id = "entry-1"
    hass = StubHass({DOMAIN: {entry_id: {"db_path": seeded_history_db}}})
    connection = StubConnection()

    _run_ws_get_security_history(
        hass,
        connection,
        {
            "id": 7,
            "type": "pp_reader/get_security_history",
            "entry_id": entry_id,
            "security_uuid": "sec-1",
            "start_date": 20240102,
            "end_date": 20240103,
        },
    )

    assert connection.errors == []
    assert len(connection.sent) == 1
    _, payload = connection.sent[0]

    assert payload["security_uuid"] == "sec-1"
    assert payload["start_date"] == 20240102
    assert payload["end_date"] == 20240103
    assert payload["prices"] == [
        {"date": 20240102, "close": 10_500},
        {"date": 20240103, "close": 10_750},
    ]


def test_ws_get_security_history_ignores_unknown_feature_flags(
    seeded_history_db: Path,
) -> None:
    """Handler should ignore unrelated legacy feature flag states."""
    entry_id = "entry-2"
    hass = StubHass(
        {
            DOMAIN: {
                entry_id: {
                    "db_path": seeded_history_db,
                    "feature_flags": {"legacy_flag": False},
                }
            }
        }
    )
    connection = StubConnection()

    _run_ws_get_security_history(
        hass,
        connection,
        {
            "id": 11,
            "type": "pp_reader/get_security_history",
            "entry_id": entry_id,
            "security_uuid": "sec-1",
        },
    )

    assert connection.errors == []
    assert connection.sent and connection.sent[0][1]["prices"]


@pytest.mark.parametrize(
    ("range_key", "day_count"),
    [
        ("1M", 30),
        ("6M", 182),
        ("1Y", 365),
        ("5Y", 1826),
    ],
)
def test_ws_get_security_history_supports_predefined_ranges(
    seeded_history_db: Path,
    range_key: str,
    day_count: int,
) -> None:
    """Ensure the handler returns stable payloads for the predefined ranges."""
    entry_id = "entry-range"
    hass = StubHass({DOMAIN: {entry_id: {"db_path": seeded_history_db}}})
    connection = StubConnection()

    # Align the range to the seeded dataset which ends on 2024-01-03.
    end_date = 20240103
    end_date_obj = _epoch_day_to_date(end_date)
    start_delta = timedelta(days=day_count - 1) if day_count > 0 else timedelta(0)
    start_date_obj = end_date_obj - start_delta
    start_date = _date_to_epoch_day(start_date_obj)

    _run_ws_get_security_history(
        hass,
        connection,
        {
            "id": 100 + day_count,
            "type": "pp_reader/get_security_history",
            "entry_id": entry_id,
            "security_uuid": "sec-1",
            "start_date": start_date,
            "end_date": end_date,
        },
    )

    assert connection.errors == []
    assert connection.sent, f"no payload for range {range_key}"
    _, payload = connection.sent[-1]

    assert payload["security_uuid"] == "sec-1"
    assert payload.get("start_date") == start_date
    assert payload.get("end_date") == end_date
    assert payload["prices"] == [
        {"date": 20240101, "close": 10_000},
        {"date": 20240102, "close": 10_500},
        {"date": 20240103, "close": 10_750},
    ]


def test_ws_get_security_snapshot_success(seeded_history_db: Path) -> None:
    """Handler should return aggregated holdings for the security."""
    entry_id = "entry-3"
    hass = StubHass({DOMAIN: {entry_id: {"db_path": seeded_history_db}}})
    connection = StubConnection()

    _run_ws_get_security_snapshot(
        hass,
        connection,
        {
            "id": 21,
            "type": "pp_reader/get_security_snapshot",
            "entry_id": entry_id,
            "security_uuid": "sec-1",
        },
    )

    assert connection.errors == []
    assert connection.sent and connection.sent[0][0] == 21
    payload = connection.sent[0][1]
    assert payload["security_uuid"] == "sec-1"
    assert payload["snapshot"] == {
        "name": "Acme Corp",
        "currency_code": "EUR",
        "total_holdings": 3.5,
        "last_price_eur": 12.5,
        "market_value_eur": 43.75,
    }


def test_ws_get_security_snapshot_missing_security(
    seeded_history_db: Path,
) -> None:
    """Handler should return an error when the security is unknown."""
    entry_id = "entry-4"
    hass = StubHass({DOMAIN: {entry_id: {"db_path": seeded_history_db}}})
    connection = StubConnection()

    _run_ws_get_security_snapshot(
        hass,
        connection,
        {
            "id": 22,
            "type": "pp_reader/get_security_snapshot",
            "entry_id": entry_id,
            "security_uuid": "does-not-exist",
        },
    )

    assert connection.sent == []
    assert connection.errors == [
        (22, "not_found", "Unbekannte security_uuid: does-not-exist"),
    ]
