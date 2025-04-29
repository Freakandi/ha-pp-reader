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

from .const import DOMAIN, CONF_API_TOKEN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .coordinator import PPReaderCoordinator

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)

    os.makedirs(hass.config.path("custom_components/pp_reader/storage"), exist_ok=True)

    file_path = entry.data[CONF_FILE_PATH]

    # Portfolio-Datei laden
    data = await hass.async_add_executor_job(parse_data_portfolio, file_path)
    if not data:
        raise ConfigEntryNotReady(f"❌ Datei konnte nicht gelesen werden: {file_path}")

    data.file_path = file_path

    # Coordinator initialisieren
    coordinator = PPReaderCoordinator(hass, None, data, file_path)
    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception as err:
        raise ConfigEntryNotReady(f"❌ Coordinator konnte nicht initialisiert werden: {err}")

    # Daten im Speicher ablegen
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "coordinator": coordinator,
        "data": data,
        "file_path": file_path,
        "api_token": entry.data.get(CONF_API_TOKEN),
    }

    # Sensor-Plattform starten
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Dashboard-Dateien bereitstellen
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/pp_reader_dashboard",
            hass.config.path("custom_components/pp_reader/www/pp_reader_dashboard"),
            cache_headers=False
        )
    ])

    # Dashboard in Seitenleiste eintragen
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

    # Interner API-Proxy
    token = entry.data.get(CONF_API_TOKEN)

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
                    headers={"Authorization": f"Bearer {self.token}"}
                ) as resp:
                    if resp.status != 200:
                        _LOGGER.error("Fehler beim Abrufen von /api/states: %s", resp.status)
                        return web.Response(status=resp.status, text="API Error")
                    data = await resp.text()
                    return web.Response(status=200, body=data, content_type="application/json")

    hass.http.register_view(PPReaderAPI(token))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
