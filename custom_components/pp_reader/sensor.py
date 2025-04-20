import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import Entity
from .const import DOMAIN, CONF_FILE_PATH

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities
) -> None:
    """Sensoren basierend auf der Konfiguration einrichten."""
    file_path = entry.data.get(CONF_FILE_PATH)

    sensors = [
        PortfolioSecurityCountSensor(entry.entry_id, file_path)
    ]
    async_add_entities(sensors, update_before_add=True)


class PortfolioSecurityCountSensor(Entity):
    """Sensor für die Anzahl der Wertpapiere im Portfolio."""

    def __init__(self, entry_id, file_path):
        self._entry_id = entry_id
        self._file_path = file_path
        self._count = None
        self._attr_name = "Portfolio: Wertpapiere"
        self._attr_unique_id = f"pp_reader_securities_{entry_id}"
        self._attr_icon = "mdi:finance"

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

    async def async_update(self):
        """Aktualisiere den Sensorwert durch Parsen der Portfolio-Datei."""
        from .reader import parse_data_portfolio

        client = await self.hass.async_add_executor_job(
            parse_data_portfolio, self._file_path
        )

        if client:
            self._count = len(client.securities)
        else:
            _LOGGER.warning("⚠️ Sensor konnte Portfolio-Datei nicht einlesen.")
            self._count = None

