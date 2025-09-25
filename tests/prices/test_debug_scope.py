"""
QA Test: Debug-Option beeinflusst ausschließlich Preis-Logger-Namespace.

Verifiziert:
1. Initiales Setup mit enable_price_debug=True setzt nur Logger
   custom_components.pp_reader.prices.* auf DEBUG.
2. Anderer Namespace (z.B. coordinator) bleibt auf INFO (oder höher; jedenfalls != DEBUG).
3. Reload mit enable_price_debug=False setzt Preis-Logger zurück auf INFO.

Nutzen der vorhandenen Reload-Logik (Update Listener) aus
custom_components.pp_reader.__init__._async_reload_entry_on_update.
"""

import logging
import asyncio
import pytest
from pathlib import Path
from tests.common import MockConfigEntry

from custom_components.pp_reader.const import DOMAIN, CONF_FILE_PATH, CONF_DB_PATH
from custom_components.pp_reader.data.db_init import initialize_database_schema


PRICE_LOGGERS = [
    "custom_components.pp_reader.prices",
    "custom_components.pp_reader.prices.price_service",
    "custom_components.pp_reader.prices.yahooquery_provider",
    "custom_components.pp_reader.prices.revaluation",
    "custom_components.pp_reader.prices.symbols",
    "custom_components.pp_reader.prices.provider_base",
]


@pytest.mark.asyncio
async def test_debug_option_scoped_logging(hass, tmp_path, caplog):
    caplog.set_level(logging.DEBUG)

    # DB + Dummy Portfolio
    db_path = tmp_path / "debugscope.db"
    initialize_database_schema(db_path)
    portfolio_file = tmp_path / "debugscope.portfolio"
    portfolio_file.write_text("DUMMY")

    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_FILE_PATH: str(portfolio_file), CONF_DB_PATH: str(db_path)},
        options={"price_update_interval_seconds": 900, "enable_price_debug": True},
        title="DebugScope",
    )
    entry.add_to_hass(hass)

    # Setup (aktiviert Debug)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # 1. Alle Preis-Logger auf DEBUG
    for name in PRICE_LOGGERS:
        lvl = logging.getLogger(name).getEffectiveLevel()
        assert (
            lvl == logging.DEBUG
        ), f"Preis-Logger {name} nicht DEBUG (ist {logging.getLevelName(lvl)})"

    # 2. Nicht-Preis-Logger bleibt != DEBUG
    other_logger = logging.getLogger("custom_components.pp_reader.data.coordinator")
    other_lvl = other_logger.getEffectiveLevel()
    assert (
        other_lvl != logging.DEBUG
    ), f"Fremd-Logger unerwartet auf DEBUG gesetzt ({logging.getLevelName(other_lvl)})"

    # Reload mit Debug=False
    caplog.clear()
    hass.config_entries.async_update_entry(
        entry,
        options={
            "price_update_interval_seconds": 900,
            "enable_price_debug": False,
        },
    )
    await hass.async_block_till_done()

    # 3. Preis-Logger zurück auf INFO
    for name in PRICE_LOGGERS:
        lvl = logging.getLogger(name).getEffectiveLevel()
        assert (
            lvl == logging.INFO
        ), f"Preis-Logger {name} nicht auf INFO zurückgesetzt (ist {logging.getLevelName(lvl)})"

    # Non-Preis Namespace weiterhin nicht DEBUG (idempotent)
    other_lvl_2 = other_logger.getEffectiveLevel()
    assert (
        other_lvl_2 != logging.DEBUG
    ), f"Fremd-Logger nach Reload DEBUG (ist {logging.getLevelName(other_lvl_2)})"