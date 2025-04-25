import json
import os
import aiohttp
import asyncio
from datetime import datetime

# Cache-Datei
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR   = os.path.join(BASE_DIR, "..", "cache")
CACHE_FILE  = os.path.join(CACHE_DIR, "fxrates.json")
API_URL     = "https://api.frankfurter.app"

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)


def get_required_currencies(client):
    # … deine bestehende Logik unverändert …
    # siehe oben
    pass


async def fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    # … wie gehabt …
    pass


# helper für Sync-I/O
def _load_cache_sync() -> dict[str, dict[str, float]]:
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        return json.load(f)

def _save_cache_sync(data: dict[str, dict[str, float]]) -> None:
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f, indent=2)


async def get_exchange_rates(client, reference_date: datetime) -> dict[str, float]:
    # … deine bestehende, asynchrone Cache-+Fetch-Logik für den Tages-Rate …
    loop = asyncio.get_running_loop()
    cache = await loop.run_in_executor(None, _load_cache_sync)
    # … ggf. fetch + speichern …
    return cache.get(reference_date.strftime("%Y-%m-%d"), {})


async def load_latest_rates(reference_date: datetime) -> dict[str, float]:
    """
    Asynchrone Version von load_latest_rates:
    Lädt den Cache im Executor und gibt nur das gewünschte Datum zurück.
    """
    loop = asyncio.get_running_loop()
    cache = await loop.run_in_executor(None, _load_cache_sync)
    date = reference_date.strftime("%Y-%m-%d")
    return cache.get(date, {})

