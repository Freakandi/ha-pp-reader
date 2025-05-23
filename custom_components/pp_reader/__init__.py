import logging
import voluptuous as vol
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
from homeassistant.components import websocket_api

from .data.backup_db import setup_backup_system
from .const import DOMAIN, CONF_API_TOKEN, CONF_FILE_PATH, CONF_DB_PATH
from .data.db_init import initialize_database_schema
from .data.coordinator import PPReaderCoordinator
from .data.websocket import ws_get_dashboard_data
from .data.websocket import ws_get_accounts
from .data.websocket import ws_get_last_file_update

import asyncio
from functools import partial
import importlib

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = [Platform.SENSOR]

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Setup of your component."""
    # Dashboard-Dateien registrieren
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/pp_reader_dashboard",
            hass.config.path("custom_components/pp_reader/www/pp_reader_dashboard"),
            cache_headers=False
        )
    ])

    # Websocket-API registrieren
    try:
        websocket_api.async_register_command(hass, ws_get_dashboard_data)
        websocket_api.async_register_command(hass, ws_get_accounts)
        websocket_api.async_register_command(hass, ws_get_last_file_update)
        _LOGGER.debug("✅ Websocket-Befehle erfolgreich registriert.")
    except Exception as e:
        _LOGGER.error("❌ Fehler bei der Registrierung der Websocket-Befehle: %s", str(e))

    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Portfolio Performance Reader from a config entry."""
    try:
        # DB-Pfad aus Config holen und DB initialisieren
        file_path = entry.data[CONF_FILE_PATH]
        db_path = Path(entry.data[CONF_DB_PATH])
        token = entry.data.get(CONF_API_TOKEN)

        # Datenbank initialisieren
        try:
            _LOGGER.info("📁 Initialisiere Datenbank falls notwendig: %s", db_path)
            initialize_database_schema(db_path)
        except Exception as e:
            _LOGGER.exception("❌ Fehler bei der DB-Initialisierung: %s", e)
            raise ConfigEntryNotReady("Datenbank konnte nicht initialisiert werden")

        # Datenstruktur initialisieren
        hass.data.setdefault(DOMAIN, {})
        hass.data[DOMAIN][entry.entry_id] = {
            "file_path": str(file_path),
            "db_path": db_path,
            "api_token": token
        }

        # Coordinator initialisieren
        coordinator = PPReaderCoordinator(
            hass,
            db_path=db_path,
            file_path=Path(file_path),
            entry_id=entry.entry_id,  # Entry-ID übergeben
        )
        try:
            await coordinator.async_config_entry_first_refresh()
            _LOGGER.debug("Initialisiere Coordinator mit entry_id: %s", entry.entry_id)
        except Exception as e:
            _LOGGER.error("❌ Fehler beim ersten Datenabruf des Coordinators: %s", str(e))
            raise ConfigEntryNotReady("Coordinator konnte nicht initialisiert werden")

        # Coordinator in hass.data speichern
        hass.data[DOMAIN][entry.entry_id]["coordinator"] = coordinator

        _LOGGER.info("Portfolio Daten erfolgreich initialisiert")
        
        # Plattformen laden
        try:
            _LOGGER.info("🔄 Starte Sensor-Setup...")
            await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
            _LOGGER.info("✅ Sensor-Setup abgeschlossen")
        except Exception as e:
            _LOGGER.error("❌ Fehler beim Sensor-Setup: %s", str(e))
            raise ConfigEntryNotReady("Sensor-Setup fehlgeschlagen")

        # API-Proxy Implementierung
        class PPReaderAPI(HomeAssistantView):
            """API View für den PP Reader."""
            url = "/pp_reader_api/states"
            name = "pp_reader_api"
            requires_auth = False

            def __init__(self, token):
                """Initialisiere API mit Token."""
                self._token = token  # Token privat speichern
                _LOGGER.debug("API initialisiert mit Token")

            async def get(self, request):
                """Handle GET requests."""
                if not self._token:
                    _LOGGER.error("Kein API-Token konfiguriert")
                    return web.Response(
                        status=500,
                        text="API Token nicht konfiguriert"
                    )

                try:
                    async with aiohttp.ClientSession() as session:
                        _LOGGER.debug("Starte API Abruf mit Token: %s", self._token[:5] + "...")
                        
                        api_url = f"{request.url.scheme}://{request.url.host}:{request.url.port}/api/states"
                        headers = {"Authorization": f"Bearer {self._token}"}
                        
                        async with session.get(api_url, headers=headers) as resp:
                            _LOGGER.debug("API Antwort Status: %s", resp.status)
                            
                            if (resp.status != 200):
                                _LOGGER.error(
                                    "API Fehler: Status %s, Body: %s",
                                    resp.status,
                                    await resp.text()
                                )
                                return web.Response(
                                    status=resp.status,
                                    text=f"API Error: {resp.status}"
                                )
                                
                            data = await resp.text()
                            return web.Response(
                                status=200,
                                body=data,
                                content_type="application/json"
                            )

                except Exception as e:
                    _LOGGER.exception("Kritischer API Fehler: %s", str(e))
                    return web.Response(
                        status=500,
                        text=f"Internal Server Error: {str(e)}"
                    )

        # API registrieren
        try:
            api_token = entry.data.get(CONF_API_TOKEN)
            if not api_token:
                _LOGGER.error("API Token fehlt in der Konfiguration")
                raise ConfigEntryNotReady("API Token nicht konfiguriert")
                
            _LOGGER.info("Registriere API mit Token")
            hass.http.register_view(PPReaderAPI(api_token))
            
        except Exception as e:
            _LOGGER.exception("Fehler bei API-Registrierung: %s", str(e))
            raise ConfigEntryNotReady("API-Setup fehlgeschlagen")

        # Backup-System starten
        try:
            await setup_backup_system(hass, db_path)
        except Exception as e:
            _LOGGER.exception("❌ Fehler beim Setup des Backup-Systems: %s", e)

        # Vor der Registrierung des Panels prüfen, ob es bereits existiert
        if not any(panel.frontend_url_path == "ppreader" for panel in hass.data.get("frontend_panels", {}).values()):
            frontend.async_register_built_in_panel(
                hass,
                component_name="custom",
                sidebar_title="Portfolio Dashboard",
                sidebar_icon="mdi:finance",
                frontend_url_path="ppreader",
                require_admin=False,
                config={
                    "_panel_custom": {
                        "name": "pp-reader-panel",
                        "embed_iframe": False,
                        "module_url": "/pp_reader_dashboard/panel.js",
                        "trust_external": True,
                        "config": {
                            "entry_id": entry.entry_id
                        }
                    }
                },
            )
        else:
            _LOGGER.warning("Das Panel 'ppreader' ist bereits registriert. Überspringe Registrierung.")

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
