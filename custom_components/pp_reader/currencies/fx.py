# custom_components/pp_reader/currencies/fx.py

import sqlite3
import aiohttp
import asyncio
import logging
import json
from pathlib import Path
from datetime import datetime

_LOGGER = logging.getLogger(__name__)

API_URL = "https://api.frankfurter.app"

# --- Hilfsfunktionen ---

async def _execute_db(fn, *args, **kwargs):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args, **kwargs)

def _load_rates_for_date_sync(db_path: Path, date: str) -> dict[str, float]:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.execute(
        "SELECT currency, rate FROM fx_rates WHERE date = ?",
        (date,)
    )
    result = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return result

def _save_rates_sync(db_path: Path, date: str, rates: dict[str, float]) -> None:
    if not rates:
        return
    conn = sqlite3.connect(str(db_path))
    inserts = [(date, currency, rate) for currency, rate in rates.items()]
    conn.executemany(
        "INSERT OR REPLACE INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
        inserts
    )
    conn.commit()
    conn.close()

async def _load_rates_for_date(db_path: Path, date: str) -> dict[str, float]:
    return await _execute_db(_load_rates_for_date_sync, db_path, date)

async def _save_rates(db_path: Path, date: str, rates: dict[str, float]) -> None:
    await _execute_db(_save_rates_sync, db_path, date, rates)

async def _fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    if not currencies:
        return {}

    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"
    timeout = aiohttp.ClientTimeout(total=10)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as response:
                if response.status != 200:
                    _LOGGER.warning("⚠️ Fehler beim Abruf der Wechselkurse (%s): Status %d", date, response.status)
                    return {}
                data = await response.json()
                return {k: float(v) for k, v in data.get("rates", {}).items()}
    except Exception as e:
        _LOGGER.error("❌ Fehler beim Abruf der Wechselkurse: %s", e)
        return {}

# --- Öffentliche Funktionen ---

def get_required_currencies(client) -> set[str]:
    holdings: dict[str, float] = {}
    for tx in client.transactions:
        if not tx.HasField("security"):
            continue
        sid = tx.security
        shares = tx.shares if tx.HasField("shares") else 0
        if tx.type in (0, 2):
            holdings[sid] = holdings.get(sid, 0) + shares
        elif tx.type in (1, 3):
            holdings[sid] = holdings.get(sid, 0) - shares

    currencies: set[str] = set()
    for sec in client.securities:
        if sec.HasField("currencyCode") and sec.currencyCode != "EUR":
            sid = sec.uuid
            qty = holdings.get(sid, 0)
            if qty > 0:
                currencies.add(sec.currencyCode)
    return currencies

async def get_exchange_rates(client, reference_date: datetime, db_path: Path) -> dict[str, float]:
    date_str = reference_date.strftime("%Y-%m-%d")
    rates = await _load_rates_for_date(db_path, date_str)

    needed = get_required_currencies(client)

    if not needed.issubset(set(rates.keys())):
        fetched = await _fetch_exchange_rates(date_str, needed)
        await _save_rates(db_path, date_str, fetched)
        rates.update(fetched)

    return rates

async def load_latest_rates(reference_date: datetime, db_path: Path) -> dict[str, float]:
    date_str = reference_date.strftime("%Y-%m-%d")
    return await _load_rates_for_date(db_path, date_str)

def load_latest_rates_sync(reference_date: datetime, db_path: Path) -> dict[str, float]:
    """Synchroner Wrapper für load_latest_rates."""
    def run_async_task():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Sicherstellen, dass reference_date ein datetime-Objekt ist
            if isinstance(reference_date, str):
                reference_date = datetime.strptime(reference_date, "%Y-%m-%d")
            return loop.run_until_complete(load_latest_rates(reference_date, db_path))
        finally:
            loop.close()

    return run_async_task()

async def ensure_exchange_rates_for_dates(dates: list[datetime], currencies: set[str], db_path: Path) -> None:
    """Stellt sicher dass alle benötigten Wechselkurse verfügbar sind."""
    if not currencies:
        return
                  
    for dt in dates:
        date_str = dt.strftime("%Y-%m-%d")
        existing = await _load_rates_for_date(db_path, date_str)
        missing = currencies - set(existing.keys())
        
        if missing:
            try:
                fetched = await _fetch_exchange_rates(date_str, missing)
                if fetched:
                    await _save_rates(db_path, date_str, fetched)
                else:
                    _LOGGER.warning("⚠️ Keine Kurse erhalten für %s am %s",
                                  missing, date_str)
            except Exception as e:
                _LOGGER.error("❌ Fehler beim Laden der Kurse: %s", str(e))
