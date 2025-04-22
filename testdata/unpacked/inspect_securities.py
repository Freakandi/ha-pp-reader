from client_pb2 import PClient

with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]

client = PClient()
client.ParseFromString(raw)

print("🔍 Nicht in EUR notierte Wertpapiere:\n")

for sec in client.securities:
    if sec.HasField("currencyCode") and sec.currencyCode != "EUR":
        print(f"📈 {sec.name}")
        print(f"  - Währung: {sec.currencyCode}")
        
        if sec.attributes:
            print("  - Attributes:")
            for attr in sec.attributes:
                print(f"    {attr.key} = {attr.value}")

        if sec.properties:
            print("  - Properties:")
            for prop in sec.properties:
                print(f"    {prop.key} = {prop.value}")
        print()
