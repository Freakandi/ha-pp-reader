"""
QA/Test: Intervalländerung während Lauf → alter Task cancel + neuer Task geplant.

Prüft, dass beim Ändern der Option `price_update_interval_seconds`:
- Der ursprüngliche Intervall-Listener gecancelt wird.
- Ein neuer Listener mit dem neuen Intervall registriert wird.
- Kein doppelter aktiver Listener übrig bleibt.

Strategie:
- Patch `custom_components.pp_reader.__init__.async_track_time_interval`, um
  Registrierungen aufzuzeichnen.
- Patch `_run_price_cycle` auf schnellen No-Op (liefert Meta-Dict).
- Ändere Optionen (Update Entry) → Reload wird durch vorhandenen Listener ausgelöst.
"""

import asyncio
import logging

import pytest

from custom_components.pp_reader.const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from tests.common import MockConfigEntry


@pytest.mark.asyncio
async def test_interval_change_cancels_old_and_creates_new(
    hass, tmp_path, monkeypatch, caplog
):
    caplog.set_level(logging.DEBUG)

    # --- Setup DB & Portfolio Dummy ---
    db_path = tmp_path / "intchange.db"
    initialize_database_schema(db_path)
    portfolio_file = tmp_path / "dummy.portfolio"
    portfolio_file.write_text("DUMMY")

    # --- Patch: async_track_time_interval Recorder ---
    registrations = []

    def fake_async_track_time_interval(hass_inner, callback, delta):
        record = {
            "callback": callback,
            "interval_seconds": int(delta.total_seconds()),
            "canceled": False,
        }
        registrations.append(record)

        def cancel():
            record["canceled"] = True

        return cancel

    monkeypatch.setattr(
        "custom_components.pp_reader.__init__.async_track_time_interval",
        fake_async_track_time_interval,
    )

    # --- Patch: Preiszyklus (No-Op, schneller) ---
    async def fake_run_price_cycle(hass_inner, entry_id: str):
        await asyncio.sleep(0)  # Yield
        return {
            "symbols_total": 0,
            "batches": 0,
            "quotes_returned": 0,
            "changed": 0,
            "errors": 0,
            "duration_ms": 1,
            "skipped_running": False,
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._run_price_cycle",
        fake_run_price_cycle,
    )

    # --- Config Entry anlegen ---
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_FILE_PATH: str(portfolio_file),
            CONF_DB_PATH: str(db_path),
        },
        options={
            "price_update_interval_seconds": 900,
            "enable_price_debug": False,
        },
    )
    entry.add_to_hass(hass)

    # --- Initial Setup ---
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert len(registrations) == 1, (
        f"Erwartet 1 Registrierung, erhalten {len(registrations)}"
    )
    first = registrations[0]
    assert first["interval_seconds"] == 900
    assert first["canceled"] is False

    # --- Options-Update (Intervall ändern) -> Reload ---
    hass.config_entries.async_update_entry(
        entry,
        options={
            "price_update_interval_seconds": 1200,
            "enable_price_debug": True,
        },
    )
    await hass.async_block_till_done()

    assert len(registrations) == 2, (
        f"Erwartet 2 Registrierungen, erhalten {len(registrations)}"
    )
    assert first["canceled"] is True, "Alter Listener wurde nicht gecancelt"

    second = registrations[1]
    assert second["interval_seconds"] == 1200
    assert second["canceled"] is False

    # Sanity: Store enthält neues Intervall
    store = hass.data[DOMAIN][entry.entry_id]
    assert store.get("price_interval_applied") == 1200
