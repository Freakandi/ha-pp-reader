import logging
from pathlib import Path
import aiohttp
import os
from aiohttp import web
from homeassistant.config_entries import ConfigEntry, ConfigEntryNotReady
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform
from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig, HomeAssistantView

from .backup_db import setup_backup_system
from .const import DOMAIN, CONF_API_TOKEN, CONF_FILE_PATH, CONF_DB_PATH
from .reader import parse_data_portfolio
from .coordinator import PPReaderCoordinator
from .db_init import initialize_database_schema

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    try:
        # Datei-Validierung
        file_path = Path(entry.data[CONF_FILE_PATH])
        if not file_path.exists():
            raise ConfigEntryNotReady(f"Datei nicht gefunden: {file_path}")
            
        # Portfolio-Datei asynchron laden
        data = await hass.async_add_executor_job(parse_data_portfolio, file_path)
        if not data:
            raise ConfigEntryNotReady("Portfolio-Daten konnten nicht geladen werden")
            
        # Plattform asynchron laden
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        
        return True
        
    except Exception as e:
        _LOGGER.exception("Kritischer Fehler beim Setup: %s", str(e))
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    try:
        coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
        await coordinator.async_shutdown()  # Neue Methode hinzufügen
        
        if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
            hass.data[DOMAIN].pop(entry.entry_id, None)
        return unload_ok
    except Exception as e:
        _LOGGER.error("Fehler beim Entladen: %s", e)
        return False
