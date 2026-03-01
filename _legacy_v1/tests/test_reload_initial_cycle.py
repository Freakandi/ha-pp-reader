"""
Test: Reload eines Config Entries startet einen neuen Initiallauf des Preis-Service.

Prüft:
- Initialer Aufruf von _run_price_cycle beim Setup.
- Nach Options-Update (Intervalländerung) → Reload → erneuter Aufruf.
- Neuer Intervall-Task (cancel handle geändert) + aktualisiertes Intervall.

Strategie:
- Patch _run_price_cycle, um Seiteneffekte (DB, Provider) zu vermeiden und Aufrufzähler zu erfassen.
- Patch PPReaderCoordinator.async_config_entry_first_refresh, um komplexes Parsing zu umgehen.
"""

import logging

import pytest
from homeassistant.const import CONF_FILE_PATH
from homeassistant.core import HomeAssistant

from custom_components.pp_reader.const import CONF_DB_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from tests.common import MockConfigEntry

# Nutzen des echten Symbols für spätere Verlinkung / Referenz in Doku:
# custom_components.pp_reader.prices.price_service._run_price_cycle


@pytest.mark.asyncio
async def test_reload_triggers_new_initial_cycle(
    hass: HomeAssistant, tmp_path, monkeypatch, caplog
):
    caplog.set_level(logging.DEBUG)

    # --- Vorbereitung: Dummy Portfolio-Datei & DB ---
    portfolio_file = tmp_path / "demo.portfolio"
    portfolio_file.write_text("DUMMY")  # Inhalt egal, da wir den ersten Refresh patchen

    db_path = tmp_path / "demo.db"
    initialize_database_schema(db_path)

    # --- Aufrufzähler für Preiszyklen ---
    calls = {"count": 0}

    async def fake_run_price_cycle(hass_inner, entry_id: str):
        calls["count"] += 1
        # Liefere Meta-Struktur wie echter Orchestrator
        return {
            "symbols_total": 0,
            "batches": 0,
            "quotes_returned": 0,
            "changed": 0,
            "errors": 0,
            "duration_ms": 1,
            "skipped_running": False,
        }

    # Patch Orchestrator + Initial-Refresh (Coordinator)
    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service._run_price_cycle",
        fake_run_price_cycle,
    )

    async def fake_first_refresh(self):
        return {}  # Koordinator-Daten bleiben leer (Sensoren tolerant)

    monkeypatch.setattr(
        "custom_components.pp_reader.data.coordinator.PPReaderCoordinator.async_config_entry_first_refresh",
        fake_first_refresh,
    )

    # --- Config Entry anlegen & Setup ---
    entry: MockConfigEntry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_FILE_PATH: str(portfolio_file),
            CONF_DB_PATH: str(db_path),
        },
        options={
            "price_update_interval_seconds": 900,
            "enable_price_debug": False,
        },
        title="Demo Portfolio",
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # Initialer Zyklus genau einmal
    assert calls["count"] == 1, (
        f"Erwartet 1 initialen Zyklus, erhalten {calls['count']}"
    )

    store = hass.data[DOMAIN][entry.entry_id]
    first_cancel = store.get("price_task_cancel")
    first_interval = store.get("price_interval_applied")
    assert first_cancel is not None
    assert first_interval == 900

    # --- Options Update (Intervall ändern) → sollte Reload + neuen Initiallauf triggern ---
    hass.config_entries.async_update_entry(
        entry,
        options={
            "price_update_interval_seconds": 1200,
            "enable_price_debug": True,  # auch Debug-Flag Umschaltung testen
        },
    )
    await hass.async_block_till_done()

    # Zweiter Initiallauf nach Reload
    assert calls["count"] == 2, (
        f"Reload sollte neuen Initiallauf starten (calls={calls['count']})"
    )

    store2 = hass.data[DOMAIN][entry.entry_id]
    second_cancel = store2.get("price_task_cancel")
    second_interval = store2.get("price_interval_applied")

    assert second_cancel is not None
    assert second_cancel != first_cancel, "Alter Intervall-Task wurde nicht ersetzt"
    assert second_interval == 1200, (
        f"Neues Intervall nicht angewandt: {second_interval}"
    )

    # Sanity: Preis-State erneut initialisiert (idempotent)
    assert "price_lock" in store2
