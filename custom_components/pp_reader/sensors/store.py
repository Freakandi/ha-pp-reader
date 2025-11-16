"""Shared snapshot cache and helpers for pp_reader sensor entities."""

from __future__ import annotations

import asyncio
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from custom_components.pp_reader.data.normalized_store import (
    SnapshotBundle,
    async_load_latest_snapshot_bundle,
)


class SnapshotSensorStore:
    """Cache canonical snapshots for sensor entities."""

    def __init__(self, hass: HomeAssistant, db_path: Path | str) -> None:
        """Initialize the cache."""
        self._hass = hass
        self._db_path = Path(db_path)
        self._lock = asyncio.Lock()
        self._metric_run_uuid: str | None = None
        self._snapshot_at: str | None = None
        self._accounts: dict[str, Mapping[str, Any]] = {}
        self._portfolios: dict[str, Mapping[str, Any]] = {}

    @property
    def account_ids(self) -> tuple[str, ...]:
        """Return account UUIDs present in the latest snapshot."""
        return tuple(self._accounts.keys())

    @property
    def portfolio_ids(self) -> tuple[str, ...]:
        """Return portfolio UUIDs present in the latest snapshot."""
        return tuple(self._portfolios.keys())

    @property
    def snapshot_at(self) -> str | None:
        """Expose the timestamp of the cached snapshot."""
        return self._snapshot_at

    def get_account(self, account_uuid: str) -> Mapping[str, Any] | None:
        """Return the cached account snapshot."""
        return self._accounts.get(account_uuid)

    def get_portfolio(self, portfolio_uuid: str) -> Mapping[str, Any] | None:
        """Return the cached portfolio snapshot."""
        return self._portfolios.get(portfolio_uuid)

    async def async_ensure_snapshot(
        self,
        target_run_uuid: str | None,
    ) -> None:
        """Reload the snapshot when the metric run changes."""
        async with self._lock:
            if target_run_uuid and target_run_uuid == self._metric_run_uuid:
                return
            if target_run_uuid is None and self._metric_run_uuid is not None:
                return
            bundle = await async_load_latest_snapshot_bundle(
                self._hass,
                self._db_path,
            )
            self._cache_bundle(bundle)

    def _cache_bundle(self, bundle: SnapshotBundle) -> None:
        """Store the decoded snapshot bundle locally."""
        self._metric_run_uuid = bundle.metric_run_uuid
        self._snapshot_at = bundle.snapshot_at
        self._accounts = {
            account["uuid"]: account for account in bundle.accounts if "uuid" in account
        }
        self._portfolios = {
            portfolio["uuid"]: portfolio
            for portfolio in bundle.portfolios
            if "uuid" in portfolio
        }


class SnapshotBackedCoordinatorEntity(CoordinatorEntity):
    """Base entity syncing its state from canonical snapshots."""

    def __init__(
        self,
        coordinator: DataUpdateCoordinator[Any],
        store: SnapshotSensorStore,
    ) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self._store = store

    async def async_added_to_hass(self) -> None:
        """Ensure the snapshot cache is hydrated on entity addition."""
        await super().async_added_to_hass()
        await self._async_refresh_snapshot()
        await self._async_post_snapshot_refresh()

    async def _async_refresh_snapshot(self) -> None:
        """Load the snapshot data for the current metric run."""
        await self._store.async_ensure_snapshot(self._current_metric_run_uuid())

    async def _async_post_snapshot_refresh(self) -> None:
        """Run subclass hook after refreshing snapshots."""

    def _current_metric_run_uuid(self) -> str | None:
        """Return the metric run UUID tracked by the coordinator telemetry."""
        normalization = self.coordinator.data.get("normalization")
        if isinstance(normalization, Mapping):
            run_uuid = normalization.get("metric_run_uuid")
            if isinstance(run_uuid, str):
                return run_uuid
        return None

    @callback
    def _handle_coordinator_update(self) -> None:
        """Schedule a snapshot refresh plus state write."""
        self.coordinator.hass.async_create_task(self._async_refresh_and_write())

    async def _async_refresh_and_write(self) -> None:
        """Refresh snapshots and push entity state."""
        await self._async_refresh_snapshot()
        await self._async_post_snapshot_refresh()
        self.async_write_ha_state()
