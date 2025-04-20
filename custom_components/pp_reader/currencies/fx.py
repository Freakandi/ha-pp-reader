import json
import os
import requests
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
    holdings = {}
    for tx in client.transactions:
        if not tx.HasField("security"):
            continue
        sid = tx.security
        shares = tx.shares if tx.HasField("shares") else 0
        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[sid] = holdings.get(sid, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[sid] = holdings.get(sid, 0) - shares

    currencies = set()
    for sec in client.securities:
        if sec.HasField("currencyCode") and sec.currencyCode != "EUR":
            sid = sec.uuid
            qty = holdings.get(sid, 0)
            if qty > 0:
                currencies.add(sec.currencyCode)
    return currencies

def fetch_exchange_rates(date: str, currencies: set):
    """Hole Kurse zum gegebenen Datum (Format YYYY-MM-DD) von frankfurter.app"""
    if not currencies:
        return {}
    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return {k: float(v) for k, v in data["rates"].items()}
    else:
        print(f"Fehler beim Abruf der Wechselkurse: {response.status_code}")
        return {}

def load_cache():
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r") as f:
        return json.load(f)

def save_cache(data):
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_exchange_rates(client, reference_date: datetime):
    """Lade oder aktualisiere Wechselkurse für gegebene client-Objektstruktur"""
    needed = get_required_currencies(client)
    date = (reference_date - timedelta(days=1)).strftime("%Y-%m-%d")

    cache = load_cache()
    if date not in cache:
        print(f"Abruf Kurse für {date} ...")
        rates = fetch_exchange_rates(date, needed)
        cache[date] = rates
        save_cache(cache)
    else:
        rates = cache[date]

    return rates
