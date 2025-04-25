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
    """Legacy setup (YAML) – hier keine Aktion nötig."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup über Config Flow (UI)."""
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # 1) Starte alle registrierten Plattformen (Sensoren)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # 2) Statische Pfade für Dashboard-Assets registrieren
    #    Serviert alles aus custom_components/pp_reader/www/pp_reader_dashboard unter /pp_reader_dashboard/…
    hass.http.async_register_static_paths([
        StaticPathConfig(
            url_path="/pp_reader_dashboard",  # öffentlicher URL-Pfad
            serve_dir=str(Path(__file__).parent / "www" / "pp_reader_dashboard"),
            cache_headers=True
        )
    ])

    # 3) Panel programmgesteuert registrieren
    frontend.async_register_built_in_panel(
        hass,
        "pp-reader-dashboard",             # Name des Custom Elements
        "Portfolio Dashboard",             # sidebar_title
        "mdi:finance",                     # sidebar_icon
        "pp-reader",                       # URL-Pfad im HA-Dashboard (ohne führenden Slash)
        {
            # Hier nun dein selbst registrierter statischer Pfad
            "js_url": "/pp_reader_dashboard/dashboard.js"
        },
        require_admin=False
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Behandle das Entfernen der Integration."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok

