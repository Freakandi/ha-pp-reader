"""FX backfill helpers for currency coverage detection."""

from __future__ import annotations

import asyncio
import json
import logging
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    upsert_fx_rates_chunked,
)
from custom_components.pp_reader.util.datetime import UTC
from custom_components.pp_reader.util.fx import fetch_fx_range

if TYPE_CHECKING:
    from collections.abc import Iterable, Mapping, Sequence

_LOGGER = logging.getLogger("custom_components.pp_reader.data.fx_backfill")

SQLITE_TIMEOUT = 30.0

CurrencyCoverage = dict[str, str | None]
CurrencyCoverageMap = dict[str, CurrencyCoverage]


def _normalize_currency_code(value: str | None) -> str | None:
    """Return an upper-cased currency code or None when empty/unsupported."""
    if not value:
        return None
    normalized = value.strip().upper()
    if not normalized or normalized == "EUR":
        return None
    return normalized


def _ensure_entry(coverage: CurrencyCoverageMap, currency: str) -> CurrencyCoverage:
    """Return the existing coverage entry or create a new default one."""
    return coverage.setdefault(
        currency,
        {
            "first_tx_date": None,
            "latest_tx_date": None,
            "latest_fx_date": None,
        },
    )


def _merge_coverage_entry(
    coverage: CurrencyCoverageMap,
    currency: str,
    first_date: str | None,
    latest_date: str | None,
) -> None:
    """Merge new coverage bounds into the existing per-currency entry."""
    entry = _ensure_entry(coverage, currency)

    if first_date:
        current = entry["first_tx_date"]
        if current is None or first_date < current:
            entry["first_tx_date"] = first_date

    if latest_date:
        current = entry["latest_tx_date"]
        if current is None or latest_date > current:
            entry["latest_tx_date"] = latest_date


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    """Return True when the given table exists in the database."""
    cursor = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    )
    return cursor.fetchone() is not None


def _collect_transaction_currencies(
    conn: sqlite3.Connection, coverage: CurrencyCoverageMap
) -> None:
    cursor = conn.execute(
        """
        SELECT currency_code, MIN(date) AS first_date, MAX(date) AS latest_date
        FROM ingestion_transactions
        WHERE currency_code IS NOT NULL
          AND TRIM(currency_code) != ''
          AND date IS NOT NULL
          AND TRIM(date) != ''
        GROUP BY currency_code
        """
    )
    for currency_code, first_date, latest_date in cursor.fetchall():
        normalized = _normalize_currency_code(currency_code)
        if normalized:
            _merge_coverage_entry(coverage, normalized, first_date, latest_date)


def _collect_transaction_unit_currencies(
    conn: sqlite3.Connection, coverage: CurrencyCoverageMap
) -> None:
    cursor = conn.execute(
        """
        SELECT u.currency_code,
               MIN(t.date) AS first_date,
               MAX(t.date) AS latest_date
        FROM ingestion_transaction_units AS u
        JOIN ingestion_transactions AS t
          ON t.uuid = u.transaction_uuid
        WHERE u.currency_code IS NOT NULL
          AND TRIM(u.currency_code) != ''
          AND t.date IS NOT NULL
          AND TRIM(t.date) != ''
        GROUP BY u.currency_code
        """
    )
    for currency_code, first_date, latest_date in cursor.fetchall():
        normalized = _normalize_currency_code(currency_code)
        if normalized:
            _merge_coverage_entry(coverage, normalized, first_date, latest_date)

    cursor = conn.execute(
        """
        SELECT u.fx_currency_code,
               MIN(t.date) AS first_date,
               MAX(t.date) AS latest_date
        FROM ingestion_transaction_units AS u
        JOIN ingestion_transactions AS t
          ON t.uuid = u.transaction_uuid
        WHERE u.fx_currency_code IS NOT NULL
          AND TRIM(u.fx_currency_code) != ''
          AND t.date IS NOT NULL
          AND TRIM(t.date) != ''
        GROUP BY u.fx_currency_code
        """
    )
    for currency_code, first_date, latest_date in cursor.fetchall():
        normalized = _normalize_currency_code(currency_code)
        if normalized:
            _merge_coverage_entry(coverage, normalized, first_date, latest_date)


