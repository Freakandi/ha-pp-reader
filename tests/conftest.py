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
    DATA_PRELOAD_PLATFORMS,
    Integration,
)

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture
def event_loop() -> AsyncGenerator[asyncio.AbstractEventLoop, None]:
    """Create a fresh event loop per test session."""

    loop = asyncio.new_event_loop()
    try:
        yield loop
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        asyncio.set_event_loop(None)


@pytest.fixture
async def hass(event_loop: asyncio.AbstractEventLoop, tmp_path) -> AsyncGenerator[HomeAssistant, None]:
    """Provide a running Home Assistant instance backed by a temp config dir."""

    asyncio.set_event_loop(event_loop)
    hass = HomeAssistant(str(tmp_path))
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()
    hass.data.setdefault(DATA_INTEGRATIONS, {})
    hass.data.setdefault(DATA_CUSTOM_COMPONENTS, {})
    hass.data.setdefault(DATA_COMPONENTS, set())
    hass.data.setdefault(DATA_PRELOAD_PLATFORMS, set())

    # Register the pp_reader integration so loader lookups succeed during tests.
    try:
        import custom_components  # noqa: PLC0415 - imported for side effect

        integration = Integration.resolve_from_root(hass, custom_components, "pp_reader")
        if integration is not None:
            hass.data[DATA_CUSTOM_COMPONENTS][integration.domain] = integration
            hass.data[DATA_INTEGRATIONS][integration.domain] = integration
    except Exception:  # pragma: no cover - defensive guard for unusual environments
        pass

    try:
        yield hass
    finally:
        await hass.async_stop(force=True)
        await hass.async_block_till_done()
