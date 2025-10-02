"""Ensure the custom panel is registered before the first coordinator refresh.

This prevents users from hitting a 404 on /ppreader while the initial data
refresh is still running during Home Assistant startup.
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.const import CONF_FILE_PATH
from homeassistant.core import HomeAssistant

from custom_components.pp_reader.const import CONF_DB_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from tests.common import MockConfigEntry


@pytest.mark.asyncio
async def test_panel_registered_before_first_refresh(
    hass: HomeAssistant, tmp_path, monkeypatch
) -> None:
    """The panel should be available before the first data sync finishes."""
    portfolio_file = tmp_path / "demo.portfolio"
    portfolio_file.write_text("DUMMY")

    db_path = tmp_path / "demo.db"
    initialize_database_schema(db_path)

    call_order: list[str] = []

    async def fake_register_panel(hass_inner, entry_inner):
        call_order.append("register_panel")

    async def fake_first_refresh(self):
        call_order.append("first_refresh")
        return {}

    monkeypatch.setattr(
        "custom_components.pp_reader.__init__._register_panel_if_absent",
        fake_register_panel,
    )
    monkeypatch.setattr(
        "custom_components.pp_reader.data.coordinator.PPReaderCoordinator.async_config_entry_first_refresh",
        fake_first_refresh,
    )

    entry: MockConfigEntry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_FILE_PATH: str(portfolio_file),
            CONF_DB_PATH: str(db_path),
        },
        options={},
        title="Demo Portfolio",
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert call_order, "Expected patched functions to be invoked"
    assert call_order[0] == "register_panel"
    assert call_order.index("register_panel") < call_order.index("first_refresh")


@pytest.mark.asyncio
async def test_placeholder_panel_registered_during_setup(
    hass: HomeAssistant, monkeypatch
) -> None:
    """A placeholder panel should be registered during component setup."""

    captured_configs: list[dict[str, Any]] = []

    async def fake_register_panel(*args, **kwargs):  # noqa: ANN002, ANN003
        captured_configs.append(kwargs.get("config", {}))

    monkeypatch.setattr(
        "custom_components.pp_reader.__init__.panel_custom_async_register_panel",
        fake_register_panel,
    )

    import custom_components.pp_reader as integration

    assert await integration.async_setup(hass, {})
    assert captured_configs, "Expected the placeholder registration to run"
    placeholder_config = captured_configs[0]
    assert placeholder_config.get("entry_id") is None
    assert placeholder_config.get("placeholder") is True
