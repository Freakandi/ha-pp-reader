"""Synchronize ingestion tables into canonical runtime tables."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic.accounting import db_calc_account_balance
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

_LOGGER = logging.getLogger("custom_components.pp_reader.data.canonical_sync")

_SCALED_INT_THRESHOLD = 10_000
_EIGHT_DECIMAL_SCALE = 10**8


@dataclass(slots=True)
class _PortfolioSecurityContext:
    """Shared context for portfolio security aggregation."""

    conn: sqlite3.Connection
    tx_units: dict[str, dict[str, Any]]
    security_currency_map: dict[str, str]
    purchase_types: tuple[int, ...]
    sale_types: tuple[int, ...]


@dataclass(slots=True)
class _SecurityAmountContext:
    """Values required to resolve amounts into security currency."""

    tx_uuid: str | None
    security_currency: str
    currency_code: str
    amount_eur_cents: int | None
    account_total: float
    tx_date: str


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
        _sync_historical_prices(conn)
        _sync_transactions(conn)
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


def _sync_historical_prices(conn: sqlite3.Connection) -> None:
    """Upsert staged historical prices into the canonical table."""
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO historical_prices (
                security_uuid,
                date,
                close,
                high,
                low,
                volume,
                fetched_at,
                data_source,
                provider,
                provenance
            )
            SELECT
                security_uuid,
                date,
                close,
                high,
                low,
                volume,
                NULL,
                'portfolio',
                'portfolio',
                NULL
            FROM ingestion_historical_prices
            """
        )
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Synchronisieren der historischen Preise aus der Ingestion"
        )
        raise


def _sync_transactions(conn: sqlite3.Connection) -> None:
    """Mirror staged transactions plus units into canonical tables."""
    conn.execute("DELETE FROM transaction_units")
    conn.execute("DELETE FROM transactions")

    conn.execute(
        """
        INSERT INTO transactions (
            uuid,
            type,
            account,
            portfolio,
            other_account,
            other_portfolio,
            other_uuid,
            other_updated_at,
            date,
            currency_code,
            amount,
            shares,
            note,
            security,
            source,
            updated_at
        )
        SELECT
            uuid,
            type,
            account,
            portfolio,
            other_account,
            other_portfolio,
            other_uuid,
            other_updated_at,
            date,
            currency_code,
            amount,
            shares,
            note,
            security,
            source,
            updated_at
        FROM ingestion_transactions
        """
    )

    conn.execute(
        """
        INSERT INTO transaction_units (
            transaction_uuid,
            type,
            amount,
            currency_code,
            fx_amount,
            fx_currency_code,
            fx_rate_to_base
        )
        SELECT
            transaction_uuid,
            type,
            amount,
            currency_code,
            fx_amount,
            fx_currency_code,
            fx_rate_to_base
        FROM ingestion_transaction_units
        """
    )


def _load_ingestion_transactions(conn: sqlite3.Connection) -> list[Transaction]:
    """Return staged transactions mapped to the canonical dataclass."""
    try:
        cursor = conn.execute(
            """
            SELECT uuid, type, account, portfolio,
                   other_account, other_portfolio,
                   date, currency_code, amount, shares, security,
                   amount_eur_cents
            FROM ingestion_transactions
            ORDER BY date
            """
        )
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden der staged Transaktionen für die Konto-Synchronisation"
        )
        return []

    transactions: list[Transaction] = []
    for row in cursor.fetchall():
        uuid = row["uuid"]
        if not uuid:
            continue
        transactions.append(
            Transaction(
                uuid=uuid,
                type=int(row["type"] or 0),
                account=row["account"],
                portfolio=row["portfolio"],
                other_account=row["other_account"],
                other_portfolio=row["other_portfolio"],
                date=row["date"],
                currency_code=row["currency_code"],
                amount=int(row["amount"] or 0),
                shares=row["shares"],
                security=row["security"],
                amount_eur_cents=(
                    int(row["amount_eur_cents"])
                    if row["amount_eur_cents"] is not None
                    else None
                ),
            )
        )
    return transactions


