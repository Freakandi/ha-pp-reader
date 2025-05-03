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

    def __init__(self, coordinator, portfolio_uuid: str):
        """Initialisiere den Sensor."""
        self.coordinator = coordinator
        self._portfolio_uuid = portfolio_uuid
        portfolio_data = self.coordinator.data["portfolios"].get(portfolio_uuid, {})
        self._attr_name = f"Kaufsumme {portfolio_data.get('name', 'Unbekannt')}"
        self._attr_unique_id = f"{slugify(portfolio_uuid)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"
        self._attr_should_poll = False  # Keine direkte Abfrage, da Coordinator verwendet wird
        self._attr_available = True

    @property
    def native_value(self):
        """Gibt die aktuelle Kaufsumme zurück."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        purchase_sum = portfolio_data.get("purchase_sum", 0.0)
        return f"{purchase_sum:.2f}"  # Wert als String mit 2 Dezimalstellen zurückgeben

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        return {
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "portfolio_uuid": self._portfolio_uuid,
        }

    async def async_update(self):
        """Erzwinge ein Update über den Coordinator."""
        await self.coordinator.async_request_refresh()
