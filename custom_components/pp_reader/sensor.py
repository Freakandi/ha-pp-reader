import os
import logging
from datetime import datetime

from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_FILE_PATH
from .reader import parse_data_portfolio
from .logic.accounting import calculate_account_balance
from .logic.portfolio import calculate_portfolio_value
from custom_components.pp_reader.currencies.fx import get_exchange_rates

from .sensors.depot_sensors import PortfolioDepotSensor, PortfolioAccountSensor
from .sensors.purchase_sensors import PortfolioPurchaseSensor
from .sensors.gain_sensors import PortfolioGainAbsSensor, PortfolioGainPctSensor

_LOGGER = logging.getLogger(__name__)



async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
):
    """Initialisiere alle Sensoren."""
    file_path = config_entry.data[CONF_FILE_PATH]
    data = await hass.async_add_executor_job(parse_data_portfolio, file_path)

    if not data:
        _LOGGER.error("Keine Daten aus Datei %s", file_path)
        return

    sensors = []

    # 🔹 Kontostände
    for account in data.accounts:
        if getattr(account, "isRetired", False):
            continue

        saldo = calculate_account_balance(account.uuid, data.transactions)
        sensors.append(PortfolioAccountSensor(hass, account.name, saldo, file_path))

    # 🔸 Depots und zusätzliche Sensoren
    securities_by_id = {s.uuid: s for s in data.securities}

    reference_date = datetime.fromtimestamp(os.path.getmtime(file_path))
    await get_exchange_rates(data, reference_date=reference_date)

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
        sensors.append(purchase_sensor)

        # Kursgewinn-Sensoren
        gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
        sensors.append(gain_abs_sensor)

        gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
        sensors.append(gain_pct_sensor)

    async_add_entities(sensors)
