"""Pytest fixtures to bootstrap Home Assistant core for integration tests."""

from __future__ import annotations

import asyncio
import importlib
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any

import pytest

HOMEASSISTANT_IMPORT_ERROR: ModuleNotFoundError | None = None
frame = None
DATA_COMPONENTS: Any = None
DATA_CUSTOM_COMPONENTS: Any = None
DATA_INTEGRATIONS: Any = None
DATA_MISSING_PLATFORMS: Any = None
DATA_PRELOAD_PLATFORMS: Any = None

if TYPE_CHECKING:  # pragma: no cover - typing helpers only
    from homeassistant.config_entries import ConfigEntries
    from homeassistant.core import HomeAssistant
    from homeassistant.loader import Integration
else:
    ConfigEntries = HomeAssistant = Integration = Any  # type: ignore[assignment]

try:  # pragma: no cover - importability validated by targeted smoke tests
    importlib.import_module("homeassistant")
except ModuleNotFoundError as err:  # pragma: no cover - missing HA in CI smoke env
    HOMEASSISTANT_IMPORT_ERROR = err
else:  # pragma: no cover - import used in fixtures only
    HOMEASSISTANT_IMPORT_ERROR = None
    config_entries_mod = importlib.import_module("homeassistant.config_entries")
    core_mod = importlib.import_module("homeassistant.core")
    loader_mod = importlib.import_module("homeassistant.loader")
    frame = importlib.import_module("homeassistant.helpers.frame")

    ConfigEntries = config_entries_mod.ConfigEntries  # type: ignore[assignment]
    HomeAssistant = core_mod.HomeAssistant  # type: ignore[assignment]
    Integration = loader_mod.Integration  # type: ignore[assignment]
    DATA_COMPONENTS = loader_mod.DATA_COMPONENTS
    DATA_CUSTOM_COMPONENTS = loader_mod.DATA_CUSTOM_COMPONENTS
    DATA_INTEGRATIONS = loader_mod.DATA_INTEGRATIONS
    DATA_MISSING_PLATFORMS = loader_mod.DATA_MISSING_PLATFORMS
    DATA_PRELOAD_PLATFORMS = loader_mod.DATA_PRELOAD_PLATFORMS

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture
def event_loop() -> AsyncGenerator[asyncio.AbstractEventLoop]:
    """Create a fresh event loop per test session."""
    loop = asyncio.new_event_loop()
    try:
        yield loop
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        asyncio.set_event_loop(None)


@pytest.fixture
async def hass(
    event_loop: asyncio.AbstractEventLoop, tmp_path
) -> AsyncGenerator[HomeAssistant]:
    """Provide a running Home Assistant instance backed by a temp config dir."""
    if HOMEASSISTANT_IMPORT_ERROR is not None:  # pragma: no cover - optional smoke path
        pytest.skip(
            "Home Assistant is required for hass fixture: "
            f"{HOMEASSISTANT_IMPORT_ERROR}",
            allow_module_level=False,
        )

    asyncio.set_event_loop(event_loop)
    hass = HomeAssistant(str(tmp_path))
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()

    previous_frame_hass = frame._hass.hass
    frame.async_setup(hass)

    class _HttpStub:
        def __init__(self) -> None:
            self.registered_static_paths: list[Any] = []

        async def async_register_static_paths(self, paths):
            self.registered_static_paths.extend(paths)

        async def async_register_view(self, _view):  # pragma: no cover - compatibility
            return None

    hass.http = _HttpStub()
    hass.data.setdefault(DATA_INTEGRATIONS, {})
    hass.data.setdefault(DATA_CUSTOM_COMPONENTS, {})
    hass.data.setdefault(DATA_COMPONENTS, {})
    hass.data.setdefault(DATA_MISSING_PLATFORMS, {})
    hass.data.setdefault(DATA_PRELOAD_PLATFORMS, set())

    # Register the pp_reader integration so loader lookups succeed during tests.
    try:
        import custom_components
    except ImportError:  # pragma: no cover - repository layout unexpected
        custom_components = None

    if custom_components is not None:
        integration = Integration.resolve_from_root(
            hass, custom_components, "pp_reader"
        )
        if integration is None:  # pragma: no cover - would indicate invalid manifest
            raise RuntimeError("Failed to resolve pp_reader integration for tests")

        hass.data[DATA_CUSTOM_COMPONENTS][integration.domain] = integration
        hass.data[DATA_INTEGRATIONS][integration.domain] = integration

        # Ensure the package exposes its module under the __init__ attribute so tests
        # using monkeypatch paths like ``custom_components.pp_reader.__init__`` work.
        import custom_components.pp_reader as pp_reader_module

        custom_components.pp_reader.__init__ = pp_reader_module

    # Avoid loading real portfolio data during tests; coordinator sync is patched to no-op.
    from custom_components.pp_reader.data.coordinator import (
        PPReaderCoordinator,
    )

    original_sync_portfolio_file = PPReaderCoordinator._sync_portfolio_file

    async def _noop_sync_portfolio_file(self, _last_update):
        return None

    PPReaderCoordinator._sync_portfolio_file = _noop_sync_portfolio_file

    try:
        yield hass
    finally:
        frame._hass.hass = previous_frame_hass
        PPReaderCoordinator._sync_portfolio_file = original_sync_portfolio_file
        await hass.async_stop(force=True)
        await hass.async_block_till_done()
