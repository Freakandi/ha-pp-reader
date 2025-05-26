import logging
from typing import Dict, List, Tuple
from datetime import datetime
from pathlib import Path
import sqlite3
from ..data.db_access import Transaction
from ..currencies.fx import ensure_exchange_rates_for_dates, load_latest_rates_sync, ensure_exchange_rates_for_dates_sync
from ..logic.portfolio import normalize_shares, normalize_price

_LOGGER = logging.getLogger(__name__)

def db_calculate_current_holdings(transactions: List[Transaction]) -> Dict[Tuple[str, str], float]:
    """
    Berechnet die aktuell im Bestand befindliche Anzahl pro Wertpapier (security) und Depot (portfolio).

    Args:
        transactions (List[Transaction]): Liste aller Transaktionen aus der Datenbank.

    Returns:
        Dict[Tuple[str, str], float]: Ein Dictionary, das die Kombination aus Depot-UUID (`portfolio_uuid`)
                                      und Wertpapier-UUID (`security_uuid`) den aktuellen Beständen (`current_holdings`) zuordnet.
    """
    portfolio_securities_holdings: Dict[Tuple[str, str], float] = {}

    for tx in transactions:
        if not tx.security or not tx.portfolio:
            continue  # Überspringe Transaktionen ohne zugeordnetes Wertpapier oder Depot

        key = (tx.portfolio, tx.security)
        shares = normalize_shares(tx.shares) if tx.shares else 0  # Wende normalize_shares an

        # _LOGGER.debug(
        #     "Berechne current_holdings: portfolio_uuid=%s, security_uuid=%s, shares=%f",
        #     tx.portfolio, tx.security, shares
        # )

        # Transaktionstypen auswerten
        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            portfolio_securities_holdings[key] = portfolio_securities_holdings.get(key, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            portfolio_securities_holdings[key] = portfolio_securities_holdings.get(key, 0) - shares

    # Entferne Einträge mit einem Bestand von 0 oder weniger
    portfolio_securities_holdings = {key: qty for key, qty in portfolio_securities_holdings.items() if qty > 0}

    return portfolio_securities_holdings

def db_calculate_sec_purchase_value(transactions: List[Transaction], db_path: Path) -> Dict[Tuple[str, str], float]:
    """
    Berechnet den gesamten Kaufpreis des aktuellen Bestands pro Wertpapier (FIFO) und Depot.

    Args:
        transactions (List[Transaction]): Liste aller Transaktionen aus der Datenbank.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        Dict[Tuple[str, str], float]: Ein Dictionary, das die Kombination aus Depot-UUID (`portfolio_uuid`)
                                      und Wertpapier-UUID (`security_uuid`) den gesamten Kaufpreisen (`purchase_value`) zuordnet.
    """
    portfolio_securities_purchase_values: Dict[Tuple[str, str], float] = {}
    holdings: Dict[Tuple[str, str], List[Tuple[float, float, datetime]]] = {}  # FIFO-Liste pro Depot und Wertpapier

    # Vor der Transaktionsverarbeitung: Alle benötigten Währungen und Daten sammeln
    fx_dates = set()
    fx_currencies = set()

    for tx in transactions:
        if not tx.security or not tx.portfolio:
            continue
        if tx.currency_code != "EUR":
            fx_currencies.add(tx.currency_code)
            fx_dates.add(datetime.fromisoformat(tx.date))

    # Wechselkurse vorab laden
    if fx_currencies:
        ensure_exchange_rates_for_dates(list(fx_dates), fx_currencies, db_path)

    for tx in transactions:
        if not tx.security or not tx.portfolio:
            continue

        key = (tx.portfolio, tx.security)
        shares = normalize_shares(tx.shares) if tx.shares else 0  # Wende normalize_shares an
        amount = tx.amount / 100  # Cent -> EUR
        tx_date = datetime.fromisoformat(tx.date)

        # Wechselkurs laden (synchron)
        fx_rates = load_latest_rates_sync(tx_date, db_path)
        rate = fx_rates.get(tx.currency_code) if tx.currency_code != "EUR" else 1.0

        if tx.currency_code != "EUR":
            if not rate:
                _LOGGER.warning(
                    "⚠️ Kein Wechselkurs gefunden: Datum=%s, Währung=%s",
                    tx_date.strftime("%Y-%m-%d"), tx.currency_code
                )
            # else:
            #     _LOGGER.debug(
            #         "Wechselkurs gefunden: Datum=%s, Währung=%s, Kurs=%f",
            #         tx_date.strftime("%Y-%m-%d"), tx.currency_code, rate
            #     )

        if not rate:
            continue  # Überspringe Transaktionen ohne gültigen Wechselkurs

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            price_per_share = amount / shares if shares != 0 else 0
            price_per_share_eur = price_per_share / rate
            holdings.setdefault(key, []).append((shares, price_per_share_eur, tx_date))

        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            remaining_to_sell = shares
            existing = holdings.get(key, [])
            updated = []

            for qty, price, date in existing:
                if remaining_to_sell <= 0:
                    updated.append((qty, price, date))
                    continue
                if qty > remaining_to_sell:
                    updated.append((qty - remaining_to_sell, price, date))
                    remaining_to_sell = 0
                else:
                    remaining_to_sell -= qty

            holdings[key] = updated

    # Summe der verbleibenden Positionen berechnen
    for key, positions in holdings.items():
        total_purchase = 0.0
        for qty, price, _ in positions:
            if qty > 0:
                total_purchase += qty * price
        portfolio_securities_purchase_values[key] = round(total_purchase, 2)

        # _LOGGER.debug(
        #     "Berechne purchase_value: portfolio_uuid=%s, security_uuid=%s, total_purchase=%f",
        #     key[0], key[1], total_purchase
        # )

    return portfolio_securities_purchase_values

def db_calculate_holdings_value(
    db_path: Path,
    conn: sqlite3.Connection,
    current_hold_pur: Dict[Tuple[str, str], Dict[str, float]]
) -> Dict[Tuple[str, str], Dict[str, float]]:
    """
    Berechnet den aktuellen Wert (current_value) für jede Position in current_holdings.

    Args:
        db_path (Path): Pfad zur SQLite-Datenbank.
        conn (sqlite3.Connection): Bestehende Verbindung zur SQLite-Datenbank.
        current_holdings (Dict[Tuple[str, str], Dict[str, float]]): Dictionary mit Beständen und Kaufwerten.

    Returns:
        Dict[Tuple[str, str], Dict[str, float]]: Das ursprüngliche Dictionary, ergänzt um den aktuellen Wert (current_value).
    """
    # _LOGGER.debug("db_calculate_holdings_value: Berechnung des aktuellen Werts gestartet.")

    # Sammle alle benötigten Währungen
    needed_currencies = set()
    cur = conn.cursor()

    for (portfolio_uuid, security_uuid), data in current_hold_pur.items():
        cur.execute("""
            SELECT currency_code FROM securities WHERE uuid = ?
        """, (security_uuid,))
        currency_row = cur.fetchone()
        currency_code = currency_row[0] if currency_row else "EUR"

        if (currency_code != "EUR"):
            needed_currencies.add(currency_code)

    # Stelle sicher, dass die Wechselkurse verfügbar sind
    today = datetime.now()
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
                # _LOGGER.debug("Angewendeter Wechselkurs für %s: %f", currency_code, rate)
            else:
                _LOGGER.warning("⚠️ Kein Wechselkurs für %s gefunden. Überspringe Berechnung.", currency_code)
                continue  # Überspringe die Berechnung für diese Währung
        else:
            rate = 1.0  # Für EUR ist der Wechselkurs immer 1.0

        # Berechne den aktuellen Wert
        current_value = holdings * latest_price
        current_hold_pur[(portfolio_uuid, security_uuid)]["current_value"] = round(current_value, 2)

        # _LOGGER.debug(
        #     "Berechneter Wert: portfolio_uuid=%s, security_uuid=%s, current_value=%f",
        #     portfolio_uuid, security_uuid, current_value
        # )

    return current_hold_pur