"""
Test: Watchdog Warnung bei Zyklusdauer >25s.

Simuliert einen Preiszyklus mit künstlich erhöhter Dauer durch Patch von time.time,
ohne reale Verzögerung. Erwartet:
- meta['duration_ms'] > 25000
- WARN Log mit 'Watchdog-Schwelle überschritten'
"""

import logging
import sqlite3
import time

import pytest

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.price_service import (
    _run_price_cycle,
    initialize_price_state,
)
from custom_components.pp_reader.prices.provider_base import Quote


@pytest.mark.asyncio
async def test_watchdog_warn(monkeypatch, hass, tmp_path, caplog):
    caplog.set_level(logging.DEBUG)
    db_path = tmp_path / "pp.db"
    initialize_database_schema(db_path)

    # Minimaler Security-Eintrag
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, isin, ticker_symbol, currency_code, type, retired)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            ("sec-1", "Test Security", "ISIN123", "AAPL", "USD", "EQUITY"),
        )
        conn.commit()

    entry_id = "test-entry"
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}
    initialize_price_state(hass, entry_id)

    store = hass.data[DOMAIN][entry_id]
    store["price_symbols"] = ["AAPL"]
    store["price_symbol_map"] = {"AAPL": ["sec-1"]}

    # Fake Provider Fetch (verhindert echten yahooquery Import / Netzwerk)
    async def fake_fetch(self, _symbols):
        return {
            "AAPL": Quote(
                symbol="AAPL",
                price=100.0,
                previous_close=None,
                currency="USD",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=base_time,
                source="yahoo",
            )
        }

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.YahooQueryProvider.fetch",
        fake_fetch,
    )

    # time.time Patch: erste Messung t, alle weiteren t+26s -> Dauer > 25s
    base_time = time.time()
    call_state = {"count": 0}

    def fake_time():
        if call_state["count"] == 0:
            call_state["count"] += 1
            return base_time
        return base_time + 26.0

    monkeypatch.setattr(
        "custom_components.pp_reader.prices.price_service.time.time", fake_time
    )

    meta = await _run_price_cycle(hass, entry_id)

    assert meta["duration_ms"] > 25000, meta
    # Warn-Log prüfen
    watchdog_warnings = [
        rec
        for rec in caplog.records
        if "Watchdog-Schwelle überschritten" in rec.getMessage()
    ]
    assert watchdog_warnings, "Erwartete Watchdog-WARN nicht gefunden"
