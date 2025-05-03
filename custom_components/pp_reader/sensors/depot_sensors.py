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
    get_portfolio_by_name,
    get_account_update_timestamp  # Neuer Import
)

from .base import PortfolioSensor

_LOGGER = logging.getLogger(__name__)

class PortfolioAccountSensor(SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, hass, account_name: str, account_uuid: str, db_path: Path):
        """Initialize the sensor."""
        self.hass = hass
        self._account_name = account_name
        self._account_uuid = account_uuid
        self._db_path = db_path
        self._value = 0.0
        self._last_update = None
        
        # Entity-Eigenschaften direkt setzen ohne Basis-Klasse
        self._attr_name = f"Kontostand {account_name}"
        self._attr_unique_id = f"kontostand_{slugify(account_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"
        self._attr_should_poll = True
        self._attr_available = True

    @property
    def native_value(self):
        """Wert des Sensors."""
        return self._value

    @property
    def extra_state_attributes(self):
        """Extra Attribute des Sensors."""
        try:
            # Zeitstempel aus der DB holen
            updated = self.hass.async_add_executor_job(
                get_account_update_timestamp,
                self._db_path,
                self._account_uuid
            )
            if not updated:
                updated = "Unbekannt"
        except Exception as e:
            _LOGGER.warning("Konnte Aktualisierungsdatum nicht lesen: %s", e)
            updated = "Unbekannt"

        return {
            "letzte_aktualisierung": updated,
            "account_uuid": self._account_uuid
        }

    async def async_update(self):
        """Update Methode für den Sensor."""
        try:
            # Aktuellen Zeitstempel prüfen
            current_update = await self.hass.async_add_executor_job(
                get_account_update_timestamp,
                self._db_path,
                self._account_uuid
            )
            
            # Update nur wenn sich das Datum geändert hat
            if current_update != self._last_update:
                # Transaktionen aus DB laden
                transactions = await self.hass.async_add_executor_job(
                    get_transactions,
                    self._db_path
                )
                
                # Kontostand berechnen mit externer Funktion
                new_value = await self.hass.async_add_executor_job(
                    calculate_account_balance,
                    self._account_uuid,
                    transactions
                )
                
                # Wert aktualisieren und runden
                self._value = round(new_value, 2)
                self._last_update = current_update
                
                _LOGGER.debug(
                    "✅ Neuer Kontostand für %s: %.2f € (Update: %s)", 
                    self._account_name,
                    self._value,
                    current_update
                )
            
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Laden des Kontostands für %s: %s",
                self._account_name,
                str(e)
            )
            raise

class PortfolioDepotSensor(SensorEntity):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""

    def __init__(self, hass, portfolio_name: str, portfolio_uuid: str, db_path: Path):
        """Initialize the sensor."""
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._portfolio_uuid = portfolio_uuid
        self._db_path = db_path
        self._value = 0.0
        self._count = 0

        # Entity-Eigenschaften direkt setzen ohne Basis-Klasse
        self._attr_name = f"Depotwert {portfolio_name}"
        self._attr_unique_id = f"depotwert_{slugify(portfolio_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line"
        self._attr_should_poll = True
        self._attr_available = True

    @property
    def native_value(self):
        """Wert des Sensors."""
        return self._value

    @property
    def extra_state_attributes(self):
        """Extra Attribute des Sensors."""
        return {
            "anzahl_wertpapiere": self._count
        }

    async def async_update(self):
        """Update Methode für den Sensor."""
        try:
            # Depotwert und Anzahl Wertpapiere berechnen
            value, count = await calculate_portfolio_value(
                self._portfolio_uuid,
                datetime.now(),
                self._db_path
            )
            
            # Werte aktualisieren und runden
            self._value = round(value, 2)
            self._count = count

            _LOGGER.debug(
                "✅ Neuer Depotwert für %s: %.2f € (Positionen: %d)", 
                self._portfolio_name,
                self._value,
                self._count
            )
            
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Laden des Depotwerts für %s: %s",
                self._portfolio_name,
                str(e)
            )
            raise
