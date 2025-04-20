import logging
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.const import CONF_NAME

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the sensor platform."""
    file_path = entry.data.get(CONF_FILE_PATH)

    client = await hass.async_add_executor_job(parse_data_portfolio, file_path)
    if client is None:
        _LOGGER.error("❌ Sensor-Initialisierung fehlgeschlagen: Datei konnte nicht gelesen werden.")
        return

    sensors = [
        PortfolioSensor("Portfolio Securities", len(client.securities), "securities", entry.entry_id),
    ]
    async_add_entities(sensors)


class PortfolioSensor(Entity):
    def __init__(self, name, value, sensor_type, entry_id):
        self._attr_name = name
        self._attr_native_value = value
        self._attr_unique_id = f"pp_reader_{sensor_type}_{entry_id}"
        self._attr_device_class = None
        self._attr_state_class = "measurement"
        self._attr_icon = "mdi:chart-line"

    def update(self):
        pass  # Keine zyklischen Updates nötig vorerst

