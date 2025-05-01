# custom_components/pp_reader/logic/portfolio.py

import logging
from pathlib import Path
from datetime import datetime
from custom_components.pp_reader.currencies.fx import load_latest_rates, ensure_exchange_rates_for_dates
from ..logic.validators import PPDataValidator  # Neuer Import
from typing import Tuple, Dict, Any
from ..db_access import get_securities, get_portfolio_by_name, get_transactions

_LOGGER = logging.getLogger(__name__)


def normalize_price(raw_price: int) -> float:
    value = raw_price / 10**8
    validator = PPDataValidator()
    result = validator.validate_normalized_value(value, "price")
    if not result.is_valid:
        _LOGGER.warning(result.message)
    return value


def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahlen mit 8 Nachkommastellen


async def calculate_portfolio_value(
    portfolio_name: str,
    reference_date: datetime,
    db_path: Path
) -> Tuple[float, int]:
    """Berechnet den aktuellen Portfolio-Wert und die Anzahl aktiver Positionen."""
    validator = PPDataValidator()
    
    # Daten aus DB laden
    portfolio = get_portfolio_by_name(db_path, portfolio_name)
    if not portfolio:
        _LOGGER.error("Portfolio nicht gefunden: %s", portfolio_name)
        return 0.0, 0
        
    securities = get_securities(db_path)
    transactions = get_transactions(db_path)
    
    total_value = 0.0
    active_positions = 0
    
    try:
        # Lade Währungskurse
        fx_rates = await load_latest_rates(db_path)
        
        for security_id, holdings in calculate_holdings(transactions).items():
            if holdings <= 0:
                continue
                
            try:
                security = securities_by_id[security_id]
            except KeyError:
                _LOGGER.error(f"Wertpapier nicht gefunden: {security_id}")
                continue
                
            # Validiere Währungskurs
            if security.currency_code != "EUR":
                fx_result = validator.validate_fx_rate(
                    "EUR", 
                    security.currency_code,
                    fx_rates.get(security.currency_code, 0)
                )
                if not fx_result.is_valid:
                    _LOGGER.warning(fx_result.message)
                    continue
            
            # Berechne Position
            position_value = calculate_position_value(
                holdings,
                security,
                fx_rates
            )
            
            total_value += position_value
            active_positions += 1
            
        return total_value, active_positions
        
    except Exception as e:
        _LOGGER.exception("Fehler bei Portfolio-Berechnung")
        return 0.0, 0


async def calculate_purchase_sum(
    portfolio,
    transactions,
    securities_by_id,
    reference_date: datetime,
    db_path: Path
) -> float:
    """
    Berechne die Summe der ursprünglichen Kaufpreise (EUR, mit historischer Umrechnung)
    für alle noch aktiven Positionen eines Depots, basierend auf FIFO.
    """
    validator = PPDataValidator()
    total_purchase = 0.0
    
    for tx in transactions:
        result = validator.validate_transaction(tx)
        if not result.is_valid:
            _LOGGER.warning(result.message)
            continue

    # 1. Transaktionen für das Depot filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # 2. Bestände und Kaufhistorie aufbauen
    holdings: dict[str, list[tuple[float, float, datetime]]] = {}

    for tx in sorted(tx_list, key=lambda x: x.date.seconds):  # wichtig: FIFO, daher nach Datum sortieren
        if not tx.HasField("security"):
            continue

        security_id = tx.security
        shares = tx.shares / 10**8  # normalize shares
        amount = tx.amount / 100  # normalize amount (Cent -> EUR)
        tx_date = datetime.fromtimestamp(tx.date.seconds)

        sec = securities_by_id.get(security_id)
        if not sec or shares == 0:
            continue

        currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"

        # Historische Wechselkurse laden
        fx_rates = await load_latest_rates(tx_date, db_path)
        rate = fx_rates.get(currency) if currency != "EUR" else 1.0

        if not rate:
            _LOGGER.warning("⚠️ Kein Wechselkurs verfügbar für %s am %s", currency, tx_date.date())
            continue

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            price_per_share = amount / shares if shares != 0 else 0
            price_per_share_eur = price_per_share / rate
            holdings.setdefault(security_id, []).append((shares, price_per_share_eur, tx_date))

        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            remaining_to_sell = shares
            existing = holdings.get(security_id, [])
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
            holdings[security_id] = updated

    # 3. Jetzt aktuelle Bestände summieren
    total_purchase = 0.0
    for security_id, positions in holdings.items():
        for qty, price, _ in positions:
            if qty <= 0:
                continue
            total_purchase += qty * price

    return round(total_purchase, 2)


def calculate_unrealized_gain(
    current_value: float,
    purchase_sum: float
) -> float:
    return round(current_value - purchase_sum, 2)


def calculate_unrealized_gain_pct(
    current_value: float,
    purchase_sum: float
) -> float:
    if purchase_sum == 0:
        return 0.0
    return round(((current_value - purchase_sum) / purchase_sum) * 100, 2)
