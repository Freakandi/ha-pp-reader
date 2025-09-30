"""
Provide functionality for managing and fetching foreign exchange rates.

Includes:
- Functions to fetch exchange rates from an external API.
- Database operations for storing and retrieving exchange rates.
- Utilities for ensuring required exchange rates are available for specific dates.
"""

# custom_components/pp_reader/currencies/fx.py

import asyncio
import logging
import sqlite3
import threading
from collections.abc import Callable
from contextlib import suppress
from datetime import datetime
from pathlib import Path
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

API_URL = "https://api.frankfurter.app"
SQLITE_TIMEOUT = 30.0
_WRITE_LOCK = threading.Lock()
UPSERT_QUERY = "INSERT OR REPLACE INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)"

# --- Hilfsfunktionen ---


async def _execute_db(fn: Callable, *args: Any, **kwargs: Any) -> Any:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args, **kwargs)


def _load_rates_for_date_sync(db_path: Path, date: str) -> dict[str, float]:
    conn = sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
    try:
        cursor = conn.execute(
            "SELECT currency, rate FROM fx_rates WHERE date = ?",
            (date,),
        )
        result = {row[0]: row[1] for row in cursor.fetchall()}
    finally:
        conn.close()
    return result


def _save_rates_sync(db_path: Path, date: str, rates: dict[str, float]) -> None:
    if not rates:
        return
    with _WRITE_LOCK:
        conn = sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
        try:
            inserts = [(date, currency, rate) for currency, rate in rates.items()]
            conn.executemany(UPSERT_QUERY, inserts)
            conn.commit()
        finally:
            conn.close()


async def _load_rates_for_date(db_path: Path, date: str) -> dict[str, float]:
    return await _execute_db(_load_rates_for_date_sync, db_path, date)


async def _save_rates(
    db_path: Path,
    date: str,
    rates: dict[str, float],
    *,
    retries: int = 3,
    initial_delay: float = 0.5,
) -> None:
    if not rates:
        return

    delay = initial_delay
    last_error: sqlite3.OperationalError | None = None

    for attempt in range(1, retries + 1):
        try:
            await _execute_db(_save_rates_sync, db_path, date, rates)
        except sqlite3.OperationalError as err:
            if "database is locked" not in str(err).lower():
                raise

            last_error = err
            if attempt == retries:
                break

            await asyncio.sleep(delay)
            delay *= 2
        else:
            return

    if last_error is not None:
        raise last_error


async def _fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    if not currencies:
        return {}

    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"
    timeout = aiohttp.ClientTimeout(total=10)

    try:
        async with (
            aiohttp.ClientSession(timeout=timeout) as session,
            session.get(url) as response,
        ):
            if response.status != 200:  # noqa: PLR2004
                _LOGGER.warning(
                    "⚠️ Fehler beim Abruf der Wechselkurse (%s): Status %d",
                    date,
                    response.status,
                )
                return {}
            data = await response.json()
            return {k: float(v) for k, v in data.get("rates", {}).items()}
    except Exception:
        _LOGGER.exception("❌ Fehler beim Abruf der Wechselkurse")
        return {}


# --- Öffentliche Funktionen ---


def get_required_currencies(client: Any) -> set[str]:
    """
    Determine required currencies based on transactions and securities.

    Parameters
    ----------
    client : object
        The client object containing transactions and securities data.

    Returns
    -------
    set[str]
        A set of currency codes required for the client's holdings.

    """
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


async def get_exchange_rates(
    client: Any, reference_date: datetime, db_path: Path
) -> dict[str, float]:
    """
    Fetch exchange rates for the required currencies on a specific date.

    Parameters
    ----------
    client : object
        The client object containing transactions and securities data.
    reference_date : datetime
        The date for which exchange rates are required.
    db_path : Path
        Path to the database file storing exchange rates.

    Returns
    -------
    dict[str, float]
        A dictionary mapping currency codes to their exchange rates.

    """
    date_str = reference_date.strftime("%Y-%m-%d")
    rates = await _load_rates_for_date(db_path, date_str)

    needed = get_required_currencies(client)

    if not needed.issubset(set(rates.keys())):
        fetched = await _fetch_exchange_rates(date_str, needed)
        await _save_rates(db_path, date_str, fetched)
        rates.update(fetched)

    return rates


async def load_latest_rates(
    reference_date: datetime, db_path: Path
) -> dict[str, float]:
    """
    Load the latest exchange rates for a specific date from the database.

    Parameters
    ----------
    reference_date : datetime
        The date for which exchange rates are required.
    db_path : Path
        Path to the database file storing exchange rates.

    Returns
    -------
    dict[str, float]
        A dictionary mapping currency codes to their exchange rates.

    """
    date_str = reference_date.strftime("%Y-%m-%d")
    return await _load_rates_for_date(db_path, date_str)


def load_latest_rates_sync(reference_date: datetime, db_path: Path) -> dict[str, float]:
    """Provide a synchronous wrapper for load_latest_rates."""

    def run_async_task(ref_date: datetime) -> dict[str, float]:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            if isinstance(ref_date, str):
                ref_date = datetime.strptime(ref_date, "%Y-%m-%d")  # noqa: DTZ007
            return loop.run_until_complete(load_latest_rates(ref_date, db_path))
        finally:
            loop.close()

    return run_async_task(reference_date)


async def ensure_exchange_rates_for_dates(
    dates: list[datetime], currencies: set[str], db_path: Path
) -> None:
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
                    _LOGGER.warning(
                        "⚠️ Keine Kurse erhalten für %s am %s", missing, date_str
                    )
            except Exception:
                _LOGGER.exception("❌ Fehler beim Laden der Kurse")


def ensure_exchange_rates_for_dates_sync(
    dates: list[datetime], currencies: set[str], db_path: Path
) -> None:
    """Ensure required exchange rates exist using a synchronous wrapper."""

    def run_async_task(
        dates: list[datetime], currencies: set[str], db_path: Path
    ) -> None:
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                ensure_exchange_rates_for_dates(dates, currencies, db_path)
            )
        finally:
            asyncio.set_event_loop(None)
            with suppress(Exception):
                loop.close()

    if currencies and dates:
        run_async_task(dates, currencies, db_path)
