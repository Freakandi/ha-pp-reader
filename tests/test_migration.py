"""Schema migration regression tests for the PP Reader database layer."""

import asyncio
import sqlite3
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _ensure_minimal_homeassistant_stubs() -> None:
    """Register lightweight Home Assistant module stubs for unit tests."""
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
    event_module = types.ModuleType("homeassistant.helpers.event")
    core_module = types.ModuleType("homeassistant.core")

    class _Platform:
        """Stub Platform namespace used in tests."""

        SENSOR = "sensor"

    class _ConfigEntryNotReady(Exception):
        """Stub ConfigEntryNotReady exception."""

    class _HomeAssistantError(Exception):
        """Stub HomeAssistantError exception."""

    class StaticPathConfig:
        """Stub for StaticPathConfig constructor."""

        def __init__(self, *args, **kwargs) -> None:
            self.args = args
            self.kwargs = kwargs

    async def async_register_panel(*_args, **_kwargs) -> None:
        """Stub panel registration coroutine."""

    def async_track_time_interval(*_args, **_kwargs):
        """Stub interval tracker returning a removable callback."""
        return lambda: None

    class Event:
        """Stub Event dataclass."""

        def __init__(self, event_type: str, data: dict | None = None) -> None:
            self.event_type = event_type
            self.data = data or {}

    class ServiceCall:
        """Stub ServiceCall placeholder."""

    class HomeAssistant:
        """Stub HomeAssistant core object."""

        is_running = False

        class _Services:
            def async_register(self, *_args, **_kwargs) -> None:
                return None

        class _Bus:
            def async_listen_once(self, *_args, **_kwargs) -> None:
                return None

        services = _Services()
        bus = _Bus()

        async def async_add_executor_job(self, func, *args, **kwargs):
            return func(*args, **kwargs)

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

    const_module.Platform = _Platform
    exceptions_module.ConfigEntryNotReady = _ConfigEntryNotReady
    exceptions_module.HomeAssistantError = _HomeAssistantError
    http_module.StaticPathConfig = StaticPathConfig
    panel_custom_module.async_register_panel = async_register_panel
    event_module.async_track_time_interval = async_track_time_interval
    core_module.Event = Event
    core_module.ServiceCall = ServiceCall
    core_module.HomeAssistant = HomeAssistant

    ha_module.components = components_module
    ha_module.const = const_module
    ha_module.exceptions = exceptions_module
    ha_module.helpers = helpers_module
    ha_module.core = core_module

    components_module.websocket_api = websocket_api_module
    components_module.http = http_module
    components_module.panel_custom = panel_custom_module

    helpers_module.event = event_module

    sys.modules["homeassistant"] = ha_module
    sys.modules["homeassistant.components"] = components_module
    sys.modules["homeassistant.components.websocket_api"] = websocket_api_module
    sys.modules["homeassistant.components.http"] = http_module
    sys.modules["homeassistant.components.panel_custom"] = panel_custom_module
    sys.modules["homeassistant.const"] = const_module
    sys.modules["homeassistant.exceptions"] = exceptions_module
    sys.modules["homeassistant.core"] = core_module
    sys.modules["homeassistant.helpers"] = helpers_module
    sys.modules["homeassistant.helpers.event"] = event_module


_ensure_minimal_homeassistant_stubs()

custom_components_pkg = types.ModuleType("custom_components")
custom_components_pkg.__path__ = [str(REPO_ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components_pkg)

pp_reader_pkg = types.ModuleType("custom_components.pp_reader")
pp_reader_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader")]
sys.modules.setdefault("custom_components.pp_reader", pp_reader_pkg)

data_pkg = types.ModuleType("custom_components.pp_reader.data")
data_pkg.__path__ = [
    str(REPO_ROOT / "custom_components" / "pp_reader" / "data"),
]
sys.modules.setdefault("custom_components.pp_reader.data", data_pkg)

from custom_components.pp_reader.data.db_init import initialize_database_schema


def _get_columns(db_path: Path, table: str) -> dict[str, dict]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA table_info('{table}')").fetchall()
        # PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
        return {r[1]: {"type": r[2], "notnull": r[3], "pk": r[5]} for r in rows}
    finally:
        conn.close()


def _get_index_names(db_path: Path, table: str) -> set[str]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA index_list('{table}')").fetchall()
        # PRAGMA index_list: seq, name, unique, origin, partial
        return {r[1] for r in rows}
    finally:
        conn.close()


def test_fresh_schema_contains_price_columns(tmp_path):
    db_path = tmp_path / "fresh.db"
    initialize_database_schema(db_path)

    cols = _get_columns(db_path, "securities")
    assert "type" in cols, "Spalte type fehlt in frischer DB"
    assert "last_price_source" in cols, "Spalte last_price_source fehlt in frischer DB"
    assert "last_price_fetched_at" in cols, (
        "Spalte last_price_fetched_at fehlt in frischer DB"
    )
    assert cols["type"]["type"].upper() == "TEXT"
    assert cols["last_price_source"]["type"].upper() == "TEXT"
    assert cols["last_price_fetched_at"]["type"].upper() == "TEXT"


def test_legacy_schema_migrated(tmp_path):
    db_path = tmp_path / "legacy.db"
    # Erzeuge Legacy Tabelle ohne die neuen Spalten
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            CREATE TABLE securities (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                isin TEXT,
                wkn TEXT,
                ticker_symbol TEXT,
                feed TEXT,
                currency_code TEXT,
                retired INTEGER,
                updated_at TEXT,
                last_price INTEGER,
                last_price_date INTEGER
            );
            """
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price, last_price_date) "
            "VALUES (?,?,?,?,?,?,?)",
            ("u1", "TestSec", "ABC", "EUR", 0, 123456789, 20240101),
        )
        conn.commit()
    finally:
        conn.close()

    # Aufruf Migration
    initialize_database_schema(db_path)

    cols = _get_columns(db_path, "securities")
    assert "type" in cols, "Migration hat type nicht ergänzt"
    assert "last_price_source" in cols, "Migration hat last_price_source nicht ergänzt"
    assert "last_price_fetched_at" in cols, (
        "Migration hat last_price_fetched_at nicht ergänzt"
    )
    assert cols["type"]["type"].upper() == "TEXT"

    # Datenintegrität prüfen
    conn2 = sqlite3.connect(str(db_path))
    try:
        row = conn2.execute(
            "SELECT uuid, last_price FROM securities WHERE uuid='u1'"
        ).fetchone()
        assert row is not None, "Bestandsdatensatz fehlt nach Migration"
        assert row[1] == 123456789, "last_price Wert geändert durch Migration"
    finally:
        conn2.close()


def test_creates_historical_price_index(tmp_path):
    """The schema initialisation must ensure the historical price index exists."""
    db_path = tmp_path / "index.db"
    initialize_database_schema(db_path)

    index_names = _get_index_names(db_path, "historical_prices")
    assert "idx_historical_prices_security_date" in index_names, (
        "Index für historical_prices(security_uuid, date) fehlt"
    )