def _load_transaction_units(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    """Return FX-aware transaction unit metadata keyed by transaction UUID."""
    try:
        cursor = conn.execute(
            """
            SELECT transaction_uuid, fx_amount, fx_currency_code
            FROM ingestion_transaction_units
            WHERE fx_amount IS NOT NULL
               OR fx_currency_code IS NOT NULL
            """
        )
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Laden der transaction_units für die Konto-Synchronisation"
        )
        return {}

    units: dict[str, dict[str, Any]] = {}
    for row in cursor.fetchall():
        tx_uuid = row["transaction_uuid"]
        if not tx_uuid:
            continue

        raw_fx_amount = row["fx_amount"]
        try:
            fx_amount = int(raw_fx_amount) if raw_fx_amount is not None else None
        except (TypeError, ValueError):
            fx_amount = None
        fx_currency = row["fx_currency_code"]

        if fx_amount is None:
            continue

        entry = units.setdefault(
            tx_uuid,
            {
                "fx_amount": 0,
                "fx_currency_code": None,
            },
        )
        with suppress(TypeError, ValueError):
            entry["fx_amount"] += fx_amount
        if entry.get("fx_currency_code") in (None, "") and fx_currency:
            entry["fx_currency_code"] = fx_currency
    return units


def _load_security_currency_map(conn: sqlite3.Connection) -> dict[str, str]:
    """Return a mapping of security UUID to its native currency code."""
    try:
        cursor = conn.execute(
            """
            SELECT uuid, currency_code
            FROM securities
            """
        )
    except sqlite3.Error:
        _LOGGER.exception("Fehler beim Laden der Wertpapier-Stammdaten")
        return {}

    mapping: dict[str, str] = {}
    for row in cursor.fetchall():
        uuid = row["uuid"]
        currency = row["currency_code"]
        if uuid:
            mapping[uuid] = (currency or "").strip().upper() or "EUR"
    return mapping


def _compute_account_balances(
    conn: sqlite3.Connection, accounts: list[sqlite3.Row]
) -> dict[str, int]:
    """Compute per-account balances (cent) from staged transactions."""
    if not accounts:
        return {}

    transactions = _load_ingestion_transactions(conn)
    if not transactions:
        return {}

    tx_units = _load_transaction_units(conn)
    accounts_currency_map = {
        row["uuid"]: (row["currency_code"] or "").strip().upper()
        for row in accounts
        if row["uuid"]
    }

    balances: dict[str, int] = {}
    for account_uuid in accounts_currency_map:
        try:
            balances[account_uuid] = db_calc_account_balance(
                account_uuid,
                transactions,
                accounts_currency_map=accounts_currency_map,
                tx_units=tx_units,
            )
        except Exception:  # pragma: no cover - defensive
            _LOGGER.exception(
                "Fehler bei der Berechnung des Kontostands für %s", account_uuid
            )
    return balances


