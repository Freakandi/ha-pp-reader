# purchase_sensors.py
import os
import logging
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from ..logic.portfolio import calculate_purchase_sum

_LOGGER = logging.getLogger(__name__)


class PortfolioPurchaseSensor(SensorEntity):
    """Sensor für die Kaufsumme eines Depots."""

    def __init__(self, hass, portfolio_name: str, portfolio_uuid: str, db_path: Path):
        """Initialize the sensor."""
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._portfolio_uuid = portfolio_uuid
        self._db_path = db_path
        self._value = 0.0
        
        # Entity-Eigenschaften direkt setzen ohne Basis-Klasse
        self._attr_name = f"Kaufsumme {portfolio_name}"
        self._attr_unique_id = f"kaufsumme_{slugify(portfolio_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"
        self._attr_should_poll = True
        self._attr_available = True

    @property
    def native_value(self):
        """Wert des Sensors."""
        return self._value

    async def async_update(self):
        """Update Methode für den Sensor."""
        try:
            # Kaufsumme berechnen
            new_value = await calculate_purchase_sum(
                self._portfolio_uuid,
                self._db_path
            )
            
            # Wert aktualisieren und runden
            self._value = round(new_value, 2)

            _LOGGER.debug(
                "✅ Neue Kaufsumme für %s: %.2f €", 
                self._portfolio_name,
                self._value
            )
            
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Laden der Kaufsumme für %s: %s",
                self._portfolio_name,
                str(e)
            )
            raise
