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
        """Initialisiere den Kontosensor.
        
        Args:
            hass: Home Assistant Instance
            name: Name des Kontos für die Anzeige
            account_uuid: UUID des Kontos für DB-Abfragen
            db_path: Pfad zur SQLite Datenbank
        """
        super().__init__()
        self.hass = hass
        self._name = name
        self._account_uuid = account_uuid
        self._db_path = db_path
        self._value = 0.0

        # Entity-Eigenschaften setzen
        self._attr_name = f"Konto {self._name}"
        self._attr_unique_id = f"pp_reader_account_{slugify(name)}"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:piggy-bank"

    @property
    def native_value(self):
        """Wert des Sensors."""
        return self._value

    async def _async_update_internal(self) -> None:
        """Update method implementation."""
        try:
            # Transaktionen für das Konto aus der DB laden
            transactions = await self.hass.async_add_executor_job(
                get_transactions,
                self._db_path
            )
            
            # Nur Transaktionen für dieses Konto filtern
            account_transactions = [
                tx for tx in transactions 
                if tx.account == self._account_uuid
            ]
            
            # Kontostand berechnen
            balance = 0
            for tx in account_transactions:
                # Positiv: DEPOSIT, INTEREST, TAX_REFUND, FEE_REFUND
                # Negativ: REMOVAL, INTEREST_CHARGE, TAX, FEE
                if tx.type in [6, 9, 12, 14]:  # DEPOSIT, INTEREST, TAX_REFUND, FEE_REFUND
                    balance += tx.amount
                elif tx.type in [7, 10, 11, 13]:  # REMOVAL, INTEREST_CHARGE, TAX, FEE
                    balance -= tx.amount
                    
            # Wert in Euro umrechnen (amount ist in Cent)
            self._value = round(balance / 100.0, 2)
            self._attr_native_value = self._value
            
            _LOGGER.debug(
                "✅ Neuer Kontostand für %s: %.2f €", 
                self._name,
                self._value
            )
            
        except Exception as e:
            _LOGGER.error(
                "❌ Fehler beim Laden des Kontostands für %s: %s",
                self._name,
                str(e)
            )
            raise

class PortfolioDepotSensor(PortfolioSensor):  # Von PortfolioSensor erben
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""
    
    entity_category = None  # Explizit als primary entity markieren
    
    def __init__(self, hass, portfolio_name: str, portfolio_uuid: str, db_path: Path):
        super().__init__()
        self.hass = hass
        self._portfolio_name = portfolio_name  # Für die Anzeige
        self._portfolio_uuid = portfolio_uuid  # Für interne Berechnungen
        self._db_path = db_path
        self._value = 0.0
        self._count = 0

        self._attr_name = f"Depotwert {portfolio_name}"
        self._attr_unique_id = f"pp_reader_{slugify(portfolio_name)}_depot"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:finance"

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
