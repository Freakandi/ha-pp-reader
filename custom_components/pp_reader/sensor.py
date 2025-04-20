import logging
from homeassistant.helpers.entity import Entity
from homeassistant.const import CONF_NAME
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import AddEntitiesCallback

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensor based on config entry."""
    file_path = entry.data.get(CONF_FILE_PATH)
    client = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if client is None:
        _LOGGER.error("❌ Portfolio konnte nicht geladen werden, Sensor wird nicht erstellt.")
        return

    entities = [
        PortfolioSecurityCountSensor(entry.entry_id, file_path, len(client.securities))
    ]

    async_add_entities(entities)


class PortfolioSecurityCountSensor(Entity):
    """Sensor für die Anzahl der Wertpapiere im Portfolio."""

    def __init__(self, entry_id, file_path, count):
        self._attr_name = "Portfolio: Wertpapiere"
        self._attr_unique_id = f"pp_reader_securities_{entry_id}"
        self._attr_native_value = count
        self._attr_icon = "mdi:finance"
        self._attr_extra_state_attributes = {
            "file_path": file_path,
        }

    @property
    def native_unit_of_measurement(self):
        return "Wertpapiere"

