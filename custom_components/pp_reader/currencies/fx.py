# custom_components/pp_reader/currencies/fx.py

import os
import sqlite3
import aiohttp
import asyncio
import logging
import json
from pathlib import Path
from datetime import datetime

_LOGGER = logging.getLogger(__name__)

# API URL
API_URL = "https://api.frankfurter.app"

# Speicherort Basis
BASE_DIR = Path(__file__).resolve().parent.parent / "storage"

# --- Hilfsfunktionen ---

def _get_db_path(file_path: str) -> Path:
    """Gibt den Pfad zur SQLite-Datei basierend auf der Portfolio-Datei."""
    basename = Path(file_path).stem
    return BASE_DIR / f"{basename}.db"

async def _open_db(db_path: Path) -> sqlite3.Connection:
    """Oeffne eine SQLite-Verbindung im Threadpool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, sqlite3.connect, str(db_path))

async def _initialize_db_schema(conn: sqlite3.Connection) -> None:
    """Initialisiere die Tabelle falls noch nicht vorhanden."""
    await asyncio.get_running_loop().run_in_executor(
        None,
        lambda: conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fx_rates (
                date TEXT NOT NULL,
                currency TEXT NOT NULL,
                rate REAL NOT NULL,
                PRIMARY KEY (date, currency)
            )
            """
        )
    )
    conn.commit()

async def _migrate_from_json(db_path: Path) -> None:
    """Migration der alten fxrates.json falls vorhanden."""
    old_cache = BASE_DIR.parent / "cache" / "fxrates.json"
    if not old_cache.exists() or db_path.exists():
        return

    _LOGGER.info("🔄 Migriere alte fxrates.json nach SQLite: %s", db_path.name)

    with open(old_cache, "r") as f:
        data = json.load(f)

    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS fx_rates (
            date TEXT NOT NULL,
            currency TEXT NOT NULL,
            rate REAL NOT NULL,
            PRIMARY KEY (date, currency)
        )
    """)

    inserts = [
        (date, currency, rate)
        for date, rates in data.items()
        for currency, rate in rates.items()
    ]

    conn.executemany(
        "INSERT OR REPLACE INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
        inserts
    )
    conn.commit()
    conn.close()

    old_cache.rename(old_cache.with_suffix(".migrated"))

async def _fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
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
                data = await response.json()
                return {k: float(v) for k, v in data.get("rates", {}).items()}
    except Exception as e:
        _LOGGER.error("❌ Fehler beim Abruf der Wechselkurse: %s", e)
        return {}

async def _load_rates_for_date(conn: sqlite3.Connection, date: str) -> dict[str, float]:
    cursor = conn.execute(
        "SELECT currency, rate FROM fx_rates WHERE date = ?",
        (date,)
    )
    return {row[0]: row[1] for row in cursor.fetchall()}

async def _save_rates(conn: sqlite3.Connection, date: str, rates: dict[str, float]) -> None:
    if not rates:
        return

    inserts = [(date, currency, rate) for currency, rate in rates.items()]
    conn.executemany(
        "INSERT OR REPLACE INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
        inserts
    )
    conn.commit()

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

async def get_exchange_rates(client, reference_date: datetime) -> dict[str, float]:
    file_path = client.file_path  # vorausgesetzt, das Client-Objekt hat file_path
    db_path = _get_db_path(file_path)

    await _migrate_from_json(db_path)
    conn = await _open_db(db_path)
    await _initialize_db_schema(conn)

    date_str = reference_date.strftime("%Y-%m-%d")
    rates = await _load_rates_for_date(conn, date_str)

    needed = get_required_currencies(client)

    if not needed.issubset(set(rates.keys())):
        _LOGGER.info("🔄 Lade fehlende Kurse für %s", date_str)
        fetched = await _fetch_exchange_rates(date_str, needed)
        await _save_rates(conn, date_str, fetched)
        rates.update(fetched)

    conn.close()
    return rates

async def load_latest_rates(reference_date: datetime, file_path: str) -> dict[str, float]:
    db_path = _get_db_path(file_path)

    await _migrate_from_json(db_path)
    conn = await _open_db(db_path)
    await _initialize_db_schema(conn)

    date_str = reference_date.strftime("%Y-%m-%d")
    rates = await _load_rates_for_date(conn, date_str)
    conn.close()
    return rates

async def ensure_exchange_rates_for_dates(dates: list[datetime], currencies: set[str], file_path: str) -> None:
    if not currencies:
        return

    db_path = _get_db_path(file_path)

    await _migrate_from_json(db_path)
    conn = await _open_db(db_path)
    await _initialize_db_schema(conn)

    missing_dates = []

    for dt in dates:
        date_str = dt.strftime("%Y-%m-%d")
        existing = await _load_rates_for_date(conn, date_str)
        if not currencies.issubset(set(existing.keys())):
            missing_dates.append(date_str)

    for date_str in missing_dates:
        _LOGGER.info("🔄 Lade historische Kurse für %s", date_str)
        fetched = await _fetch_exchange_rates(date_str, currencies)
        await _save_rates(conn, date_str, fetched)

    conn.close()
