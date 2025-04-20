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
from .logic.portfolio import calculate_portfolio_value

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    """Initialisiere Kontostand- und Depot-Sensoren aus .portfolio-Datei."""

    file_path = config_entry.data[CONF_FILE_PATH]
    data = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if not data:
        _LOGGER.error("Keine Daten aus Datei %s", file_path)
        return

    sensors = []

    # 🔹 Kontostände
    for account in data.accounts:
        if getattr(account, "isRetired", False):
            continue

        saldo = calculate_account_balance(account.uuid, data.transactions)
        sensors.append(PortfolioAccountSensor(account.name, saldo, file_path))

    # 🔸 Depotwerte
    securities_by_id = {s.uuid: s for s in data.securities}  # ✅ Korrekt erzeugen
    for portfolio in data.portfolios:
        if getattr(portfolio, "isRetired", False):
            continue

        value, count = calculate_portfolio_value(portfolio, data.transactions, securities_by_id)
        sensors.append(PortfolioDepotSensor(portfolio.name, value, count, file_path))

    async_add_entities(sensors)


class PortfolioAccountSensor(SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, account_name, saldo, file_path):
        self._account_name = account_name
        self._file_path = file_path
        self._saldo = round(saldo, 2)

        self._attr_name = f"Kontostand {account_name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(account_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"  # Symbol für Konto

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


class PortfolioDepotSensor(SensorEntity):
    """Sensor für den Gesamtwert eines Depots mit Wertpapieranzahl als Attribut."""

    def __init__(self, portfolio_name, value, count, file_path):
        self._portfolio_name = portfolio_name
        self._value = round(value, 2)
        self._count = count
        self._file_path = file_path

        self._attr_name = f"Depotwert {portfolio_name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(portfolio_name)}_depot"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:finance"  # Symbol für Depot

    @property
    def native_value(self):
        return self._value

    @property
    def extra_state_attributes(self):
        try:
            ts = os.path.getmtime(self._file_path)
            updated = datetime.fromtimestamp(ts).strftime("%d.%m.%Y %H:%Mh")
        except Exception as e:
            _LOGGER.warning("Konnte Änderungsdatum nicht lesen: %s", e)
            updated = None

        return {
            "anzahl_wertpapiere": self._count,
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

