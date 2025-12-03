"""Sensoren zur Darstellung der Kaufsumme für Portfolio-Depots."""

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


class PortfolioPurchaseSensor(SnapshotBackedCoordinatorEntity, SensorEntity):
    """Sensor für die Kaufsumme eines Depots."""

    def __init__(
        self,
        coordinator: PPReaderCoordinator,
        store: SnapshotSensorStore,
        portfolio_uuid: str,
    ) -> None:
        """Initialisiere den Sensor."""
        super().__init__(coordinator, store)
        self._portfolio_uuid = portfolio_uuid
        self._attr_name = "Kaufsumme Unbekannt"
        self._attr_unique_id = f"{slugify(portfolio_uuid)}_kaufsumme"
        self._attr_native_unit_of_measurement = "€"
        self._attr_icon = "mdi:cash"
        self._attr_should_poll = False
        self._attr_available = True
        self._attr_state_class = "measurement"

    @property
    def native_value(self) -> float | None:
        """Gibt die aktuelle Kaufsumme zurück."""
        snapshot = self._portfolio_snapshot()
        if not snapshot:
            return None
        purchase_sum = snapshot.get("purchase_value", 0.0)
        return round(float(purchase_sum or 0.0), 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Zusätzliche Attribute des Sensors."""
        snapshot = self._portfolio_snapshot() or {}
        return {
            "letzte_aktualisierung": self._store.snapshot_at or "Unbekannt",
            "portfolio_uuid": self._portfolio_uuid,
            "portfolio_name": snapshot.get("name"),
        }

    def _portfolio_snapshot(self) -> Mapping[str, Any] | None:
        """Return the active portfolio snapshot."""
        return self._store.get_portfolio(self._portfolio_uuid)

    async def _async_post_snapshot_refresh(self) -> None:
        """Update metadata after refreshing snapshot caches."""
        snapshot = self._portfolio_snapshot()
        if snapshot:
            self._attr_name = f"Kaufsumme {snapshot.get('name', 'Unbekannt')}"
            self._attr_available = True
        else:
            self._attr_name = "Kaufsumme Unbekannt"
            self._attr_available = False
