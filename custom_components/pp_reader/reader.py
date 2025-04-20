import os
import zipfile
import logging

from .name.abuchen.portfolio import client_pb2

_LOGGER = logging.getLogger(__name__)

def parse_data_portfolio(path: str):
    """
    Entpackt eine .portfolio-Datei und extrahiert das Client-Objekt aus dem protobuf-Container.
    :param path: Pfad zur .portfolio-Datei
    :return: Instanz von client_pb2.PClient oder None bei Fehler
    """
    if not os.path.exists(path):
        _LOGGER.error("Die Datei %s existiert nicht", path)
        return None

    try:
        with zipfile.ZipFile(path, 'r') as archive:
            if "data.portfolio" not in archive.namelist():
                _LOGGER.error("ZIP-Datei enthält keine 'data.portfolio'")
                return None

            with archive.open("data.portfolio") as f:
                raw_data = f.read()

        # Protobuf-Inhalt dekodieren
        container = client_pb2.SerializedModel()
        container.ParseFromString(raw_data)

        client = container.client
        _LOGGER.info("Erfolgreich geparst: Version %s mit %d Wertpapieren",
                     client.version, len(client.securities))
        return client

    except zipfile.BadZipFile:
        _LOGGER.exception("Ungültige ZIP-Datei: %s", path)
    except google.protobuf.message.DecodeError as e:
        _LOGGER.error("Fehler beim Parsen der Datei: %s", e)
    except Exception as e:
        _LOGGER.exception("Unerwarteter Fehler beim Parsen: %s", e)

    return None
