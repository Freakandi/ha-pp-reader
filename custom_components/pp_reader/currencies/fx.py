import json
import os
import aiohttp
import asyncio
import logging
from datetime import datetime

_LOGGER = logging.getLogger(__name__)

# Cache-Datei liegt unter custom_components/pp_reader/cache/fxrates.json
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "..", "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "fxrates.json")

API_URL = "https://api.frankfurter.app"

# ——— Hilfsfunktionen ———

def get_required_currencies(client):
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

async def fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    if not currencies:
        return {}

    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    _LOGGER.warning("⚠️ Fehler beim Abruf der Wechselkurse (%s): Status %d", date, response.status)
                    return {}

                text = await response.text()
                if not text.strip():
                    _LOGGER.error("❌ Leere Antwort beim Abrufen der Wechselkurse für %s", date)
                    return {}

                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    _LOGGER.error("❌ Ungültige JSON-Antwort beim Abrufen der Wechselkurse für %s", date)
                    return {}

                return {k: float(v) for k, v in data.get("rates", {}).items()}
    except Exception as e:
        _LOGGER.error("❌ Unerwarteter Fehler beim Abrufen der Wechselkurse: %s", e)
        return {}

# ——— Synchrone Kernfunktionen für File-I/O ———

def _load_cache_sync() -> dict[str, dict[str, float]]:
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        return json.load(f)

def _save_cache_sync(cache: dict[str, dict[str, float]]) -> None:
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2, sort_keys=True)

# ——— Executor-Wrapper ———

async def _load_cache_async() -> dict[str, dict[str, float]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _load_cache_sync)

async def _save_cache_async(cache: dict[str, dict[str, float]]) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_cache_sync, cache)

# ——— Haupt-API für neue Kurse ———

async def get_exchange_rates(client, reference_date: datetime) -> dict[str, float]:
    needed = get_required_currencies(client)
    date = reference_date.strftime("%Y-%m-%d")

    cache = await _load_cache_async()
    if date not in cache:
        _LOGGER.info("Abruf Kurse für %s: %s", date, needed)
        rates = await fetch_exchange_rates(date, needed)
        if rates:
            cache[date] = rates
            await _save_cache_async(cache)
    else:
        rates = cache[date]

    return rates

async def load_latest_rates(reference_date: datetime) -> dict[str, float]:
    cache = await _load_cache_async()
    date = reference_date.strftime("%Y-%m-%d")
    return cache.get(date, {})

async def ensure_exchange_rates_for_dates(dates: list[datetime], currencies: set[str]) -> None:
    if not currencies:
        return

    cache = await _load_cache_async()

    tasks = [
        _fetch_and_update_cache(date.strftime("%Y-%m-%d"), currencies, cache)
        for date in dates
        if date.strftime("%Y-%m-%d") not in cache
    ]

    if tasks:
        await asyncio.gather(*tasks)
        await _save_cache_async(cache)

async def _fetch_and_update_cache(date_str: str, currencies: set[str], cache: dict) -> None:
    try:
        _LOGGER.info("Lade historische Kurse für %s: %s", date_str, currencies)
        rates = await fetch_exchange_rates(date_str, currencies)
        if rates:
            cache[date_str] = rates
        else:
            _LOGGER.warning("⚠️ Keine Kurse geladen für %s", date_str)
    except Exception as e:
        _LOGGER.error("❌ Fehler beim Laden der Kurse für %s: %s", date_str, e)
