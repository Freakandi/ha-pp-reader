"""
Provide functions for various calculations.

Holdings, purchase values, and current values of securities
in a portfolio. Includes utilities for handling transactions,
exchange rates, and database interactions.
"""

import logging
import sqlite3
from datetime import datetime
from pathlib import Path

from custom_components.pp_reader.currencies.fx import (
    ensure_exchange_rates_for_dates_sync,
    load_latest_rates_sync,
)
from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.logic.portfolio import (
    normalize_price,
    normalize_shares,
)

_LOGGER = logging.getLogger(__name__)

PURCHASE_TYPES = {0, 2}
SALE_TYPES = {1, 3}


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
    transaction: Transaction, tx_date: datetime, db_path: Path
) -> float | None:
    """Load the exchange rate for a transaction."""
    fx_rates = load_latest_rates_sync(tx_date, db_path)

    if transaction.currency_code == "EUR":
        return 1.0

    rate = fx_rates.get(transaction.currency_code)
    if not rate:
        _LOGGER.warning(
            "⚠️ Kein Wechselkurs gefunden: Datum=%s, Währung=%s",
            tx_date.strftime("%Y-%m-%d"),
            transaction.currency_code,
        )

    return rate


def _apply_sale_fifo(
    existing_holdings: list[tuple[float, float, datetime]],
    shares_to_sell: float,
) -> list[tuple[float, float, datetime]]:
    """Reduce holdings using FIFO when selling shares."""
    remaining_to_sell = shares_to_sell
    updated_positions: list[tuple[float, float, datetime]] = []

    for qty, price, date in existing_holdings:
        if remaining_to_sell <= 0:
            updated_positions.append((qty, price, date))
            continue

        if qty > remaining_to_sell:
            updated_positions.append((qty - remaining_to_sell, price, date))
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


def db_calculate_sec_purchase_value(
    transactions: list[Transaction], db_path: Path
) -> dict[tuple[str, str], float]:
    """Berechne den gesamten Kaufpreis des aktuellen Bestands (FIFO)."""
    portfolio_securities_purchase_values: dict[tuple[str, str], float] = {}
    holdings: dict[tuple[str, str], list[tuple[float, float, datetime]]] = {}

    fx_dates, fx_currencies = _collect_fx_requirements(transactions)
    if fx_currencies:
        ensure_exchange_rates_for_dates_sync(list(fx_dates), fx_currencies, db_path)

    for tx in transactions:
        if not _is_relevant_transaction(tx):
            continue

        key = (tx.portfolio, tx.security)
        shares = normalize_shares(tx.shares) if tx.shares else 0
        amount = tx.amount / 100  # Cent -> EUR
        tx_date = datetime.fromisoformat(tx.date)
        rate = _determine_exchange_rate(tx, tx_date, db_path)

        if not rate:
            continue

        if tx.type in PURCHASE_TYPES:
            price_per_share = amount / shares if shares != 0 else 0
            price_per_share_eur = price_per_share / rate
            holdings.setdefault(key, []).append((shares, price_per_share_eur, tx_date))
        elif tx.type in SALE_TYPES:
            holdings[key] = _apply_sale_fifo(holdings.get(key, []), shares)

    for key, positions in holdings.items():
        total_purchase = sum(qty * price for qty, price, _ in positions if qty > 0)
        portfolio_securities_purchase_values[key] = round(total_purchase, 2)

    return portfolio_securities_purchase_values


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
        latest_price = normalize_price(latest_prices.get(security_uuid, 0.0))

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
                continue  # Überspringe die Berechnung für diese Währung
        else:
            rate = 1.0  # Für EUR ist der Wechselkurs immer 1.0

        # Berechne den aktuellen Wert
        current_value = holdings * latest_price
        current_hold_pur[(portfolio_uuid, security_uuid)]["current_value"] = round(
            current_value, 2
        )

    return current_hold_pur
