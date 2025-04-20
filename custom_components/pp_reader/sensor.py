import os
import logging
from datetime import datetime

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.util import slugify

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .logic.accounting import calculate_account_balance

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
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
        sensor = PortfolioAccountSensor(account.name, saldo, file_path)
        account_sensors.append(sensor)

    async_add_entities(account_sensors)


class PortfolioAccountSensor(SensorEntity):
    """Ein Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, account_name, saldo, file_path):
        self._account_name = account_name
        self._file_path = file_path
        self._saldo = round(saldo, 2)

        # Anzeige-Name für die GUI
        self._attr_name = f"Kontostand {account_name}"

        # Eindeutige ID für HA: Kombination aus Dateiname + Konto
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(account_name)}"

        self._attr_native_unit_of_measurement = "€"

    @property
    def native_value(self):
        return self._saldo

    @property
    def extra_state_attributes(self):
        try:
            ts = os.path.getmtime(self._file_path)
            updated = datetime.fromtimestamp(ts).strftime("%d.%m.%Y %H:%Mh")
        except Exception as e:
            _LOGGER.warning("Konnte Änderungsdatum nicht lesen: %s", e)
            updated = None

        return {
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

