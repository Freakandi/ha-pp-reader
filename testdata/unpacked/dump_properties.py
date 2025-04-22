from client_pb2 import PClient

with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]
client = PClient()
client.ParseFromString(raw)

print("=== Properties ===")
for key, value in client.properties.items():
    print(f"{key} = {value}")

print("\n=== AttributeTypes (aus settings) ===")
for a in client.settings.attributeTypes:
    print(f"- {a.name} ({a.id})")

print("\n=== Configuration Sets ===")
for c in client.settings.configurationSets:
    print(f"- {c.name} ({c.key})")
