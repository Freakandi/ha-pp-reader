"""Sensor entities exposing unrealized gains for portfolios."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import slugify

from custom_components.pp_reader.metrics.common import select_performance_metrics

if TYPE_CHECKING:
    from custom_components.pp_reader.sensors.depot_sensors import (
        PortfolioDepotSensor,
    )
    from custom_components.pp_reader.sensors.purchase_sensors import (
        PortfolioPurchaseSensor,
    )

_LOGGER = logging.getLogger(__name__)


def _resolve_portfolio_name(depot_sensor: PortfolioDepotSensor) -> str:
    """Return the portfolio name associated with the provided depot sensor."""
    attributes = depot_sensor.extra_state_attributes or {}
    name = attributes.get("portfolio_name")
    if isinstance(name, str) and name:
        return name

    entity_name = depot_sensor.name or ""
    if entity_name.startswith("Depotwert "):
        return entity_name.removeprefix("Depotwert ")
    return entity_name or "Unbekannt"


class PortfolioGainAbsSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den Kursgewinn (absolut) eines Depots."""

    def __init__(
        self,
        depot_sensor: PortfolioDepotSensor,
        purchase_sensor: PortfolioPurchaseSensor,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(depot_sensor.coordinator)
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor

        # db_path direkt vom Coordinator abrufen
        base = Path(depot_sensor.coordinator.db_path).name
        self._portfolio_name = _resolve_portfolio_name(depot_sensor)
        slugified_base = slugify(base)
        slugified_portfolio = slugify(self._portfolio_name)
        self._attr_name = f"Kursgewinn absolut {self._portfolio_name}"
        self._attr_unique_id = (
            f"{slugified_base}_kursgewinn_absolut_{slugified_portfolio}"
        )
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line-variant"
        self._attr_should_poll = True
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self) -> float | None:
        """Wert des Sensors."""
        current_value = self._depot_sensor.native_value
        purchase_value = self._purchase_sensor.native_value
        try:
            current = float(current_value)
            purchase = float(purchase_value)
        except (TypeError, ValueError) as err:
            message = (
                "Fehler beim Berechnen des Kursgewinns für "
                f"{self._portfolio_name}: {err}"
            )
            _LOGGER.exception(message)
            return None

        performance, _ = select_performance_metrics(
            current_value=current,
            purchase_value=purchase,
        )
        return performance.gain_abs


class PortfolioGainPctSensor(CoordinatorEntity, SensorEntity):
    """Sensor für den Kursgewinn (prozentual) eines Depots."""

    def __init__(
        self,
        depot_sensor: PortfolioDepotSensor,
        purchase_sensor: PortfolioPurchaseSensor,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(depot_sensor.coordinator)
        self._depot_sensor = depot_sensor
        self._purchase_sensor = purchase_sensor

        base = Path(depot_sensor.coordinator.db_path).name
        self._portfolio_name = _resolve_portfolio_name(depot_sensor)
        slugified_base = slugify(base)
        slugified_portfolio = slugify(self._portfolio_name)
        self._attr_name = f"Kursgewinn % {self._portfolio_name}"
        self._attr_unique_id = (
            f"{slugified_base}_kursgewinn_prozent_{slugified_portfolio}"
        )
        self._attr_native_unit_of_measurement = "%"
        self._attr_icon = "mdi:percent"
        self._attr_should_poll = True
        self._attr_available = True
        self._attr_state_class = "measurement"  # Zustandsklasse hinzufügen

    @property
    def native_value(self) -> float | None:
        """Wert des Sensors."""
        current_value = self._depot_sensor.native_value
        purchase_value = self._purchase_sensor.native_value
        try:
            current = float(current_value)
            purchase = float(purchase_value)
        except (TypeError, ValueError) as err:
            message = (
                "Fehler beim Berechnen des Kursgewinns (%) für "
                f"{self._portfolio_name}: {err}"
            )
            _LOGGER.exception(message)
            return None

        performance, _ = select_performance_metrics(
            current_value=current,
            purchase_value=purchase,
        )
        return performance.gain_pct
