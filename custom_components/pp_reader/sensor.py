# sensor.py
import os
import logging
import asyncio
from datetime import datetime

from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .logic.accounting import calculate_account_balance
from .logic.portfolio import calculate_portfolio_value
from .coordinator import PPReaderCoordinator  # Neu!

from .sensors.depot_sensors import PortfolioDepotSensor, PortfolioAccountSensor
from .sensors.purchase_sensors import PortfolioPurchaseSensor
from .sensors.gain_sensors import PortfolioGainAbsSensor, PortfolioGainPctSensor

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    """Initialisiere alle Sensoren für pp_reader."""
    start_time = datetime.now()

    file_path = config_entry.data[CONF_FILE_PATH]
    data = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if not data:
        _LOGGER.error("❌ Keine Daten aus Datei %s", file_path)
        return

    # Coordinator anlegen und Daten vorbereiten (inkl. Wechselkurse)
    coordinator = PPReaderCoordinator(hass, None, data)
    await coordinator.async_config_entry_first_refresh()

    sensors = []
    purchase_sensors = []

    # 🔹 Kontostände
    for account in data.accounts:
        if getattr(account, "isRetired", False):
            continue

        saldo = calculate_account_balance(account.uuid, data.transactions)
        sensors.append(PortfolioAccountSensor(hass, account.name, saldo, file_path))

    # 🔸 Depots und zusätzliche Sensoren vorbereiten
    securities_by_id = {s.uuid: s for s in data.securities}
    reference_date = datetime.fromtimestamp(os.path.getmtime(file_path))

    for portfolio in data.portfolios:
        if getattr(portfolio, "isRetired", False):
            continue

        # Depotwert-Sensor
        value, count = await calculate_portfolio_value(
            portfolio,
            data.transactions,
            securities_by_id,
            reference_date
        )
        depot_sensor = PortfolioDepotSensor(hass, portfolio.name, value, count, file_path)
        sensors.append(depot_sensor)

        # Kaufsumme-Sensor
        purchase_sensor = PortfolioPurchaseSensor(hass, portfolio.name, file_path)
        purchase_sensors.append(purchase_sensor)
        sensors.append(purchase_sensor)

        # Kursgewinn-Sensoren
        gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
        sensors.append(gain_abs_sensor)

        gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
        sensors.append(gain_pct_sensor)

    # 🔥 Kaufsummen-Sensoren parallel initialisieren
    await asyncio.gather(*(sensor.async_update() for sensor in purchase_sensors))

    # 🔥 Sensoren an HA übergeben
    async_add_entities(sensors)

    # ⏱️ Setup-Dauer messen und loggen
    elapsed = (datetime.now() - start_time).total_seconds()
    _LOGGER.info("✅ pp_reader Setup abgeschlossen in %.2f Sekunden", elapsed)
