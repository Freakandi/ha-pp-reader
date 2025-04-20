# logic/portfolio.py

def calculate_portfolio_value(portfolio, transactions, securities_by_id):
    """
    Ermittle für jedes aktive Depot:
    - Gesamtwert (EUR, sofern Kurswährung = Basiswährung)
    - Anzahl enthaltener Wertpapiere
    """
    results = []

    # Transaktionen je Depot gruppieren
    tx_by_portfolio = {}
    for tx in transactions:
        if tx.portfolio:
            tx_by_portfolio.setdefault(tx.portfolio, []).append(tx)

    for p in portfolio:
        if p.isRetired:
            continue

        portfolio_id = p.uuid
        portfolio_name = p.name
        tx_list = tx_by_portfolio.get(portfolio_id, [])

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
            if not sec:
                continue
            if not sec.latest:
                continue
            total_value += (sec.latest.close / 100.0) * qty  # Cent → Euro

        results.append({
            "uuid": portfolio_id,
            "name": portfolio_name,
            "value_eur": round(total_value, 2),
            "count": len(active_securities)
        })

    return results

