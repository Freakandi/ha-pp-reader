"""
Provide functions for various calculations.

Holdings, purchase values, and current values of securities
in a portfolio. Includes utilities for handling transactions,
exchange rates, and database interactions.
"""

import logging
import sqlite3
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from custom_components.pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates_sync,
    load_latest_rates_sync,
)
from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic.portfolio import normalize_shares
from custom_components.pp_reader.util.currency import normalize_raw_price

_LOGGER = logging.getLogger(__name__)

PURCHASE_TYPES = {0, 2}
SALE_TYPES = {1, 3}

_FX_RATE_FAILURES: Counter[tuple[str, str]] = Counter()
_MISSING_NATIVE_POSITIONS: Counter[tuple[str, str]] = Counter()


def get_missing_fx_diagnostics() -> dict[str, Any]:
    """Return a snapshot of accumulated missing FX diagnostics."""

    rate_failures = [
        {
            "currency": currency,
            "date": date,
            "occurrences": count,
        }
        for (currency, date), count in _FX_RATE_FAILURES.items()
    ]
    native_missing = [
        {
            "portfolio_uuid": portfolio,
            "security_uuid": security,
            "occurrences": count,
        }
        for (portfolio, security), count in _MISSING_NATIVE_POSITIONS.items()
    ]

    return {
        "rate_lookup_failures": rate_failures,
        "native_amount_missing": native_missing,
    }


def reset_missing_fx_diagnostics() -> None:
    """Clear accumulated FX diagnostics (for tests or fresh runs)."""

    _FX_RATE_FAILURES.clear()
    _MISSING_NATIVE_POSITIONS.clear()


def _record_rate_failure(currency: str | None, tx_date: datetime | None) -> None:
    """Track missing FX rate lookups grouped by currency and trade date."""

    if not currency or tx_date is None:
        return

    _FX_RATE_FAILURES[(currency, tx_date.strftime("%Y-%m-%d"))] += 1


def _record_missing_native_position(
    portfolio_uuid: str | None, security_uuid: str | None
) -> None:
    """Track purchases lacking native currency totals by portfolio/security."""

    if not portfolio_uuid or not security_uuid:
        return

    _MISSING_NATIVE_POSITIONS[(portfolio_uuid, security_uuid)] += 1


@dataclass(slots=True)
class _NormalizedTransactionAmounts:
    """Represent normalized monetary figures for a transaction."""

    shares: float
    gross: float
    fees: float
    taxes: float
    net_trade_account: float


def _normalize_transaction_amounts(
    transaction: Transaction,
    tx_units: dict[str, Any] | None,
) -> _NormalizedTransactionAmounts:
    """Convert raw transaction figures into floats with fee/tax breakdown."""

    shares = normalize_shares(transaction.shares) if transaction.shares else 0.0
    gross = (transaction.amount or 0) / 100.0
    fees = 0.0
    taxes = 0.0

    if tx_units:
        units = tx_units.get(transaction.uuid)

        entries: list[dict[str, Any]]
        if isinstance(units, list):
            entries = [entry for entry in units if isinstance(entry, dict)]
        elif isinstance(units, dict):
            nested = units.get("entries") if "entries" in units else None
            if isinstance(nested, list):
                entries = [entry for entry in nested if isinstance(entry, dict)]
            else:
                entries = [units]
        else:
            entries = []

        for entry in entries:
            unit_type_raw = entry.get("type")
            amount_raw = entry.get("amount")

            try:
                unit_type = int(unit_type_raw)
            except (TypeError, ValueError):
                continue

            if amount_raw is None:
                continue

            if isinstance(amount_raw, (int, float)):
                unit_amount = float(amount_raw)
            else:
                try:
                    unit_amount = float(int(amount_raw))
                except (TypeError, ValueError):
                    continue

            unit_amount /= 100.0

            if unit_type == 2:
                fees += unit_amount
            elif unit_type == 1:
                taxes += unit_amount

    net_trade_account = gross - fees - taxes

    return _NormalizedTransactionAmounts(
        shares=shares,
        gross=gross,
        fees=fees,
        taxes=taxes,
        net_trade_account=net_trade_account,
    )


@dataclass(slots=True)
class PurchaseComputation:
    """Aggregate purchase metrics for a portfolio security."""

    purchase_value: float
    avg_price_native: float | None
    security_currency_total: float = 0.0
    account_currency_total: float = 0.0
    avg_price_security: float | None = None
    avg_price_account: float | None = None


@dataclass(slots=True)
class _HoldingLot:
    """Represent a FIFO lot tracked during purchase calculations."""

    shares: float
    price_eur: float
    timestamp: datetime
    native_price: float | None = None
    native_currency: str | None = None
    security_price: float | None = None
    security_currency: str | None = None
    account_price: float | None = None
    account_currency: str | None = None


