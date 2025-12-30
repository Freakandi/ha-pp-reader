"""
Provide functionality for managing and fetching foreign exchange rates.

Includes:
- Functions to fetch exchange rates from an external API.
- Database operations for storing and retrieving exchange rates.
- Utilities for ensuring required exchange rates are available for specific dates.
"""

# custom_components/pp_reader/currencies/fx.py

import asyncio
import functools
import json
import logging
import sqlite3
import threading
from collections import defaultdict
from collections.abc import Callable, Mapping
from contextlib import suppress
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import aiohttp
import requests
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from custom_components.pp_reader.currencies.persistence import (
    FxRateRecord,
    load_fx_rates_for_date,
    load_fx_rates_in_range,
    upsert_fx_rate,
    upsert_fx_rates_chunked,
)
from custom_components.pp_reader.util.currency import (
    PRICE_DECIMALS,
    normalize_raw_price,
    round_price,
)

_LOGGER = logging.getLogger(__name__)

API_URL = "https://data-api.ecb.europa.eu/service/data/EXR"
SQLITE_TIMEOUT = 30.0
_WRITE_LOCK = threading.Lock()

FRANKFURTER_SOURCE = "ecb"
FRANKFURTER_PROVIDER = "ecb.europa.eu"
FETCH_RETRIES = 3
FETCH_BACKOFF_SECONDS = 1.0

# Dedupe repeated warning logs for the same date/currency combination.
_FAILED_WARNINGS: dict[str, set[frozenset[str]]] = defaultdict(set)
_FAILED_WARNINGS_LOCK = threading.Lock()
_COMPACT_DATE_LEN = 8
# Track warned deep fallbacks to avoid spamming the log once per row
_DEEP_FALLBACK_WARNED: set[tuple[str, str]] = set()
MAX_FALLBACK_DAYS_WITHOUT_WARNING = 5


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


def _parse_ecb_sdmx_response(data: Any) -> dict[str, dict[str, float]]:
    """Parse ECB SDMX-JSON response into date->currency->rate mapping."""
    result: dict[str, dict[str, float]] = defaultdict(dict)

    if not isinstance(data, dict):
        return {}

    try:
        structure = data.get("structure", {})
        dimensions = structure.get("dimensions", {})
        series_dims = dimensions.get("series", [])
        obs_dims = dimensions.get("observation", [])

        # Find index of CURRENCY in series keys
        curr_idx = next(
            (i for i, d in enumerate(series_dims) if d["id"] == "CURRENCY"), None
        )
        if curr_idx is None:
            return {}

        # Get currency codes mapping (index -> code)
        currencies_map = {
            i: val["id"] for i, val in enumerate(series_dims[curr_idx]["values"])
        }

        # Get dates mapping (index -> date_str)
        # Time period is usually at index 0 of observation dimensions
        time_dim = next((d for d in obs_dims if d["id"] == "TIME_PERIOD"), None)
        if not time_dim:
            return {}

        dates_map = {str(i): val["id"] for i, val in enumerate(time_dim["values"])}

        # Parse data
        data_sets = data.get("dataSets", [])
        if not data_sets:
            return {}

        series = data_sets[0].get("series", {})
        for key, series_data in series.items():
            # Key is "0:1:0:0:0" etc.
            key_parts = key.split(":")
            if len(key_parts) <= curr_idx:
                continue

            curr_code_idx = int(key_parts[curr_idx])
            currency = currencies_map.get(curr_code_idx)
            if not currency:
                continue

            observations = series_data.get("observations", {})
            for date_idx, obs_vals in observations.items():
                date_str = dates_map.get(str(date_idx))
                if date_str and obs_vals:
                    try:
                        rate = float(obs_vals[0])
                        result[date_str][currency] = rate
                    except (ValueError, TypeError):
                        pass

    except Exception:
        _LOGGER.exception("Error parsing ECB SDMX response")

    return result


def _safe_float(value: Any) -> float | None:
    """Best-effort float conversion for coverage calculations."""
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric


def _normalize_date_input(value: date | datetime | str) -> str:
    """Ensure date is in ISO YYYY-MM-DD string format."""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            message = "date string must not be empty"
            raise ValueError(message)
        return stripped
    msg = f"Unsupported date type: {type(value)!r}"
    raise TypeError(msg)


