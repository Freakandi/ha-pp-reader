"""Unit tests for historical price helpers in ``db_access``."""

from __future__ import annotations

import asyncio
import sqlite3
import sys
import types
from datetime import datetime
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

    class ConfigEntry:
        """Stub ConfigEntry object."""

        def __init__(self, **kwargs) -> None:
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

# Ensure hierarchical attributes exist so monkeypatch resolution works when
# submodules have not been imported yet.
setattr(custom_components_pkg, "pp_reader", pp_reader_pkg)

data_pkg = types.ModuleType("custom_components.pp_reader.data")
data_pkg.__path__ = [str(REPO_ROOT / "custom_components" / "pp_reader" / "data")]
sys.modules.setdefault("custom_components.pp_reader.data", data_pkg)
setattr(pp_reader_pkg, "data", data_pkg)


from custom_components.pp_reader.data.db_access import (
    get_all_portfolio_securities,
    get_portfolio_securities,
    get_security_close_prices,
    get_security_snapshot,
    iter_security_close_prices,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.fixture
def seeded_history_db(tmp_path: Path) -> Path:
    """Create a temporary database with historical price rows for tests."""
    db_path = tmp_path / "history.db"
    initialize_database_schema(db_path)

    rows = [
        ("sec-1", 20240101, int(10.0 * 1e8), None, None, None),
        ("sec-1", 20240103, int(12.0 * 1e8), None, None, None),
        ("sec-1", 20240102, int(11.0 * 1e8), None, None, None),
        ("sec-2", 20240101, int(5.0 * 1e8), None, None, None),
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


@pytest.fixture
def seeded_snapshot_db(tmp_path: Path) -> Path:
    """Create a temporary database with securities and FX data."""
    db_path = tmp_path / "snapshot.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executemany(
            """
            INSERT INTO securities (
                uuid,
                name,
                ticker_symbol,
                currency_code,
                retired,
                last_price
            ) VALUES (?, ?, ?, ?, 0, ?)
            """,
            [
                (
                    "eur-sec",
                    "Euro Equity",
                    "EUEQ",
                    "EUR",
                    int(42.5 * 1e8),
                ),
                (
                    "usd-sec",
                    "US Tech",
                    "USTK",
                    "USD",
                    int(200 * 1e8),
                ),
            ],
        )

        conn.executemany(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                avg_price_native,
                current_value
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("p-eur", "eur-sec", 2.5, 0, None, 0),
                ("p-usd-a", "usd-sec", 1.5, 12_345, 150.25, 0),
                ("p-usd-b", "usd-sec", 2.25, 67_890, 199.75, 0),
            ],
        )

        conn.executemany(
            """
            UPDATE portfolio_securities
            SET
                security_currency_total = ?,
                account_currency_total = ?,
                avg_price_security = ?,
                avg_price_account = ?
            WHERE portfolio_uuid = ? AND security_uuid = ?
            """,
            [
                (
                    180.185184,
                    173.981481,
                    120.123456,
                    115.987654,
                    "p-usd-a",
                    "usd-sec",
                ),
                (
                    294.9727225,
                    272.527776,
                    130.654321,
                    121.123456,
                    "p-usd-b",
                    "usd-sec",
                ),
            ],
        )

        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            ("2024-05-01", "USD", 1.25),
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


