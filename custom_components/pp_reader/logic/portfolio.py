from datetime import datetime
from custom_components.pp_reader.currencies.fx import load_latest_rates

def normalize_price(raw_price: int) -> float:
    return raw_price / 10**8  # Kurswerte mit 8 Nachkommastellen

def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahlen mit 8 Nachkommastellen

def calculate_portfolio_value(portfolio, transactions, securities_by_id, reference_date: datetime):
    """
    Ermittle für ein aktives Depot:
    - Gesamtwert (EUR, mit Umrechnung)
    - Anzahl enthaltener Wertpapiere (mit Bestand > 0)
    """

    # 1. Transaktionen für das Depot filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # 2. Bestände berechnen
    holdings = {}
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

    # 4. Wechselkurse aus Cache laden
    fx_rates = load_latest_rates(reference_date)

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
                kurs *= rate
            else:
                print(f"⚠️ Kein Wechselkurs verfügbar für {currency}, Papier: {sec.name}")
                continue

        total_value += qty * kurs

    return round(total_value, 2), len(active_securities)

