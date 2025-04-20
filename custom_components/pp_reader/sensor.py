import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN, CONF_FILE_PATH

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
) -> None:
    """Set up portfolio sensors based on a config entry."""
    file_path = entry.data.get(CONF_FILE_PATH)
    sensor = PortfolioSecurityCountSensor(entry.entry_id, file_path)
    async_add_entities([sensor], update_before_add=True)


class PortfolioSecurityCountSensor(SensorEntity):
    """Sensor that shows the number of securities in the portfolio."""

    def __init__(self, entry_id, file_path):
        self._entry_id = entry_id
        self._file_path = file_path
        self._attr_name = "Portfolio: Wertpapiere"
        self._attr_unique_id = f"pp_reader_securities_{entry_id}"
        self._attr_icon = "mdi:finance"
        self._attr_native_unit_of_measurement = "Wertpapiere"
        self._attr_native_value = None

    @property
    def extra_state_attributes(self):
        return {"file_path": self._file_path}

    async def async_update(self):
        """Load latest data from the .portfolio file."""
        from .reader import parse_data_portfolio

        try:
            client = await self.hass.async_add_executor_job(
                parse_data_portfolio, self._file_path
            )
            if client and hasattr(client, "securities"):
                self._attr_native_value = len(client.securities)
            else:
                _LOGGER.warning("⚠️ Keine Wertpapiere gefunden oder Parsing fehlgeschlagen.")
                self._attr_native_value = None
        except Exception as e:
            _LOGGER.error(f"Fehler beim Aktualisieren des Sensors: {e}")
            self._attr_native_value = None

