"""Helpers for parsing `.portfolio` exports into protocol buffer objects."""

from __future__ import annotations

import logging
import zipfile
from importlib import import_module
from pathlib import Path
from typing import TYPE_CHECKING, Any

_LOGGER = logging.getLogger(__name__)

try:  # pragma: no cover - exercised indirectly via tests
    _client_pb2 = import_module(
        "custom_components.pp_reader.name.abuchen.portfolio.client_pb2"
    )
except ModuleNotFoundError as err:  # pragma: no cover - defensive branch
    _CLIENT_PROTO_IMPORT_ERROR: ModuleNotFoundError | None = err
    _client_pb2 = None  # type: ignore[assignment]
else:
    _CLIENT_PROTO_IMPORT_ERROR = None

try:  # pragma: no cover - exercised indirectly via tests
    from google.protobuf import message as _protobuf_message
except ModuleNotFoundError as err:  # pragma: no cover - defensive branch
    _PROTOBUF_IMPORT_ERROR: ModuleNotFoundError | None = err
    _protobuf_message = None  # type: ignore[assignment]
else:
    _PROTOBUF_IMPORT_ERROR = None

if TYPE_CHECKING:  # pragma: no cover - typing helpers only
    from custom_components.pp_reader.name.abuchen.portfolio import client_pb2
else:
    client_pb2 = Any  # type: ignore[assignment]


def parse_data_portfolio(path: str) -> client_pb2.PClient | None:  # type: ignore  # noqa: PGH003
    """
    Entpackt eine .portfolio-Datei und extrahiert das Client-Objekt.

    :param path: Pfad zur .portfolio-Datei
    :return: Instanz von PClient oder None bei Fehler.
    """
    if not Path(path).exists():
        _LOGGER.error("❌ Datei existiert nicht: %s", path)
        return None

    if _client_pb2 is None or _protobuf_message is None:
        missing = _CLIENT_PROTO_IMPORT_ERROR or _PROTOBUF_IMPORT_ERROR
        error_msg = "google protobuf runtime fehlt" if missing else "Unbekannter Fehler"
        _LOGGER.warning(
            "❌ Portfolioparser deaktiviert (%s): %s",
            error_msg,
            missing,
        )
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
            client = _client_pb2.PClient()  # type: ignore[attr-defined]
            client.ParseFromString(raw_data)
            _LOGGER.info(
                "✅ Parsen erfolgreich - Version %s mit %d Wertpapieren",
                client.version,
                len(client.securities),
            )
        except _protobuf_message.DecodeError:  # type: ignore[union-attr]
            _LOGGER.exception("❌ Fehler beim Parsen der Datei")
        else:
            return client

    except zipfile.BadZipFile:
        _LOGGER.exception("❌ Ungültige ZIP-Datei: %s", path)
    except Exception:
        _LOGGER.exception("❌ Unerwarteter Fehler beim Parsen")

    return None
