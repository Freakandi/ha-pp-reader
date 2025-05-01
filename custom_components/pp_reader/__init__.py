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

import asyncio
from functools import partial
import importlib

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    try:
        # Plattform-Import vor dem Event Loop
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, 
            partial(importlib.import_module, "custom_components.pp_reader.sensor")
        )
        
        # Datei-Validierung
        file_path = Path(entry.data[CONF_FILE_PATH])
        if not file_path.exists():
            raise ConfigEntryNotReady(f"Datei nicht gefunden: {file_path}")
            
        # Portfolio-Datei laden
        data = await hass.async_add_executor_job(parse_data_portfolio, str(file_path))
        if not data:
            raise ConfigEntryNotReady("Portfolio-Daten konnten nicht geladen werden")
        
        # DB-Pfad konfigurieren
        db_path = Path(entry.data.get(CONF_DB_PATH, hass.config.path("pp_reader.db")))
        
        # Coordinator erstellen
        coordinator = PPReaderCoordinator(
            hass=hass,
            file_path=file_path,
            db_path=db_path,
            data=data
        )
        
        # Erste Aktualisierung durchführen
        await coordinator.async_config_entry_first_refresh()
            
        # Datenstruktur initialisieren
        hass.data.setdefault(DOMAIN, {})
        hass.data[DOMAIN][entry.entry_id] = {
            "data": data,
            "file_path": str(file_path),
            "db_path": db_path,
            "coordinator": coordinator  # Coordinator hinzufügen
        }
        
        _LOGGER.info("Portfolio Daten und Coordinator erfolgreich initialisiert")
        
        # Plattformen laden
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        return True
        
    except Exception as e:
        _LOGGER.exception("Kritischer Fehler beim Setup: %s", str(e))
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return unload_ok
