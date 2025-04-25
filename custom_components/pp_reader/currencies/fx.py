import json
import os
import aiohttp
import asyncio
from datetime import datetime, timedelta

# Cache-Datei liegt unter custom_components/pp_reader/cache/fxrates.json
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "..", "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "fxrates.json")

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

API_URL = "https://api.frankfurter.app"


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
            else:
                print(f"Fehler beim Abruf der Wechselkurse: {response.status}")
                return {}


# --- SYNCHRONE Helfer, die wir später im Executor laufen lassen ---
def _load_cache_sync() -> dict[str, dict[str, float]]:
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        return json.load(f)


def _save_cache_sync(data: dict[str, dict[str, float]]) -> None:
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f, indent=2)


async def get_exchange_rates(client, reference_date: datetime) -> dict[str, float]:
    """
    Hauptfunktion: ermittelt alle benötigten Währungen, lädt ggf. aus Cache
    oder ruft sie über fetch_exchange_rates ab und schreibt dann zurück.
    """
    needed = get_required_currencies(client)
    date = reference_date.strftime("%Y-%m-%d")

    # 1) Cache asynchron laden
    loop = asyncio.get_running_loop()
    cache = await loop.run_in_executor(None, _load_cache_sync)

    # 2) ggf. neu abrufen und speichern
    if date not in cache:
        print(f"Abruf Kurse für {date} ...")
        rates = await fetch_exchange_rates(date, needed)
        cache[date] = rates
        # Cache asynchron speichern
        await loop.run_in_executor(None, _save_cache_sync, cache)
    else:
        rates = cache[date]

    return rates


def load_latest_rates(reference_date: datetime) -> dict[str, float]:
    """
    Lese gespeicherte Wechselkurse aus dem Cache.
    Achtung: Dies bleibt synchron, sollte nur gelegentlich genutzt werden.
    """
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        data = json.load(f)
    date = reference_date.strftime("%Y-%m-%d")
    return data.get(date, {})

