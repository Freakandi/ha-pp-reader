"""Tests for FX currency collection in websocket handler."""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

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
