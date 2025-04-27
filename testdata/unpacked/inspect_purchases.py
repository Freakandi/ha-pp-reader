from client_pb2 import PClient
from datetime import datetime
from collections import defaultdict

# Hilfsfunktionen
def normalize_shares(raw_shares):
    return raw_shares / 10**8

def normalize_amount(raw_amount):
    return raw_amount / 100  # Cent → Euro

# Lade Portfolio-Datei
with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]

client = PClient()
client.ParseFromString(raw)

# Mapping Wertpapier-ID auf Name
securities_by_id = {sec.uuid: sec.name for sec in client.securities}

# Depot-Transaktionen aufbauen
depot_transaktionen = defaultdict(list)

for tx in client.transactions:
    if not tx.HasField("security"):
        continue
    portfolio_id = tx.portfolio
    depot_transaktionen[portfolio_id].append(tx)

# Auswertung für jedes Depot
for portfolio in client.portfolios:
    if getattr(portfolio, "isRetired", False):
        continue

    print(f"\n📈 Depot: {portfolio.name}")

    tx_list = depot_transaktionen.get(portfolio.uuid, [])

    # FIFO-Listen pro Wertpapier
    holdings = defaultdict(list)  # {security_id: [(shares, price_per_share, kaufdatum), ...]}

    for tx in sorted(tx_list, key=lambda x: x.date.seconds):
        security_id = tx.security
        shares = normalize_shares(tx.shares) if tx.HasField("shares") else 0
        amount = normalize_amount(tx.amount)
        tx_date = datetime.fromtimestamp(tx.date.seconds)

        if shares == 0:
            continue

        if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
            price_per_share = amount / shares if shares != 0 else 0
            holdings[security_id].append((shares, price_per_share, tx_date))
            print(f"  ➕ Kauf: {shares:.4f} Stück @ {price_per_share:.2f} EUR (Originalwährung) am {tx_date.strftime('%d.%m.%Y')}")

        elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
            print(f"  ➖ Verkauf: {shares:.4f} Stück am {tx_date.strftime('%d.%m.%Y')}")
            remaining_to_sell = shares
            updated = []
            for qty, price, date in holdings.get(security_id, []):
                if remaining_to_sell <= 0:
                    updated.append((qty, price, date))
                    continue
                if qty > remaining_to_sell:
                    updated.append((qty - remaining_to_sell, price, date))
                    remaining_to_sell = 0
                else:
                    remaining_to_sell -= qty
            holdings[security_id] = updated

    # Berechnung Gesamtkaufsumme pro Wertpapier
    depot_total = 0.0
    for security_id, positions in holdings.items():
        if not positions:
            continue

        sec_name = securities_by_id.get(security_id, "Unbekannt")
        print(f"\n  📦 Wertpapier: {sec_name} ({security_id})")
        total_purchase = 0.0

        for qty, price, date in positions:
            if qty <= 0:
                continue
            wert = qty * price
            print(f"    - {qty:.4f} Stück @ {price:.2f} EUR/Stk, Kaufdatum: {date.strftime('%d.%m.%Y')} (Wert: {wert:.2f} EUR)")
            total_purchase += wert

        print(f"    💶 Gesamtkaufsumme für Papier: {total_purchase:.2f} EUR\n")
        depot_total += total_purchase

    print(f"  💰 Gesamtkaufsumme für Depot: {depot_total:.2f} EUR\n")
