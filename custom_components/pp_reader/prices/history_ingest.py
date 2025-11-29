"""
Async helpers for Yahoo-based historical price ingestion.

This module focuses on fetching daily candles without touching persistence.
It provides:
    - HistoryJob dataclass describing a symbol/date range request
    - HistoryCandle dataclass for normalized OHLC rows
    - YahooHistoryFetcher that wraps the blocking yahooquery client
    - Utility helpers for chunking jobs and running them with bounded concurrency
"""

from __future__ import annotations

import asyncio
import logging
import math
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime
from importlib import import_module
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterable, Sequence

DEFAULT_HISTORY_INTERVAL = "1d"
DEFAULT_JOB_BATCH_SIZE = 5
# Slightly higher concurrency keeps startup history drains from stretching
# over many executor waves without overwhelming Yahoo.
DEFAULT_MAX_CONCURRENCY = 8
YAHOO_SOURCE = "yahoo"

_LOGGER = logging.getLogger(__name__)
_YAHOOQUERY_IMPORT_ERROR = False
_YAHOO_DNS_ERROR_TOKENS = (
    "Could not resolve host: guce.yahoo.com",
    "Could not resolve host: consent.yahoo.com",
    "Could not resolve host: query2.finance.yahoo.com",
    "Could not resolve host: finance.yahoo.com",
)
_YAHOOQUERY_DNS_WARNED: set[str] = set()
_DNS_RETRY_DELAY = 0.4


