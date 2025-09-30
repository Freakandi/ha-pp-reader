"""Pytest fixtures to bootstrap Home Assistant core for integration tests."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import pytest
from homeassistant.config_entries import ConfigEntries
from homeassistant.core import HomeAssistant
from homeassistant.loader import (
    DATA_COMPONENTS,
    DATA_CUSTOM_COMPONENTS,
    DATA_INTEGRATIONS,
    DATA_MISSING_PLATFORMS,
    DATA_PRELOAD_PLATFORMS,
    Integration,
)

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
    asyncio.set_event_loop(event_loop)
    hass = HomeAssistant(str(tmp_path))
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()

    class _HttpStub:
        async def async_register_static_paths(self, _paths):
            return None

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
    from custom_components.pp_reader.data.coordinator import PPReaderCoordinator

    original_sync_portfolio_file = PPReaderCoordinator._sync_portfolio_file

    async def _noop_sync_portfolio_file(self, _last_update):
        return None

    PPReaderCoordinator._sync_portfolio_file = _noop_sync_portfolio_file

    try:
        yield hass
    finally:
        PPReaderCoordinator._sync_portfolio_file = original_sync_portfolio_file
        await hass.async_stop(force=True)
        await hass.async_block_till_done()
