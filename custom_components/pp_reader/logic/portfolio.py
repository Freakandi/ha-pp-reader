# logic/portfolio.py

def normalize_price(raw_price: int) -> float:
    """Wandle Kurswert aus Portfolio Performance in echte Euro um (Skalierung beachten)."""
    return raw_price / 10**16  # empirisch ermittelt, siehe PortfolioSnapshot.java

def calculate_portfolio_value(portfolio, transactions, securities):
    """
    Ermittle für ein aktives Depot:
    - Gesamtwert (EUR)
    - Anzahl enthaltener Wertpapiere
    """

    # Transaktionen zu diesem Depot herausfiltern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio.uuid]

    # Enthaltene Wertpapiere und Anteile bestimmen
    holdings = {}
    for tx in tx_list:
        if not tx.security:
            continue
        security_id = tx.security
        shares = tx.shares if tx.shares else 0

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) + shares
        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            holdings[security_id] = holdings.get(security_id, 0) - shares

    # Nur Papiere mit Bestand > 0 werten
    active_securities = {
        sid: qty for sid, qty in holdings.items() if qty > 0
    }

    # Wert berechnen
    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.latest:
            continue
        total_value += normalize_price(sec.latest.close) * qty

    return round(total_value, 2), len(active_securities)

