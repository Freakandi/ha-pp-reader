"""Unit tests for historical price helpers in ``db_access``."""

from __future__ import annotations

import sqlite3
import sys
import types
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent


def _ensure_minimal_homeassistant_stubs() -> None:
    """Register lightweight Home Assistant module stubs for imports."""

    if "homeassistant" in sys.modules:
        return

    ha_module = types.ModuleType("homeassistant")
    components_module = types.ModuleType("homeassistant.components")
    websocket_api_module = types.ModuleType("homeassistant.components.websocket_api")
    http_module = types.ModuleType("homeassistant.components.http")
    panel_custom_module = types.ModuleType("homeassistant.components.panel_custom")
    const_module = types.ModuleType("homeassistant.const")
    exceptions_module = types.ModuleType("homeassistant.exceptions")
    helpers_module = types.ModuleType("homeassistant.helpers")
    helpers_event_module = types.ModuleType("homeassistant.helpers.event")
    config_entries_module = types.ModuleType("homeassistant.config_entries")
    core_module = types.ModuleType("homeassistant.core")
    helpers_typing_module = types.ModuleType("homeassistant.helpers.typing")

    class _Platform:  # noqa: D401 - simple stub
        """Stub Platform namespace used in tests."""

        SENSOR = "sensor"

    class _ConfigEntryNotReady(Exception):
        """Stub ConfigEntryNotReady exception."""

    class _HomeAssistantError(Exception):
        """Stub HomeAssistantError exception."""

    class StaticPathConfig:  # noqa: D401 - simple stub
        """Stub for StaticPathConfig constructor."""

        def __init__(self, *args, **kwargs) -> None:  # noqa: D401
            self.args = args
            self.kwargs = kwargs

    async def async_register_panel(*_args, **_kwargs) -> None:
        """Stub panel registration coroutine."""

    def async_track_time_interval(*_args, **_kwargs):
        """Stub interval tracker returning a removable callback."""

        return lambda: None

    class Event:  # noqa: D401 - simple stub
        """Stub Event dataclass."""

        def __init__(self, event_type: str, data: dict | None = None) -> None:
            self.event_type = event_type
            self.data = data or {}

    class ServiceCall:  # noqa: D401 - simple stub
        """Stub ServiceCall placeholder."""

    class HomeAssistant:  # noqa: D401 - simple stub
        """Stub HomeAssistant core object."""

        is_running = False

        class _Services:
            def async_register(self, *_args, **_kwargs) -> None:  # noqa: D401
                return None

        class _Bus:
            def async_listen_once(self, *_args, **_kwargs) -> None:  # noqa: D401
                return None

        services = _Services()
        bus = _Bus()

        async def async_add_executor_job(self, func, *args, **kwargs):  # noqa: D401
            return func(*args, **kwargs)

    class ConfigEntry:  # noqa: D401 - simple stub
        """Stub ConfigEntry object."""

        def __init__(self, **kwargs) -> None:  # noqa: D401
            self.__dict__.update(kwargs)

    class ConfigType(dict):
        """Stub ConfigType mapping."""

    const_module.Platform = _Platform
    exceptions_module.ConfigEntryNotReady = _ConfigEntryNotReady
    exceptions_module.HomeAssistantError = _HomeAssistantError
    http_module.StaticPathConfig = StaticPathConfig
    panel_custom_module.async_register_panel = async_register_panel
    helpers_event_module.async_track_time_interval = async_track_time_interval
    core_module.Event = Event
    core_module.ServiceCall = ServiceCall
    core_module.HomeAssistant = HomeAssistant
    config_entries_module.ConfigEntry = ConfigEntry
    helpers_typing_module.ConfigType = ConfigType

    ha_module.components = components_module
    ha_module.const = const_module
    ha_module.exceptions = exceptions_module
    ha_module.helpers = helpers_module
    ha_module.core = core_module
    ha_module.config_entries = config_entries_module

    components_module.websocket_api = websocket_api_module
    components_module.http = http_module
    components_module.panel_custom = panel_custom_module

    helpers_module.event = helpers_event_module

    sys.modules["homeassistant"] = ha_module
    sys.modules["homeassistant.components"] = components_module
    sys.modules["homeassistant.components.websocket_api"] = websocket_api_module
    sys.modules["homeassistant.components.http"] = http_module
    sys.modules["homeassistant.components.panel_custom"] = panel_custom_module
    sys.modules["homeassistant.const"] = const_module
    sys.modules["homeassistant.exceptions"] = exceptions_module
    sys.modules["homeassistant.core"] = core_module
    sys.modules["homeassistant.helpers"] = helpers_module
    sys.modules["homeassistant.helpers.event"] = helpers_event_module
    sys.modules["homeassistant.config_entries"] = config_entries_module
    sys.modules["homeassistant.helpers.typing"] = helpers_typing_module