def _iter_expected_dates(start: date, end: date) -> list[str]:
    total_days = (end - start).days + 1
    return [
        (start + timedelta(days=offset)).isoformat() for offset in range(total_days)
    ]


# --- Hilfsfunktionen ---


async def _execute_db(fn: Callable, *args: Any, **kwargs: Any) -> Any:
    loop = asyncio.get_running_loop()
    if kwargs:
        fn = functools.partial(fn, **kwargs)
    return await loop.run_in_executor(None, fn, *args)


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


def _resolve_fallback_rate(
    db_path: Path,
    currency_code: str,
    reference_date: datetime,
) -> float | None:
    """Resolve a fallback exchange rate using the closest available record."""
    fallback = get_closest_rate_sync(
        db_path,
        currency_code,
        reference_date.strftime("%Y-%m-%d"),
    )
    if not fallback:
        _LOGGER.debug(
            "Kein Wechselkurs für %s (%s) und kein Fallback gefunden",
            currency_code,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    rate_val, date_str = fallback

    # Check age
    fallback_date = datetime.fromisoformat(date_str).date()
    if isinstance(reference_date, datetime):
        ref_date = reference_date.date()
    else:
        ref_date = reference_date
    age_days = (ref_date - fallback_date).days

    if age_days > MAX_FALLBACK_DAYS_WITHOUT_WARNING:
        warn_key = (currency_code, date_str)
        if warn_key not in _DEEP_FALLBACK_WARNED:
            _DEEP_FALLBACK_WARNED.add(warn_key)
            _LOGGER.warning(
                "Veralteter Wechselkurs für %s: %s genutzt. Datum %s "
                "(%d Tage alt > %d)",
                currency_code,
                date_str,
                reference_date.strftime("%Y-%m-%d"),
                age_days,
                MAX_FALLBACK_DAYS_WITHOUT_WARNING,
            )
    return rate_val


def normalize_price_to_eur_sync(
    raw_price: float | None,
    currency_code: str,
    reference_date: datetime,
    db_path: Path,
    *,
    decimals: int = PRICE_DECIMALS,
    conn: sqlite3.Connection | None = None,
) -> float | None:
    """Normalize a raw price to EUR using synchronous FX helpers."""
    price_native = normalize_raw_price(raw_price, decimals=decimals)
    if price_native is None:
        return None

    normalized_currency = (currency_code or "EUR").upper()
    if normalized_currency == "EUR":
        return price_native

    # Try exact match first
    try:
        # Note: allow_fetch defaults to False in the implementation, so this is safe
        ensure_exchange_rates_for_dates_sync(
            [reference_date], {normalized_currency}, db_path, conn=conn
        )
        fx_records = load_cached_rate_records_sync(reference_date, db_path, conn=conn)
    except Exception:  # pragma: no cover - defensive
        _LOGGER.exception("Fehler beim Laden der Wechselkurse für %s", currency_code)
        return None

    rate = None
    record = fx_records.get(normalized_currency)

    if record:
        rate = float(record.rate)
    else:
        rate = _resolve_fallback_rate(db_path, normalized_currency, reference_date)

    if not rate:
        return None

    try:
        normalized = price_native / rate
    except (TypeError, ValueError, ZeroDivisionError):
        _LOGGER.warning(
            "Ungültiger Wechselkurs für %s (%s)",
            normalized_currency,
            reference_date.strftime("%Y-%m-%d"),
        )
        return None

    return round_price(normalized, decimals=decimals)


def _load_rates_for_date_sync(
    db_path: Path,
    date: str,
    conn: sqlite3.Connection | None = None,
) -> dict[str, float]:
    records = load_fx_rates_for_date(db_path, date, conn=conn)
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


def get_closest_rate_sync(
    db_path: Path,
    currency: str,
    target_date: str,
    conn: sqlite3.Connection | None = None,
) -> tuple[float, str] | None:
    """
    Find the most recent exchange rate for a currency on or before target_date.

    Returns (rate, date_str) or None.
    """
    query = """
        SELECT rate, date
        FROM fx_rates
        WHERE currency = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 1
    """
    local_conn = conn or sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
    try:
        cursor = local_conn.execute(query, (currency, target_date))
        row = cursor.fetchone()
        if row:
            return float(row[0]), row[1]
        return None
    finally:
        if conn is None:
            local_conn.close()


def _save_rates_sync(
    db_path: Path,
    date: str,
    rates: dict[str, float],
    conn: sqlite3.Connection | None = None,
) -> None:
    if not rates:
        return
    with _WRITE_LOCK:
        local_conn = conn or sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT)
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
                upsert_fx_rate(db_path, record, conn=local_conn)
            if conn is None:
                local_conn.commit()
        finally:
            if conn is None:
                local_conn.close()


