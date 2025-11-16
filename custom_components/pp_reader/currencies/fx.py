"""
Provide functionality for managing and fetching foreign exchange rates.

Includes:
- Functions to fetch exchange rates from an external API.
- Database operations for storing and retrieving exchange rates.
- Utilities for ensuring required exchange rates are available for specific dates.
"""

# custom_components/pp_reader/currencies/fx.py

import asyncio
import json
import logging
import sqlite3
import ssl
import threading
from collections import defaultdict
from collections.abc import Callable
from contextlib import suppress
from datetime import datetime
from pathlib import Path
from typing import Any

import aiohttp
from homeassistant.util import ssl as hass_ssl

from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    load_fx_rates_for_date,
    upsert_fx_rate,
)
from custom_components.pp_reader.util.datetime import UTC

_LOGGER = logging.getLogger(__name__)

API_URL = "https://api.frankfurter.app"
SQLITE_TIMEOUT = 30.0
_WRITE_LOCK = threading.Lock()

FRANKFURTER_SOURCE = "frankfurter"
FRANKFURTER_PROVIDER = "frankfurter.app"
FETCH_RETRIES = 3
FETCH_BACKOFF_SECONDS = 1.0

# Dedupe repeated warning logs for the same date/currency combination.
_FAILED_WARNINGS: dict[str, set[frozenset[str]]] = defaultdict(set)
_FAILED_WARNINGS_LOCK = threading.Lock()


def _should_log_warning(date: str, currencies: set[str]) -> bool:
    """Return True when the warning for the given date/currencies should be emitted."""
    # Normalize currencies to ensure deterministic comparison.
    key = frozenset(currencies or {"__none__"})
    with _FAILED_WARNINGS_LOCK:
        logged = _FAILED_WARNINGS[date]
        if key in logged:
            return False
        logged.add(key)
    return True


# --- Hilfsfunktionen ---


async def _execute_db(fn: Callable, *args: Any, **kwargs: Any) -> Any:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, fn, *args, **kwargs)


def discover_active_currencies(db_path: Path) -> set[str]:
    """Return non-EUR currencies referenced by accounts/securities."""
    conn = sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
    currencies: set[str] = set()
    try:
        cursor = conn.execute(
            """
            SELECT currency_code
            FROM securities
            WHERE currency_code IS NOT NULL
              AND TRIM(currency_code) != ''
        """
        )
        currencies.update(
            row[0].strip().upper()
            for row in cursor.fetchall()
            if isinstance(row[0], str) and row[0].strip()
        )
        cursor = conn.execute(
            """
            SELECT currency_code
            FROM accounts
            WHERE currency_code IS NOT NULL
              AND TRIM(currency_code) != ''
        """
        )
        currencies.update(
            row[0].strip().upper()
            for row in cursor.fetchall()
            if isinstance(row[0], str) and row[0].strip()
        )
    finally:
        conn.close()
    return {code for code in currencies if code != "EUR"}


def _load_rates_for_date_sync(db_path: Path, date: str) -> dict[str, float]:
    records = load_fx_rates_for_date(db_path, date)
    result: dict[str, float] = {}
    for record in records:
        try:
            result[record.currency] = float(record.rate)
        except (TypeError, ValueError):
            _LOGGER.debug(
                "Ignoriere ungültigen FX-Datensatz für %s/%s",
                date,
                record.currency,
            )
    return result


def _save_rates_sync(db_path: Path, date: str, rates: dict[str, float]) -> None:
    if not rates:
        return
    with _WRITE_LOCK:
        conn = sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
        try:
            fetched_at = (
                datetime.now(tz=UTC)
                .replace(microsecond=0)
                .strftime("%Y-%m-%dT%H:%M:%SZ")
            )
            provenance = json.dumps(
                {"currencies": sorted(rates.keys())},
                ensure_ascii=False,
            )
            for currency, rate in rates.items():
                record = FxRateRecord(
                    date=date,
                    currency=currency,
                    rate=rate,
                    fetched_at=fetched_at,
                    data_source=FRANKFURTER_SOURCE,
                    provider=FRANKFURTER_PROVIDER,
                    provenance=provenance,
                )
                upsert_fx_rate(db_path, record, conn=conn)
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