def test_get_portfolio_securities_exposes_native_average(tmp_path: Path) -> None:
    """Portfolio security loaders should surface stored native averages."""

    db_path = tmp_path / "portfolio_native.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("portfolio-native", "Native Coverage"),
        )
        conn.executemany(
            "INSERT INTO securities (uuid, name) VALUES (?, ?)",
            [("sec-native", "Native Equity"), ("sec-legacy", "Legacy Equity")],
        )
        conn.executemany(
            """
            INSERT INTO portfolio_securities (
                portfolio_uuid,
                security_uuid,
                current_holdings,
                purchase_value,
                avg_price_native,
                current_value
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("portfolio-native", "sec-native", 2.0, 100_000, 48.75, 125_000),
                ("portfolio-native", "sec-legacy", 5.0, 0, None, 0),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    entries = get_portfolio_securities(db_path, "portfolio-native")
    assert len(entries) == 2

    by_security = {entry.security_uuid: entry for entry in entries}
    assert by_security["sec-native"].avg_price_native == pytest.approx(48.75)
    assert by_security["sec-native"].avg_price == pytest.approx(50_000.0)
    assert by_security["sec-legacy"].avg_price_native is None

    all_entries = get_all_portfolio_securities(db_path)
    assert {(entry.portfolio_uuid, entry.security_uuid) for entry in all_entries} == {
        ("portfolio-native", "sec-native"),
        ("portfolio-native", "sec-legacy"),
    }
def test_iter_security_close_prices_orders_and_filters_range(
    seeded_history_db: Path,
) -> None:
    """Iterator should return ordered rows and respect the provided bounds."""
    all_rows = list(iter_security_close_prices(seeded_history_db, "sec-1"))
    assert all_rows == [
        (20240101, 10.0, 1_000_000_000),
        (20240102, 11.0, 1_100_000_000),
        (20240103, 12.0, 1_200_000_000),
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
        (20240102, 11.0, 1_100_000_000),
        (20240103, 12.0, 1_200_000_000),
    ]

    trailing_rows = list(
        iter_security_close_prices(
            seeded_history_db,
            "sec-1",
            start_date=20240103,
        )
    )
    assert trailing_rows == [(20240103, 12.0, 1_200_000_000)]


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
        (20240101, 10.0, 1_000_000_000),
        (20240102, 11.0, 1_100_000_000),
        (20240103, 12.0, 1_200_000_000),
    ]

    assert get_security_close_prices(seeded_history_db, "missing") == []

    filtered = get_security_close_prices(
        seeded_history_db,
        "sec-1",
        start_date=20240102,
        end_date=20240102,
    )
    assert filtered == [(20240102, 11.0, 1_100_000_000)]


def test_get_security_snapshot_multicurrency(
    seeded_snapshot_db: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Snapshot helper aggregates holdings and normalises FX prices."""
    reference_date = datetime(2024, 5, 1, 12, 0, 0)

    class _FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            del tz
            return reference_date

    monkeypatch.setattr(
        "custom_components.pp_reader.data.db_access.datetime",
        _FixedDatetime,
    )

    snapshot = get_security_snapshot(seeded_snapshot_db, "usd-sec")

    assert snapshot["name"] == "US Tech"
    assert snapshot["currency_code"] == "USD"
    assert snapshot["total_holdings"] == pytest.approx(3.75, rel=0, abs=1e-6)
    assert snapshot["last_price_native"] == pytest.approx(200.0, rel=0, abs=1e-4)
    assert snapshot["last_price_eur"] == pytest.approx(160.0, rel=0, abs=1e-4)
    assert snapshot["market_value_eur"] == pytest.approx(600.0, rel=0, abs=1e-2)
    assert snapshot["purchase_value_eur"] == pytest.approx(802.35, rel=0, abs=1e-2)
    assert snapshot["average_purchase_price_native"] == pytest.approx(
        179.95,
        rel=0,
        abs=1e-6,
    )
    assert snapshot["purchase_total_security"] == pytest.approx(
        475.16,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["purchase_total_account"] == pytest.approx(
        446.51,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["avg_price_security"] == pytest.approx(
        126.441975,
        rel=0,
        abs=1e-6,
    )
    assert snapshot["avg_price_account"] == pytest.approx(
        119.069135,
        rel=0,
        abs=1e-6,
    )
    assert snapshot["last_close_native"] is None
    assert snapshot["last_close_eur"] is None
    assert snapshot["day_price_change_native"] is None
    assert snapshot["day_price_change_eur"] is None
    assert snapshot["day_change_pct"] is None

    with pytest.raises(LookupError):
        get_security_snapshot(seeded_snapshot_db, "missing")


def test_get_security_snapshot_handles_null_purchase_value(
    seeded_snapshot_db: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Snapshot should treat NULL purchase sums as zero without averages."""

    class _FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            del tz
            return datetime(2024, 5, 1, 12, 0, 0)

    monkeypatch.setattr(
        "custom_components.pp_reader.data.db_access.datetime",
        _FixedDatetime,
    )

    conn = sqlite3.connect(str(seeded_snapshot_db))
    try:
        conn.execute(
            "UPDATE portfolio_securities SET purchase_value = NULL WHERE security_uuid = ?",
            ("usd-sec",),
        )
        conn.commit()
    finally:
        conn.close()

    snapshot = get_security_snapshot(seeded_snapshot_db, "usd-sec")

    assert snapshot["purchase_value_eur"] == pytest.approx(0.0, rel=0, abs=1e-4)
    assert snapshot["average_purchase_price_native"] == pytest.approx(
        179.95,
        rel=0,
        abs=1e-6,
    )
    assert snapshot["purchase_total_security"] == pytest.approx(
        475.16,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["purchase_total_account"] == pytest.approx(
        446.51,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["avg_price_security"] == pytest.approx(
        126.441975,
        rel=0,
        abs=1e-6,
    )
    assert snapshot["avg_price_account"] == pytest.approx(
        119.069135,
        rel=0,
        abs=1e-6,
    )


def test_get_security_snapshot_zero_holdings_preserves_purchase_sum(
    seeded_snapshot_db: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Zero holdings should not trigger division errors and keep purchase sums."""

    reference_date = datetime(2024, 5, 1, 12, 0, 0)

    class _FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            del tz
            return reference_date

    monkeypatch.setattr(
        "custom_components.pp_reader.data.db_access.datetime",
        _FixedDatetime,
    )

    conn = sqlite3.connect(str(seeded_snapshot_db))
    try:
        conn.executemany(
            """
            UPDATE portfolio_securities
            SET current_holdings = ?, purchase_value = ?
            WHERE portfolio_uuid = ? AND security_uuid = ?
            """,
            [
                (0.0, 12_345, "p-usd-a", "usd-sec"),
                (0.0, 0, "p-usd-b", "usd-sec"),
            ],
        )
        conn.execute(
            """
            INSERT INTO historical_prices (
                security_uuid,
                date,
                close,
                high,
                low,
                volume
            ) VALUES (?, ?, ?, NULL, NULL, NULL)
            """,
            ("usd-sec", 20240430, int(175.5 * 10**8)),
        )
        conn.commit()
    finally:
        conn.close()

    snapshot = get_security_snapshot(seeded_snapshot_db, "usd-sec")

    assert snapshot["total_holdings"] == pytest.approx(0.0, rel=0, abs=1e-6)
    assert snapshot["market_value_eur"] == pytest.approx(0.0, rel=0, abs=1e-4)
    assert snapshot["purchase_value_eur"] == pytest.approx(123.45, rel=0, abs=1e-4)
    assert snapshot["average_purchase_price_native"] is None
    assert snapshot["purchase_total_security"] == pytest.approx(
        475.16,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["purchase_total_account"] == pytest.approx(
        446.51,
        rel=0,
        abs=1e-2,
    )
    assert snapshot["avg_price_security"] is None
    assert snapshot["avg_price_account"] is None
    assert snapshot["last_close_native"] == pytest.approx(175.5, rel=0, abs=1e-4)
    assert snapshot["last_close_eur"] == pytest.approx(140.4, rel=0, abs=1e-4)
    assert snapshot["day_price_change_native"] == pytest.approx(
        24.5,
        rel=0,
        abs=1e-4,
    )
    assert snapshot["day_price_change_eur"] == pytest.approx(
        19.6,
        rel=0,
        abs=1e-4,
    )
    assert snapshot["day_change_pct"] == pytest.approx(13.96, rel=0, abs=1e-2)
