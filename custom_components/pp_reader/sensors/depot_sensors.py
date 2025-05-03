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

    def __init__(self, coordinator, portfolio_uuid: str):
        """Initialisiere den Sensor."""
        self.coordinator = coordinator
        self._portfolio_uuid = portfolio_uuid

        # Portfolio-Daten aus dem Coordinator abrufen
        portfolio_data = self.coordinator.data["portfolios"].get(portfolio_uuid, {})
        self._portfolio_name = portfolio_data.get("name", "Unbekannt")  # Name speichern

        # Sensor-Attribute setzen
        self._attr_name = f"Depotwert {self._portfolio_name}"
        self._attr_unique_id = f"{slugify(portfolio_uuid)}_depotwert"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line"
        self._attr_should_poll = False  # Keine direkte Abfrage, da Coordinator verwendet wird
        self._attr_available = True

    @property
    def native_value(self):
        """Gibt den aktuellen Depotwert zurück."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        return portfolio_data.get("value", 0.0)

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        return {
            "anzahl_wertpapiere": portfolio_data.get("count", 0),
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "portfolio_uuid": self._portfolio_uuid,
        }

    async def async_update(self):
        """Erzwinge ein Update über den Coordinator."""
        await self.coordinator.async_request_refresh()