def _is_relevant_transaction(transaction: Transaction) -> bool:
    """Return ``True`` when a transaction has both a security and portfolio."""
    return bool(transaction.security and transaction.portfolio)


def _collect_fx_requirements(
    transactions: list[Transaction],
) -> tuple[set[datetime], set[str]]:
    """Collect all non-EUR currencies and their relevant dates."""
    fx_dates: set[datetime] = set()
    fx_currencies: set[str] = set()

    for tx in transactions:
        if _is_relevant_transaction(tx) and tx.currency_code != "EUR":
            fx_currencies.add(tx.currency_code)
            fx_dates.add(datetime.fromisoformat(tx.date))

    return fx_dates, fx_currencies


def _determine_exchange_rate(
    transaction: Transaction,
    tx_date: datetime,
    db_path: Path,
    *,
    missing_logged: set[tuple[str, datetime]] | None = None,
) -> tuple[float | None, float | None]:
    """Load the exchange rate for a transaction and expose the raw value."""
    fx_rates = load_latest_rates_sync(tx_date, db_path)

    if transaction.currency_code == "EUR":
        return 1.0, 1.0

    rate = fx_rates.get(transaction.currency_code)
    if not rate:
        if missing_logged is None:
            missing_logged = set()

        key = (transaction.currency_code, tx_date)
        if key not in missing_logged:
            missing_logged.add(key)
            _record_rate_failure(transaction.currency_code, tx_date)
            _LOGGER.warning(
                "⚠️ Kein Wechselkurs gefunden: Datum=%s, Währung=%s",
                tx_date.strftime("%Y-%m-%d"),
                transaction.currency_code,
            )
        return None, None

    return rate, rate


def _apply_sale_fifo(
    existing_holdings: list[_HoldingLot],
    shares_to_sell: float,
) -> list[_HoldingLot]:
    """Reduce holdings using FIFO when selling shares."""
    remaining_to_sell = shares_to_sell
    updated_positions: list[_HoldingLot] = []

    for lot in existing_holdings:
        qty = lot.shares
        if remaining_to_sell <= 0:
            updated_positions.append(lot)
            continue

        if qty > remaining_to_sell:
            updated_positions.append(
                _HoldingLot(
                    shares=qty - remaining_to_sell,
                    price_eur=lot.price_eur,
                    timestamp=lot.timestamp,
                    native_price=lot.native_price,
                    native_currency=lot.native_currency,
                    security_price=lot.security_price,
                    security_currency=lot.security_currency,
                    account_price=lot.account_price,
                    account_currency=lot.account_currency,
                )
            )
            remaining_to_sell = 0
        else:
            remaining_to_sell -= qty

    return updated_positions


def db_calculate_current_holdings(
    transactions: list[Transaction],
) -> dict[tuple[str, str], float]:
    """
    Berechne die aktuell gehaltene Anzahl pro Wertpapier und Depot.

    Args:
        transactions (list[Transaction]): Liste aller Transaktionen aus der Datenbank.

    Returns:
        Dict[Tuple[str, str], float]: Ein Dictionary mit Depot-UUID
            (`portfolio_uuid`) und Wertpapier-UUID (`security_uuid`), das den
            aktuellen Beständen (`current_holdings`) zugeordnet ist.

    """
    portfolio_securities_holdings: dict[tuple[str, str], float] = {}

    for tx in transactions:
        if not tx.security or not tx.portfolio:
            continue  # Überspringe Transaktionen ohne Wertpapier oder Depot

        key = (tx.portfolio, tx.security)
        shares = (
            normalize_shares(tx.shares) if tx.shares else 0
        )  # Wende normalize_shares an

        # Transaktionstypen auswerten
        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            portfolio_securities_holdings[key] = (
                portfolio_securities_holdings.get(key, 0) + shares
            )
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            portfolio_securities_holdings[key] = (
                portfolio_securities_holdings.get(key, 0) - shares
            )

    # Entferne Einträge mit einem Bestand von 0 oder weniger
    return {key: qty for key, qty in portfolio_securities_holdings.items() if qty > 0}