def _collect_security_currencies(
    conn: sqlite3.Connection, coverage: CurrencyCoverageMap
) -> None:
    cursor = conn.execute(
        """
        SELECT currency_code, target_currency_code
        FROM ingestion_securities
        WHERE (currency_code IS NOT NULL AND TRIM(currency_code) != '')
           OR (
               target_currency_code IS NOT NULL
               AND TRIM(target_currency_code) != ''
           )
        """
    )
    for currency_code, target_currency_code in cursor.fetchall():
        for code in (currency_code, target_currency_code):
            normalized = _normalize_currency_code(code)
            if normalized:
                _merge_coverage_entry(coverage, normalized, None, None)


def _collect_latest_fx_dates(
    conn: sqlite3.Connection, coverage: CurrencyCoverageMap
) -> None:
    cursor = conn.execute(
        """
        SELECT currency, MAX(date) AS latest_date
        FROM fx_rates
        WHERE currency IS NOT NULL
          AND TRIM(currency) != ''
        GROUP BY currency
        """
    )
    for currency_code, latest_date in cursor.fetchall():
        normalized = _normalize_currency_code(currency_code)
        if not normalized:
            continue
        entry = _ensure_entry(coverage, normalized)
        if latest_date and (
            entry["latest_fx_date"] is None or latest_date > entry["latest_fx_date"]
        ):
            entry["latest_fx_date"] = latest_date


def collect_currency_coverage(db_path: Path | str) -> CurrencyCoverageMap:
    """
    Return earliest and latest transaction dates for non-EUR currencies.

    The helper scans ingestion transactions plus transaction units (including
    FX currencies) and merges in securities' native currencies so downstream
    backfill jobs can determine required coverage.
    """
    coverage: CurrencyCoverageMap = {}
    normalized_path = Path(db_path)
    conn = sqlite3.connect(str(normalized_path), timeout=SQLITE_TIMEOUT)
    try:
        if not _table_exists(conn, "ingestion_transactions"):
            _LOGGER.debug(
                "Skipping currency coverage collection: staging tables missing"
            )
            return coverage

        _collect_transaction_currencies(conn, coverage)

        if _table_exists(conn, "ingestion_transaction_units"):
            _collect_transaction_unit_currencies(conn, coverage)
        else:
            _LOGGER.debug(
                "Skipping transaction unit currency scan: table missing in staging DB"
            )

        if _table_exists(conn, "ingestion_securities"):
            _collect_security_currencies(conn, coverage)
        else:
            _LOGGER.debug(
                "Skipping security currency scan: table missing in staging DB"
            )
    finally:
        conn.close()

    return coverage


def collect_currency_coverage_snapshot(db_path: Path | str) -> CurrencyCoverageMap:
    """
    Return coverage map enriched with latest fx_rates date per currency.

    This helper keeps the staging scan separate from fx_rates lookups so it can
    be reused for diagnostics and backfill planning.
    """
    coverage = collect_currency_coverage(db_path)
    normalized_path = Path(db_path)
    conn = sqlite3.connect(str(normalized_path), timeout=SQLITE_TIMEOUT)
    try:
        if _table_exists(conn, "fx_rates"):
            _collect_latest_fx_dates(conn, coverage)
        else:
            _LOGGER.debug("Skipping FX coverage scan: fx_rates table missing")
    finally:
        conn.close()

    return coverage


def log_currency_coverage_snapshot(db_path: Path | str) -> CurrencyCoverageMap:
    """Log a structured FX coverage snapshot and return the payload."""
    snapshot = collect_currency_coverage_snapshot(db_path)
    payload = {
        "currency_count": len(snapshot),
        "coverage": snapshot,
    }
    _LOGGER.info("FX coverage snapshot: %s", json.dumps(payload, sort_keys=True))
    return snapshot


def _parse_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        sanitized = value.strip()
        if sanitized:
            return datetime.fromisoformat(sanitized).date()
    message = f"Unsupported date value: {value!r}"
    raise ValueError(message)


async def _persist_fx_records(
    db_path: Path, records: Sequence[FxRateRecord]
) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        upsert_fx_rates_chunked,
        db_path,
        records,
    )


