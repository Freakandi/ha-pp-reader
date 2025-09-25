import sqlite3
import logging
import pytest
from pathlib import Path

from custom_components.pp_reader.const import DOMAIN
from custom_components.pp_reader.prices.price_service import (
    initialize_price_state,
    load_and_map_symbols,
    _run_price_cycle,
)
from custom_components.pp_reader.prices.yahooquery_provider import (
    CHUNK_SIZE,
    YahooQueryProvider,
)


# Patch provider to return a dummy quote per symbol
@pytest.mark.asyncio
async def test_batches_count_regression(tmp_path, monkeypatch, caplog):
    db_path = tmp_path / "batch_reg.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE securities (
            uuid TEXT PRIMARY KEY,
            name TEXT,
            ticker_symbol TEXT,
            retired INTEGER DEFAULT 0,
            last_price INTEGER,
            last_price_source TEXT,
            last_price_fetched_at TEXT,
            currency_code TEXT
        )
        """
    )
    # Create CHUNK_SIZE + 3 symbols -> expect 2 batches
    for i in range(CHUNK_SIZE + 3):
        conn.execute(
            "INSERT INTO securities (uuid,name,ticker_symbol,retired,last_price,currency_code) VALUES (?,?,?,?,?,?)",
            (f"sec{i}", f"Sec {i}", f"SYM{i}", 0, int(100 * 1e8), "EUR"),
        )
    conn.commit()
    conn.close()

    hass = type(
        "Hass",
        (),
        {"data": {DOMAIN: {}}, "async_add_executor_job": lambda *a, **k: None},
    )()
    entry_id = "batch_reg"
    hass.data[DOMAIN][entry_id] = {"db_path": db_path}
    initialize_price_state(hass, entry_id)
    load_and_map_symbols(hass, entry_id, db_path)

    async def fake_fetch(self, symbols):
        # Return a constant price >0 for each symbol
        from custom_components.pp_reader.prices.provider_base import Quote

        return {
            sym: Quote(
                symbol=sym,
                price=101.0,
                previous_close=None,
                currency="EUR",
                volume=None,
                market_cap=None,
                high_52w=None,
                low_52w=None,
                dividend_yield=None,
                ts=0.0,
                source="yahoo",
            )
            for sym in symbols
        }

    monkeypatch.setattr(YahooQueryProvider, "fetch", fake_fetch)
    caplog.set_level(logging.INFO)
    meta = await _run_price_cycle(hass, entry_id)

    assert meta["symbols_total"] == CHUNK_SIZE + 3
    assert meta["batches"] == 2, (
        f"Erwartet 2 Batches bei >CHUNK_SIZE Symbolen, bekam {meta['batches']}"
    )
    assert "batches=" in caplog.text
    assert meta["quotes_returned"] == CHUNK_SIZE + 3
    assert meta["errors"] == 0
