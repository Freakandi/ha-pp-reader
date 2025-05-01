### Datei: sensor.py

import os
import logging
import asyncio
from datetime import datetime
from pathlib import Path

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo

from .const import DOMAIN
from .logic.accounting import calculate_account_balance
from .logic.portfolio import calculate_portfolio_value
from .coordinator import PPReaderCoordinator
from .db_access import get_transactions, get_accounts, get_securities, get_portfolios, Transaction, Account, Security, Portfolio  # Neuer Import

from .sensors.depot_sensors import PortfolioDepotSensor, PortfolioAccountSensor
from .sensors.purchase_sensors import PortfolioPurchaseSensor
from .sensors.gain_sensors import PortfolioGainAbsSensor, PortfolioGainPctSensor

from .logic.validators import PPDataValidator

_LOGGER = logging.getLogger(__name__)

class PortfolioSensor(SensorEntity):
    """Basis-Klasse für Portfolio Performance Sensoren."""
    
    async def async_update(self) -> None:
        """Aktualisiert den Sensor-Wert."""
        try:
            await self._async_update_internal()
            self._attr_available = True
        except Exception as e:
            self._attr_available = False
            _LOGGER.error(
                "Fehler bei Aktualisierung von %s: %s", 
                self.entity_id, 
                str(e)
            )
            
    async def _async_update_internal(self) -> None:
        """Interne Update-Methode, die von Kindklassen überschrieben wird."""
        raise NotImplementedError()

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> bool:
    """Richte die Portfolio Performance Sensoren ein."""
    try:
        entry_data = hass.data[DOMAIN].get(config_entry.entry_id)
        if not entry_data:
            _LOGGER.error("Keine Daten für entry_id %s gefunden", config_entry.entry_id)
            return False
            
        coordinator = entry_data["coordinator"]
        db_path = coordinator.db_path
        file_path = coordinator.file_path
        
        # DB-Daten laden
        transactions = await hass.async_add_executor_job(get_transactions, db_path)
        accounts = await hass.async_add_executor_job(get_accounts, db_path)
        securities = await hass.async_add_executor_job(get_securities, db_path)
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)
        
        sensors = []
        purchase_sensors = []

        # Kontostände
        for account in accounts:
            if account.is_retired:
                continue

            saldo = calculate_account_balance(account.uuid, transactions)
            sensors.append(PortfolioAccountSensor(hass, account.name, saldo, file_path))

        # Depots und zusätzliche Sensoren
        securities_by_id = {s.uuid: s for s in securities}
        reference_date = datetime.fromtimestamp(os.path.getmtime(file_path))

        for portfolio in portfolios:
            if portfolio.is_retired:
                continue

            # Depotwert-Sensor
            value, count = await calculate_portfolio_value(
                portfolio.uuid,  # Nur UUID übergeben
                reference_date,
                db_path
            )
            depot_sensor = PortfolioDepotSensor(hass, portfolio.name, value, count, file_path)
            sensors.append(depot_sensor)

            # Kaufsumme-Sensor
            purchase_sensor = PortfolioPurchaseSensor(hass, portfolio.name, file_path, db_path)
            purchase_sensors.append(purchase_sensor)
            sensors.append(purchase_sensor)

            # Kursgewinn-Sensoren
            gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_abs_sensor)

            gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_pct_sensor)

        async_add_entities(sensors, True)
        return True
        
    except Exception as e:
        _LOGGER.exception("Kritischer Fehler im Sensor-Setup: %s", str(e))
        return False
