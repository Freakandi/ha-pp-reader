import sys
import tempfile
import zipfile
import os
from tools.reader import extract_data_portfolio
from name.abuchen.portfolio import client_pb2
from google.protobuf.message import DecodeError

def parse_data_portfolio(data_path):
    with open(data_path, "rb") as f:
        raw = f.read()

    client = client_pb2.PClient()
    try:
        # Skip Header "PPPBV1" (7 bytes) + 1 Byte Flags = 8 Bytes
        client.ParseFromString(raw[8:])
    except DecodeError as e:
        print("❌ Protobuf-DecodeError: Die Struktur stimmt nicht mit der Datei überein.")
        print(f"   → Fehlermeldung: {e}")
        return None

    return client

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Verwendung: python3 tools/parser_test.py /pfad/zur/Datei.portfolio")
        sys.exit(1)

    input_path = sys.argv[1]

    if zipfile.is_zipfile(input_path):
        with tempfile.TemporaryDirectory() as tmp:
            print(f"🗜️ Entpacke ZIP-Datei nach: {tmp}")
            try:
                data_file = extract_data_portfolio(input_path, tmp)
                print(f"✅ Gefunden: {data_file}")
                print("📥 Lese Daten aus data.portfolio …")
                print(f"📄 Verwende Datei zum Parsen: {data_file}")
                client = parse_data_portfolio(data_file)
            except Exception as e:
                print(f"❌ Fehler beim Entpacken: {e}")
                sys.exit(1)
    else:
        print(f"📁 Verwende unverpackte Datei direkt: {input_path}")
        data_file = input_path

#    print("📥 Lese Daten aus data.portfolio …")
#    print(f"📄 Verwende Datei zum Parsen: {data_file}")
#    client = parse_data_portfolio(data_file)

    if client is None:
        print("⚠️ Parsing fehlgeschlagen – weitere Analyse nötig.")
        sys.exit(1)

    print("\n📈 Wertpapiere (erste 5):")
    for sec in client.securities[:5]:
        print(f"  - {sec.name} ({sec.isin}) – {sec.currencyCode}")

    print("\n🏦 Konten:")
    for acc in client.accounts:
        print(f"  - {acc.name} [{acc.currencyCode}]")

    print("\n🧾 Transaktionen (erste 5):")
    for tx in client.transactions[:5]:
        print(f"  - {tx.type} {tx.amount} {tx.currencyCode} am {tx.date}")

