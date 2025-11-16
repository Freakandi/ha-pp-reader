from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data.normalized_store import SnapshotBundle
from custom_components.pp_reader.sensors.depot_sensors import PortfolioAccountSensor
from custom_components.pp_reader.sensors.store import SnapshotSensorStore


class _DummyCoordinator:
    """Minimal coordinator replacement for sensor unit tests."""

    def __init__(self, hass: Any, db_path: Path, run_uuid: str | None = "run-1") -> None:
        self.hass = hass
        self.db_path = db_path
        self.data = {"normalization": {"metric_run_uuid": run_uuid}}
        self.last_update_success = True

    def async_add_listener(self, _update_callback, _context=None):
        """Return a no-op listener removal callback."""
        return lambda: None

    async def async_request_refresh(self) -> None:  # pragma: no cover - not used
        """Stub for CoordinatorEntity compatibility."""


async def _fake_bundle(*, run_uuid: str = "run-1") -> SnapshotBundle:
    """Construct a fake snapshot bundle for tests."""
    account = {
        "uuid": "acc-1",
        "name": "Tagesgeld",
        "currency_code": "EUR",
        "orig_balance": 100.0,
        "balance": 120.5,
    }
    portfolio = {
        "uuid": "pf-1",
        "name": "Depot A",
        "current_value": 200.0,
        "purchase_value": 150.0,
        "position_count": 3,
    }
    return SnapshotBundle(
        metric_run_uuid=run_uuid,
        snapshot_at="2024-01-01T00:00:00Z",
        accounts=(account,),
        portfolios=(portfolio,),
    )


@pytest.mark.asyncio
async def test_snapshot_store_caches_by_run_uuid(hass, tmp_path, monkeypatch) -> None:
    """The snapshot store only reloads when the metric run changes."""
    calls: list[str] = []

    async def fake_loader(hass_arg, db_path):
        calls.append("load")
        return await _fake_bundle()

    monkeypatch.setattr(
        "custom_components.pp_reader.sensors.store.async_load_latest_snapshot_bundle",
        fake_loader,
    )

    store = SnapshotSensorStore(hass, tmp_path / "db.sqlite")
    await store.async_ensure_snapshot("run-1")
    assert store.get_account("acc-1")["balance"] == 120.5
    assert store.snapshot_at == "2024-01-01T00:00:00Z"
    assert calls == ["load"]

    # Same run UUID -> do not reload
    await store.async_ensure_snapshot("run-1")
    assert calls == ["load"]

    # Changing the run UUID triggers a reload
    async def fake_loader_run2(hass_arg, db_path):
        calls.append("load2")
        return await _fake_bundle(run_uuid="run-2")

    monkeypatch.setattr(
        "custom_components.pp_reader.sensors.store.async_load_latest_snapshot_bundle",
        fake_loader_run2,
    )
    await store.async_ensure_snapshot("run-2")
    assert calls == ["load", "load2"]


@pytest.mark.asyncio
async def test_account_sensor_reads_from_snapshot_store(hass, tmp_path, monkeypatch):
    """PortfolioAccountSensor exposes canonical balances from the snapshot store."""

    async def fake_loader(hass_arg, db_path):
        return await _fake_bundle()

    monkeypatch.setattr(
        "custom_components.pp_reader.sensors.store.async_load_latest_snapshot_bundle",
        fake_loader,
    )

    db_path = tmp_path / "db.sqlite"
    store = SnapshotSensorStore(hass, db_path)
    await store.async_ensure_snapshot(None)

    coordinator = _DummyCoordinator(hass, db_path)

    sensor = PortfolioAccountSensor(coordinator, store, "acc-1")
    sensor.hass = hass
    await sensor.async_added_to_hass()

    assert sensor.native_value == pytest.approx(120.5)
    assert sensor.extra_state_attributes["letzte_aktualisierung"] == "2024-01-01T00:00:00Z"
