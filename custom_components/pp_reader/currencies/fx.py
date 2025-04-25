import json
import os
import aiohttp
import asyncio
import logging
from datetime import datetime

_LOGGER = logging.getLogger(__name__)

# Cache-Datei liegt unter custom_components/pp_reader/cache/fxrates.json
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR  = os.path.join(BASE_DIR, "..", "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "fxrates.json")

API_URL = "https://api.frankfurter.app"

# --- Deine ursprünglichen Hilfsfunktionen ---
def get_required_currencies(client):
    """Extrahiere Fremdwährungen mit Bestand > 0 aus der Portfolio-Datei"""
    holdings: dict[str, float] = {}
    for tx in client.transactions:
        if not tx.HasField("security"):
            continue
        sid = tx.security
        shares = tx.shares if tx.HasField("shares") else 0
        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[sid] = holdings.get(sid, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
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
    """Hole frische Wechselkurse via HTTP."""
    if not currencies:
        return {}
    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return {k: float(v) for k, v in data["rates"].items()}
            _LOGGER.error("Fehler beim Abruf der Wechselkurse: %s", response.status)
            return {}


# --- Synchrone Kernfunktionen für File-I/O ---
def _load_cache_sync() -> dict[str, dict[str, float]]:
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        return json.load(f)


def _save_cache_sync(cache: dict[str, dict[str, float]]) -> None:
    # Stelle Verzeichnis sicher (wird im Executor ausgeführt)
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


# --- Asynchrone Wrapper, die im Thread-Pool laufen ---
async def _load_cache_async() -> dict[str, dict[str, float]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _load_cache_sync)


async def _save_cache_async(cache: dict[str, dict[str, float]]) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _save_cache_sync, cache)


# --- Haupt-API für deine Integration ---
async def get_exchange_rates(client, reference_date: datetime) -> dict[str, float]:
    """
    Liefere Wechselkurse für das Datum:
    - Lädt den Cache im Executor
    - Falls Datum fehlt, ruft API ab und speichert asynchron
    """
    needed = get_required_currencies(client)
    date = reference_date.strftime("%Y-%m-%d")

    cache = await _load_cache_async()

    if date not in cache:
        _LOGGER.info("Abruf Kurse für %s: %s", date, needed)
        rates = await fetch_exchange_rates(date, needed)
        cache[date] = rates
        await _save_cache_async(cache)
    else:
        rates = cache[date]

    return rates


def load_latest_rates(reference_date: datetime) -> dict[str, float]:
    """
    (Synchron) Lese gespeicherte Wechselkurse aus dem Cache.
    Wird in calculate_portfolio_value verwendet.
    """
    cache = _load_cache_sync()
    date = reference_date.strftime("%Y-%m-%d")
    return cache.get(date, {})
