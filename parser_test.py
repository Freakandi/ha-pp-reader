import sys
from custom_components.pp_reader.portfolio_pb2 import Client

def parse_data_portfolio(data_path):
    with open(data_path, "rb") as f:
        client = Client()
        client.ParseFromString(f.read())
        return client

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python3 parser_test.py /pfad/zu/data.portfolio")
        sys.exit(1)

    data_file = sys.argv[1]
    client = parse_data_portfolio(data_file)

    print("📈 Wertpapiere:")
    for sec in client.securities:
        print(f"  - {sec.name} ({sec.isin}) – {sec.currency} @ {sec.current_price}")

    print("\n🏦 Konten:")
    for acc in client.accounts:
        print(f"  - {acc.name} [{acc.currency}] – Saldo: {acc.balance}")
