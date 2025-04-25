import logging
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform

from homeassistant.components import frontend

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

    # 2) Panel programmgesteuert registrieren
    frontend.async_register_built_in_panel(
        hass,
        "iframe",                        # Standard-Paneltyp: IFrame
        "Portfolio Dashboard",           # sidebar_title
        "mdi:finance",                   # sidebar_icon
        "pp-reader",                     # url_path (Erreichbar unter /pp-reader)
        {
            "url": "/local/community/pp_reader_dashboard/dashboard.html"   # Geladene HTML-Datei
        },
        require_admin=False
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Integration entfernen."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
