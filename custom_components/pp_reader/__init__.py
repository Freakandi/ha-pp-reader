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
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/pp_reader_dashboard",
            str(Path(__file__).parent / "www" / "pp_reader_dashboard"),
            True
        )
    ])

    # 3) Panel programmgesteuert registrieren
    frontend.async_register_built_in_panel(
        hass,
        "pp-reader-dashboard",          # Name des Custom-Elements (<pp-reader-dashboard>)
        "Portfolio Dashboard",          # sidebar_title
        "mdi:finance",                  # sidebar_icon
        "pp-reader",                    # url_path im Sidebar (ohne Slash)
        {
            "_panel_custom": {
                "name": "pp-reader-dashboard",
                # Statt module_url jetzt direkt das HTML im IFrame laden:
                "html_url":  "/pp_reader_dashboard/dashboard.html",
                "embed_iframe": True,
                # trust_external nicht nötig, da deine Assets intern liegen
            }
        },
        require_admin=False
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Integration entfernen."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
