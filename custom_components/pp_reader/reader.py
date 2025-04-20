import os
import zipfile
import logging
import google.protobuf.message

from .name.abuchen.portfolio import client_pb2

_LOGGER = logging.getLogger(__name__)

def parse_data_portfolio(path: str):
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

        # Erst versuche als direkten Client
        try:
            client = client_pb2.PClient()
            client.ParseFromString(raw_data)
            _LOGGER.info("Parsen als PClient erfolgreich (direkt)")
            return client
        except google.protobuf.message.DecodeError:
            _LOGGER.warning("Direktes Parsen als PClient fehlgeschlagen, versuche Container ...")

        # Alternativ: versuche Parsing über SerializedModel
        try:
            container = client_pb2.SerializedModel()
            container.ParseFromString(raw_data)
            client = container.client
            _LOGGER.info("Parsen als container.client erfolgreich")
            return client
        except AttributeError:
            _LOGGER.error("SerializedModel nicht vorhanden in client_pb2")
        except google.protobuf.message.DecodeError as e:
            _LOGGER.error("Fehler beim Container-Parsing: %s", e)

    except zipfile.BadZipFile:
        _LOGGER.exception("Ungültige ZIP-Datei: %s", path)
    except Exception as e:
        _LOGGER.exception("Unerwarteter Fehler beim Parsen: %s", e)

    return None