def _resolve_native_amount(
    transaction: Transaction,
    tx_units: dict[str, Any] | None,
) -> tuple[float | None, str | None, float | None]:
    """Return native and account amounts for ``transaction_units`` metadata."""
    if not tx_units:
        return None, None, None

    units = tx_units.get(transaction.uuid)
    if not units:
        return None, None, None

    aggregate: dict[str, Any] | None = None
    entries: list[dict[str, Any]]
    if isinstance(units, list):
        entries = [entry for entry in units if isinstance(entry, dict)]
    elif isinstance(units, dict):
        aggregate = units
        nested = units.get("entries") if "entries" in units else None
        if isinstance(nested, list):
            entries = [entry for entry in nested if isinstance(entry, dict)]
        else:
            entries = [units]
    else:
        return None, None, None

    native_amount: float | None = None
    native_currency: str | None = None
    account_amount: float | None = None

    for entry in entries:
        unit_type_raw = entry.get("type")

        if unit_type_raw is None and (
            "fx_amount" in entry or "fx_currency_code" in entry or "amount" in entry
        ):
            unit_type = 0
        else:
            try:
                unit_type = int(unit_type_raw)
            except (TypeError, ValueError):
                continue

        if unit_type != 0:
            continue

        raw_amount = entry.get("amount")
        if raw_amount is not None:
            if isinstance(raw_amount, (int, float)):
                account_amount = float(raw_amount) / 100.0
            else:
                try:
                    account_amount = float(int(raw_amount)) / 100.0
                except (TypeError, ValueError):
                    account_amount = None

        fx_amount = entry.get("fx_amount")
        if fx_amount is not None:
            if isinstance(fx_amount, (int, float)):
                native_amount = float(fx_amount) / 100.0
            else:
                try:
                    native_amount = float(int(fx_amount)) / 100.0
                except (TypeError, ValueError):
                    native_amount = None

        currency = entry.get("fx_currency_code")
        if isinstance(currency, str):
            native_currency = currency

        if native_amount is not None and account_amount is not None:
            break

    if aggregate:
        if native_amount is None:
            fx_amount = aggregate.get("fx_amount")
            if isinstance(fx_amount, (int, float)):
                native_amount = float(fx_amount) / 100.0
            elif fx_amount is not None:
                try:
                    native_amount = float(int(fx_amount)) / 100.0
                except (TypeError, ValueError):
                    native_amount = None

        if native_currency is None:
            currency = aggregate.get("fx_currency_code")
            if isinstance(currency, str):
                native_currency = currency

    return native_amount, native_currency, account_amount


def db_calculate_sec_purchase_value(
    transactions: list[Transaction],
    db_path: Path,
    *,
    tx_units: dict[str, Any] | None = None,
) -> dict[tuple[str, str], PurchaseComputation]:
    """Berechne den gesamten Kaufpreis und native Durchschnittspreise (FIFO)."""
    portfolio_metrics: dict[tuple[str, str], PurchaseComputation] = {}
    holdings: dict[tuple[str, str], list[_HoldingLot]] = {}

    fx_dates, fx_currencies = _collect_fx_requirements(transactions)
    if fx_currencies:
        ensure_exchange_rates_for_dates_sync(list(fx_dates), fx_currencies, db_path)

    missing_rates_logged: set[tuple[str, datetime]] = set()
    missing_native_logs: set[tuple[str, str]] = set()

    for tx in transactions:
        if not _is_relevant_transaction(tx):
            continue

        key = (tx.portfolio, tx.security)
        normalized = _normalize_transaction_amounts(tx, tx_units)
        shares = normalized.shares
        tx_date = datetime.fromisoformat(tx.date)
        native_amount: float | None = None
        native_currency: str | None = None
        native_account_amount: float | None = None
        if tx.type in PURCHASE_TYPES:
            native_amount, native_currency, native_account_amount = _resolve_native_amount(
                tx,
                tx_units,
            )
        rate, _ = _determine_exchange_rate(
            tx,
            tx_date,
            db_path,
            missing_logged=missing_rates_logged,
        )

        if not rate:
            if (
                tx.type in PURCHASE_TYPES
                and native_amount is None
                and tx.portfolio
                and tx.security
            ):
                warn_key = (tx.portfolio, tx.security)
                if warn_key not in missing_native_logs:
                    missing_native_logs.add(warn_key)
                    _record_missing_native_position(tx.portfolio, tx.security)
                    _LOGGER.warning(
                        (
                            "⚠️ Keine nativen Kaufdaten für Portfolio=%s, Security=%s "
                            "(Transaktion %s). Bitte manuell prüfen."
                        ),
                        tx.portfolio,
                        tx.security,
                        tx.uuid,
                    )
            continue

        if tx.type in PURCHASE_TYPES:
            if shares <= 0:
                continue
            account_total = (
                native_account_amount
                if native_account_amount is not None
                else normalized.net_trade_account
            )
            account_price = account_total / shares if shares > 0 else None
            price_per_share_eur = (
                account_price / rate if account_price is not None else 0.0
            )
            security_total = native_amount
            security_currency = native_currency
            if security_total is None:
                security_total = account_total
                security_currency = security_currency or tx.currency_code
            security_price = (
                security_total / shares if security_total is not None and shares > 0 else None
            )
            native_price = None
            if native_amount is not None and shares > 0:
                native_price = native_amount / shares

            holdings.setdefault(key, []).append(
                _HoldingLot(
                    shares=shares,
                    price_eur=price_per_share_eur,
                    timestamp=tx_date,
                    native_price=native_price,
                    native_currency=native_currency,
                    security_price=security_price,
                    security_currency=security_currency,
                    account_price=account_price,
                    account_currency=tx.currency_code,
                )
            )
        elif tx.type in SALE_TYPES:
            shares_to_sell = abs(shares)
            if shares_to_sell <= 0:
                continue
            holdings[key] = _apply_sale_fifo(holdings.get(key, []), shares_to_sell)

    for key, positions in holdings.items():
        total_purchase = sum(
            lot.shares * lot.price_eur for lot in positions if lot.shares > 0
        )
        total_shares = sum(lot.shares for lot in positions if lot.shares > 0)

        avg_price_native: float | None = None
        native_total = 0.0
        native_shares = 0.0
        security_total = 0.0
        security_shares = 0.0
        account_total = 0.0
        account_shares = 0.0
        for lot in positions:
            if lot.shares <= 0:
                continue
            if lot.native_price is not None:
                native_total += lot.shares * lot.native_price
                native_shares += lot.shares
            if lot.security_price is not None:
                security_total += lot.shares * lot.security_price
                security_shares += lot.shares
            if lot.account_price is not None:
                account_total += lot.shares * lot.account_price
                account_shares += lot.shares

        if total_shares > 0:
            if native_shares and abs(native_shares - total_shares) <= 1e-6:
                avg_price_native = round(native_total / native_shares, 6)

        avg_price_security: float | None = None
        if security_shares and abs(security_shares - total_shares) <= 1e-6:
            avg_price_security = round(security_total / security_shares, 6)

        avg_price_account: float | None = None
        if account_shares and abs(account_shares - total_shares) <= 1e-6:
            avg_price_account = round(account_total / account_shares, 6)

        portfolio_metrics[key] = PurchaseComputation(
            purchase_value=round(total_purchase, 2),
            avg_price_native=avg_price_native,
            security_currency_total=round(security_total, 2) if security_shares else 0.0,
            account_currency_total=round(account_total, 2) if account_shares else 0.0,
            avg_price_security=avg_price_security,
            avg_price_account=avg_price_account,
        )

    return portfolio_metrics


