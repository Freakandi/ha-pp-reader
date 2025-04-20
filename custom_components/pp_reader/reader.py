import logging
import zipfile
import struct

from .name.abuchen.portfolio import client_pb2

_LOGGER = logging.getLogger(__name__)


def decode_pppbv1(raw: bytes) -> bytes:
    """Entfernt den PPPBV1-Header und extrahiert den Protobuf-Datenblock."""
    if not raw.startswith(b"PPPBV1"):
        raise ValueError("Kein gültiger PPPBV1-Header")
    length = struct.unpack(">I", raw[6:10])[0]
    return raw[10 : 10 + length]


def parse_data_portfolio(file_path: str):
    """Liest die .portfolio-Datei, entfernt Header, parst mit Protobuf."""
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            with z.open("data.portfolio") as f:
                raw = f.read()
                decoded = decode_pppbv1(raw)
                client = client_pb2.PClient()
                client.ParseFromString(decoded)
                return client
    except Exception as e:
        _LOGGER.exception("Fehler beim Parsen der Datei: %s", e)
        return None

