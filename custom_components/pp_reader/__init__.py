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
import sqlite3
from .sync_from_pclient import sync_from_pclient

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
            
        # DB-Pfad aus Config Entry verwenden
        db_path = Path(entry.data[CONF_DB_PATH])
        
        # DB initialisieren
        await hass.async_add_executor_job(initialize_database_schema, db_path)
            
        # Portfolio-Datei laden
        data = await hass.async_add_executor_job(parse_data_portfolio, str(file_path))
        if not data:
            raise ConfigEntryNotReady("Portfolio-Daten konnten nicht geladen werden")
            
        # Daten in die SQLite DB synchronisieren
        try:
            _LOGGER.info("📥 Synchronisiere Daten mit SQLite DB...")
            
            # DB-Synchronisation in einem eigenen Executor-Job
            def sync_data():
                conn = sqlite3.connect(str(db_path))
                try:
                    sync_from_pclient(data, conn)
                finally:
                    conn.close()
                    
            await hass.async_add_executor_job(sync_data)
            
        except Exception as e:
            _LOGGER.exception("❌ Fehler bei der DB-Synchronisation: %s", str(e))
            raise ConfigEntryNotReady("DB-Synchronisation fehlgeschlagen")
        
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

        # Dashboard-Dateien registrieren
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                "/pp_reader_dashboard",
                hass.config.path("custom_components/pp_reader/www/pp_reader_dashboard"),
                cache_headers=False
            )
        ])

        if "pp-reader" not in hass.data.get("frontend_panels", {}):
            frontend.async_register_built_in_panel(
                hass,
                "iframe",
                "Portfolio Dashboard",
                "mdi:finance", 
                "pp-reader",
                {
                    "url": "/pp_reader_dashboard/dashboard.html"
                },
                require_admin=False
            )

        # API-Proxy registrieren
        class PPReaderAPI(HomeAssistantView):
            url = "/pp_reader_api/states"
            name = "pp_reader_api"
            requires_auth = False

            def __init__(self, token):
                self.token = token

            async def get(self, request):
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        "http://localhost:8123/api/states",
                        headers={"Authorization": f"Bearer {entry.data[CONF_API_TOKEN]}"}
                    ) as resp:
                        if resp.status != 200:
                            _LOGGER.error("Fehler beim Abrufen von /api/states: %s", resp.status)
                            return web.Response(status=resp.status, text="API Error")
                        data = await resp.text()
                        return web.Response(status=200, body=data, content_type="application/json")

        hass.http.register_view(PPReaderAPI(entry.data[CONF_API_TOKEN]))

        # Backup-System starten
        try:
            await setup_backup_system(hass, db_path)
        except Exception as e:
            _LOGGER.exception("❌ Fehler beim Setup des Backup-Systems: %s", e)
            
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