async def _fetch_exchange_rates_with_retry(
    date: str,
    currencies: set[str],
    *,
    retries: int = FETCH_RETRIES,
    initial_delay: float = FETCH_BACKOFF_SECONDS,
) -> dict[str, float]:
    """Fetch exchange rates with retry/backoff semantics."""
    if not currencies:
        return {}

    attempt = 0
    delay = initial_delay
    while attempt < retries:
        attempt += 1
        result = await _fetch_exchange_rates(date, currencies)
        if result:
            return result
        if attempt >= retries:
            break
        await asyncio.sleep(delay)
        delay *= 2
    return {}


async def _fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    if not currencies:
        return {}

    symbols = ",".join(currencies)
    url = f"{API_URL}/{date}?from=EUR&to={symbols}"
    timeout = aiohttp.ClientTimeout(total=10)
    ssl_context = hass_ssl.client_context()
    if hasattr(ssl_context, "verify_flags"):
        ssl_context.verify_flags &= ~ssl.VERIFY_X509_STRICT
    connector = aiohttp.TCPConnector(ssl=ssl_context)

    try:
        async with (
            aiohttp.ClientSession(
                timeout=timeout,
                trust_env=True,
                connector=connector,
            ) as session,
            session.get(url) as response,
        ):
            if response.status != 200:  # noqa: PLR2004
                if _should_log_warning(date, currencies):
                    _LOGGER.warning(
                        "Fehler beim Abruf der Wechselkurse (%s): Status %d",
                        date,
                        response.status,
                    )
                return {}
            data = await response.json()
            return {k: float(v) for k, v in data.get("rates", {}).items()}
    except (TimeoutError, aiohttp.ClientError, OSError) as err:
        if _should_log_warning(date, currencies):
            _LOGGER.warning(
                "Netzwerkproblem beim Abruf der Wechselkurse (%s): %s",
                date,
                err,
            )
        return {}
    except Exception:
        _LOGGER.exception("Fehler beim Abruf der Wechselkurse")
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
        fetched = await _fetch_exchange_rates_with_retry(
            date_str,
            needed,
            retries=FETCH_RETRIES,
            initial_delay=FETCH_BACKOFF_SECONDS,
        )
        await _save_rates(db_path, date_str, fetched)
        rates.update(fetched)

    return rates


async def load_latest_rates(
    reference_date: datetime, db_path: Path
) -> dict[str, float]:
    """Load cached rates as simple currency -> rate mapping."""
    records = await load_cached_rate_records(reference_date, db_path)
    return {currency: float(record.rate) for currency, record in records.items()}


def load_latest_rates_sync(reference_date: datetime, db_path: Path) -> dict[str, float]:
    """Provide a synchronous wrapper for load_latest_rates."""
    records = load_cached_rate_records_sync(reference_date, db_path)
    return {currency: float(record.rate) for currency, record in records.items()}


async def load_cached_rate_records(
    reference_date: datetime,
    db_path: Path,
) -> dict[str, FxRateRecord]:
    """Return cached FX rate records keyed by currency for the given date."""
    date_str = reference_date.strftime("%Y-%m-%d")
    records = await _execute_db(load_fx_rates_for_date, db_path, date_str)
    return {record.currency: record for record in records}


def load_cached_rate_records_sync(
    reference_date: datetime,
    db_path: Path,
) -> dict[str, FxRateRecord]:
    """Return cached rate records for the given date."""
    date_str = reference_date.strftime("%Y-%m-%d")
    records = load_fx_rates_for_date(db_path, date_str)
    return {record.currency: record for record in records}


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
                fetched = await _fetch_exchange_rates_with_retry(
                    date_str,
                    missing,
                    retries=FETCH_RETRIES,
                    initial_delay=FETCH_BACKOFF_SECONDS,
                )
                if fetched:
                    await _save_rates(db_path, date_str, fetched)
                elif _should_log_warning(date_str, missing):
                    _LOGGER.warning(
                        "Keine Kurse erhalten für %s am %s", missing, date_str
                    )
            except Exception:
                _LOGGER.exception("Fehler beim Laden der Kurse")


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
