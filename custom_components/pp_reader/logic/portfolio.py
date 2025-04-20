# logic/portfolio.py

def calculate_portfolio_value(portfolio, transactions, securities_by_id):
    """
    Ermittle für ein einzelnes aktives Depot:
    - Gesamtwert (EUR, sofern Kurswährung = Basiswährung)
    - Anzahl enthaltener Wertpapiere
    """
    if getattr(portfolio, "isRetired", False):
        return 0.0, 0

    portfolio_id = portfolio.uuid

    # Transaktionen zu diesem Portfolio filtern
    tx_list = [tx for tx in transactions if tx.portfolio == portfolio_id]

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

    total_value = 0.0
    for sid, qty in active_securities.items():
        sec = securities_by_id.get(sid)
        if not sec or not sec.latest:
            continue
        total_value += (sec.latest.close / 100.0) * qty  # Cent → Euro

    return round(total_value, 2), len(active_securities)

