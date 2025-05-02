### Datei: sensor.py

import os
import logging
import asyncio
from datetime import datetime
from pathlib import Path

from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo
import homeassistant.helpers.device_registry as dr

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

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry, 
    async_add_entities: AddEntitiesCallback,
) -> bool:
    """Richte die Portfolio Performance Sensoren ein."""
    try:
        entry_data = hass.data[DOMAIN].get(config_entry.entry_id)
        db_path = Path(entry_data["db_path"])
        
        sensors = []
        purchase_sensors = []

        # Kontostände aus DB laden
        accounts = await hass.async_add_executor_job(get_accounts, db_path)
        
        # Kontosensoren erstellen
        for account in accounts:
            if account.is_retired:
                continue
                
            account_sensor = PortfolioAccountSensor(
                hass,
                account.name,
                account.uuid,
                db_path
            )
            account_sensor.entity_registry_enabled_default = True
            sensors.append(account_sensor)

        # Depots und zusätzliche Sensoren
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)

        for portfolio in portfolios:
            if portfolio.is_retired:
                continue

            # Depotwert-Sensor
            depot_sensor = PortfolioDepotSensor(
                hass, 
                portfolio.name,
                portfolio.uuid,
                db_path
            )
            depot_sensor.entity_registry_enabled_default = True
            sensors.append(depot_sensor)

            # Kaufsumme-Sensor
            purchase_sensor = PortfolioPurchaseSensor(
                hass,
                portfolio.name,
                portfolio.uuid,
                db_path
            )
            purchase_sensor.entity_registry_enabled_default = True
            purchase_sensors.append(purchase_sensor)
            sensors.append(purchase_sensor)

            # Gewinn-Sensoren
            gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
            gain_abs_sensor.entity_registry_enabled_default = True
            sensors.append(gain_abs_sensor)

            gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
            gain_pct_sensor.entity_registry_enabled_default = True
            sensors.append(gain_pct_sensor)

        # Sensoren initialisieren und registrieren
        async_add_entities(sensors)
        return True
        
    except Exception as e:
        _LOGGER.exception("Fehler beim Setup der Sensoren: %s", e)
        return False
