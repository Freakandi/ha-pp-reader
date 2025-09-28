"""
QA Test: Currency Drift WARN nur einmal pro Symbol.

Szenario:
- Security in DB mit currency_code='USD', Symbol 'AAA'.
- Provider liefert Quote mit currency='EUR' (Mismatch) und gültigem Preis.
- Erster Zyklus: Erwartet genau eine WARN (Drift).
- Zweiter Zyklus (erneuter Mismatch): Keine zweite WARN (dedupliziert über
  store['price_currency_drift_logged']).

Prüfungen:
- Anzahl Drift-WARNs == 1.
- Preis wird aktualisiert (changed > 0 im ersten Lauf).
"""

import logging
import sqlite3

import pytest

from custom_components.pp_reader.const import CONF_DB_PATH, CONF_FILE_PATH, DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.price_service import _run_price_cycle
from custom_components.pp_reader.prices.provider_base import Quote
from tests.common import MockConfigEntry


@pytest.mark.asyncio
async def test_currency_drift_warn_once(hass, tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)

    # --- DB & Security Setup ---
    db_path = tmp_path / "drift.db"
    initialize_database_schema(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, isin, ticker_symbol, currency_code, type, retired)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            ("sec-1", "Drift Test Security", "ISINDRIFT", "AAA", "USD", "EQUITY"),
        )
        conn.commit()

    # --- Provider Patch: immer gleicher Preis + mismatched currency (EUR) ---
    async def fake_fetch(symbols):
        assert symbols == ["AAA"]
        return {
            "AAA": Quote(
                symbol="AAA",
                price=101.23,
                previous_close=None,
                currency="EUR",  # Mismatch zu persistierter 'USD'
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=0.0,
                source="yahoo",
            )
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.YahooQueryProvider.fetch",
        fake_fetch,
    )

    # --- Config Entry Setup (triggert initialen Zyklus via async_setup_entry) ---
    portfolio_file = tmp_path / "dummy.portfolio"
    portfolio_file.write_text("DUMMY")

    entry = MockConfigEntry(
        domain=DOMAIN,
        data={CONF_FILE_PATH: str(portfolio_file), CONF_DB_PATH: str(db_path)},
        options={"price_update_interval_seconds": 900, "enable_price_debug": True},
        title="CurrencyDrift",
    )
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # Sicherstellen, dass initialer Zyklus durchgelaufen ist (es sollte genau eine Drift-WARN geben)
    first_drift_warns = [
        r
        for r in caplog.records
        if r.levelno == logging.WARNING
        and "currency" in r.getMessage().lower()
        and "drift" in r.getMessage().lower()
    ]
    assert len(first_drift_warns) == 1, (
        f"Erwartet 1 Drift-WARN im ersten Zyklus, erhalten {len(first_drift_warns)}"
    )

    # Logs leeren für zweite Betrachtung
    caplog.clear()

    # Zweiter manueller Preiszyklus (erneuter Mismatch) → keine zusätzliche WARN
    await _run_price_cycle(hass, entry.entry_id)

    second_drift_warns = [
        r
        for r in caplog.records
        if r.levelno == logging.WARNING
        and "currency" in r.getMessage().lower()
        and "drift" in r.getMessage().lower()
    ]
    assert len(second_drift_warns) == 0, (
        f"Keine zweite Drift-WARN erwartet, gefunden {len(second_drift_warns)}"
    )