async def _load_rates_for_date(
    db_path: Path,
    date: str,
    conn: sqlite3.Connection | None = None,
) -> dict[str, float]:
    if conn is not None:
        return _load_rates_for_date_sync(db_path, date, conn=conn)
    return await _execute_db(_load_rates_for_date_sync, db_path, date)


async def _save_rates(
    db_path: Path,
    date: str,
    rates: dict[str, float],
    *,
    conn: sqlite3.Connection | None = None,
    retries: int = 3,
    initial_delay: float = 0.5,
) -> None:
    if not rates:
        return

    delay = initial_delay
    last_error: sqlite3.OperationalError | None = None

    for attempt in range(1, retries + 1):
        try:
            if conn is not None:
                _save_rates_sync(db_path, date, rates, conn=conn)
            else:
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


def _fetch_exchange_rates_sync_http(
    date_str: str, currencies: set[str]
) -> dict[str, float]:
    """Fetch synchronously using requests to avoid aiohttp instability."""
    if not currencies:
        return {}

    symbols = "+".join(sorted(currencies))
    url = f"{API_URL}/D.{symbols}.EUR.SP00.A"
    params = {"startPeriod": date_str, "endPeriod": date_str, "detail": "dataonly"}
    headers = {"Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd"}

    try:
        # TIMEOUT is critical here. Using a standard requests session.
        resp = requests.get(url, params=params, headers=headers, timeout=10)

        if resp.status_code != 200:  # noqa: PLR2004
            if _should_log_warning(date_str, currencies):
                # 404 is normal for holidays/weekends on some APIs, but ECB returns 404?
                # Actually observations show ECB returns 200 with empty body
                # for holidays.
                _LOGGER.warning(
                    "Fehler beim Abruf der Wechselkurse (%s): Status %d",
                    date_str,
                    resp.status_code,
                )
            return {}

        # ECB API returns 200 OK with empty body for holidays/no-data.
        # We check for empty content to avoid JSON decode errors and warnings.
        if not resp.content:
            _LOGGER.debug(
                "Keine Daten (leere Antwort) für %s (Status %d)",
                date_str,
                resp.status_code,
            )
            return {}

        try:
            data = resp.json()
        except ValueError:
            if _should_log_warning(date_str, currencies):
                _LOGGER.warning(
                    "Ungültiges JSON vom ECB-Dienst (%s): %s",
                    date_str,
                    resp.text[:200],
                )
            return {}

        parsed = _parse_ecb_sdmx_response(data)
        return parsed.get(date_str, {})
    except Exception as err:  # noqa: BLE001
        if _should_log_warning(date_str, currencies):
            _LOGGER.warning(
                "Netzwerkproblem beim Abruf der Wechselkurse (%s): %s",
                date_str,
                err,
            )
        return {}


async def _fetch_exchange_rates(date: str, currencies: set[str]) -> dict[str, float]:
    return await _execute_db(_fetch_exchange_rates_sync_http, date, currencies)


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
    """Provide a synchronous wrapper for load_latest_rates with holiday fallback."""
    records = load_cached_rate_records_sync(reference_date, db_path)
    result = {currency: float(record.rate) for currency, record in records.items()}

    # If cache is empty or sparse for "latest" (today), look back.
    # We do a naive check: if we got results, return them.
    # A more complex check would be to see if SPECIFIC currencies are missing,
    # but 'discover_active_currencies' is expensive to call here.
    # Instead, if the result is completely empty, it is likely a holiday.
    if not result:
        # Fallback loop: Check up to 5 days into the past
        for i in range(1, 6):
            fallback_date = reference_date - timedelta(days=i)
            fallback_records = load_cached_rate_records_sync(fallback_date, db_path)
            if fallback_records:
                _LOGGER.debug(
                    "Verwende Fallback-Rates (Bulk) vom %s (statt %s)",
                    fallback_date.strftime("%Y-%m-%d"),
                    reference_date.strftime("%Y-%m-%d"),
                )
                result = {
                    currency: float(record.rate)
                    for currency, record in fallback_records.items()
                }
                break

    return result