def _sync_accounts(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM accounts")
    conn.execute("DELETE FROM account_attributes")
    cursor = conn.execute(
        """
        SELECT uuid, name, currency_code, note, is_retired, updated_at
        FROM ingestion_accounts
        ORDER BY name
        """
    )
    accounts = cursor.fetchall()
    balances = _compute_account_balances(conn, accounts)

    rows: list[tuple[Any, ...]] = []
    for row in accounts:
        uuid = row["uuid"]
        if not uuid:
            continue
        rows.append(
            (
                uuid,
                row["name"],
                row["currency_code"] or "",
                row["note"],
                row["is_retired"],
                row["updated_at"],
                balances.get(uuid, 0),
            )
        )

    if rows:
        conn.executemany(
            """
            INSERT INTO accounts (
                uuid,
                name,
                currency_code,
                note,
                is_retired,
                updated_at,
                balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
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
    tx_units = _load_transaction_units(conn)
    security_currency_map = _load_security_currency_map(conn)
    context = _PortfolioSecurityContext(
        conn=conn,
        tx_units=tx_units,
        security_currency_map=security_currency_map,
        purchase_types=(
            client_pb2.PTransaction.Type.PURCHASE,
            client_pb2.PTransaction.Type.INBOUND_DELIVERY,
        ),
        sale_types=(
            client_pb2.PTransaction.Type.SALE,
            client_pb2.PTransaction.Type.OUTBOUND_DELIVERY,
        ),
    )
    aggregates = _gather_portfolio_security_aggregates(context)
    rows = _build_portfolio_security_rows(aggregates)
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


def _gather_portfolio_security_aggregates(
    context: _PortfolioSecurityContext,
) -> dict[tuple[str, str], dict[str, float]]:
    """Aggregate staged portfolio/security metrics from transactions."""
    cursor = context.conn.execute(
        """
        SELECT
            uuid,
            portfolio,
            security,
            type,
            currency_code,
            amount,
            amount_eur_cents,
            shares,
            date
        FROM ingestion_transactions
        WHERE portfolio IS NOT NULL
          AND security IS NOT NULL
        """
    )

    aggregates: dict[tuple[str, str], dict[str, float]] = {}
    for row in cursor.fetchall():
        _accumulate_portfolio_security_row(
            aggregates=aggregates,
            row=row,
            context=context,
        )
    return aggregates


def _accumulate_portfolio_security_row(
    *,
    aggregates: dict[tuple[str, str], dict[str, float]],
    row: sqlite3.Row,
    context: _PortfolioSecurityContext,
) -> None:
    """Update aggregate totals for a single transaction row."""
    tx_uuid = row["uuid"]
    portfolio = row["portfolio"]
    security = row["security"]
    if not portfolio or not security:
        return

    tx_type = int(row["type"] or 0)
    amount_raw = int(row["amount"] or 0)
    amount_eur_cents = (
        int(row["amount_eur_cents"]) if row["amount_eur_cents"] is not None else None
    )
    shares_raw = int(row["shares"] or 0)
    currency_code = (row["currency_code"] or "").strip().upper()
    tx_date = row["date"] or ""
    security_currency = (
        context.security_currency_map.get(security) or currency_code or "EUR"
    )

    entry = aggregates.setdefault(
        (portfolio, security),
        {
            "holdings_raw": 0,
            "purchase_value_eur_cents": 0.0,
            "account_currency_total": 0.0,
            "security_currency_total": 0.0,
        },
    )

    if tx_type in context.purchase_types:
        entry["holdings_raw"] += shares_raw
        account_total = cent_to_eur(amount_raw, default=0.0) or 0.0
        entry["account_currency_total"] += account_total

        security_total = _resolve_security_total(
            context=context,
            amount_context=_SecurityAmountContext(
                tx_uuid=tx_uuid,
                security_currency=security_currency,
                currency_code=currency_code,
                amount_eur_cents=amount_eur_cents,
                account_total=account_total,
                tx_date=tx_date,
            ),
        )
        entry["security_currency_total"] += security_total or 0.0

        if amount_eur_cents is None:
            _LOGGER.warning(
                (
                    "Kein EUR-Betrag für Transaktion "
                    "portfolio=%s security=%s date=%s currency=%s"
                ),
                portfolio or "<ohne Portfolio>",
                security or "<ohne Wertpapier>",
                tx_date or "<ohne Datum>",
                currency_code or "<ohne Währung>",
            )
        else:
            entry["purchase_value_eur_cents"] += float(amount_eur_cents)
    elif tx_type in context.sale_types:
        entry["holdings_raw"] -= abs(shares_raw)


def _resolve_security_total(
    *,
    context: _PortfolioSecurityContext,
    amount_context: _SecurityAmountContext,
) -> float | None:
    """Resolve transaction amount in security currency."""
    unit = (
        context.tx_units.get(amount_context.tx_uuid) if amount_context.tx_uuid else None
    )
    if unit:
        unit_currency = (unit.get("fx_currency_code") or "").strip().upper()
        unit_total = cent_to_eur(unit.get("fx_amount"), default=None)
        if (
            unit_total is not None
            and unit_currency
            and unit_currency == amount_context.security_currency
        ):
            return unit_total

    if amount_context.currency_code == amount_context.security_currency:
        return amount_context.account_total

    eur_value = (
        cent_to_eur(amount_context.amount_eur_cents, default=None)
        if amount_context.amount_eur_cents is not None
        else None
    )
    if eur_value is not None:
        rate_security = _lookup_fx_rate(
            context.conn, amount_context.security_currency, amount_context.tx_date
        )
        if rate_security:
            return eur_value * rate_security

    rate_security = _lookup_fx_rate(
        context.conn, amount_context.security_currency, amount_context.tx_date
    )
    rate_account = _lookup_fx_rate(
        context.conn, amount_context.currency_code, amount_context.tx_date
    )
    if rate_security and rate_account and rate_account not in (0, None):
        return (amount_context.account_total / rate_account) * rate_security

    return None


def _build_portfolio_security_rows(
    aggregates: dict[tuple[str, str], dict[str, float]],
) -> list[
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
]:
    """Transform aggregate totals into insert rows for portfolio_securities."""
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
    return rows
