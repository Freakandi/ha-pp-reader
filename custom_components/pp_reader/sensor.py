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
    start_time = datetime.now()
    
    device_registry = dr.async_get(hass)
    device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={(DOMAIN, "pp_reader")},
        name="Portfolio Performance Reader",
        manufacturer="Portfolio Performance",
        model="Sensor Hub"
    )
    
    try:
        entry_data = hass.data[DOMAIN].get(config_entry.entry_id)
        if not entry_data:
            _LOGGER.error("Keine Daten für entry_id %s gefunden", config_entry.entry_id)
            return False
            
        coordinator = entry_data["coordinator"]
        db_path = Path(entry_data["db_path"])
        file_path = entry_data["file_path"]
        
        sensors = []
        purchase_sensors = []

        # Debug-Logging für DB-Zugriffe
        _LOGGER.debug("📊 DB-Pfad: %s", db_path)
        _LOGGER.debug("📄 Datei-Pfad: %s", file_path)
        
        # Kontostände aus DB laden
        _LOGGER.debug("💰 Lade Accounts aus DB...")
        accounts = await hass.async_add_executor_job(get_accounts, db_path)
        _LOGGER.debug("👥 Gefundene Accounts (%d): %s", len(accounts), 
                     ", ".join(f"{a.name} ({a.currency_code})" for a in accounts))

        # Transaktionen einmalig laden
        transactions = await hass.async_add_executor_job(get_transactions, db_path)
        
        # Kontosensoren erstellen
        for account in accounts:
            if account.is_retired:
                continue
                
            account_sensor = PortfolioAccountSensor(
                hass,
                account.name,
                account.uuid,  # UUID statt Saldo übergeben
                db_path       # DB-Pfad statt Datei-Pfad
            )
            account_sensor.entity_registry_enabled_default = True
            sensors.append(account_sensor)

        # Depots und zusätzliche Sensoren
        _LOGGER.debug("📈 Lade Portfolios aus DB...")
        portfolios = await hass.async_add_executor_job(get_portfolios, db_path)
        _LOGGER.debug("📊 Gefundene Portfolios (%d): %s", len(portfolios),
                     ", ".join(f"{p.name}" for p in portfolios))

        for portfolio in portfolios:
            if portfolio.is_retired:
                continue

            # Depotwert-Sensor
            depot_sensor = PortfolioDepotSensor(
                hass, 
                portfolio.name,    # Name für Anzeige
                portfolio.uuid,    # UUID für Berechnungen
                db_path
            )
            depot_sensor.entity_registry_enabled_default = True  # Aktiviere Sensor standardmäßig
            sensors.append(depot_sensor)

            # Kaufsumme-Sensor
            purchase_sensor = PortfolioPurchaseSensor(
                hass,
                portfolio.name,    # Name für Anzeige
                portfolio.uuid,    # UUID für Berechnungen
                db_path
            )
            purchase_sensor.entity_registry_enabled_default = True  # Aktiviere Sensor standardmäßig
            purchase_sensors.append(purchase_sensor)
            sensors.append(purchase_sensor)

            # Kursgewinn-Sensoren mit expliziter Aktivierung
            gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
            gain_abs_sensor.entity_registry_enabled_default = True
            sensors.append(gain_abs_sensor)

            gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
            gain_pct_sensor.entity_registry_enabled_default = True
            sensors.append(gain_pct_sensor)

        # Kaufsummen-Sensoren parallel initialisieren
        await asyncio.gather(*(sensor.async_update() for sensor in purchase_sensors))

        # Initial-Update für alle Sensoren durchführen
        update_tasks = []
        for sensor in sensors:
            if hasattr(sensor, 'async_update'):
                update_tasks.append(sensor.async_update())
        if update_tasks:
            await asyncio.gather(*update_tasks)

        # Sensoren an HA übergeben
        async_add_entities(sensors, True)
        
        # Debug-Logging für Sensor-Registrierung
        _LOGGER.debug(
            "🔄 Registrierte Sensoren (%d): %s",
            len(sensors),
            ", ".join(f"{s.name} ({s.__class__.__name__})" for s in sensors)
        )
        
        elapsed = (datetime.now() - start_time).total_seconds()
        _LOGGER.info("✅ pp_reader Setup abgeschlossen in %.2f Sekunden", elapsed)
        
        return True
        
    except Exception as e:
        _LOGGER.exception("❌ Kritischer Fehler im Sensor-Setup: %s", str(e))
        return False
