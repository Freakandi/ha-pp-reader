from client_pb2 import PClient

with open("data.portfolio", "rb") as f:
    raw = f.read()[8:]  # Strip PPPBV1 header

client = PClient()
client.ParseFromString(raw)

print("Kurse in client.exchangeRates:", hasattr(client, "exchangeRates") and len(client.exchangeRates) > 0)
print("Kurse in client.ecbData.series:", hasattr(client, "ecbData") and hasattr(client.ecbData, "series") and len(client.ecbData.series) > 0)
