"""Portfolio Performance Reader - Initialisierung."""
import logging
import tempfile
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_PATH
from .reader import extract_data_portfolio

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict):
    """Setup über configuration.yaml (nicht verwendet)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Setze die Integration bei Verwendung über das UI auf."""
    path = entry.data.get(CONF_PATH)
    _LOGGER.info("Initialisiere pp_reader mit Datei: %s", path)

    # Entpacken in temporäres Verzeichnis
    try:
        with tempfile.TemporaryDirectory() as tmp:
            data_path = extract_data_portfolio(path, tmp)
            _LOGGER.info("Extrahierte data.portfolio: %s", data_path)
            # → Später: parse & verarbeite die Datei hier
    except Exception as e:
        _LOGGER.error("Fehler beim Verarbeiten der Datei: %s", str(e))
        return False

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry):
    """Räume beim Entfernen der Integration auf."""
    _LOGGER.debug("pp_reader wird entladen")
    return True

