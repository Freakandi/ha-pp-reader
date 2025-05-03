import logging
import os
from pathlib import Path
import pytest
from custom_components.pp_reader.data.reader import parse_data_portfolio
from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
from datetime import datetime

# Log-Level auf DEBUG setzen, aber den Root-Logger auf WARNING
logging.basicConfig(
    level=logging.WARNING,  # Root-Logger auf WARNING
    format='%(asctime)s - %(levelname)s - %(message)s'
)
_LOGGER = logging.getLogger(__name__)
_LOGGER.setLevel(logging.DEBUG)  # Test-Logger auf DEBUG

@pytest.fixture
def portfolio_data():
    """Test-Fixture für Portfolio-Daten."""
    file_path = Path(__file__).parent.parent / "testdata" / "unpacked" / "data.portfolio"
    if not file_path.exists():
        pytest.skip(f"Testdatei nicht gefunden: {file_path}")
    
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    
    if raw_data.startswith(b'PPPBV1'):
        raw_data = raw_data[8:]
    return raw_data

def find_first_barry_transaction(client):
    """Findet die erste Transaktion der Barry Callebaut Aktie"""
    barry_isin = "CH0009002962"
    
    # Zuerst Security UUID finden
    barry_uuid = None
    for sec in client.securities:
        if sec.isin == barry_isin:
            barry_uuid = sec.uuid
            _LOGGER.debug("Barry Callebaut UUID gefunden: %s", barry_uuid)
            break
            
    if not barry_uuid:
        _LOGGER.error("Barry Callebaut Aktie nicht gefunden")
        return None
        
    # Alle Transaktionen nach Datum sortieren und erste finden
    barry_transactions = [
        tx for tx in client.transactions 
        if tx.HasField("security") and tx.security == barry_uuid
    ]
    
    if not barry_transactions:
        _LOGGER.error("Keine Transaktionen für Barry Callebaut gefunden")
        return None
        
    sorted_transactions = sorted(barry_transactions, key=lambda x: x.date.seconds)
    first_tx = sorted_transactions[0]
    
    # Werte normalisieren
    shares = first_tx.shares / 10**8 if first_tx.HasField("shares") else 0
    amount = first_tx.amount / 100  # Cent zu Euro
    
    # Fremdwährungsbeträge in den Units suchen
    fx_info = None
    for unit in first_tx.units:
        if unit.type == 0:  # GROSS_VALUE
            if unit.HasField("fxAmount"):
                # Wechselkurs aus PDecimalValue extrahieren
                fx_rate = float(int.from_bytes(unit.fxRateToBase.value, byteorder='little', signed=True)) / (10 ** unit.fxRateToBase.scale)
                
                fx_info = {
                    "original_amount": unit.fxAmount / 100,  # Cent zu Währung
                    "original_currency": unit.fxCurrencyCode,
                    "exchange_rate": fx_rate
                }
                _LOGGER.debug("FX Info gefunden: %s", fx_info)
    
    return {
        "date": datetime.fromtimestamp(first_tx.date.seconds),
        "type": first_tx.type,
        "shares": shares,
        "amount": amount,
        "currency": first_tx.currencyCode,
        "fx_info": fx_info
    }

def test_find_barry_transaction(skip_hass):
    """Test zum Finden und Parsen einer Barry Callebaut Transaktion."""
    file_path = Path(__file__).parent.parent / "testdata" / "unpacked" / "data.portfolio"
    if not file_path.exists():
        pytest.skip(f"Testdatei nicht gefunden: {file_path}")
    
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    
    if raw_data.startswith(b'PPPBV1'):
        raw_data = raw_data[8:]
    
    try:
        client = client_pb2.PClient()
        client.ParseFromString(raw_data)
        
        tx = find_first_barry_transaction(client)
        if tx:
            _LOGGER.warning("\nErste Barry Callebaut Transaktion:")  # WARNING statt INFO
            _LOGGER.warning("==============================")
            _LOGGER.warning("Datum: %s", tx["date"].strftime("%d.%m.%Y"))
            _LOGGER.warning("Typ: %s", ["KAUF", "VERKAUF"][tx["type"] if tx["type"] <= 1 else 0])
            _LOGGER.warning("Stückzahl: %.3f", tx["shares"])
            _LOGGER.warning("Betrag: %.2f %s", tx["amount"], tx["currency"])
            if tx["fx_info"]:
                _LOGGER.warning("Ursprungsbetrag: %.2f %s (Kurs: %.4f)", 
                              tx["fx_info"]["original_amount"],
                              tx["fx_info"]["original_currency"],
                              tx["fx_info"]["exchange_rate"])
        else:
            _LOGGER.warning("Keine Barry Callebaut Transaktion gefunden!")
            
    except Exception as e:
        pytest.fail(f"Fehler beim Parsen: {e}")

def test_portfolio_parser():
    """Test zum Parsen der Portfolio-Datei."""
    try:
        file_path = Path(__file__).parent.parent / "testdata" / "unpacked" / "data.portfolio"
        if not file_path.exists():
            pytest.skip(f"Testdatei nicht gefunden: {file_path}")
        
        with open(file_path, 'rb') as f:
            raw_data = f.read()
        
        if raw_data.startswith(b'PPPBV1'):
            raw_data = raw_data[8:]
        
        client = client_pb2.PClient()
        client.ParseFromString(raw_data)
        
        _LOGGER.info("Portfolio Version: %d", client.version)
        _LOGGER.info("Anzahl Wertpapiere: %d", len(client.securities))
        
        # Wertpapiere ausgeben
        for security in client.securities:
            _LOGGER.info("Wertpapier gefunden: %s (ISIN: %s)", 
                        security.name, 
                        security.isin)
        
        tx = find_first_barry_transaction(client)
        if tx:
            _LOGGER.info("\nErste Barry Callebaut Transaktion:")
            _LOGGER.info("==============================")
            _LOGGER.info("Datum: %s", tx["date"].strftime("%d.%m.%Y"))
            _LOGGER.info("Typ: %s", ["KAUF", "VERKAUF"][tx["type"] if tx["type"] <= 1 else 0])
            _LOGGER.info("Stückzahl: %.3f", tx["shares"])
            _LOGGER.info("Betrag: %.2f %s", tx["amount"], tx["currency"])
            
    except Exception as e:
        pytest.fail(f"Fehler beim Parsen: {e}")

if __name__ == "__main__":
    find_barry_transaction()