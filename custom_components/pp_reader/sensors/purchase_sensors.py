# purchase_sensors.py
import os
import logging
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import slugify

from ..logic.portfolio import calculate_purchase_sum

_LOGGER = logging.getLogger(__name__)


class PortfolioPurchaseSensor(CoordinatorEntity, SensorEntity):
    """Sensor für die Kaufsumme eines Depots."""

    def __init__(self, coordinator, portfolio_uuid: str):
        """Initialisiere den Sensor."""
        super().__init__(coordinator)
        self.coordinator = coordinator
        self._portfolio_uuid = portfolio_uuid
        portfolio_data = self.coordinator.data["portfolios"].get(portfolio_uuid, {})
        self._attr_name = f"Kaufsumme {portfolio_data.get('name', 'Unbekannt')}"
        self._attr_unique_id = f"{slugify(portfolio_uuid)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"
        self._attr_should_poll = False
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self):
        """Gibt die aktuelle Kaufsumme zurück."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        purchase_sum = portfolio_data.get("purchase_sum", 0.0)
        return round(purchase_sum, 2)

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        return {
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "portfolio_uuid": self._portfolio_uuid,
        }