async def load_cached_rate_records(
    reference_date: datetime,
    db_path: Path,
) -> dict[str, FxRateRecord]:
    """
    Return cached FX rate records keyed by currency for the given date.

    Includes fallback logic for up to 5 days if valid rates are not found
    for the exact date.
    """
    date_str = reference_date.strftime("%Y-%m-%d")
    records = await _execute_db(load_fx_rates_for_date, db_path, date_str)
    result = {record.currency: record for record in records}

    if not result:
        # Fallback loop: Check up to 5 days into the past
        for i in range(1, 6):
            fallback_date = reference_date - timedelta(days=i)
            fallback_str = fallback_date.strftime("%Y-%m-%d")
            fallback_records_list = await _execute_db(
                load_fx_rates_for_date, db_path, fallback_str
            )

            if fallback_records_list:
                _LOGGER.debug(
                    "Verwende Fallback-Rates (Async) vom %s (statt %s)",
                    fallback_str,
                    date_str,
                )
                result = {record.currency: record for record in fallback_records_list}
                break

    return result


def load_cached_rate_records_sync(
    reference_date: datetime,
    db_path: Path,
    conn: sqlite3.Connection | None = None,
) -> dict[str, FxRateRecord]:
    """Return cached rate records for the given date."""
    date_str = reference_date.strftime("%Y-%m-%d")
    records = load_fx_rates_for_date(db_path, date_str, conn=conn)
    return {record.currency: record for record in records}


