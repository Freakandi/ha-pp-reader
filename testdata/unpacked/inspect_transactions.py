from client_pb2 import PClient

with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]
client = PClient()
client.ParseFromString(raw)

print("🔍 Transaktionen in Fremdwährungen:\n")

for tx in client.transactions:
    if tx.currencyCode != "EUR":
        print(f"{tx.date.ToDatetime().date()} | Typ {tx.type} | {tx.amount / 100:.2f} {tx.currencyCode}")

        if tx.units:
            for unit in tx.units:
                print(f"  ↳ Unit-Type: {unit.type} | Betrag: {unit.amount / 100:.2f} {unit.currencyCode}")
                if unit.HasField("fxRateToBase"):
                    r = unit.fxRateToBase
                    try:
                        fx_value = int.from_bytes(r.value, "big") / 10**r.scale
                        print(f"     fxRateToBase = {fx_value:.6f} (Skalierung: 10^{r.scale})")
                    except:
                        print(f"     fxRateToBase: raw = {r.value}")
        print()
