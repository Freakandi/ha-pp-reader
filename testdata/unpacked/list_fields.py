from client_pb2 import PClient

with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]  # Strip PPPBV1 header

client = PClient()
client.ParseFromString(raw)

print("Top-Level-Felder in client:")
for field in client.DESCRIPTOR.fields:
    print(f"- {field.name}")