def load_fx_rates_cache_range(
    db_path: Path,
    start_date: str,
    end_date: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> dict[str, dict[str, float]]:
    """Load FX rates for a date range into a fast lookup cache."""
    records_by_date = load_fx_rates_in_range(db_path, start_date, end_date, conn=conn)
    cache = {}
    for date_iso, records in records_by_date.items():
        rates = {}
        for record in records:
            try:
                rates[record.currency.strip().upper()] = float(record.rate)
            except (TypeError, ValueError):
                continue
        cache[date_iso] = rates
    return cache


# --- Caching for failed fetches ---
_FETCH_FAIL_CACHE: dict[tuple[str, frozenset[str]], float] = {}
_FETCH_FAIL_TTL = 3600.0  # 1 hour
_FETCH_FAIL_LOCK = threading.Lock()


def _is_failed_recently(date_str: str, currencies: set[str]) -> bool:
    """Check if we recently failed to fetch this exact combination."""
    key = (date_str, frozenset(currencies))
    now = datetime.now(UTC).timestamp()
    with _FETCH_FAIL_LOCK:
        expiry = _FETCH_FAIL_CACHE.get(key)
        if expiry and now < expiry:
            return True
        # Clean up if expired
        if expiry:
            del _FETCH_FAIL_CACHE[key]
    return False


def _mark_failed(date_str: str, currencies: set[str]) -> None:
    """Mark this combination as failed for the TTL duration."""
    key = (date_str, frozenset(currencies))
    now = datetime.now(UTC).timestamp()
    with _FETCH_FAIL_LOCK:
        _FETCH_FAIL_CACHE[key] = now + _FETCH_FAIL_TTL


async def _process_fetch_missing(
    date_str: str,
    missing: set[str],
    fetched_at: str,
) -> list[FxRateRecord]:
    """Fetch rates for a single date and return records."""
    try:
        fetched_rates = await _fetch_exchange_rates_with_retry(
            date_str,
            missing,
            retries=FETCH_RETRIES,
            initial_delay=FETCH_BACKOFF_SECONDS,
        )

        if not fetched_rates:
            # Mark as failed in negative cache
            _mark_failed(date_str, missing)
            if _should_log_warning(date_str, missing):
                _LOGGER.debug(
                    "Keine Kurse erhalten für %s am %s "
                    "(nutze Fallback falls verfügbar)",
                    missing,
                    date_str,
                )
            return []

        provenance = json.dumps(
            {"currencies": sorted(fetched_rates.keys())},
            ensure_ascii=False,
        )

        return [
            FxRateRecord(
                date=date_str,
                currency=currency,
                rate=rate,
                fetched_at=fetched_at,
                data_source=FRANKFURTER_SOURCE,
                provider=FRANKFURTER_PROVIDER,
                provenance=provenance,
            )
            for currency, rate in fetched_rates.items()
        ]

    except Exception:
        _LOGGER.exception("Fehler beim Laden der Kurse für %s", date_str)
        return []


async def ensure_exchange_rates_for_dates(
    dates: list[datetime],
    currencies: set[str],
    db_path: Path,
    conn: sqlite3.Connection | None = None,
    *,
    allow_fetch: bool = False,
) -> None:
    """Stellt sicher dass alle benötigten Wechselkurse verfügbar sind."""
    if not currencies or not allow_fetch:
        return

    # 1. Identify missing
    missing_by_date: dict[str, set[str]] = {}
    for dt in dates:
        date_str = dt.strftime("%Y-%m-%d")
        existing = await _load_rates_for_date(db_path, date_str, conn=conn)
        needed = currencies - set(existing.keys())
        if needed:
            # Check negative cache before adding to work queue
            if _is_failed_recently(date_str, needed):
                _LOGGER.debug(
                    "Skipping fetch for %s on %s (negative cache hit)", needed, date_str
                )
                continue
            missing_by_date[date_str] = needed

    if not missing_by_date:
        return

    # 2. Fetch all missing
    # Note: Fetch sequentially to avoid API rate limits, but could parallelize
    fetched_records: list[FxRateRecord] = []

    fetched_at = (
        datetime.now(tz=UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    )

    for date_str, missing in missing_by_date.items():
        records = await _process_fetch_missing(date_str, missing, fetched_at)
        fetched_records.extend(records)

    # 3. Bulk save
    if fetched_records:
        if conn:
            # If we have a connection (e.g. from worker), use it synchronously
            # to avoid thread-sharing violations with sqlite connections.
            upsert_fx_rates_chunked(db_path, fetched_records, conn=conn)
        else:
            await _execute_db(
                upsert_fx_rates_chunked, db_path, fetched_records, conn=None
            )


def ensure_exchange_rates_for_dates_sync(
    dates: list[datetime],
    currencies: set[str],
    db_path: Path,
    conn: sqlite3.Connection | None = None,
    *,
    allow_fetch: bool = False,
) -> None:
    """Ensure required exchange rates exist using a synchronous wrapper."""
    if not currencies or not dates or not allow_fetch:
        return

    date_list = list(dates)
    currency_set = set(currencies)

    missing_currencies = set(currency_set)
    if conn is not None:
        for dt in date_list:
            date_str = dt.strftime("%Y-%m-%d")
            existing = _load_rates_for_date_sync(db_path, date_str, conn=conn)
            missing_currencies -= set(existing.keys())
        if not missing_currencies:
            return

    try:
        running_loop = asyncio.get_running_loop()
    except RuntimeError:
        running_loop = None

    coroutine = ensure_exchange_rates_for_dates(
        date_list,
        missing_currencies,
        db_path,
        conn=None if running_loop else conn,
        allow_fetch=allow_fetch,
    )

    if running_loop is None:
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coroutine)
        finally:
            asyncio.set_event_loop(None)
            with suppress(Exception):
                loop.close()
        return

    result: list[Exception] = []

    def _run_in_thread() -> None:
        try:
            asyncio.run(coroutine)
        except Exception as err:  # noqa: BLE001 - defensive wrapper
            result.append(err)

    thread = threading.Thread(target=_run_in_thread)
    thread.start()
    thread.join()
    if result:
        raise result[0]


# --- Backdating helpers ---

_COMPACT_DATE_LEN = 8
_ISO_DATE_LEN = 10
MAX_EPOCH_DAY_CUTOFF = 100000


@functools.lru_cache(maxsize=1024)
def _parse_date_value(value: Any) -> date | None:  # noqa: PLR0911, PLR0912
    """Best-effort parsing for transaction date values stored as TEXT or int."""
    if value in (None, ""):
        return None

    # Optimization: Early return if already a date object
    if isinstance(value, date):
        if isinstance(value, datetime):
            return value.date()
        return value

    text_value = str(value).strip()
    if not text_value:
        return None

    # Optimization: Fast path for ISO dates (YYYY-MM-DD) which are most common
    if (
        len(text_value) == _ISO_DATE_LEN
        and text_value[4] == "-"
        and text_value[7] == "-"
    ):
        try:
            return date.fromisoformat(text_value)
        except ValueError:
            pass

    if text_value.isdigit():
        if len(text_value) == _COMPACT_DATE_LEN:
            try:
                return date(
                    int(text_value[0:4]),
                    int(text_value[4:6]),
                    int(text_value[6:8]),
                )
            except ValueError:
                return None
        # Handle epoch days (e.g. 19733 for 2024-01-12)
        # 10000 days is around 1997. 100000 is 2243.
        try:
            numeric_val = int(text_value)
        except ValueError:
            return None

        if 0 <= numeric_val <= MAX_EPOCH_DAY_CUTOFF:
            return date(1970, 1, 1) + timedelta(days=numeric_val)

        # Handle Unix timestamps (e.g. 1700000000 for 2023-11-14).
        # Any value larger than MAX_EPOCH_DAY_CUTOFF is assumed to be a
        # timestamp in seconds.
        try:
            return datetime.fromtimestamp(numeric_val, tz=UTC).date()
        except (ValueError, OSError, OverflowError):
            pass

    sanitized = text_value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(sanitized).date()
    except ValueError:
        try:
            return date.fromisoformat(text_value[:10])
        except ValueError:
            return None


def discover_currency_date_bounds(db_path: Path) -> dict[str, tuple[date, date]]:
    """
    Return earliest and latest transaction dates per non-EUR currency.

    Dates stored as ISO strings or YYYYMMDD integers are normalized to date
    objects; invalid rows are skipped.
    """
    bounds: dict[str, tuple[date, date]] = {}
    with sqlite3.connect(str(db_path), timeout=SQLITE_TIMEOUT) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                t.date,
                TRIM(UPPER(t.currency_code)) AS tx_currency,
                TRIM(UPPER(s.currency_code)) AS sec_currency
            FROM transactions t
            LEFT JOIN securities s ON t.security = s.uuid
            WHERE (t.currency_code IS NOT NULL AND TRIM(t.currency_code) != '')
               OR (s.currency_code IS NOT NULL AND TRIM(s.currency_code) != '')
            """
        ).fetchall()

    for row in rows:
        parsed = _parse_date_value(row["date"])
        if parsed is None:
            continue

        # Collect both potential currencies
        candidates = {row["tx_currency"], row["sec_currency"]}

        for currency in candidates:
            if not currency or currency == "EUR":
                continue

            if currency not in bounds:
                bounds[currency] = (parsed, parsed)
            else:
                current_start, current_end = bounds[currency]
                bounds[currency] = (
                    min(current_start, parsed),
                    max(current_end, parsed),
                )

    return bounds


def _iter_dates(start: date, end: date) -> list[date]:
    total_days = (end - start).days + 1
    if total_days <= 0:
        return []
    return [start + timedelta(days=offset) for offset in range(total_days)]


def build_fx_schedule_from_bounds(
    bounds: Mapping[str, tuple[date, date]],
    *,
    until: date | None = None,
) -> dict[date, set[str]]:
    """
    Build a date->currencies schedule from per-currency bounds.

    Each currency is considered active from its start_date through the provided
    `until` date (or its own end_date if `until` is earlier).
    """
    if not bounds:
        return {}

    effective_until = until or datetime.now(UTC).date()
    schedule: dict[date, set[str]] = {}

    for currency, (start_date, _) in bounds.items():
        if start_date > effective_until:
            continue
        # Always extend to the target date (now) to ensure open positions are covered.
        # Relying on transaction bounds (end_date) is dangerous for buy-and-hold
        # portfolios.
        horizon = effective_until
        for day in _iter_dates(start_date, horizon):
            schedule.setdefault(day, set()).add(currency)

    return schedule


def _compute_fx_coverage_ratio(
    required_currencies: set[str],
    rates: Mapping[str, Any],
) -> float:
    if not required_currencies:
        return 1.0

    covered = 0
    for currency in required_currencies:
        if currency == "EUR":
            covered += 1
            continue
        if currency in rates and _safe_float(rates[currency]):
            covered += 1
    return round(covered / len(required_currencies), 3)


async def _fetch_exchange_rates_range_aiohttp(
    session: aiohttp.ClientSession,
    currency: str,
    start_date: str,
    end_date: str,
) -> dict[str, float]:
    """
    Fetch rates for a single currency over a date range.

    Returns a dict mapping date_str -> rate.
    """
    # ECB API supports ranges but structure is different
    url = f"{API_URL}/D.{currency}.EUR.SP00.A"
    params = {"startPeriod": start_date, "endPeriod": end_date, "detail": "dataonly"}
    headers = {"Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd"}

    try:
        async with session.get(url, params=params, headers=headers, timeout=20) as resp:
            if resp.status != 200:  # noqa: PLR2004
                # 404 might mean no data for this range/currency
                if resp.status != 404:  # noqa: PLR2004
                    _LOGGER.warning(
                        "Fehler beim Abruf der Wechselkurse (%s..%s, %s): Status %d",
                        start_date,
                        end_date,
                        currency,
                        resp.status,
                    )
                return {}

            data = await resp.json()
            parsed = _parse_ecb_sdmx_response(data)

            result = {}
            for d_str, rates in parsed.items():
                if currency in rates:
                    result[d_str] = rates[currency]
            return result

    except Exception as err:  # noqa: BLE001
        _LOGGER.warning(
            "Netzwerkproblem beim Abruf der Wechselkurse (%s..%s, %s): %s",
            start_date,
            end_date,
            currency,
            err,
        )
        return {}


async def async_ensure_exchange_rates_for_schedule(  # noqa: PLR0912
    hass: Any,
    db_path: Path,
    schedule: Mapping[date, set[str]],
    *,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
    conn: sqlite3.Connection | None = None,
) -> dict[str, float]:
    """
    Ensure FX rates exist for each date in the schedule and compute coverage.

    Uses range queries to minimize API requests.
    """
    if not schedule:
        return {}

    # 1. Identify missing dates per currency
    # We first load what we have for all scheduled dates to see what's missing.
    # This might be slightly expensive if schedule is huge, but necessary.
    # Optimization: We could just query distinct dates from DB?
    # For now, let's trust the existing pattern but optimize the fetching.

    needed_by_currency: dict[str, set[date]] = defaultdict(set)
    all_needed_dates = sorted(schedule.keys())

    # We can load existing rates for ALL dates in one go?
    # Current helper loads one date. Let's stick to the loop for checking
    # existence but maybe we can optimize this later. For backdating, we assume
    # many gaps.

    # Actually, iterate days, check DB, build missing map
    # To reduce DB read churn, we should probably check existence more
    # efficiently if possible.
    # But sticking to safety:

    today = datetime.now(tz=UTC).date()

    for day in all_needed_dates:
        if day > today:
            continue  # Can't fetch future

        currencies = {code for code in schedule[day] if code and code != "EUR"}
        if not currencies:
            continue

        # This loop over days to check DB is the slow part if we do it one by one?
        # But `_load_rates_for_date` is fast (sqlite).
        # Ideally we'd batch-check existence, but let's see.

        date_str = day.isoformat()
        # We can accept that we might re-check DB.
        # But wait, `_load_rates_for_date` runs a query. 1000 queries is 1000 queries.
        # However, compared to network requests, sqlite is instant.

        existing = await _load_rates_for_date(db_path, date_str, conn=conn)

        for curr in currencies:
            if curr not in existing:
                needed_by_currency[curr].add(day)

    # 2. Fetch ranges per currency
    # Get or create session
    own_session = False
    if hass:
        session = async_get_clientsession(hass)
    else:
        session = aiohttp.ClientSession()
        own_session = True

    fetched_data: dict[str, dict[str, float]] = defaultdict(
        dict
    )  # date_str -> {currency: rate}

    try:
        for currency, dates in needed_by_currency.items():
            if not dates:
                continue

            min_date = min(dates)
            max_date = max(dates)

            # Fetch range
            start_str = min_date.isoformat()
            end_str = max_date.isoformat()

            rates_map = await _fetch_exchange_rates_range_aiohttp(
                session, currency, start_str, end_str
            )

            for d_str, rate in rates_map.items():
                fetched_data[d_str][currency] = rate

        # 3. Save all fetched data
        # Group by date to call _save_rates
        for date_str, rates in fetched_data.items():
            if rates:
                await _save_rates(db_path, date_str, rates, conn=conn)

    finally:
        if own_session:
            await session.close()

    # 4. Compute final coverage
    # (Re-using the loop from before or just computing it now)
    coverage: dict[str, float] = {}

    for day in all_needed_dates:
        date_str = day.isoformat()
        currencies = {code for code in schedule[day] if code and code != "EUR"}

        if not currencies:
            coverage[date_str] = 1.0
            continue

        # Re-load from DB to be 100% sure what we have
        # (Cached read or trust DB)
        existing = await _load_rates_for_date(db_path, date_str, conn=conn)

        coverage_ratio = _compute_fx_coverage_ratio(currencies, existing)
        coverage[date_str] = coverage_ratio

        if emit_progress is not None:
            emit_progress(
                "fx_schedule_day",
                {
                    "date": date_str,
                    "currencies": sorted(currencies),
                    "coverage_ratio": coverage_ratio,
                },
            )

    return coverage


async def async_prepare_exchange_rates_for_backdating(
    hass: Any,
    db_path: Path,
    *,
    until: date | None = None,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
) -> dict[str, float]:
    """
    Ensure FX coverage from first transaction per currency through `until`.

    Returns ISO-date -> coverage ratio mapping for the planned window.
    """
    bounds = discover_currency_date_bounds(db_path)
    if not bounds:
        return {}

    schedule = build_fx_schedule_from_bounds(bounds, until=until)

    return await async_ensure_exchange_rates_for_schedule(
        hass,
        db_path,
        schedule,
        emit_progress=emit_progress,
    )


async def fetch_fx_range(
    currency: str,
    start_date: date | datetime | str,
    end_date: date | datetime | str,
    *,
    provider: str = "ecb",
) -> list[FxRateRecord]:
    """
    Fetch historical FX rates for a currency between two dates (inclusive).

    Returns a list of FxRateRecord entries; missing weekend/holiday dates are
    logged and skipped instead of raising errors.
    """
    # Normalize inputs
    if not currency:
        message = "currency must be provided"
        raise ValueError(message)
    normalized_currency = currency.strip().upper()

    start_str = _normalize_date_input(start_date)
    end_str = _normalize_date_input(end_date)
    start_dt = datetime.fromisoformat(start_str).date()
    end_dt = datetime.fromisoformat(end_str).date()

    if start_dt > end_dt:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    fetched_at = (
        datetime.now(tz=UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    provenance = json.dumps(
        {
            "provider": provider,
            "range_start": start_str,
            "range_end": end_str,
        },
        sort_keys=True,
    )

    records: list[FxRateRecord] = []

    # Re-use _fetch_exchange_rates_range_aiohttp logic but with fresh session
    async with aiohttp.ClientSession() as session:
        # Note: _fetch_exchange_rates_range_aiohttp returns dict[date_str, rate]
        rates_map = await _fetch_exchange_rates_range_aiohttp(
            session, normalized_currency, start_str, end_str
        )

    # Convert to FxRateRecord list
    observed_dates = set()
    for day, rate_value in sorted(rates_map.items()):
        observed_dates.add(day)
        records.append(
            FxRateRecord(
                date=day,
                currency=normalized_currency,
                rate=rate_value,
                fetched_at=fetched_at,
                data_source=provider,
                provider=FRANKFURTER_PROVIDER,
                provenance=provenance,
            )
        )

    # Check for gaps
    expected_dates = set(_iter_expected_dates(start_dt, end_dt))
    missing_dates = sorted(expected_dates - observed_dates)
    if missing_dates:
        preview = ", ".join(missing_dates[:5])
        _LOGGER.warning(
            (
                "FX range for %s missing %d day(s) (likely weekend/holiday); "
                "first gaps: %s"
            ),
            normalized_currency,
            len(missing_dates),
            preview,
        )

    return records
