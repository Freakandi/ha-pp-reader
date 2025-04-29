# custom_components/pp_reader/logic/portfolio.py
import logging
from datetime import datetime
from custom_components.pp_reader.currencies.fx import load_latest_rates, ensure_exchange_rates_for_dates

_LOGGER = logging.getLogger(__name__)

def normalize_price(raw_price: int) -> float:
    return raw_price / 10**8  # Kurswerte mit 8 Nachkommastellen

def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahlen mit 8 Nachkommastellen

async def calculate_portfolio_value(
    portfolio,
    transactions,
    securities_by_id,
    reference_date: datetime,
    file_path: str
) -> tuple[float, int]:
    """
    Ermittle für ein aktives Depot:
    - Gesamtwert (EUR, mit Umrechnung)
    - Anzahl enthaltener Wertpapiere (mit Bestand > 0)
    """

    # 1. Transaktionen für das Depot filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # 2. Bestände berechnen
    holdings: dict[str, float] = {}
    for tx in tx_list:
        if not tx.security:
            continue
        security_id = tx.security
        shares = normalize_shares(tx.shares) if tx.HasField("shares") else 0

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) - shares

    # 3. Nur Wertpapiere mit positivem Bestand berücksichtigen
    active_securities = {sid: qty for sid, qty in holdings.items() if qty > 0}

    # 4. Währungen der gehaltenen Wertpapiere erfassen
    currencies = set()
    for sid in active_securities:
        sec = securities_by_id.get(sid)
        if sec and sec.HasField("currencyCode") and sec.currencyCode != "EUR":
            currencies.add(sec.currencyCode)

    # 5. Sicherstellen, dass alle benötigten Wechselkurse vorhanden sind
    await ensure_exchange_rates_for_dates([reference_date], currencies, file_path)

    # 6. Wechselkurse laden
    fx_rates = await load_latest_rates(reference_date, file_path)

    # 7. Bewertung durchführen
    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.HasField("latest") or sec.latest.close == 0:
            continue

        kurs = normalize_price(sec.latest.close)
        currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"

        if currency != "EUR":
            rate = fx_rates.get(currency)
            if rate:
                kurs = kurs / rate
            else:
                _LOGGER.warning("⚠️ Kein Wechselkurs verfügbar für %s (%s)", sec.name, currency)
                continue

        total_value += qty * kurs

    return round(total_value, 2), len(active_securities)

async def calculate_purchase_sum(
    portfolio,
    transactions,
    securities_by_id,
    reference_date: datetime,
    file_path: str
) -> float:
    """
    Berechne die Summe der ursprünglichen Kaufpreise (EUR, mit historischer Umrechnung)
    für alle noch aktiven Positionen eines Depots, basierend auf FIFO.
    """

    # 1. Transaktionen für das Depot filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # 2. Bestände und Kaufhistorie aufbauen
    holdings: dict[str, list[tuple[float, float, datetime]]] = {}  # {security_id: [(shares, price_per_share_eur, date), ...]}

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

        # Währung ermitteln
        currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"

        # Historische Wechselkurse laden
        fx_rates = await load_latest_rates(tx_date, file_path)
        rate = fx_rates.get(currency) if currency != "EUR" else 1.0

        if not rate:
            print(f"⚠️ Kein Wechselkurs verfügbar für {currency} am {tx_date.date()}, Papier: {sec.name}")
            continue

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            price_per_share = amount / shares if shares != 0 else 0
            price_per_share_eur = price_per_share / rate
            holdings.setdefault(security_id, []).append((shares, price_per_share_eur, tx_date))

        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            # Verkaufte Stücke FIFO reduzieren
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
    """
    Berechne den absoluten Gewinn oder Verlust auf Basis aktueller Wertentwicklung.
    """
    return round(current_value - purchase_sum, 2)

def calculate_unrealized_gain_pct(
    current_value: float,
    purchase_sum: float
) -> float:
    """
    Berechne die prozentuale Veränderung auf Basis aktueller Wertentwicklung.
    """
    if purchase_sum == 0:
        return 0.0
    return round(((current_value - purchase_sum) / purchase_sum) * 100, 2)
