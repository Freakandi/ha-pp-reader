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
from custom_components.pp_reader.currencies.fx import get_exchange_rates

_LOGGER = logging.getLogger(__name__)


def calculate_account_balance_by_name(account_name, client_data):
    """Berechnet Kontostand basierend auf dem Kontonamen."""
    account = next((a for a in client_data.accounts if a.name == account_name), None)
    if account is None:
        _LOGGER.error("Konto mit Name '%s' nicht gefunden", account_name)
        return 0.0
    return calculate_account_balance(account.uuid, client_data.transactions)


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
        sensors.append(PortfolioAccountSensor(hass, account.name, saldo, file_path))

    # 🔸 Depotwerte
    securities_by_id = {s.uuid: s for s in data.securities}

    # 💱 Wechselkurse aktualisieren & in Cache speichern
    reference_date = datetime.fromtimestamp(os.path.getmtime(file_path))
    await get_exchange_rates(data, reference_date=reference_date)

    # 🚀 Depotwerte berechnen (jetzt async) und Sensoren erzeugen
    for portfolio in data.portfolios:
        if getattr(portfolio, "isRetired", False):
            continue

        value, count = await calculate_portfolio_value(
            portfolio,
            data.transactions,
            securities_by_id,
            reference_date
        )
        sensors.append(PortfolioDepotSensor(hass, portfolio.name, value, count, file_path))

    async_add_entities(sensors)


class PortfolioAccountSensor(SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, hass, account_name, saldo, file_path):
        self.hass = hass
        self._account_name = account_name
        self._file_path = file_path
        self._saldo = round(saldo, 2)
        self._last_mtime = os.path.getmtime(file_path)

        self._attr_name = f"Kontostand {account_name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(account_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"

    @property
    def native_value(self):
        return self._saldo

    @property
    def extra_state_attributes(self):
        try:
            ts = os.path.getmtime(self._file_path)
            updated = datetime.fromtimestamp(ts).strftime("%d.%m.%Y %H:%M")
        except Exception as e:
            _LOGGER.warning("Konnte Änderungsdatum nicht lesen: %s", e)
            updated = None

        return {
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

    async def async_update(self):
        try:
            current_mtime = os.path.getmtime(self._file_path)
            if current_mtime != self._last_mtime:
                _LOGGER.info("Änderung erkannt bei %s - lade neu", self._file_path)
                data = await self.hass.async_add_executor_job(parse_data_portfolio, self._file_path)
                if data:
                    saldo = calculate_account_balance_by_name(self._account_name, data)
                    self._saldo = round(saldo, 2)
                    self._last_mtime = current_mtime
        except Exception as e:
            _LOGGER.error("Fehler beim Update des Sensors: %s", e)


class PortfolioDepotSensor(SensorEntity):
    """Sensor für den Gesamtwert eines Depots mit Wertpapieranzahl als Attribut."""

    def __init__(self, hass, portfolio_name, value, count, file_path):
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._value = round(value, 2)
        self._count = count
        self._file_path = file_path
        self._last_mtime = os.path.getmtime(file_path)

        self._attr_name = f"Depotwert {portfolio_name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(portfolio_name)}_depot"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:finance"

    @property
    def native_value(self):
        return self._value

    @property
    def extra_state_attributes(self):
        try:
            ts = os.path.getmtime(self._file_path)
            updated = datetime.fromtimestamp(ts).strftime("%d.%m.%Y %H:%M")
        except Exception as e:
            _LOGGER.warning("Konnte Änderungsdatum nicht lesen: %s", e)
            updated = None

        return {
            "anzahl_wertpapiere": self._count,
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

    async def async_update(self):
        try:
            current_mtime = os.path.getmtime(self._file_path)
            if current_mtime != self._last_mtime:
                _LOGGER.info("Änderung erkannt bei %s - lade neu", self._file_path)
                data = await self.hass.async_add_executor_job(parse_data_portfolio, self._file_path)
                if data:
                    securities_by_id = {s.uuid: s for s in data.securities}
                    for portfolio in data.portfolios:
                        if portfolio.name == self._portfolio_name:
                            value, count = await calculate_portfolio_value(
                                portfolio, data.transactions, securities_by_id,
                                reference_date=datetime.fromtimestamp(current_mtime)
                            )
                            self._value = round(value, 2)
                            self._count = count
                            self._last_mtime = current_mtime
                            break
        except Exception as e:
            _LOGGER.error("Fehler beim Update des Depotsensors: %s", e)
