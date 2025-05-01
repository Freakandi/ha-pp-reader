import os
import logging
from datetime import datetime
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify
from pathlib import Path

from custom_components.pp_reader.reader import parse_data_portfolio
from custom_components.pp_reader.logic.accounting import calculate_account_balance
from custom_components.pp_reader.logic.portfolio import calculate_portfolio_value
from ..db_access import get_transactions, get_account_by_name
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo

from ..coordinator import PPReaderCoordinator

_LOGGER = logging.getLogger(__name__)

def calculate_account_balance_by_name(account_name: str, db_path: Path) -> float:
    """Berechnet Kontostand basierend auf Kontonamen."""
    account = get_account_by_name(db_path, account_name)
    if account is None:
        _LOGGER.error("Konto mit Name '%s' nicht gefunden", account_name)
        return 0.0
        
    transactions = get_transactions(db_path)
    return calculate_account_balance(account.uuid, transactions)

class PortfolioAccountSensor(SensorEntity):
    """Sensor für Kontostände."""
    
    def __init__(self, coordinator: PPReaderCoordinator, account_name: str):
        """Initialize the sensor."""
        self._coordinator = coordinator
        self._account_name = account_name

    async def async_update(self) -> None:
        """Aktualisiert den Sensor-Wert."""
        try:
            # Berechnung in executor ausführen wegen DB-Zugriff
            value = await self.hass.async_add_executor_job(
                calculate_account_balance_by_name,
                self._account_name,
                self._coordinator.db_path
            )
            self._attr_native_value = value
            self._attr_available = True
        except Exception as e:
            self._attr_available = False
            _LOGGER.error("Fehler bei Kontostand-Berechnung: %s", str(e))

class PortfolioDepotSensor(SensorEntity):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""

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
                _LOGGER.info("Änderung erkannt bei %s - lade Depotwert neu", self._file_path)
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
