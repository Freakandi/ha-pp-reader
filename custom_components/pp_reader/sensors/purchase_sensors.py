# purchase_sensors.py
import os
import logging
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from ..logic.portfolio import calculate_purchase_sum
from ..db_access import get_transactions, get_portfolio_by_name
from .base import PortfolioSensor  # Import der Basis-Klasse

_LOGGER = logging.getLogger(__name__)


class PortfolioPurchaseSensor(PortfolioSensor):
    """Sensor für die Kaufsumme eines Depots."""

    should_poll = True
    entity_category = None

    def __init__(self, hass, portfolio_name: str, portfolio_uuid: str, db_path: Path):
        """Initialisiere den Sensor.
        
        Args:
            hass: Home Assistant Instance
            portfolio_name: Name des Portfolios für die Anzeige
            portfolio_uuid: UUID des Portfolios für interne Berechnungen
            db_path: Pfad zur SQLite Datenbank
        """
        self.hass = hass
        self._portfolio_name = portfolio_name  # Für die Anzeige
        self._portfolio_uuid = portfolio_uuid  # Für interne Berechnungen
        self._db_path = db_path
        self._purchase_sum = 0.0

        self._attr_name = f"Kaufsumme {portfolio_name}"
        self._attr_unique_id = f"pp_reader_{slugify(portfolio_name)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"

    @property
    def native_value(self):
        return self._purchase_sum

    async def _async_update_internal(self) -> None:
        """Update method implementation."""
        self._purchase_sum = await calculate_purchase_sum(
            self._portfolio_uuid,
            self._db_path
        )
        self._attr_native_value = self._purchase_sum
