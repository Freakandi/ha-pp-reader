"""Sensor setup and entity definitions for the pp_reader Home Assistant integration."""

import logging
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .sensors.depot_sensors import PortfolioAccountSensor, PortfolioDepotSensor
from .sensors.gain_sensors import PortfolioGainAbsSensor, PortfolioGainPctSensor
from .sensors.purchase_sensors import PortfolioPurchaseSensor
from .sensors.store import SnapshotSensorStore

if TYPE_CHECKING:
    from .data.coordinator import PPReaderCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> bool:
    """Initialisiere alle Sensoren für pp_reader."""
    try:
        # Zugriff auf den Coordinator aus hass.data
        coordinator: PPReaderCoordinator = hass.data[DOMAIN][config_entry.entry_id][
            "coordinator"
        ]

        sensors = []
        depot_sensors = []
        purchase_sensors = []

        store = SnapshotSensorStore(hass, coordinator.db_path)
        await store.async_ensure_snapshot(None)
        hass.data[DOMAIN][config_entry.entry_id]["sensor_store"] = store

        sensors.extend(
            PortfolioAccountSensor(coordinator, store, account_uuid)
            for account_uuid in store.account_ids
        )

        # 🔸 Depot- und Kaufsummen-Sensoren erstellen
        for portfolio_uuid in store.portfolio_ids:
            depot_sensor = PortfolioDepotSensor(coordinator, store, portfolio_uuid)
            sensors.append(depot_sensor)
            depot_sensors.append(depot_sensor)

            purchase_sensor = PortfolioPurchaseSensor(
                coordinator, store, portfolio_uuid
            )
            sensors.append(purchase_sensor)
            purchase_sensors.append(purchase_sensor)

        # 🔺 Gewinn-Sensoren erstellen (basierend auf Depot- und Kaufsummen-Sensoren)
        for depot_sensor, purchase_sensor in zip(
            depot_sensors, purchase_sensors, strict=True
        ):
            # Absoluter Gewinn-Sensor
            gain_abs_sensor = PortfolioGainAbsSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_abs_sensor)

            # Prozentualer Gewinn-Sensor
            gain_pct_sensor = PortfolioGainPctSensor(depot_sensor, purchase_sensor)
            sensors.append(gain_pct_sensor)

        # 🔥 Sensoren an HA übergeben
        async_add_entities(sensors)

    except Exception:
        _LOGGER.exception("Fehler beim Setup der Sensoren")
        return False

    return True
