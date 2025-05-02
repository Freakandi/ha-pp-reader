import os
import logging
from datetime import datetime
from pathlib import Path
from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from ..logic.accounting import calculate_account_balance
from ..logic.portfolio import calculate_portfolio_value
from ..db_access import (
    get_transactions,
    get_accounts, 
    get_securities,
    get_portfolio_by_name
)

from .base import PortfolioSensor

_LOGGER = logging.getLogger(__name__)

class PortfolioAccountSensor(PortfolioSensor):
    """Sensor für Kontostände."""
    
    should_poll = True
    entity_category = None
    
    def __init__(self, hass, name: str, account_uuid: str, db_path: Path):
        super().__init__()
        self.hass = hass
        self._name = name
        self._account_uuid = account_uuid
        self._db_path = db_path
        self._value = 0.0

        # Entity-Eigenschaften
        self._attr_unique_id = f"pp_reader_kontostand_{slugify(name)}"
        self._attr_name = f"Kontostand {name}"  
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:piggy-bank"

    @property
    def native_value(self):
        """Wert des Sensors."""
        return self._value

    async def _async_update_internal(self) -> None:
        """Update method implementation."""
        try:
            transactions = await self.hass.async_add_executor_job(
                get_transactions,
                self._db_path
            )
            
            new_value = await self.hass.async_add_executor_job(
                calculate_account_balance,
                self._account_uuid,
                transactions
            )
            
            self._value = new_value
            self._attr_native_value = new_value
            
            _LOGGER.debug(
                "✅ Neuer Kontostand für %s: %.2f €", 
                self._name,
                new_value
            )
            
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Laden des Kontostands für %s: %s",
                self._name,
                str(e)
            )
            raise

class PortfolioDepotSensor(PortfolioSensor):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""
    
    should_poll = True
    entity_category = None
    
    def __init__(self, hass, portfolio_name: str, portfolio_uuid: str, db_path: Path):
        super().__init__()
        self.hass = hass
        self._portfolio_name = portfolio_name
        self._portfolio_uuid = portfolio_uuid
        self._db_path = db_path
        self._value = 0.0
        self._count = 0

        # Entity-Eigenschaften
        self._attr_unique_id = f"pp_reader_depotwert_{slugify(portfolio_name)}"
        self._attr_name = f"Depotwert {portfolio_name}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line"

    @property
    def native_value(self):
        return self._value

    @property
    def extra_state_attributes(self):
        return {
            "anzahl_wertpapiere": self._count
        }

    async def _async_update_internal(self) -> None:
        """Update method implementation."""
        value, count = await calculate_portfolio_value(
            self._portfolio_uuid,
            datetime.now(),
            self._db_path
        )
        self._value = value
        self._count = count
        self._attr_native_value = value
