from client_pb2 import PClient
from datetime import datetime

# Lade Portfolio-Datei
with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]

client = PClient()
client.ParseFromString(raw)

# Nimm erste Transaktion
tx = client.transactions[0]

print("🔍 Erste Transaktion")
print("security:", tx.security)
print("shares:", tx.shares)
print("amount:", tx.amount)
print("date.seconds:", tx.date.seconds)
print("type:", tx.type)
