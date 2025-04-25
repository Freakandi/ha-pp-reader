import logging
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Unterstützte Plattformen
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """YAML-Setup (nicht genutzt)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup über Config Flow (UI)."""
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # 1) Sensor-Plattformen laden
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # 2) Statische Assets selbst verfügbar machen
    #    (url_path, serve-Pfad, cache_headers)
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/pp_reader_dashboard",
            str(Path(__file__).parent / "www" / "pp_reader_dashboard"),
            True
        )
    ])

    # 3) Panel programmatisch registrieren
    frontend.async_register_built_in_panel(
        hass,
        "pp-reader-dashboard",             # Custom Element-Name
        "Portfolio Dashboard",             # Sidebar-Titel
        "mdi:finance",                     # Icon
        "pp-reader",                       # URL-Pfad im Sidebar (ohne Slash)
        {
            "module_url": "/pp_reader_dashboard/dashboard.js"
        },
        require_admin=False
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Integration entfernen."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok

