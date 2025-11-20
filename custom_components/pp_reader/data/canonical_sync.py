"""Synchronize ingestion tables into canonical runtime tables."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from custom_components.pp_reader.util import async_run_executor_job


async def async_sync_ingestion_to_canonical(
    hass: Any,
    db_path: Path | str,
) -> None:
    """Populate canonical tables from the latest staging ingestion."""
    resolved = Path(db_path)
    await async_run_executor_job(hass, _sync_ingestion_to_canonical, resolved)


def _sync_ingestion_to_canonical(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("BEGIN")
        _sync_accounts(conn)
        _sync_portfolios(conn)
        _sync_securities(conn)
        _sync_portfolio_securities(conn)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


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


def _sync_portfolio_securities(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM portfolio_securities")
    purchase_types = (
        client_pb2.PTransaction.Type.PURCHASE,
        client_pb2.PTransaction.Type.INBOUND_DELIVERY,
    )
    sale_types = (
        client_pb2.PTransaction.Type.SALE,
        client_pb2.PTransaction.Type.OUTBOUND_DELIVERY,
    )
    params = (*purchase_types, *sale_types, *purchase_types)
    cursor = conn.cursor()
    query = """
        SELECT
            portfolio,
            security,
            SUM(
                CASE
                    WHEN type IN (?, ?)
                        THEN COALESCE(shares, 0)
                    WHEN type IN (?, ?)
                        THEN -COALESCE(shares, 0)
                    ELSE 0
                END
            ) AS holdings,
            SUM(
                CASE
                    WHEN type IN (?, ?)
                        THEN COALESCE(amount, 0)
                    ELSE 0
                END
            ) AS purchase_value
        FROM ingestion_transactions
        WHERE portfolio IS NOT NULL
          AND security IS NOT NULL
        GROUP BY portfolio, security
        """
    cursor.execute(query, params)

    rows: list[tuple[str, str, int, int]] = []
    for portfolio, security, holdings, purchase_value in cursor.fetchall():
        holding_value = int(holdings or 0)
        if holding_value <= 0:
            continue
        purchase_cents = int(purchase_value or 0)
        rows.append(
            (
                portfolio,
                security,
                holding_value,
                purchase_cents,
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
        VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0, 0, 0)
        """,
        rows,
    )
