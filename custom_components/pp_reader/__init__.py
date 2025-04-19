"""Portfolio Performance Reader - Initialisierung."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_PATH

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict):
    """Setup über configuration.yaml (nicht verwendet)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Setze die Integration bei Verwendung über das UI auf."""
    path = entry.data.get(CONF_PATH)
    _LOGGER.info("Initialisiere pp_reader mit Datei: %s", path)
    # Hier später: Datei verarbeiten
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Räume beim Entfernen der Integration auf."""
    _LOGGER.debug("pp_reader wird entladen")
    return True

