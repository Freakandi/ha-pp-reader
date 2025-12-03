"""Backfill helper to populate EUR amounts for staged transactions."""

from __future__ import annotations

import argparse
import logging
import sqlite3
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.canonical_sync import _lookup_fx_rate
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    ensure_exchange_rates_for_dates_sync,
    eur_to_cent,
)

_LOGGER = logging.getLogger("custom_components.pp_reader.data.backfill_fx_tx")

DATE_FMT = "%Y-%m-%d"
DEFAULT_DB = Path("config/pp_reader.db")


@dataclass
class PendingTransaction:
    """Transaction row requiring EUR backfill."""

    uuid: str
    currency_code: str
    date: str
    amount: int


def _normalize_currency_code(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().upper()
    return normalized or None


def _parse_iso_date(value: str | None) -> datetime | None:
    if not value:
        return None
    sanitized = value.removesuffix("Z")
    with suppress(ValueError):
        return datetime.fromisoformat(sanitized)
    return None


def _load_pending_transactions(
    conn: sqlite3.Connection,
    *,
    currencies: set[str] | None = None,
) -> list[PendingTransaction]:
    """Return transactions without EUR amounts and a usable currency/date."""
    placeholders = ""
    params: list[Any] = []
    if currencies:
        placeholders = ", ".join("?" for _ in currencies)
        params.extend(sorted(currencies))

    query = """
        SELECT uuid, currency_code, date, amount
        FROM ingestion_transactions
        WHERE amount_eur_cents IS NULL
          AND amount IS NOT NULL
          AND currency_code IS NOT NULL
          AND TRIM(currency_code) != ''
          AND date IS NOT NULL
          AND TRIM(date) != ''
    """
    if placeholders:
        query += f" AND UPPER(currency_code) IN ({placeholders})"

    cursor = conn.execute(query, params)
    rows = []
    for uuid, currency_code, date_str, amount in cursor.fetchall():
        if uuid is None or amount is None:
            continue
        currency = _normalize_currency_code(currency_code)
        if currency is None:
            continue
        rows.append(
            PendingTransaction(
                uuid=uuid,
                currency_code=currency,
                date=date_str,
                amount=int(amount),
            )
        )
    return rows


def _ensure_fx_rates(
    db_path: Path,
    rows: list[PendingTransaction],
) -> None:
    """Fetch missing FX rates for the given transactions."""
    currencies: set[str] = set()
    dates: set[datetime] = set()
    for row in rows:
        if row.currency_code == "EUR":
            continue
        currencies.add(row.currency_code)
        parsed = _parse_iso_date(row.date)
        if parsed:
            dates.add(parsed)

    if not currencies or not dates:
        return

    try:
        ensure_exchange_rates_for_dates_sync(
            sorted(dates),
            currencies,
            db_path,
        )
    except Exception:  # pragma: no cover - defensive guard
        _LOGGER.exception(
            "Fehler beim Laden fehlender FX-Kurse (currencies=%s, dates=%s)",
            sorted(currencies),
            sorted(dt.strftime(DATE_FMT) for dt in dates),
        )


def _compute_amount_eur_cents(
    conn: sqlite3.Connection,
    tx: PendingTransaction,
) -> int | None:
    """Return EUR cents for a staged transaction or None when unavailable."""
    if tx.currency_code == "EUR":
        return tx.amount

    rate = _lookup_fx_rate(conn, tx.currency_code, tx.date)
    native_value = cent_to_eur(tx.amount, default=None)
    if rate in (None, 0) or native_value is None:
        _LOGGER.warning(
            "Kein FX-Kurs gefunden für %s zum %s - amount_eur_cents bleibt NULL",
            tx.currency_code,
            tx.date,
        )
        return None

    try:
        eur_value = native_value / float(rate)
    except (TypeError, ValueError, ZeroDivisionError):
        _LOGGER.warning(
            "Ungültiger FX-Kurs für %s zum %s - amount_eur_cents bleibt NULL",
            tx.currency_code,
            tx.date,
        )
        return None

    return eur_to_cent(eur_value, default=None)


def backfill_ingestion_transactions(
    db_path: Path | str,
    *,
    currencies: set[str] | None = None,
    dry_run: bool = False,
) -> dict[str, int | bool]:
    """
    Populate amount_eur_cents for staged transactions missing EUR values.

    Returns a summary dict with processed, updated, and skipped counts.
    """
    resolved = Path(db_path)
    conn = sqlite3.connect(str(resolved))
    conn.row_factory = sqlite3.Row
    try:
        pending = _load_pending_transactions(conn, currencies=currencies)
        if not pending:
            _LOGGER.info("Keine Transaktionen zum Backfill gefunden.")
            return {"processed": 0, "updated": 0, "skipped": 0, "dry_run": dry_run}

        _ensure_fx_rates(resolved, pending)

        updates: list[tuple[int, str]] = []
        skipped = 0
        for tx in pending:
            value = _compute_amount_eur_cents(conn, tx)
            if value is None:
                skipped += 1
                continue
            updates.append((value, tx.uuid))

        if updates and not dry_run:
            conn.executemany(
                """
                UPDATE ingestion_transactions
                SET amount_eur_cents = ?
                WHERE uuid = ?
                """,
                updates,
            )
            conn.commit()

        summary = {
            "processed": len(pending),
            "updated": len(updates),
            "skipped": skipped,
            "dry_run": dry_run,
        }
        _LOGGER.info(
            "FX-Backfill abgeschlossen (processed=%d updated=%d skipped=%d dry_run=%s)",
            summary["processed"],
            summary["updated"],
            summary["skipped"],
            summary["dry_run"],
        )
        return summary
    finally:
        conn.close()


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Backfill EUR amounts for staged ingestion transactions.",
    )
    parser.add_argument(
        "--db",
        dest="db_path",
        type=Path,
        default=DEFAULT_DB,
        help="Path to the SQLite database (default: %(default)s)",
    )
    parser.add_argument(
        "--currency",
        action="append",
        dest="currencies",
        help="Limit backfill to the given currency (repeatable). Defaults to all.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform lookup without writing updates.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )
    return parser


def _configure_logging(*, verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def main(argv: list[str] | None = None) -> int:
    """CLI entry point for the transaction FX backfill helper."""
    parser = _build_arg_parser()
    args = parser.parse_args(argv)
    _configure_logging(verbose=args.verbose)

    currencies = (
        {c.strip().upper() for c in args.currencies if c.strip()}
        if args.currencies
        else None
    )

    try:
        backfill_ingestion_transactions(
            args.db_path,
            currencies=currencies,
            dry_run=args.dry_run,
        )
    except Exception:  # pragma: no cover - CLI guardrail
        _LOGGER.exception("Backfill fehlgeschlagen")
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
