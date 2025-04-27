# custom_components/pp_reader/logic/portfolio.py
from datetime import datetime
from custom_components.pp_reader.currencies.fx import load_latest_rates

def normalize_price(raw_price: int) -> float:
    return raw_price / 10**8  # Kurswerte mit 8 Nachkommastellen

def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahlen mit 8 Nachkommastellen

async def calculate_portfolio_value(
    portfolio,
    transactions,
    securities_by_id,
    reference_date: datetime
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
    active_securities = {
        sid: qty for sid, qty in holdings.items() if qty > 0
    }

    # 4. Wechselkurse asynchron aus Cache laden
    fx_rates = await load_latest_rates(reference_date)

    # 5. Bewertung durchführen
    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.HasField("latest") or sec.latest.close == 0:
            continue

        kurs = normalize_price(sec.latest.close)
        currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"

        # Umrechnung falls nötig
        if currency != "EUR":
            rate = fx_rates.get(currency)
            if rate:
                kurs = kurs / rate
            else:
                print(f"⚠️ Kein Wechselkurs verfügbar für {currency}, Papier: {sec.name}")
                continue

        total_value += qty * kurs

    return round(total_value, 2), len(active_securities)

async def calculate_purchase_sum(
    portfolio,
    transactions,
    securities_by_id,
    reference_date: datetime
) -> float:
    """
    Berechne die Summe der ursprünglichen Kaufpreise (EUR, mit historischer Umrechnung)
    für alle noch aktiven Positionen eines Depots.
    """

    # 1. Transaktionen für das Depot filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # 2. Bestände berechnen und Kaufdetails sammeln
    holdings: dict[str, float] = {}
    purchases: list[tuple[str, float, float, datetime]] = []  # (security_id, shares, purchase_price, purchase_date)

    for tx in tx_list:
        if not tx.security:
            continue

        security_id = tx.security
        shares = normalize_shares(tx.shares) if tx.HasField("shares") else 0

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) + shares
            if shares > 0:
                # Kaufdetails merken (für spätere Währungsumrechnung)
                purchases.append((
                    security_id,
                    shares,
                    normalize_price(tx.amount / shares * 100) if tx.amount != 0 else 0,  # aus Transaktion ableiten
                    datetime.fromtimestamp(tx.date / 1000)  # Kaufdatum
                ))
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) - shares

    active_securities = {
        sid: qty for sid, qty in holdings.items() if qty > 0
    }

    # 3. Kaufpreise summieren – jetzt korrekt mit Kurs zum Kaufdatum
    total_purchase = 0.0
    for sid, shares, price_per_share, purchase_date in purchases:
        if sid not in active_securities:
            continue  # Nur aktive Positionen zählen

        sec = securities_by_id.get(sid)
        if not sec:
            continue

        currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"

        # Lokalen Wechselkurs für Kaufdatum laden
        fx_rates = await load_latest_rates(purchase_date)
        if currency != "EUR":
            rate = fx_rates.get(currency)
            if rate:
                price_per_share = price_per_share / rate
            else:
                print(f"⚠️ Kein Wechselkurs verfügbar für {currency} am {purchase_date.date()}, Papier: {sec.name}")
                continue

        total_purchase += shares * price_per_share

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
