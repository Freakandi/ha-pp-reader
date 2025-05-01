import os
import zipfile
import logging
import google.protobuf.message

from .name.abuchen.portfolio import client_pb2  # Relativer Import

_LOGGER = logging.getLogger(__name__)


def parse_data_portfolio(path: str):
    """
    Entpackt eine .portfolio-Datei und extrahiert das Client-Objekt aus dem Protobuf-Container.
    :param path: Pfad zur .portfolio-Datei
    :return: Instanz von PClient oder None bei Fehler
    """
    if not os.path.exists(path):
        _LOGGER.error("❌ Datei existiert nicht: %s", path)
        return None

    try:
        with zipfile.ZipFile(path, 'r') as archive:
            if "data.portfolio" not in archive.namelist():
                _LOGGER.error("❌ ZIP-Datei enthält keine 'data.portfolio'")
                return None

            with archive.open("data.portfolio") as f:
                raw_data = f.read()

        # Entferne Prefix (PPPBV1), falls vorhanden
        if raw_data.startswith(b'PPPBV1'):
            prefix_end = 8  # 'PPPBV1' + 1 Byte für Version/Flag
            raw_data = raw_data[prefix_end:]
            _LOGGER.debug("ℹ️ PPPBV1-Header erkannt und entfernt")

        # Direktes Parsen als PClient
        try:
            client = client_pb2.PClient()
            client.ParseFromString(raw_data)
            _LOGGER.info("✅ Parsen erfolgreich – Version %s mit %d Wertpapieren",
                         client.version, len(client.securities))
            return client
        except google.protobuf.message.DecodeError as e:
            _LOGGER.error("❌ Fehler beim Parsen der Datei: %s", e)

    except zipfile.BadZipFile:
        _LOGGER.exception("❌ Ungültige ZIP-Datei: %s", path)
    except Exception as e:
        _LOGGER.exception("❌ Unerwarteter Fehler beim Parsen: %s", e)

    return None