def db_calculate_holdings_value(
    db_path: Path,
    conn: sqlite3.Connection,
    current_hold_pur: dict[tuple[str, str], dict[str, float]],
) -> dict[tuple[str, str], dict[str, float]]:
    """Berechne den aktuellen Wert (``current_value``) für alle Positionen."""
    # Sammle alle benötigten Währungen
    needed_currencies = set()
    cur = conn.cursor()

    for _portfolio_uuid, security_uuid in current_hold_pur:
        cur.execute(
            """
            SELECT currency_code FROM securities WHERE uuid = ?
        """,
            (security_uuid,),
        )
        currency_row = cur.fetchone()
        currency_code = currency_row[0] if currency_row else "EUR"

        if currency_code != "EUR":
            needed_currencies.add(currency_code)

    # Stelle sicher, dass die Wechselkurse verfügbar sind
    today = datetime.now()  # noqa: DTZ005
    ensure_exchange_rates_for_dates_sync([today], needed_currencies, db_path)

    # Lade die Wechselkurse
    fx_rates = load_latest_rates_sync(today, db_path)

    # Lade die aktuellen Preise der Wertpapiere aus der Tabelle "securities"
    cur.execute("SELECT uuid, last_price FROM securities")
    latest_prices = {row[0]: row[1] for row in cur.fetchall()}

    # Lade die Währungen der Wertpapiere
    cur.execute("SELECT uuid, currency_code FROM securities")
    securities = {row[0]: row[1] for row in cur.fetchall()}

    # Berechne den aktuellen Wert für jede Position
    for (portfolio_uuid, security_uuid), data in current_hold_pur.items():
        holdings = data.get("current_holdings", 0)

        # Hole den aktuellen Preis
        latest_price = normalize_raw_price(latest_prices.get(security_uuid, 0.0))

        # Hole die Währung
        currency_code = securities.get(security_uuid, "EUR")

        if currency_code != "EUR":
            rate = fx_rates.get(currency_code)
            if rate:
                latest_price /= rate  # Wende den Wechselkurs an
            else:
                _LOGGER.warning(
                    "⚠️ Kein Wechselkurs für %s gefunden. Überspringe Berechnung.",
                    currency_code,
                )
                data["current_value"] = None
                continue  # Überspringe die Berechnung für diese Währung
        else:
            rate = 1.0  # Für EUR ist der Wechselkurs immer 1.0

        # Berechne den aktuellen Wert
        current_value = holdings * latest_price
        current_hold_pur[(portfolio_uuid, security_uuid)]["current_value"] = round(
            current_value, 2
        )

    return current_hold_pur