def _normalize_datetime(value: datetime | date | str) -> datetime:
    """Normalize incoming datetime/date/ISO strings to UTC datetimes."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=UTC)

    if isinstance(value, str):
        text = value.strip()
        if not text:
            message = "datetime string darf nicht leer sein"
            raise ValueError(message)
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError as exc:
            message = f"Ungültiges Datum: {value}"
            raise ValueError(message) from exc
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        else:
            parsed = parsed.astimezone(UTC)
        return parsed

    message = f"Unsupported datetime type: {type(value)!r}"
    raise TypeError(message)


@dataclass(frozen=True, slots=True)
class HistoryJob:
    """Describe a historical price request for a single symbol."""

    symbol: str
    start: datetime
    end: datetime
    interval: str = DEFAULT_HISTORY_INTERVAL

    def __post_init__(self) -> None:
        """Normalize symbol casing and ensure date range is valid."""
        if not self.symbol or not self.symbol.strip():
            message = "symbol darf nicht leer sein"
            raise ValueError(message)

        normalized_symbol = self.symbol.strip().upper()
        object.__setattr__(self, "symbol", normalized_symbol)

        start_dt = _normalize_datetime(self.start)
        end_dt = _normalize_datetime(self.end)
        if end_dt < start_dt:
            message = "end darf nicht vor start liegen"
            raise ValueError(message)

        object.__setattr__(self, "start", start_dt)
        object.__setattr__(self, "end", end_dt)

        interval = (self.interval or DEFAULT_HISTORY_INTERVAL).strip()
        object.__setattr__(self, "interval", interval or DEFAULT_HISTORY_INTERVAL)


@dataclass(frozen=True, slots=True)
class HistoryCandle:
    """Normalized candle returned from Yahoo history fetch."""

    symbol: str
    timestamp: datetime
    close: float
    high: float | None = None
    low: float | None = None
    open: float | None = None
    volume: float | None = None
    data_source: str = YAHOO_SOURCE


def chunk_history_jobs(
    jobs: Sequence[HistoryJob],
    *,
    batch_size: int = DEFAULT_JOB_BATCH_SIZE,
) -> list[list[HistoryJob]]:
    """Group jobs into manageable chunks."""
    if batch_size <= 0:
        message = "batch_size muss größer 0 sein"
        raise ValueError(message)
    return [
        list(jobs[index : index + batch_size])
        for index in range(0, len(jobs), batch_size)
    ]


class YahooHistoryFetcher:
    """Async wrapper around yahooquery history retrieval."""

    source = YAHOO_SOURCE

    async def fetch(self, job: HistoryJob) -> list[HistoryCandle]:
        """Fetch history for a single job."""
        loop = asyncio.get_running_loop()
        history = await loop.run_in_executor(None, self._fetch_blocking, job)
        candles = _normalize_history(job.symbol, history)
        if _LOGGER.isEnabledFor(logging.DEBUG):
            _LOGGER.debug(
                "YahooQuery History: %s rows for %s (%s-%s)",
                len(candles),
                job.symbol,
                job.start.strftime("%Y-%m-%d"),
                job.end.strftime("%Y-%m-%d"),
            )
        return candles

    def _fetch_blocking(self, job: HistoryJob) -> object:
        """Blocking portion executed in executor."""
        global _YAHOOQUERY_IMPORT_ERROR  # noqa: PLW0603

        try:
            yahoo_module = import_module("yahooquery")
        except ImportError as exc:
            if not _YAHOOQUERY_IMPORT_ERROR:
                _LOGGER.debug("YahooQuery Import fehlgeschlagen: %s", exc)
                _YAHOOQUERY_IMPORT_ERROR = True
            return []

        ticker_factory = getattr(yahoo_module, "Ticker", None)
        if ticker_factory is None:
            if not _YAHOOQUERY_IMPORT_ERROR:
                _LOGGER.debug("YahooQuery Ticker Factory fehlt - History disabled")
                _YAHOOQUERY_IMPORT_ERROR = True
            return []

        start_str = job.start.strftime("%Y-%m-%d")
        end_str = job.end.strftime("%Y-%m-%d")
        ticker = None

        def _call_history() -> object:
            nonlocal ticker
            ticker = ticker or ticker_factory(job.symbol, asynchronous=False)
            return ticker.history(
                interval=job.interval,
                start=start_str,
                end=end_str,
            )

        try:
            history = _call_history()
        except Exception as exc:  # noqa: BLE001
            if _handle_yahoo_dns_error(exc):
                time.sleep(_DNS_RETRY_DELAY)
                try:
                    history = _call_history()
                except Exception as retry_exc:  # noqa: BLE001
                    if not _handle_yahoo_dns_error(retry_exc):
                        _LOGGER.warning(
                            "YahooQuery History Fetch Fehler für %s (%s-%s): %s",
                            job.symbol,
                            start_str,
                            end_str,
                            retry_exc,
                        )
                    return []
            else:
                _LOGGER.warning(
                    "YahooQuery History Fetch Fehler für %s (%s-%s): %s",
                    job.symbol,
                    start_str,
                    end_str,
                    exc,
                )
                return []

        return history


def _handle_yahoo_dns_error(exc: Exception) -> bool:
    """Detect DNS failures hitting Yahoo consent hosts and log once."""
    message = str(exc)

    for token in _YAHOO_DNS_ERROR_TOKENS:
        if token in message:
            if token not in _YAHOOQUERY_DNS_WARNED:
                _LOGGER.warning(
                    "YahooQuery History DNS-Fehler erkannt (%s). "
                    "Bitte Netzwerk/DNS prüfen; Fetch wird erneut versucht.",
                    token,
                )
                _YAHOOQUERY_DNS_WARNED.add(token)
            return True

    return False


def _normalize_history(symbol: str, history: object) -> list[HistoryCandle]:
    """Convert yahooquery return types into HistoryCandle instances."""
    if history is None:
        return []

    dataframe_records = _normalize_history_dataframe(symbol, history)
    if dataframe_records is not None:
        return dataframe_records

    if isinstance(history, dict):
        return _normalize_history_dict(symbol, history)

    _LOGGER.debug("Unbekanntes History Resultat: %s", type(history).__name__)
    return []


def _normalize_history_dataframe(
    symbol: str,
    history: object,
) -> list[HistoryCandle] | None:
    """Handle pandas-like objects returned by yahooquery."""
    if not hasattr(history, "empty"):
        return None

    try:
        if history.empty:  # type: ignore[attr-defined]
            return []
        frame = history.reset_index()  # type: ignore[call-arg]
    except Exception:  # noqa: BLE001
        _LOGGER.debug(
            "YahooQuery DataFrame Normalisierung fehlgeschlagen",
            exc_info=True,
        )
        return None

    records: list[HistoryCandle] = []
    for row in frame.itertuples():  # type: ignore[call-arg]
        row_symbol = getattr(row, "symbol", symbol) or symbol
        timestamp = _coerce_timestamp(getattr(row, "date", None))
        close = getattr(row, "close", None)
        if close in (None, 0):
            continue
        records.append(
            HistoryCandle(
                symbol=str(row_symbol).upper(),
                timestamp=timestamp,
                close=float(close),
                high=_coerce_float(getattr(row, "high", None)),
                low=_coerce_float(getattr(row, "low", None)),
                open=_coerce_float(getattr(row, "open", None)),
                volume=_coerce_float(getattr(row, "volume", None)),
            )
        )
    return records


def _normalize_history_dict(symbol: str, history: dict) -> list[HistoryCandle]:
    """Handle dict-like payloads returned by yahooquery history."""
    records: list[HistoryCandle] = []
    quotes = history.get(symbol) if symbol in history else history

    if isinstance(quotes, dict) and "close" in quotes:
        timestamp = _coerce_timestamp(quotes.get("date"))
        close = quotes.get("close")
        if close not in (None, 0):
            records.append(
                HistoryCandle(
                    symbol=symbol,
                    timestamp=timestamp,
                    close=float(close),
                    high=_coerce_float(quotes.get("high")),
                    low=_coerce_float(quotes.get("low")),
                    open=_coerce_float(quotes.get("open")),
                    volume=_coerce_float(quotes.get("volume")),
                )
            )
        return records

    if isinstance(quotes, dict):
        for key, payload in quotes.items():
            if not isinstance(payload, dict):
                continue
            row_symbol = symbol
            if isinstance(key, tuple) and key:
                row_symbol = str(key[0]).upper()
                timestamp_value = key[-1]
            else:
                timestamp_value = payload.get("date")
            timestamp = _coerce_timestamp(timestamp_value)
            close = payload.get("close")
            if close in (None, 0):
                continue
            records.append(
                HistoryCandle(
                    symbol=row_symbol,
                    timestamp=timestamp,
                    close=float(close),
                    high=_coerce_float(payload.get("high")),
                    low=_coerce_float(payload.get("low")),
                    open=_coerce_float(payload.get("open")),
                    volume=_coerce_float(payload.get("volume")),
                )
            )

    return records


def _coerce_timestamp(value: object) -> datetime:
    """Convert yahooquery timestamp payloads to timezone-aware datetimes."""
    result: datetime | None = None

    if isinstance(value, datetime):
        result = _normalize_datetime(value)
    elif isinstance(value, date):
        result = _normalize_datetime(value)
    elif value is None:
        result = None
    elif hasattr(value, "to_pydatetime"):
        try:
            python_dt = value.to_pydatetime()  # type: ignore[call-arg]
        except Exception:  # noqa: BLE001
            result = None
        else:
            result = _normalize_datetime(python_dt)
    elif isinstance(value, (int, float)):
        try:
            result = datetime.fromtimestamp(float(value), tz=UTC)
        except (OverflowError, ValueError):
            result = None
    elif isinstance(value, str):
        try:
            result = _normalize_datetime(value)
        except (TypeError, ValueError):
            result = None

    if result is None:
        result = datetime.now(UTC)
    return result


def _coerce_float(value: object) -> float | None:
    """Safely cast values to float."""
    if value in (None, ""):
        return None
    try:
        cast = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(cast):
        return None
    return cast


async def fetch_history_for_jobs(
    jobs: Iterable[HistoryJob],
    *,
    fetcher: YahooHistoryFetcher | None = None,
    max_concurrency: int = DEFAULT_MAX_CONCURRENCY,
) -> dict[HistoryJob, list[HistoryCandle]]:
    """
    Execute history fetches for the provided jobs with bounded concurrency.

    Returns a mapping from job to fetched candles; jobs with errors return [].
    """
    job_list = list(jobs)
    if not job_list:
        return {}

    if max_concurrency <= 0:
        message = "max_concurrency muss größer 0 sein"
        raise ValueError(message)

    fetcher = fetcher or YahooHistoryFetcher()
    semaphore = asyncio.Semaphore(max_concurrency)
    results: dict[HistoryJob, list[HistoryCandle]] = {}

    async def _run(job: HistoryJob) -> None:
        async with semaphore:
            try:
                candles = await fetcher.fetch(job)
            except Exception:  # noqa: BLE001
                _LOGGER.warning(
                    "History Fetch: Fehler für %s (%s-%s)",
                    job.symbol,
                    job.start.date(),
                    job.end.date(),
                    exc_info=True,
                )
                candles = []
            results[job] = candles

    await asyncio.gather(*(_run(job) for job in job_list))
    return results
