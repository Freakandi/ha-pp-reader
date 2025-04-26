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

    # 2) Statische Dateien für das Dashboard bereitstellen
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/pp_reader_dashboard",
            hass.config.path("custom_components/pp_reader/www/pp_reader_dashboard"),
            cache_headers=False
        )
    ])

    # 3) Panel (Dashboard) in der Seitenleiste registrieren
    frontend.async_register_built_in_panel(
        hass,
        "iframe",                        # Standard-Paneltyp: IFrame
        "Portfolio Dashboard",           # sidebar_title
        "mdi:finance",                   # sidebar_icon
        "pp-reader",                     # url_path (Sidebar)
        {
            "url": "/pp_reader_dashboard/dashboard.html"
        },
        require_admin=False
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Integration entfernen."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
