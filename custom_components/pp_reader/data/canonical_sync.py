"""Synchronize ingestion tables into canonical runtime tables."""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any

from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

_LOGGER = logging.getLogger("custom_components.pp_reader.data.canonical_sync")

_SCALED_INT_THRESHOLD = 10_000
_EIGHT_DECIMAL_SCALE = 10**8


async def async_sync_ingestion_to_canonical(
    hass: Any,
    db_path: Path | str,
) -> None:
    """Populate canonical tables from the latest staging ingestion."""
    resolved = Path(db_path)
    await async_run_executor_job(hass, _sync_ingestion_to_canonical, resolved)


def _sync_ingestion_to_canonical(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("BEGIN")
        _sync_accounts(conn)
        _sync_portfolios(conn)
        _sync_securities(conn)
        _sync_portfolio_securities(conn, db_path)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _normalize_scaled_quantity(value: float | None) -> float:
    """Interpret raw numeric values that may already be scaled by 1e8."""
    if value in (None, ""):
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    if abs(numeric) >= _SCALED_INT_THRESHOLD:
        return numeric / _EIGHT_DECIMAL_SCALE
    return numeric


def _lookup_fx_rate(
    conn: sqlite3.Connection, currency: str, tx_date: str
) -> float | None:
    """Return the latest FX rate on or before the transaction date."""
    normalized = (currency or "").strip().upper()
    if not normalized:
        return None
    if normalized == "EUR":
        return 1.0
    try:
        cur = conn.execute(
            """
            SELECT rate, date
            FROM fx_rates
            WHERE currency = ?
              AND date <= ?
            ORDER BY date DESC
            LIMIT 1
            """,
            (normalized, tx_date),
        )
        row = cur.fetchone()
        if row is None:
            cur = conn.execute(
                """
                SELECT rate, date
                FROM fx_rates
                WHERE currency = ?
                ORDER BY date ASC
                LIMIT 1
                """,
                (normalized,),
            )
            row = cur.fetchone()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden des FX-Kurses für %s (%s)", normalized, tx_date
        )
        return None

    if row and row[0] not in (None, ""):
        try:
            rate_value = float(row[0])
        except (TypeError, ValueError):
            return None
        if row[1] and row[1] > tx_date:
            _LOGGER.warning(
                "Kein FX-Kurs <= %s für %s gefunden; nutze ersten Wert vom %s",
                tx_date,
                normalized,
                row[1],
            )
        return rate_value

    _LOGGER.warning("Kein FX-Kurs gefunden für %s zum %s", normalized, tx_date)
    return None


def _sync_accounts(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM accounts")
    conn.execute("DELETE FROM account_attributes")
    conn.execute(
        """
        INSERT INTO accounts (
            uuid,
            name,
            currency_code,
            note,
            is_retired,
            updated_at,
            balance
        )
        SELECT
            uuid,
            name,
            COALESCE(currency_code, ''),
            note,
            is_retired,
            updated_at,
            0
        FROM ingestion_accounts
        """
    )


def _sync_portfolios(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM portfolios")
    conn.execute("DELETE FROM portfolio_attributes")
    conn.execute(
        """
        INSERT INTO portfolios (
            uuid,
            name,
            note,
            reference_account,
            is_retired,
            updated_at
        )
        SELECT
            uuid,
            name,
            note,
            reference_account,
            is_retired,
            updated_at
        FROM ingestion_portfolios
        """
    )


def _sync_securities(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM securities")
    conn.execute(
        """
        INSERT INTO securities (
            uuid,
            name,
            isin,
            wkn,
            ticker_symbol,
            feed,
            type,
            currency_code,
            retired,
            updated_at,
            last_price,
            last_price_date,
            last_price_source,
            last_price_fetched_at
        )
        SELECT
            uuid,
            name,
            isin,
            wkn,
            ticker_symbol,
            feed,
            NULL,
            currency_code,
            is_retired,
            updated_at,
            latest_close,
            latest_date,
            latest_feed,
            updated_at
        FROM ingestion_securities
        """
    )


def _sync_portfolio_securities(conn: sqlite3.Connection, db_path: Path) -> None:
    conn.execute("DELETE FROM portfolio_securities")
    _ = db_path
    purchase_types = (
        client_pb2.PTransaction.Type.PURCHASE,
        client_pb2.PTransaction.Type.INBOUND_DELIVERY,
    )
    sale_types = (
        client_pb2.PTransaction.Type.SALE,
        client_pb2.PTransaction.Type.OUTBOUND_DELIVERY,
    )
    cursor = conn.execute(
        """
        SELECT
            portfolio,
            security,
            type,
            currency_code,
            amount,
            shares,
            date
        FROM ingestion_transactions
        WHERE portfolio IS NOT NULL
          AND security IS NOT NULL
        """
    )

    aggregates: dict[tuple[str, str], dict[str, float]] = {}

    for row in cursor.fetchall():
        portfolio = row["portfolio"]
        security = row["security"]
        tx_type = int(row["type"] or 0)
        amount_raw = int(row["amount"] or 0)
        shares_raw = int(row["shares"] or 0)
        currency_code = (row["currency_code"] or "").strip().upper()
        tx_date = row["date"] or ""

        key = (portfolio, security)
        entry = aggregates.setdefault(
            key,
            {
                "holdings_raw": 0,
                "purchase_value_eur_cents": 0.0,
                "account_currency_total": 0.0,
                "security_currency_total": 0.0,
            },
        )

        if tx_type in purchase_types:
            entry["holdings_raw"] += shares_raw
            rate = _lookup_fx_rate(conn, currency_code, tx_date)
            if rate is None or rate == 0:
                continue

            purchase_cents_eur = amount_raw / float(rate)
            entry["purchase_value_eur_cents"] += purchase_cents_eur

            account_total = cent_to_eur(amount_raw, default=0.0) or 0.0
            entry["account_currency_total"] += account_total
            entry["security_currency_total"] += account_total
        elif tx_type in sale_types:
            entry["holdings_raw"] -= abs(shares_raw)

    rows: list[
        tuple[
            str,
            str,
            int,
            int,
            float | None,
            float | None,
            float | None,
            float,
            float,
            int,
        ]
    ] = []
    for (portfolio, security), data in aggregates.items():
        holdings_raw = int(data.get("holdings_raw", 0))
        if holdings_raw <= 0:
            continue

        normalized_holdings = _normalize_scaled_quantity(holdings_raw)
        if normalized_holdings <= 0:
            continue

        purchase_cents_eur = round(data.get("purchase_value_eur_cents", 0.0))
        account_total = data.get("account_currency_total", 0.0)
        security_total = data.get("security_currency_total", 0.0)

        avg_price_security = (
            security_total / normalized_holdings
            if security_total and normalized_holdings
            else None
        )
        avg_price_account = (
            account_total / normalized_holdings
            if account_total and normalized_holdings
            else None
        )

        rows.append(
            (
                portfolio,
                security,
                holdings_raw,
                int(purchase_cents_eur),
                None,
                avg_price_security,
                avg_price_account,
                security_total,
                account_total,
                0,
            )
        )

    if not rows:
        return

    conn.executemany(
        """
        INSERT INTO portfolio_securities (
            portfolio_uuid,
            security_uuid,
            current_holdings,
            purchase_value,
            avg_price_native,
            avg_price_security,
            avg_price_account,
            security_currency_total,
            account_currency_total,
            current_value
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
