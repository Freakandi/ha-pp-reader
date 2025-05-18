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
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api import websocket_command

from .data.backup_db import setup_backup_system
from .const import DOMAIN, CONF_API_TOKEN, CONF_FILE_PATH, CONF_DB_PATH
from .data.db_init import initialize_database_schema
from .data.coordinator import PPReaderCoordinator  # Import hinzufügen

import asyncio
from functools import partial
import importlib
import sqlite3

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = [Platform.SENSOR]  # Explizite Platform-Konstante verwenden


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
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
        )
        try:
            await coordinator.async_config_entry_first_refresh()
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

        # Dashboard-Dateien registrieren
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                "/pp_reader_dashboard",
                hass.config.path("custom_components/pp_reader/www/pp_reader_dashboard"),
                cache_headers=False
            )
        ])

        panel_config = {
            "module_url": "/pp_reader_dashboard/js/panel.js",
            "trust_external_script": True
        }
        _LOGGER.warning("Panel-Registrierung: %s", panel_config)

        frontend.async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Portfolio Dashboard",
            sidebar_icon="mdi:finance",
            frontend_url_path="ppreader",
            config=panel_config,
            require_admin=False
        )

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
                            
                            if resp.status != 200:
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

        # --- Websocket-API für Dashboard ---
        @websocket_command({"type": "pp_reader/get_dashboard_data"})
        async def ws_get_dashboard_data(hass, connection, msg):
            """Liefert Konten und Depots aus der SQLite-DB."""
            try:
                db_path = hass.data[DOMAIN][entry.entry_id]["db_path"]
                # Lade Konten und Depots synchron (da DB-Access nicht async ist)
                from .data.db_access import get_accounts, get_portfolios
                accounts = await hass.async_add_executor_job(get_accounts, db_path)
                portfolios = await hass.async_add_executor_job(get_portfolios, db_path)
                # Optional: weitere Daten hinzufügen
                connection.send_result(msg["id"], {
                    "accounts": [a.__dict__ for a in accounts],
                    "portfolios": [p.__dict__ for p in portfolios],
                })
            except Exception as e:
                connection.send_error(msg["id"], "db_error", str(e))

        websocket_api.async_register_command(hass, ws_get_dashboard_data)

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