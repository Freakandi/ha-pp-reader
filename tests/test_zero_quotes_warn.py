"""
QA Test: Zero-Quotes Szenario → WARN dedupliziert (nur einmal innerhalb 30 Min).

Ablauf:
1. Provider wird gepatcht, um für jede Fetch-Anfrage ein leeres Dict (keine Quotes) zurückzugeben.
2. `async_setup_entry` triggert initialen Preiszyklus -> erwartet eine WARN.
3. Zweiter manueller Aufruf von `_run_price_cycle` unmittelbar danach -> erwartet KEINE zweite WARN,
   sondern ein DEBUG Log mit "gedrosselt".

Prüfungen:
- Genau 1 WARN mit "zero-quotes detected (WARN)".
- Mindestens ein DEBUG Log mit "zero-quotes detected (WARN gedrosselt)".
"""

import logging
import sqlite3

import pytest

from custom_components.pp_reader.const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.price_service import _run_price_cycle
from tests.common import MockConfigEntry


@pytest.mark.asyncio
async def test_zero_quotes_warn_deduplicated(hass, tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)

    # --- DB & Security Setup ---
    db_path = tmp_path / "zeroquotes.db"
    initialize_database_schema(db_path)

    # Mindestens eine aktive Security mit Symbol, damit Discovery != leer
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, isin, ticker_symbol, currency_code, type, retired)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            ("sec-1", "ZeroQuotesTest", "ISINZERO", "ZZQ", "USD", "EQUITY"),
        )
        conn.commit()

    # --- Patch Provider: immer leeres Dict (0 Quotes) ---
    async def fake_fetch(self, _symbols):
        return {}

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.YahooQueryProvider.fetch",
        fake_fetch,
    )

    # --- Config Entry Setup (triggert initialen Zyklus) ---
    portfolio_file = tmp_path / "dummy.portfolio"
    portfolio_file.write_text("DUMMY")

    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_FILE_PATH: str(portfolio_file), CONF_DB_PATH: str(db_path)},
        options={"price_update_interval_seconds": 900, "enable_price_debug": True},
        title="ZeroQuotes",
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # Zweiter Zyklus direkt manuell anstoßen
    await _run_price_cycle(hass, entry.entry_id)

    # --- Auswertung Logs ---
    warn_logs = [
        r
        for r in caplog.records
        if r.levelno == logging.WARNING
        and "zero-quotes detected (WARN)" in r.getMessage()
    ]
    assert len(warn_logs) == 1, (
        f"Erwartet genau 1 deduplizierte WARN, erhalten {len(warn_logs)}"
    )

    debug_dedup = [
        r
        for r in caplog.records
        if r.levelno == logging.DEBUG
        and "zero-quotes detected (WARN gedrosselt)" in r.getMessage()
    ]
    assert debug_dedup, "Gedrosseltes DEBUG Log für zweiten Zero-Quotes Zyklus fehlt"
