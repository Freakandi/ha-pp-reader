"""Sensor entities exposing account and depot metrics."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.util import slugify

from .store import SnapshotBackedCoordinatorEntity, SnapshotSensorStore

if TYPE_CHECKING:
    from collections.abc import Mapping

    from custom_components.pp_reader.data.coordinator import PPReaderCoordinator

_LOGGER = logging.getLogger(__name__)


class PortfolioAccountSensor(SnapshotBackedCoordinatorEntity, SensorEntity):
    """Sensor für den Kontostand eines aktiven Kontos."""

    def __init__(
        self,
        coordinator: PPReaderCoordinator,
        store: SnapshotSensorStore,
        account_uuid: str,
    ) -> None:
        """Initialisiere den Sensor."""
        super().__init__(coordinator, store)
        self._account_uuid = account_uuid
        self._attr_name = "Kontostand Unbekannt"
        self._attr_unique_id = f"{slugify(account_uuid)}_kontostand"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:bank"
        self._attr_should_poll = False
        self._attr_available = True
        self._attr_state_class = "measurement"

    @property
    def native_value(self) -> float | None:
        """Gibt den aktuellen Kontostand zurück."""
        snapshot = self._account_snapshot()
        if not snapshot:
            return None
        balance = snapshot.get("balance")
        if balance is None:
            balance = snapshot.get("orig_balance", 0.0)
        return round(float(balance or 0.0), 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Zusätzliche Attribute des Sensors."""
        snapshot = self._account_snapshot() or {}
        return {
            "letzte_aktualisierung": self.coordinator_store.snapshot_at or "Unbekannt",
            "account_uuid": self._account_uuid,
            "currency_code": snapshot.get("currency_code"),
        }

    @property
    def coordinator_store(self) -> SnapshotSensorStore:
        """Shortcut for the shared snapshot store."""
        return self._store

    def _account_snapshot(self) -> Mapping[str, Any] | None:
        """Return the active account snapshot."""
        return self._store.get_account(self._account_uuid)

    async def _async_post_snapshot_refresh(self) -> None:
        """Update metadata after refreshing snapshot caches."""
        snapshot = self._account_snapshot()
        if snapshot:
            self._attr_name = f"Kontostand {snapshot.get('name', 'Unbekannt')}"
            self._attr_available = True
        else:
            self._attr_name = "Kontostand Unbekannt"
            self._attr_available = False


class PortfolioDepotSensor(SnapshotBackedCoordinatorEntity, SensorEntity):
    """Sensor für den aktuellen Depotwert eines aktiven Depots."""

    def __init__(
        self,
        coordinator: PPReaderCoordinator,
        store: SnapshotSensorStore,
        portfolio_uuid: str,
    ) -> None:
        """Initialisiere den Sensor."""
        super().__init__(coordinator, store)
        self._portfolio_uuid = portfolio_uuid
        self._attr_name = "Depotwert Unbekannt"
        self._attr_unique_id = f"{slugify(portfolio_uuid)}_depotwert"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:chart-line"
        self._attr_should_poll = False
        self._attr_available = True
        self._attr_state_class = "measurement"

    @property
    def native_value(self) -> float | None:
        """Gibt den aktuellen Depotwert zurück."""
        snapshot = self._portfolio_snapshot()
        if not snapshot:
            return None
        value = snapshot.get("current_value", 0.0)
        return round(float(value or 0.0), 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Zusätzliche Attribute des Sensors."""
        snapshot = self._portfolio_snapshot() or {}
        return {
            "anzahl_wertpapiere": snapshot.get("position_count", 0),
            "letzte_aktualisierung": self.coordinator_store.snapshot_at or "Unbekannt",
            "portfolio_uuid": self._portfolio_uuid,
            "portfolio_name": snapshot.get("name"),
        }

    @property
    def coordinator_store(self) -> SnapshotSensorStore:
        """Shortcut for the shared snapshot store."""
        return self._store

    def _portfolio_snapshot(self) -> Mapping[str, Any] | None:
        """Return the active portfolio snapshot."""
        return self._store.get_portfolio(self._portfolio_uuid)

    async def _async_post_snapshot_refresh(self) -> None:
        """Update metadata after refreshing snapshot caches."""
        snapshot = self._portfolio_snapshot()
        if snapshot:
            self._attr_name = f"Depotwert {snapshot.get('name', 'Unbekannt')}"
            self._attr_available = True
        else:
            self._attr_name = "Depotwert Unbekannt"
            self._attr_available = False
