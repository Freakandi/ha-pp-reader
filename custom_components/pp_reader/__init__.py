import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform

# Panel-API importieren
from homeassistant.components import frontend

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Legacy setup (YAML) – hier nichts zu tun."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup über UI (Config Flow)."""
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Sensor-Plattformen laden
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # === Panel programmgesteuert registrieren ===
    frontend.async_register_built_in_panel(
        hass,
        "pp-reader-dashboard",  # Name deiner Webkomponente (<pp-reader-dashboard>)
        "Portfolio Dashboard",  # sidebar_title
        "mdi:finance",          # sidebar_icon
        "pp-reader",            # frontend_url_path (ohne führenden Slash)
        {
            "module_url": "/hacsfiles/ha-pp-reader/pp_reader_dashboard/dashboard.js"
        },                       # config-Dict mit module_url :contentReference[oaicite:1]{index=1}
        False                    # require_admin
    )
    # ============================================

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Entfernen der Integration."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok

