"""
Provide functionality to parse .portfolio files.

Include a function to extract and parse data from .portfolio files
into PClient objects using Protocol Buffers.
"""

import logging
import zipfile
from pathlib import Path

import google.protobuf.message

from ..name.abuchen.portfolio import client_pb2

_LOGGER = logging.getLogger(__name__)
_LOGGER.debug(dir(client_pb2))

def parse_data_portfolio(path: str) -> client_pb2.PClient | None: # type: ignore  # noqa: PGH003
    """
    Entpackt eine .portfolio-Datei und extrahiert das Client-Objekt.

    :param path: Pfad zur .portfolio-Datei
    :return: Instanz von PClient oder None bei Fehler.
    """
    if not Path(path).exists():
        _LOGGER.error("❌ Datei existiert nicht: %s", path)
        return None

    try:
        with zipfile.ZipFile(path, "r") as archive:
            if "data.portfolio" not in archive.namelist():
                _LOGGER.error("❌ ZIP-Datei enthält keine 'data.portfolio'")
                return None

            with archive.open("data.portfolio") as f:
                raw_data = f.read()

        # Entferne Prefix (PPPBV1), falls vorhanden
        if raw_data.startswith(b"PPPBV1"):
            prefix_end = 8  # 'PPPBV1' + 1 Byte für Version/Flag
            raw_data = raw_data[prefix_end:]
            # _LOGGER.debug("i PPPBV1-Header erkannt und entfernt")  # noqa: ERA001

        # Direktes Parsen als PClient
        try:
            client = client_pb2.PClient() # type: ignore  # noqa: PGH003
            client.ParseFromString(raw_data)
            _LOGGER.info("✅ Parsen erfolgreich - Version %s mit %d Wertpapieren",
                         client.version, len(client.securities))
        except google.protobuf.message.DecodeError:
            _LOGGER.exception("❌ Fehler beim Parsen der Datei")
        else:
            return client

    except zipfile.BadZipFile:
        _LOGGER.exception("❌ Ungültige ZIP-Datei: %s", path)
    except Exception:
        _LOGGER.exception("❌ Unerwarteter Fehler beim Parsen")

    return None

