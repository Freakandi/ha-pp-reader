import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import slugify
from ..data.coordinator import PPReaderCoordinator

_LOGGER = logging.getLogger(__name__)

class PortfolioAccountSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(self, coordinator, account_uuid: str):
        """Initialisiere den Sensor."""
        super().__init__(coordinator)
        self.coordinator = coordinator
        self._account_uuid = account_uuid
        self._attr_name = f"Kontostand {self.coordinator.data['accounts'][account_uuid]['name']}"
        self._attr_unique_id = f"{slugify(account_uuid)}_kontostand"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"
        self._attr_should_poll = False  # Keine direkte Abfrage, da Coordinator verwendet wird
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self):
        """Gibt den aktuellen Kontostand zurück."""
        account_data = self.coordinator.data["accounts"].get(self._account_uuid, {})
        balance = account_data.get("balance", 0.0)
        return round(balance, 2)

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        return {
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "account_uuid": self._account_uuid,
        }

class PortfolioDepotSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""

    def __init__(self, coordinator, portfolio_uuid: str):
        """Initialisiere den Sensor."""
        super().__init__(coordinator)
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
        self._attr_should_poll = False
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self):
        """Gibt den aktuellen Depotwert zurück."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        value = portfolio_data.get("value", 0.0)
        return round(value, 2)

    @property
    def extra_state_attributes(self):
        """Zusätzliche Attribute des Sensors."""
        portfolio_data = self.coordinator.data["portfolios"].get(self._portfolio_uuid, {})
        return {
            "anzahl_wertpapiere": portfolio_data.get("count", 0),
            "letzte_aktualisierung": self.coordinator.data.get("last_update", "Unbekannt"),
            "portfolio_uuid": self._portfolio_uuid,
        }
