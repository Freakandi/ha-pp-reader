import os
import logging
from datetime import datetime
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value
from ..data.db_access import (
    get_transactions,
    get_account_update_timestamp
)

_LOGGER = logging.getLogger(__name__)

class PortfolioAccountSensor(SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, coordinator, account_uuid: str):
        """Initialisiere den Sensor."""
        self.coordinator = coordinator
        self._account_uuid = account_uuid
        self._attr_name = f"Kontostand {self.coordinator.data['accounts'][account_uuid]['name']}"
        self._attr_unique_id = f"{slugify(account_uuid)}_kontostand"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"
        self._attr_should_poll = False  # Keine direkte Abfrage, da Coordinator verwendet wird
        self._attr_available = True

    @property
    def native_value(self):
        """Gibt den aktuellen Kontostand zurück."""
        account_data = self.coordinator.data["accounts"].get(self._account_uuid, {})
        return account_data.get("balance", 0.0)

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        return {
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "account_uuid": self._account_uuid,
        }

    async def async_update(self):
        """Erzwinge ein Update über den Coordinator."""
        await self.coordinator.async_request_refresh()

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
        
        base = os.path.basename(db_path)
        self._attr_name = f"Depotwert {portfolio_name}"
        self._attr_unique_id = f"{slugify(base)}_{slugify(portfolio_name)}"
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
