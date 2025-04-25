import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType
from homeassistant.const import Platform

# Für die Panel-Registrierung
from homeassistant.components import frontend

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Unterstützte Plattformen
PLATFORMS: list[Platform] = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Legacy setup (YAML) – hier keine Aktion nötig."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Setup über UI (Config Flow)."""
    _LOGGER.debug("🔧 Starte Integration: %s", DOMAIN)
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Starte alle registrierten Plattformen
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # --- Panel registrieren ---
    frontend.async_register_built_in_panel(
        hass,
        component_name="panel_custom",
        url_path="pp-reader",
        sidebar_title="Portfolio Dashboard",
        sidebar_icon="mdi:finance",
        # Pfad unter /hacsfiles/<repo-name>/<Ordner-ohne-www>/
        module_url="/hacsfiles/ha-pp-reader/pp_reader_dashboard/dashboard.js",
        require_admin=False
    )
    # --------------------------

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Behandle das Entfernen der Integration."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok

