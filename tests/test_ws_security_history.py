"""Tests for the historical price WebSocket handler."""

from __future__ import annotations

import asyncio
import importlib.util
import sqlite3
import sys
import types
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

    class HomeAssistant:  # noqa: D401 - simple stub
        """Stub HomeAssistant core object."""

        def __init__(self) -> None:
            self.data: dict[str, object] = {}

        async def async_add_executor_job(self, func, *args):  # noqa: D401
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

    class ActiveConnection:  # noqa: D401 - simple stub
        """Stub ActiveConnection placeholder."""

        pass

    def websocket_command(_schema):  # noqa: D401 - decorator stub
        def decorator(func):
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)

            wrapper.__wrapped__ = func  # type: ignore[attr-defined]
            return wrapper

        return decorator

    def async_response(func):  # noqa: D401 - decorator stub
        func.__wrapped__ = func  # type: ignore[attr-defined]
        return func

    def async_register_command(*_args, **_kwargs):  # noqa: D401 - stub
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

    def _identity(value):  # noqa: D401 - stub helper
        return value

    def _any(*_args, **_kwargs):  # noqa: D401 - stub helper
        return None

    def _coerce(target_type):  # noqa: D401 - stub helper
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
if db_init_spec is None or db_init_spec.loader is None:  # pragma: no cover - defensive guard
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


def _run_ws_get_security_history(*args, **kwargs) -> None:
    """Execute the websocket handler in a dedicated asyncio loop."""

    asyncio.run(WS_GET_SECURITY_HISTORY(*args, **kwargs))


@pytest.fixture
def seeded_history_db(tmp_path: Path) -> Path:
    """Create a temporary database populated with historical prices."""

    db_path = tmp_path / "history.db"
    initialize_database_schema(db_path)

    rows = [
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
            rows,
        )
        conn.commit()
    finally:
        conn.close()

    return db_path

def test_ws_get_security_history_requires_enabled_flag(
    seeded_history_db: Path,
) -> None:
    """Handler should reject requests when the feature flag is disabled."""

    entry_id = "entry-1"
    hass = StubHass(
        {
            DOMAIN: {
                entry_id: {
                    "db_path": seeded_history_db,
                    "feature_flags": {"pp_reader_history": False},
                }
            }
        }
    )
    connection = StubConnection()

    _run_ws_get_security_history(
        hass,
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_security_history",
            "entry_id": entry_id,
            "security_uuid": "sec-1",
        },
    )

    assert connection.sent == []
    assert connection.errors == [
        (1, "feature_not_enabled", "Historische Kursdaten sind derzeit deaktiviert."),
    ]


def test_ws_get_security_history_returns_filtered_prices(
    seeded_history_db: Path,
) -> None:
    """Handler should stream filtered close prices when enabled."""

    entry_id = "entry-1"
    hass = StubHass(
        {
            DOMAIN: {
                entry_id: {
                    "db_path": seeded_history_db,
                    "feature_flags": {"pp_reader_history": True},
                }
            }
        }
    )
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
