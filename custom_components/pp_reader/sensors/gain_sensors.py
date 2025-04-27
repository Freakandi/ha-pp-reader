import logging
from homeassistant.components.sensor import SensorEntity

from custom_components.pp_reader.logic.portfolio import (
    calculate_unrealized_gain,
    calculate_unrealized_gain_pct,
)

_LOGGER = logging.getLogger(__name__)

class PortfolioGainAbsSensor(SensorEntity):
    """Sensor für den Kursgewinn (absolut) eines Depots."""

    def __init__(self, depot_sensor, purchase_sensor):
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor

        self._attr_name = f"Kursgewinn absolut {depot_sensor._portfolio_name}"
        self._attr_unique_id = depot_sensor._attr_unique_id.replace("_depot", "_kursgewinn_abs")
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line-variant"

    @property
    def native_value(self):
        try:
            return calculate_unrealized_gain(
                self._depot_sensor.native_value,
                self._purchase_sensor.native_value,
            )
        except Exception as e:
            _LOGGER.error("Fehler beim Berechnen des Kursgewinns (absolut): %s", e)
            return None

class PortfolioGainPctSensor(SensorEntity):
    """Sensor für den Kursgewinn (prozentual) eines Depots."""

    def __init__(self, depot_sensor, purchase_sensor):
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor

        self._attr_name = f"Kursgewinn % {depot_sensor._portfolio_name}"
        self._attr_unique_id = depot_sensor._attr_unique_id.replace("_depot", "_kursgewinn_pct")
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:percent"

    @property
    def native_value(self):
        try:
            return calculate_unrealized_gain_pct(
                self._depot_sensor.native_value,
                self._purchase_sensor.native_value,
            )
        except Exception as e:
            _LOGGER.error("Fehler beim Berechnen des Kursgewinns (prozentual): %s", e)
            return None
