"""
QA Test: Fehlerzähler Reset nach erfolgreichem Zyklus.

Szenario:
- Zwei aufeinanderfolgende Fehlzyklen (Provider liefert 0 Quotes) erhöhen den
  Fehlerzähler (jeweils errors > 0 in den Zyklus-Metadaten).
- Dritter Zyklus liefert eine gültige Quote -> errors=0 und INFO Log:
  "prices_cycle: Fehlerzähler zurückgesetzt (previous=<N>)" (N = Fehlerzähler des
  vorherigen (zweiten) Fehlzyklus).

Prüfungen:
- meta_fail_1["errors"] > 0
- meta_fail_2["errors"] > 0
- meta_success["errors"] == 0
- Genau ein INFO Log mit Pattern "Fehlerzähler zurückgesetzt (previous=<meta_fail_2['errors']>)"
"""

import logging
import sqlite3
import re
import pytest
from pathlib import Path
from tests.common import MockConfigEntry

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.price_service import (
    initialize_price_state,
    _run_price_cycle,
)
from custom_components.pp_reader.prices.provider_base import Quote


@pytest.mark.asyncio
async def test_error_counter_reset_after_success(hass, tmp_path, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)

    # --- DB & Security Setup ---
    db_path = tmp_path / "errors.db"
    initialize_database_schema(db_path)
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, isin, ticker_symbol, currency_code, type, retired)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            ("sec-1", "ErrCounterTest", "ISINERR", "AAA", "USD", "EQUITY"),
        )
        conn.commit()

    entry_id = "entry-err-reset"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}

    # Preis-State + Symbol-Mapping manuell initialisieren (kein vollständiges setup_entry nötig)
    initialize_price_state(hass, entry_id)
    store = hass.data[DOMAIN][entry_id]
    store["price_symbols"] = ["AAA"]
    store["price_symbol_map"] = {"AAA": ["sec-1"]}

    # --- Provider Fetch Patch (2x leer, dann Quote) ---
    call_state = {"cycle": 0}

    async def fake_fetch(_symbols):
        # Jede _run_price_cycle ruft fetch pro Batch einmal auf (eine Symbolgruppe)
        if call_state["cycle"] < 2:
            call_state["cycle"] += 1
            return {}
        # Erfolg im dritten Zyklus
        return {
            "AAA": Quote(
                symbol="AAA",
                price=100.5,
                previous_close=None,
                currency="USD",
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

    # --- Zwei Fehlzyklen ---
    meta_fail_1 = await _run_price_cycle(hass, entry_id)
    meta_fail_2 = await _run_price_cycle(hass, entry_id)

    assert meta_fail_1["errors"] > 0, f"Erwartet errors>0 im ersten Fehlzyklus: {meta_fail_1}"
    assert meta_fail_2["errors"] > 0, f"Erwartet errors>0 im zweiten Fehlzyklus: {meta_fail_2}"

    # Logs für Erfolgsprüfung säubern
    caplog.clear()

    # --- Erfolgszyklus ---
    meta_success = await _run_price_cycle(hass, entry_id)
    assert meta_success["quotes_returned"] == 1, meta_success
    assert meta_success["errors"] == 0, meta_success

    # INFO Log für Reset prüfen
    reset_logs = [
        r for r in caplog.records if r.levelno == logging.INFO and "Fehlerzähler zurückgesetzt" in r.getMessage()
    ]
    assert len(reset_logs) == 1, f"Erwartet genau 1 Reset-Log, gefunden {len(reset_logs)}"
    msg = reset_logs[0].getMessage()

    prev_val_match = re.search(r"previous=(\d+)", msg)
    assert prev_val_match, f"previous=... nicht gefunden in Log: {msg}"
    prev_val = int(prev_val_match.group(1))
    assert prev_val == meta_fail_2["errors"], f"previous={prev_val} != letzter Fehlerzähler={meta_fail_2['errors']}"