def _normalize_currency_filter(
    currencies: Iterable[str] | None,
) -> set[str] | None:
    if currencies is None:
        return None
    normalized = {_normalize_currency_code(code) for code in currencies}
    return {code for code in normalized if code}


async def backfill_fx(  # noqa: PLR0913,PLR0915 - explicit keyword args for clarity
    db_path: Path | str,
    *,
    currencies: Iterable[str] | None = None,
    start: str | date | datetime | None = None,
    end: str | date | datetime | None = None,
    limit_days: int | None = None,
    dry_run: bool = False,
    max_days: int | None = None,
) -> Mapping[str, int]:
    """
    Compute missing FX dates per currency and persist fetched ranges.

    Returns a per-currency summary mapping to inserted record counts.
    """
    db_path = Path(db_path)
    coverage = collect_currency_coverage_snapshot(db_path)
    currency_filter = _normalize_currency_filter(currencies)
    today = datetime.now(tz=UTC).date()
    effective_end = _parse_date(end) if end else today

    def _log_failure(code: str, err: Exception) -> None:
        failures.append((code, str(err)))
        _LOGGER.exception("Failed to backfill FX for %s", code)

    summary: dict[str, int] = {}
    total_inserted = 0
    failures: list[tuple[str, str]] = []
    for currency, entry in sorted(coverage.items()):
        if currency_filter is not None and currency not in currency_filter:
            continue

        first_tx_date = entry.get("first_tx_date")
        if not first_tx_date:
            _LOGGER.debug("Skipping %s: no transaction date coverage", currency)
            continue

        desired_start = _parse_date(start) if start else datetime.fromisoformat(
            first_tx_date
        ).date()
        latest_fx_date = entry.get("latest_fx_date")
        if latest_fx_date:
            latest_known = _parse_date(latest_fx_date)
            desired_start = max(desired_start, latest_known + timedelta(days=1))

        fetch_end = effective_end
        if limit_days is not None and limit_days > 0:
            limited_start = fetch_end - timedelta(days=limit_days - 1)
            desired_start = max(desired_start, limited_start)

        if desired_start > fetch_end:
            summary[currency] = 0
            _LOGGER.debug(
                "Skipping %s: start date after end (%s > %s)",
                currency,
                desired_start,
                fetch_end,
            )
            continue

        missing_count = (fetch_end - desired_start).days + 1
        if max_days is not None and max_days > 0 and missing_count > max_days:
            _LOGGER.warning(
                (
                    "FX backfill aborted for %s: missing %d day(s) exceed max_days=%d "
                    "(%s .. %s)"
                ),
                currency,
                missing_count,
                max_days,
                desired_start,
                fetch_end,
            )
            summary[currency] = 0
            continue

        _LOGGER.info(
            "Backfilling FX for %s (%s .. %s, %d day(s))%s",
            currency,
            desired_start,
            fetch_end,
            missing_count,
            " [dry-run]" if dry_run else "",
        )
        if dry_run:
            summary[currency] = missing_count
            continue

        try:
            records = await fetch_fx_range(currency, desired_start, fetch_end)
        except Exception as exc:  # noqa: BLE001 - defensive CLI surface
            _log_failure(currency, exc)
            summary[currency] = 0
            continue

        if not records:
            _LOGGER.warning(
                "No FX records fetched for %s (%s .. %s)",
                currency,
                desired_start,
                fetch_end,
            )
            summary[currency] = 0
            continue

        try:
            await _persist_fx_records(db_path, records)
        except Exception as exc:  # noqa: BLE001 - defensive CLI surface
            _log_failure(currency, exc)
            summary[currency] = 0
            continue

        summary[currency] = len(records)
        total_inserted += len(records)
        _LOGGER.info(
            "Persisted %d FX records for %s",
            len(records),
            currency,
        )

    suffix = " [dry-run]" if dry_run else ""
    _LOGGER.info(
        "FX backfill finished%s: currencies=%d, inserted=%d, failures=%d",
        suffix,
        len(summary),
        total_inserted,
        len(failures),
    )
    for currency, reason in failures:
        _LOGGER.warning("FX backfill failed for %s: %s", currency, reason)
    return summary
