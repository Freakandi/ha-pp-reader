import os
import logging
from datetime import datetime
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value
from ..db_access import (
    get_transactions,
    get_accounts, 
    get_securities,
    get_portfolio_by_name
)

_LOGGER = logging.getLogger(__name__)

class PortfolioAccountSensor(SensorEntity):
    """Sensor für Kontostände."""
    
    def __init__(self, hass, name: str, value: float, file_path: str):
        """Initialize the sensor."""
        self.hass = hass
        self._name = name
        self._value = round(value, 2)
        self._file_path = file_path
        
        self._attr_name = f"Konto {name}"
        base = os.path.basename(file_path)
        self._attr_unique_id = f"{slugify(base)}_{slugify(name)}_account"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"

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
            "letzte_aktualisierung": updated,
            "datenquelle": os.path.basename(self._file_path),
        }

class PortfolioDepotSensor(SensorEntity):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""

    def __init__(self, hass, portfolio_name: str, value: float, count: int, file_path: str):
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._value = round(value, 2)
        self._count = count
        self._file_path = file_path

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
        """Aktualisiert den Sensor-Wert basierend auf DB-Daten."""
        try:
            # Daten aus der SQLite DB laden
            db_path = Path(self._file_path).with_suffix('.db')
            
            portfolio = await self.hass.async_add_executor_job(
                get_portfolio_by_name, db_path, self._portfolio_name
            )
            
            if portfolio:
                # Berechne Depotwert aus DB-Daten
                value, count = await calculate_portfolio_value(
                    portfolio.uuid,
                    datetime.fromtimestamp(os.path.getmtime(self._file_path)),
                    db_path
                )
                self._value = round(value, 2)
                self._count = count
                self._attr_available = True
            else:
                _LOGGER.error("Portfolio %s nicht in DB gefunden", self._portfolio_name)
                self._attr_available = False
                
        except Exception as e:
            _LOGGER.error("Fehler beim Update des Depotsensors: %s", e)
            self._attr_available = False
