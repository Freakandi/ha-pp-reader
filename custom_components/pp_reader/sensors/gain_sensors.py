import logging
import os
from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import slugify

from custom_components.pp_reader.logic.portfolio import (
    calculate_unrealized_gain,
    calculate_unrealized_gain_pct,
)

_LOGGER = logging.getLogger(__name__)

class PortfolioGainAbsSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den Kursgewinn (absolut) eines Depots."""

    def __init__(self, depot_sensor, purchase_sensor):
        """Initialize the sensor."""
        super().__init__(depot_sensor.coordinator)
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor
        
        # db_path direkt vom Coordinator abrufen
        base = os.path.basename(depot_sensor.coordinator.db_path)
        self._attr_name = f"Kursgewinn absolut {depot_sensor._portfolio_name}"
        self._attr_unique_id = f"{slugify(base)}_kursgewinn_absolut_{slugify(depot_sensor._portfolio_name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line-variant"
        self._attr_should_poll = True
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self):
        """Wert des Sensors."""
        try:
            gain = calculate_unrealized_gain(
                self._depot_sensor.native_value,
                self._purchase_sensor.native_value
            )
            return round(gain, 2)
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Berechnen des Kursgewinns für %s: %s",
                self._depot_sensor._portfolio_name,
                str(e)
            )
            return None


class PortfolioGainPctSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den Kursgewinn (prozentual) eines Depots."""

    def __init__(self, depot_sensor, purchase_sensor):
        """Initialize the sensor."""
        super().__init__(depot_sensor.coordinator)
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor
        
        base = os.path.basename(depot_sensor.coordinator.db_path)
        self._attr_name = f"Kursgewinn % {depot_sensor._portfolio_name}"
        self._attr_unique_id = f"{slugify(base)}_kursgewinn_prozent_{slugify(depot_sensor._portfolio_name)}"
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:percent"
        self._attr_should_poll = True
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self):
        """Wert des Sensors."""
        try:
            gain = calculate_unrealized_gain_pct(
                self._depot_sensor.native_value,
                self._purchase_sensor.native_value
            )
            return round(gain, 2)
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Berechnen des Kursgewinns (%) für %s: %s",
                self._depot_sensor._portfolio_name,
                str(e)
            )
            return None
