# custom_components/pp_reader/logic/portfolio.py

import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

from ..currencies.fx import load_latest_rates, ensure_exchange_rates_for_dates
from ..data.db_access import (
    get_portfolio_by_uuid,
    get_transactions,
    get_securities_by_id,
    Transaction,
    get_portfolio_securities
)

_LOGGER = logging.getLogger(__name__)

def normalize_price(raw_price: int) -> float:
    return raw_price / 10**8  # Kurswerte mit 8 Nachkommastellen

def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahlen mit 8 Nachkommastellen

def calculate_holdings(transactions: List[Transaction]) -> Dict[str, float]:
    """Berechnet aktuelle Bestände aus Transaktionen."""
    holdings: Dict[str, float] = {}
    for tx in transactions:
        if not tx.security:
            continue
        shares = normalize_shares(tx.shares) if tx.shares else 0

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY  
            holdings[tx.security] = holdings.get(tx.security, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[tx.security] = holdings.get(tx.security, 0) - shares
            
    return holdings

async def calculate_portfolio_value(
    portfolio_uuid: str,
    reference_date: datetime,
    db_path: Path
) -> Tuple[float, int]:
    """Berechnet den aktuellen Portfolio-Wert und die Anzahl aktiver Positionen."""
    
    portfolio = get_portfolio_by_uuid(db_path, portfolio_uuid)
    if not portfolio:
        _LOGGER.error("Portfolio nicht gefunden: %s", portfolio_uuid)
        return 0.0, 0
        
    transactions = get_transactions(db_path)
    securities_by_id = get_securities_by_id(db_path)
    
    # Nur Transaktionen des Portfolios
    portfolio_transactions = [tx for tx in transactions if tx.portfolio == portfolio.uuid]
    
    # Bestände berechnen
    holdings = calculate_holdings(portfolio_transactions)
    active_securities = {sid: qty for sid, qty in holdings.items() if qty > 0}
    
    # Währungen ermitteln 
    currencies = set()
    for sid in active_securities:
        sec = securities_by_id.get(sid)
        if sec and sec.currency_code != "EUR":
            currencies.add(sec.currency_code)
            
    # Wechselkurse sicherstellen und laden
    await ensure_exchange_rates_for_dates([reference_date], currencies, db_path)
    fx_rates = await load_latest_rates(reference_date, db_path)
    
    # Depotwert berechnen
    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.last_price:
            continue
            
        kurs = normalize_price(sec.last_price)
        if sec.currency_code != "EUR":
            rate = fx_rates.get(sec.currency_code)
            if rate:
                kurs = kurs / rate
            else:
                _LOGGER.warning("⚠️ Kein Wechselkurs für %s (%s)", sec.name, sec.currency_code)
                continue
                
        total_value += qty * kurs
        
    return round(total_value, 2), len(active_securities)


async def calculate_purchase_sum(
    portfolio_uuid: str,  # Änderung: Name → UUID
    db_path: Path
) -> float:
    """Berechnet die Kaufsumme für aktive Positionen (FIFO)."""
    
    portfolio = get_portfolio_by_uuid(db_path, portfolio_uuid)
    if not portfolio:
        _LOGGER.error("Portfolio nicht gefunden: %s", portfolio_uuid)
        return 0.0
    
    transactions = get_transactions(db_path)
    securities_by_id = get_securities_by_id(db_path)
    
    # Nur Portfolio-Transaktionen, nach Datum sortiert
    portfolio_transactions = sorted(
        [tx for tx in transactions if tx.portfolio == portfolio.uuid],
        key=lambda x: datetime.fromisoformat(x.date)
    )
    
    holdings: Dict[str, List[Tuple[float, float, datetime]]] = {}
    
    # Vor der Transaktionsverarbeitung: Alle benötigten Währungen und Daten sammeln
    fx_dates = set()
    fx_currencies = set()
    
    for tx in portfolio_transactions:
        if not tx.security:
            continue
        sec = securities_by_id.get(tx.security)
        if sec and sec.currency_code != "EUR":
            fx_currencies.add(sec.currency_code)
            fx_dates.add(datetime.fromisoformat(tx.date))
    
    # Wechselkurse vorab laden
    if fx_currencies:
        await ensure_exchange_rates_for_dates(list(fx_dates), fx_currencies, db_path)
    
    for tx in portfolio_transactions:
        if not tx.security:
            continue
            
        shares = normalize_shares(tx.shares) if tx.shares else 0
        amount = tx.amount / 100  # Cent -> EUR
        tx_date = datetime.fromisoformat(tx.date)
        
        sec = securities_by_id.get(tx.security)
        if not sec or shares == 0:
            continue
            
        # Wechselkurs laden
        fx_rates = await load_latest_rates(tx_date, db_path)
        rate = fx_rates.get(sec.currency_code) if sec.currency_code != "EUR" else 1.0
        
        if not rate:
            _LOGGER.warning("⚠️ Kein Wechselkurs für %s am %s", sec.currency_code, tx_date.date())
            continue
            
        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            price_per_share = amount / shares if shares != 0 else 0
            price_per_share_eur = price_per_share / rate
            holdings.setdefault(tx.security, []).append((shares, price_per_share_eur, tx_date))
            
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            remaining_to_sell = shares
            existing = holdings.get(tx.security, [])
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
                    
            holdings[tx.security] = updated
            
    # Summe der verbleibenden Positionen
    total_purchase = 0.0
    for positions in holdings.values():
        for qty, price, _ in positions:
            if qty <= 0:
                continue
            total_purchase += qty * price
            
    return round(total_purchase, 2)


def calculate_unrealized_gain(current_value: float, purchase_sum: float) -> float:
    return round(current_value - purchase_sum, 2)


def calculate_unrealized_gain_pct(current_value: float, purchase_sum: float) -> float:
    if purchase_sum == 0:
        return 0.0
    return round(((current_value - purchase_sum) / purchase_sum) * 100, 2)


def db_calculate_portfolio_value_and_count(
    portfolio_uuid: str,
    db_path: Path
) -> Tuple[float, int]:
    """
    Berechnet den aktuellen Wert eines Depots und die Anzahl der darin enthaltenen Wertpapiere.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        Tuple[float, int]: Der aktuelle Wert des Depots (in EUR) und die Anzahl der enthaltenen Wertpapiere.
    """
    # Lade die Wertpapiere des Depots aus der Tabelle portfolio_securities
    portfolio_securities = get_portfolio_securities(db_path, portfolio_uuid)

    total_value = 0.0
    active_securities_count = 0

    for ps in portfolio_securities:
        if ps.current_value and ps.current_value > 0:
            total_value += ps.current_value / 100  # Cent -> EUR
            active_securities_count += 1

    return round(total_value, 2), active_securities_count


def db_calculate_portfolio_value_only(
    portfolio_uuid: str,
    db_path: Path
) -> float:
    """
    Berechnet nur den aktuellen Wert eines Depots.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        float: Der aktuelle Wert des Depots (in EUR).
    """
    total_value, _ = db_calculate_portfolio_value_and_count(portfolio_uuid, db_path)
    return total_value


def db_calculate_portfolio_securities_count(
    portfolio_uuid: str,
    db_path: Path
) -> int:
    """
    Berechnet nur die Anzahl der Wertpapiere in einem Depot.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        int: Die Anzahl der Wertpapiere im Depot.
    """
    _, securities_count = db_calculate_portfolio_value_and_count(portfolio_uuid, db_path)
    return securities_count


def db_calculate_portfolio_purchase_sum(
    portfolio_uuid: str,
    db_path: Path
) -> float:
    """
    Berechnet die Kaufsumme (purchase_sum) für ein Depot basierend auf den Kaufpreisen
    der darin enthaltenen Wertpapiere.

    Args:
        portfolio_uuid (str): Die UUID des Depots.
        db_path (Path): Pfad zur SQLite-Datenbank.

    Returns:
        float: Die Kaufsumme des Depots (in EUR).
    """
    # Lade die Wertpapiere des Depots aus der Tabelle portfolio_securities
    portfolio_securities = get_portfolio_securities(db_path, portfolio_uuid)

    total_purchase_sum = 0.0
    for ps in portfolio_securities:
        if ps.purchase_value and ps.purchase_value > 0:
            total_purchase_sum += ps.purchase_value / 100  # Cent -> EUR

    return round(total_purchase_sum, 2)
