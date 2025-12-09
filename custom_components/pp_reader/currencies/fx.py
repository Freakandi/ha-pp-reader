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
from collections.abc import Callable, Mapping
from contextlib import suppress
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import aiohttp
from homeassistant.util import ssl as hass_ssl

from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    load_fx_rates_for_date,
    upsert_fx_rate,
)

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
_COMPACT_DATE_LEN = 8


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


def _safe_float(value: Any) -> float | None:
    """Best-effort float conversion for coverage calculations."""
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric


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


async def _save_rates(  # noqa: PLR0913 - retries and db control are intentional
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
    dates: list[datetime],
    currencies: set[str],
    db_path: Path,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Stellt sicher dass alle benötigten Wechselkurse verfügbar sind."""
    if not currencies:
        return

    for dt in dates:
        date_str = dt.strftime("%Y-%m-%d")
        existing = await _load_rates_for_date(db_path, date_str, conn=conn)
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
                    await _save_rates(db_path, date_str, fetched, conn=conn)
                elif _should_log_warning(date_str, missing):
                    _LOGGER.warning(
                        "Keine Kurse erhalten für %s am %s", missing, date_str
                    )
            except Exception:
                _LOGGER.exception("Fehler beim Laden der Kurse")


def ensure_exchange_rates_for_dates_sync(
    dates: list[datetime],
    currencies: set[str],
    db_path: Path,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Ensure required exchange rates exist using a synchronous wrapper."""
    if not currencies or not dates:
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
MAX_EPOCH_DAY_CUTOFF = 100000


def _parse_date_value(value: Any) -> date | None:  # noqa: PLR0911
    """Best-effort parsing for transaction date values stored as TEXT or int."""
    if value in (None, ""):
        return None
    text_value = str(value).strip()
    if not text_value:
        return None

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
        # 10000 days is around 1997. 50000 is 2106.
        if 0 <= int(text_value) <= MAX_EPOCH_DAY_CUTOFF:
            return date(1970, 1, 1) + timedelta(days=int(text_value))

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
                TRIM(UPPER(currency_code)) AS currency_code,
                date
            FROM transactions
            WHERE currency_code IS NOT NULL
              AND TRIM(currency_code) != ''
            """
        ).fetchall()

    for row in rows:
        currency = (row["currency_code"] or "").strip().upper()
        if not currency or currency == "EUR":
            continue

        parsed = _parse_date_value(row["date"])
        if parsed is None:
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

    for currency, (start_date, end_date) in bounds.items():
        if start_date > effective_until:
            continue
        horizon = min(end_date, effective_until)
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


async def async_ensure_exchange_rates_for_schedule(
    hass: Any,  # noqa: ARG001
    db_path: Path,
    schedule: Mapping[date, set[str]],
    *,
    emit_progress: Callable[[str, Mapping[str, Any]], None] | None = None,
    conn: sqlite3.Connection | None = None,
) -> dict[str, float]:
    """
    Ensure FX rates exist for each date in the schedule and compute coverage.

    The schedule maps a date to the set of non-EUR currencies active on that
    day. Missing rates are fetched once per date across all currencies. The
    returned mapping is ISO-date -> coverage ratio [0.0-1.0].
    """
    if not schedule:
        return {}

    coverage: dict[str, float] = {}

    for day in sorted(schedule):
        currencies = {code for code in schedule[day] if code and code != "EUR"}
        date_str = day.isoformat()

        if not currencies:
            coverage[date_str] = 1.0
            continue

        existing = await _load_rates_for_date(db_path, date_str, conn=conn)
        missing = currencies - set(existing.keys())

        if missing:
            try:
                fetched = await _fetch_exchange_rates_with_retry(date_str, missing)
                if fetched:
                    await _save_rates(db_path, date_str, fetched, conn=conn)
                elif _should_log_warning(date_str, missing):
                    _LOGGER.warning(
                        "Keine FX-Kurse erhalten für %s (Währungen: %s)",
                        date_str,
                        ", ".join(sorted(missing)),
                    )
            except Exception:
                _LOGGER.exception(
                    "FX-Fetch für %s fehlgeschlagen (currencies=%s)",
                    date_str,
                    ", ".join(sorted(missing)),
                )

        refreshed = existing.copy()
        if missing:
            refreshed.update(await _load_rates_for_date(db_path, date_str, conn=conn))

        coverage_ratio = _compute_fx_coverage_ratio(currencies, refreshed)
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
