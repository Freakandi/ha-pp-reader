import logging
from pathlib import Path
import aiohttp
from aiohttp import web
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform
from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig, HomeAssistantView
from .const import DOMAIN, CONF_API_TOKEN

_LOGGER = logging.getLogger(__name__)
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

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
        requires_auth = True

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
