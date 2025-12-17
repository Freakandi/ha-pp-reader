"""
Isolated database operations for FX rates.

Avoids circular dependencies between `db_access.py` and `util/currency.py`.
"""

import logging
import sqlite3
import time
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)


@dataclass
class FxRateRecord:
    """Persisted FX rate metadata."""

    date: str
    currency: str
    rate: float
    fetched_at: str | None = None
    data_source: str | None = None
    provider: str | None = None
    provenance: str | None = None


def load_fx_rates_for_date(
    db_path: Path,
    date: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> list[FxRateRecord]:
    """Load all FX rates stored for a specific date."""
    if not date:
        message = "date darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            cursor = local_conn.execute(
                """
                SELECT
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                FROM fx_rates
                WHERE date = ?
                """,
                (date,),
            )
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Laden der Wechselkurse (date=%s)",
                date,
            )
            raise

        rows = cursor.fetchall()
        return [
            FxRateRecord(
                date=row[0],
                currency=row[1],
                rate=row[2],
                fetched_at=row[3],
                data_source=row[4],
                provider=row[5],
                provenance=row[6],
            )
            for row in rows
        ]
    finally:
        if conn is None:
            local_conn.close()


def load_fx_rates_in_range(
    db_path: Path,
    start_date: str,
    end_date: str,
    *,
    conn: sqlite3.Connection | None = None,
) -> dict[str, list[FxRateRecord]]:
    """Load all FX rates stored for a date range."""
    if not start_date or not end_date:
        message = "start_date und end_date dürfen nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            cursor = local_conn.execute(
                """
                SELECT
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                FROM fx_rates
                WHERE date >= ? AND date <= ?
                """,
                (start_date, end_date),
            )
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Laden der Wechselkurse (range=%s..%s)",
                start_date,
                end_date,
            )
            raise

        rows = cursor.fetchall()
        result: dict[str, list[FxRateRecord]] = {}
        for row in rows:
            date_iso = row[0]
            record = FxRateRecord(
                date=date_iso,
                currency=row[1],
                rate=row[2],
                fetched_at=row[3],
                data_source=row[4],
                provider=row[5],
                provenance=row[6],
            )
            if date_iso not in result:
                result[date_iso] = []
            result[date_iso].append(record)
        return result
    finally:
        if conn is None:
            local_conn.close()


def upsert_fx_rate(
    db_path: Path,
    rate: FxRateRecord,
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update an FX rate entry."""
    if not rate.date:
        message = "date darf nicht leer sein"
        raise ValueError(message)
    if not rate.currency:
        message = "currency darf nicht leer sein"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            local_conn.execute(
                """
                INSERT OR REPLACE INTO fx_rates (
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rate.date,
                    rate.currency,
                    rate.rate,
                    rate.fetched_at,
                    rate.data_source,
                    rate.provider,
                    rate.provenance,
                ),
            )
            if conn is None:
                local_conn.commit()
        except sqlite3.Error:
            _LOGGER.exception(
                "Fehler beim Speichern des Wechselkurses (date=%s, currency=%s)",
                rate.date,
                rate.currency,
            )
            raise
    finally:
        if conn is None:
            local_conn.close()


def upsert_fx_rates_bulk(
    db_path: Path,
    rates: Sequence[FxRateRecord],
    *,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert or update multiple FX rate entries in a single statement."""
    if not rates:
        return

    for rate in rates:
        if not rate.date:
            message = "date darf nicht leer sein"
            raise ValueError(message)
        if not rate.currency:
            message = "currency darf nicht leer sein"
            raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        try:
            local_conn.executemany(
                """
                INSERT OR REPLACE INTO fx_rates (
                    date,
                    currency,
                    rate,
                    fetched_at,
                    data_source,
                    provider,
                    provenance
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        rate.date,
                        rate.currency,
                        rate.rate,
                        rate.fetched_at,
                        rate.data_source,
                        rate.provider,
                        rate.provenance,
                    )
                    for rate in rates
                ],
            )
            if conn is None:
                local_conn.commit()
        except sqlite3.Error:
            _LOGGER.exception("Fehler beim Bulk-Speichern von FX-Kursen")
            raise
    finally:
        if conn is None:
            local_conn.close()


def _iter_chunks(iterable: Sequence[Any], chunk_size: int) -> Iterator[Sequence[Any]]:
    """Yield successive chunks from iterable."""
    for i in range(0, len(iterable), chunk_size):
        yield iterable[i : i + chunk_size]


def upsert_fx_rates_chunked(
    db_path: Path,
    rates: Sequence[FxRateRecord],
    *,
    chunk_size: int = 500,
    retries: int = 3,
    conn: sqlite3.Connection | None = None,
) -> None:
    """Insert multiple FX rates in chunks with simple retry on database locks."""
    if not rates:
        return
    if chunk_size <= 0:
        message = "chunk_size must be positive"
        raise ValueError(message)

    local_conn = conn or sqlite3.connect(str(db_path))

    try:
        for chunk in _iter_chunks(rates, chunk_size):
            delay = 0.25
            for attempt in range(retries):
                try:
                    local_conn.executemany(
                        """
                        INSERT OR REPLACE INTO fx_rates (
                            date,
                            currency,
                            rate,
                            fetched_at,
                            data_source,
                            provider,
                            provenance
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        [
                            (
                                rate.date,
                                rate.currency,
                                rate.rate,
                                rate.fetched_at,
                                rate.data_source,
                                rate.provider,
                                rate.provenance,
                            )
                            for rate in chunk
                        ],
                    )
                    if conn is None:
                        local_conn.commit()
                    break
                except sqlite3.OperationalError as err:
                    is_locked = "database is locked" in str(err).lower()
                    last_attempt = attempt >= retries - 1
                    if not is_locked or last_attempt:
                        _LOGGER.exception("Fehler beim chunked FX-Insert")
                        raise
                    time.sleep(delay)
                    delay *= 2
    finally:
        if conn is None:
            local_conn.close()
