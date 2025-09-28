"""
QA Test: Reload Config Entry → Initiallauf + erwartete Logs (Intervalländerung).

Verifiziert:
- _run_price_cycle wird beim Setup und nach Options-Änderung erneut aufgerufen.
- INFO Log mit Intervalländerung alt→neu vorhanden (Spezifikation §7).
"""

import asyncio
import logging

import pytest

from custom_components.pp_reader.const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from tests.common import MockConfigEntry


@pytest.mark.asyncio
async def test_reload_logs_interval_change(hass, tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)

    # Dummy Portfolio & DB
    portfolio_file = tmp_path / "rl.portfolio"
    portfolio_file.write_text("DUMMY")
    db_path = tmp_path / "rl.db"
    initialize_database_schema(db_path)

    call_counter = {"count": 0}

    async def fake_cycle(hass_inner, entry_id: str):
        call_counter["count"] += 1
        await asyncio.sleep(0)
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
        fake_cycle,
    )

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
        title="ReloadLogs",
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert call_counter["count"] == 1

    # Log Reset (nur Reload-Phase betrachten)
    caplog.clear()

    # Options ändern → Reload
    hass.config_entries.async_update_entry(
        entry,
        options={
            "price_update_interval_seconds": 1500,
            "enable_price_debug": True,
        },
    )
    await hass.async_block_till_done()

    # Zweiter Initiallauf
    assert call_counter["count"] == 2, "Erwartet zweiten Initiallauf nach Reload"

    # Erwartetes INFO Log prüfen
    interval_logs = [
        r for r in caplog.records if "Intervall geändert" in r.getMessage()
    ]
    assert interval_logs, "INFO Log für Intervalländerung nicht gefunden"
    msg = interval_logs[0].getMessage()
    assert "alt=900s" in msg and "neu=1500s" in msg, msg
