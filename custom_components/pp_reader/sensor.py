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
from .data.coordinator import PPReaderCoordinator
from .data.db_access import get_transactions, get_accounts, get_securities, get_portfolios, Transaction, Account, Security, Portfolio  # Neuer Import

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
    """Initialisiere alle Sensoren für pp_reader."""
    start_time = datetime.now()

    try:
        # Zugriff auf den Coordinator aus hass.data
        coordinator: PPReaderCoordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]

        sensors = []
        depot_sensors = []  # Liste für Depot-Sensoren
        purchase_sensors = []  # Liste für Kaufsummen-Sensoren

        # 🔹 Kontostands-Sensoren erstellen
        for account_uuid, account_data in coordinator.data["accounts"].items():
            if not account_data.get("is_retired", False):  # Nur aktive Konten berücksichtigen
                sensors.append(PortfolioAccountSensor(coordinator, account_uuid))

        # 🔸 Depot- und Kaufsummen-Sensoren erstellen
        for portfolio_uuid in coordinator.data["portfolios"]:
            # Depotwert-Sensor
            depot_sensor = PortfolioDepotSensor(coordinator, portfolio_uuid)
            sensors.append(depot_sensor)
            depot_sensors.append(depot_sensor)

            # Kaufsumme-Sensor
            purchase_sensor = PortfolioPurchaseSensor(coordinator, portfolio_uuid)
            sensors.append(purchase_sensor)
            purchase_sensors.append(purchase_sensor)

        # 🔺 Gewinn-Sensoren erstellen (basierend auf Depot- und Kaufsummen-Sensoren)
        for depot_sensor, purchase_sensor in zip(depot_sensors, purchase_sensors):
            # Absoluter Gewinn-Sensor
            gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_abs_sensor)

            # Prozentualer Gewinn-Sensor
            gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_pct_sensor)

        # 🔥 Sensoren an HA übergeben
        async_add_entities(sensors)

        # ⏱️ Setup-Dauer messen und loggen
        elapsed = (datetime.now() - start_time).total_seconds()
        _LOGGER.info("✅ pp_reader Setup abgeschlossen in %.2f Sekunden", elapsed)
        
        return True

    except Exception as e:
        _LOGGER.exception("Fehler beim Setup der Sensoren: %s", e)
        return False