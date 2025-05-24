from typing import Dict, List, Tuple
from datetime import datetime
from pathlib import Path
from ..data.db_access import Transaction
from ..logic.portfolio import normalize_shares, normalize_price
from ..currencies.fx import load_latest_rates, ensure_exchange_rates_for_dates

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
        shares = normalize_shares(tx.shares) if tx.shares else 0  # Stückzahlen normalisieren

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
        shares = normalize_shares(tx.shares) if tx.shares else 0
        amount = tx.amount / 100  # Cent -> EUR
        tx_date = datetime.fromisoformat(tx.date)

        # Wechselkurs laden
        fx_rates = load_latest_rates(tx_date, db_path)
        rate = fx_rates.get(tx.currency_code) if tx.currency_code != "EUR" else 1.0

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

    return portfolio_securities_purchase_values