_ensure_minimal_homeassistant_stubs()

custom_components_pkg = types.ModuleType("custom_components")
custom_components_pkg.__path__ = [str(REPO_ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components_pkg)

pp_reader_pkg = types.ModuleType("custom_components.pp_reader")
pp_reader_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader")]
sys.modules.setdefault("custom_components.pp_reader", pp_reader_pkg)

data_pkg = types.ModuleType("custom_components.pp_reader.data")
data_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader" / "data")]
sys.modules.setdefault("custom_components.pp_reader.data", data_pkg)


from custom_components.pp_reader.data.db_access import (
    get_security_close_prices,
    iter_security_close_prices,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.fixture
def seeded_history_db(tmp_path: Path) -> Path:
    """Create a temporary database with historical price rows for tests."""

    db_path = tmp_path / "history.db"
    initialize_database_schema(db_path)

    rows = [
        ("sec-1", 20240101, 1000, None, None, None),
        ("sec-1", 20240103, 1200, None, None, None),
        ("sec-1", 20240102, 1100, None, None, None),
        ("sec-2", 20240101, 500, None, None, None),
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


def test_iter_security_close_prices_orders_and_filters_range(
    seeded_history_db: Path,
) -> None:
    """Iterator should return ordered rows and respect the provided bounds."""

    all_rows = list(iter_security_close_prices(seeded_history_db, "sec-1"))
    assert all_rows == [
        (20240101, 1000),
        (20240102, 1100),
        (20240103, 1200),
    ]

    bounded_rows = list(
        iter_security_close_prices(
            seeded_history_db,
            "sec-1",
            start_date=20240102,
            end_date=20240103,
        )
    )
    assert bounded_rows == [
        (20240102, 1100),
        (20240103, 1200),
    ]

    trailing_rows = list(
        iter_security_close_prices(
            seeded_history_db,
            "sec-1",
            start_date=20240103,
        )
    )
    assert trailing_rows == [(20240103, 1200)]


def test_iter_security_close_prices_rejects_invalid_range(
    seeded_history_db: Path,
) -> None:
    """Iterator should raise when start date is after end date."""

    with pytest.raises(ValueError):
        list(
            iter_security_close_prices(
                seeded_history_db,
                "sec-1",
                start_date=20240105,
                end_date=20240101,
            )
        )


def test_get_security_close_prices_materialises_iterator(
    seeded_history_db: Path,
) -> None:
    """Helper should return a concrete list mirroring the iterator output."""

    result = get_security_close_prices(seeded_history_db, "sec-1")
    assert result == [
        (20240101, 1000),
        (20240102, 1100),
        (20240103, 1200),
    ]

    assert get_security_close_prices(seeded_history_db, "missing") == []

    filtered = get_security_close_prices(
        seeded_history_db,
        "sec-1",
        start_date=20240102,
        end_date=20240102,
    )
    assert filtered == [(20240102, 1100)]
