import logging
from homeassistant.helpers.entity import Entity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities) -> None:
    """Set up sensor based on config entry."""
    file_path = entry.data.get(CONF_FILE_PATH)
    client = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if client is None:
        _LOGGER.error("❌ Portfolio konnte nicht geladen werden, Sensor wird nicht erstellt.")
        return

    sensors = [
        PortfolioSecurityCountSensor(entry.entry_id, file_path, len(client.securities))
    ]
    async_add_entities(sensors)

class PortfolioSecurityCountSensor(Entity):
    """Sensor für die Anzahl der Wertpapiere im Portfolio."""

    def __init__(self, entry_id, file_path, count):
        self._attr_name = "Portfolio: Wertpapiere"
        self._attr_unique_id = f"pp_reader_securities_{entry_id}"
        self._count = count
        self._attr_icon = "mdi:finance"
        self._file_path = file_path

    @property
    def native_value(self):
        return self._count

    @property
    def native_unit_of_measurement(self):
        return "Wertpapiere"

    @property
    def extra_state_attributes(self):
        return {
            "file_path": self._file_path,
        }

