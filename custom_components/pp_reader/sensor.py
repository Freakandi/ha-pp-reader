import os
import logging
from datetime import datetime

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.typing import HomeAssistantType, ConfigType
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .accounting import calculate_account_balance

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistantType,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    """Initialisiere Kontostand-Sensoren aus .portfolio-Datei."""

    file_path = config_entry.data[CONF_FILE_PATH]
    data = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if not data:
        _LOGGER.error("Keine Daten aus Datei %s", file_path)
        return

    account_sensors = []
    for account in data.accounts:
        if getattr(account, "isRetired", False):
            continue

        saldo = calculate_account_balance(account.uuid, data.transactions)
        account_sensors.append(PortfolioAccountSensor(account.name, saldo, file_path))

    async_add_entities(account_sensors)


class PortfolioAccountSensor(SensorEntity):
    """Ein Sensor für den Kontostand eines Portfolios-Kontos."""

    def __init__(self, name, saldo, file_path):
        self._attr_name = f"Kontostand {name}"
        self._attr_native_unit_of_measurement = "€"
        self._state = round(saldo, 2)
        self._file_path = file_path

    @property
    def native_value(self):
        return self._state

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute, z. B. Änderungsdatum der Datei."""
        try:
            ts = os.path.getmtime(self._file_path)
            updated = datetime.fromtimestamp(ts).isoformat()
        except Exception as e:
            _LOGGER.warning("Konnte Änderungsdatum nicht lesen: %s", e)
            updated = None

        return {
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

