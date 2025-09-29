"""Tests for FX currency collection in websocket handler."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

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

SPEC = importlib.util.spec_from_file_location(
    "custom_components.pp_reader.data.websocket",
    REPO_ROOT / "custom_components" / "pp_reader" / "data" / "websocket.py",
)
if SPEC is None or SPEC.loader is None:  # pragma: no cover - defensive guard
    error_message = "Unable to load websocket module spec"
    raise ImportError(error_message)
_websocket_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(_websocket_module)

_collect_active_fx_currencies = _websocket_module._collect_active_fx_currencies  # noqa: SLF001
WS_GET_ACCOUNTS = _websocket_module.ws_get_accounts.__wrapped__
DOMAIN = _websocket_module.DOMAIN


class DummyAccount:
    """Simple stand-in object with minimal attributes for testing."""

    def __init__(self, currency_code: str | None, *, retired: bool = False) -> None:
        """Store dummy attributes used by the websocket helper."""
        self.currency_code = currency_code
        self.is_retired = retired
        self.balance = 0


def test_collect_active_fx_currencies_filters_invalid_entries() -> None:
    """Only active accounts with valid non-EUR currency codes are returned."""
    accounts = [
        DummyAccount("usd"),
        DummyAccount(" EUR "),
        DummyAccount(None),
        DummyAccount(""),
        DummyAccount("chf"),
        DummyAccount("jpy", retired=True),
        DummyAccount(123),
    ]

    assert _collect_active_fx_currencies(accounts) == {"USD", "CHF"}  # noqa: S101


class StubConnection:
    """Capture websocket responses for inspection."""

    def __init__(self) -> None:
        """Initialise in-memory buffers for websocket traffic."""
        self.sent: list[tuple[int | None, dict[str, object]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, object]) -> None:
        """Record a websocket result payload."""
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        """Record a websocket error response."""
        self.errors.append((msg_id, code, message))


class StubHass:
    """Minimal Home Assistant stub providing executor shim."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        """Store minimal registry data for the target entry."""
        self.data = {DOMAIN: {entry_id: {"db_path": db_path}}}

    async def async_add_executor_job(
        self, func: Any, *args: Any
    ) -> Any:
        """Execute blocking helpers synchronously for tests."""
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


def _make_account(currency: str, balance: int = 10000) -> object:
    class Account:
        def __init__(self) -> None:
            self.currency_code = currency
            self.is_retired = False
            self.balance = balance
            self.name = "Test Account"

    return Account()


def _stub_db_path(tmp_path: Path) -> Path:
    db_path = tmp_path / "portfolio.db"
    db_path.write_text("stub", encoding="utf-8")
    return db_path


def _run_ws_get_accounts(*args: Any, **kwargs: Any) -> None:
    """Execute websocket handler synchronously for tests."""
    asyncio.run(WS_GET_ACCOUNTS(*args, **kwargs))


def test_ws_get_accounts_requests_fx_with_utc_timezone(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """FX helper receives timezone aware dates to avoid datetime.UTC dependency."""
    entry_id = "entry-1"
    db_path = _stub_db_path(tmp_path)
    hass = StubHass(entry_id, db_path)
    connection = StubConnection()

    captured: dict[str, object] = {}

    async def fake_ensure(
        dates: list[datetime], currencies: set[str], path: Path
    ) -> None:
        captured["dates"] = dates
        captured["currencies"] = currencies
        captured["ensure_path"] = path

    async def fake_load(date: datetime, path: Path) -> dict[str, float]:
        captured["load_args"] = (date, path)
        return {"USD": 1.25}

    def fake_get_accounts(path: Path) -> list[object]:
        assert path == db_path  # noqa: S101 - ensure handler forwards db_path
        return [_make_account("USD", balance=12_500)]

    monkeypatch.setattr(
        _websocket_module,
        "ensure_exchange_rates_for_dates",
        fake_ensure,
    )
    monkeypatch.setattr(_websocket_module, "load_latest_rates", fake_load)
    monkeypatch.setattr(_websocket_module, "get_accounts", fake_get_accounts)

    _run_ws_get_accounts(
        hass,
        connection,
        {"id": 7, "type": "pp_reader/get_accounts", "entry_id": entry_id},
    )

    assert connection.errors == []  # noqa: S101
    assert connection.sent == [  # noqa: S101
        (
            7,
            {
                "accounts": [
                    {
                        "name": "Test Account",
                        "currency_code": "USD",
                        "orig_balance": 125.0,
                        "balance": 100.0,
                    }
                ]
            },
        )
    ]

    dates = captured.get("dates")
    assert dates is not None  # noqa: S101
    assert isinstance(dates, list)  # noqa: S101
    assert dates  # noqa: S101
    assert dates[0].tzinfo is timezone.utc  # noqa: UP017,S101
    assert captured.get("currencies") == {"USD"}  # noqa: S101
    assert captured.get("ensure_path") == db_path  # noqa: S101
    load_args = captured.get("load_args")
    assert load_args is not None  # noqa: S101
    assert load_args[0].tzinfo is timezone.utc  # noqa: UP017,S101
