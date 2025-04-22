from client_pb2 import PClient
from google.protobuf.timestamp_pb2 import Timestamp

# === Datei laden ===
with open("data.portfolio", "rb") as f:
    raw_data = f.read()[8:]  # Strip "PPPBV1" + Versionsbyte

client = PClient()
client.ParseFromString(raw_data)

# === Portfolios extrahieren ===
portfolios = {p.uuid: p.name for p in client.portfolios}
tr_uuid = next((uuid for uuid, name in portfolios.items() if "Trade Republic" in name), None)
if not tr_uuid:
    print("❌ Kein Trade Republic-Depot gefunden.")
    exit(1)

# === Transaktionen + Wertpapiere indexieren ===
transactions = [tx for tx in client.transactions if tx.portfolio == tr_uuid]
securities_by_id = {s.uuid: s for s in client.securities}

# === Normalisierungen
def normalize_price(raw_price: int) -> float:
    return raw_price / 10**8  # Kurs: 8 Nachkommastellen

def normalize_shares(raw_shares: int) -> float:
    return raw_shares / 10**8  # Stückzahl: 8 Nachkommastellen

def normalize_rate(rate) -> float:
    return rate.value.value / 10**8  # Kurs in EUR (aus PDecimalValue)

# === EUR-Umrechnungskurse vorbereiten
eur_rates = {}
for series in client.ecbData.series:
    if series.baseCurrency == "EUR":
        for r in series.exchangeRates:
            eur_rates[series.termCurrency] = normalize_rate(r)

# === Anteile berechnen
holdings = {}
for tx in transactions:
    if not tx.HasField("security"):
        continue
    sid = tx.security
    shares = normalize_shares(tx.shares) if tx.HasField("shares") else 0

    if tx.type in (0, 2):  # PURCHASE, INBOUND_DELIVERY
        holdings[sid] = holdings.get(sid, 0) + shares
    elif tx.type in (1, 3):  # SALE, OUTBOUND_DELIVERY
        holdings[sid] = holdings.get(sid, 0) - shares

# === Ausgabe der aktiven Positionen inkl. Währungsumrechnung
print("\n📊 Aktive Positionen (Bestand > 0):\n")
gesamtwert = 0.0
for sid, qty in holdings.items():
    if qty <= 0:
        continue
    sec = securities_by_id.get(sid)
    if not sec or not sec.HasField("latest") or sec.latest.close == 0:
        continue

    kurs = normalize_price(sec.latest.close)
    currency = sec.currencyCode if sec.HasField("currencyCode") else "EUR"
    umrechnung = eur_rates.get(currency, 1.0)
    wert = kurs * qty * umrechnung

    if currency != "EUR":
        print(f"{sec.name}: {qty:.2f} Anteile × {kurs:.2f} {currency} × {umrechnung:.4f} EUR → {wert:.2f} €")
    else:
        print(f"{sec.name}: {qty:.2f} Anteile × {kurs:.2f} € = {wert:.2f} €")

    gesamtwert += wert

print(f"\n🧮 Berechneter Depotwert (Trade Republic, EUR): {gesamtwert:.2f} €")

