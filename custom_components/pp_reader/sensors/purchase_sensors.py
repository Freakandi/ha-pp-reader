# purchase_sensors.py
import os
import logging
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from custom_components.pp_reader.logic.portfolio import calculate_purchase_sum

_LOGGER = logging.getLogger(__name__)


class PortfolioPurchaseSensor(SensorEntity):
    """Sensor für die Kaufsumme eines Depots (Summe der Kaufpreise aktiver Positionen)."""

    should_poll = True

    def __init__(self, hass, portfolio_name: str, db_path: Path):
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._db_path = db_path
        self._purchase_sum = 0.0

        self._attr_name = f"Kaufsumme {portfolio_name}"
        self._attr_unique_id = f"pp_reader_{slugify(portfolio_name)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"

    @property
    def native_value(self):
        return self._purchase_sum

    async def async_update(self):
        """Aktualisiere die Kaufsumme aus der DB."""
        try:
            # DB-Zugriff im executor
            self._purchase_sum = await self.hass.async_add_executor_job(
                calculate_purchase_sum,
                self._portfolio_name,
                self._db_path
            )
            _LOGGER.debug(
                "✅ Neue Kaufsumme für %s: %.2f €", 
                self._portfolio_name, 
                self._purchase_sum
            )
        except Exception as e:
            _LOGGER.error("❌ Fehler beim Update der Kaufsumme: %s", e)
