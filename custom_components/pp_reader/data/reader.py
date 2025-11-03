"""Helpers for parsing `.portfolio` exports into protocol buffer objects."""

from __future__ import annotations

import logging
import warnings
from importlib import import_module
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.services import (
    PortfolioParseError,
    PortfolioValidationError,
)
from custom_components.pp_reader.services.portfolio_file import LOGGER as PARSER_LOGGER
from custom_components.pp_reader.services.portfolio_file import read_portfolio_bytes

_LOGGER = logging.getLogger(__name__)
_DEPRECATION_STATE = {"logged": False}

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
    warning_msg = (
        "parse_data_portfolio is deprecated; use "
        "custom_components.pp_reader.services.parser_pipeline."
        "async_parse_portfolio instead"
    )
    warnings.warn(warning_msg, DeprecationWarning, stacklevel=2)
    if not _DEPRECATION_STATE["logged"]:
        _LOGGER.warning(warning_msg)
        _DEPRECATION_STATE["logged"] = True

    if _client_pb2 is None or _protobuf_message is None:
        missing = _CLIENT_PROTO_IMPORT_ERROR or _PROTOBUF_IMPORT_ERROR
        PARSER_LOGGER.error(
            "protobuf runtime for Portfolio Performance not available: %s",
            missing or "unknown import error",
        )
        return None

    try:
        raw_data = read_portfolio_bytes(path)
    except PortfolioValidationError as err:
        PARSER_LOGGER.error(
            "validation error while reading portfolio '%s': %s",
            path,
            err.message or "validation error",
        )
        return None
    except PortfolioParseError as err:
        PARSER_LOGGER.error(
            "unable to read portfolio '%s': %s",
            path,
            err.message or "parse error",
        )
        return None

    try:
        client = _client_pb2.PClient()  # type: ignore[attr-defined]
        client.ParseFromString(raw_data)
        _LOGGER.info(
            "✅ Parsen erfolgreich - Version %s mit %d Wertpapieren",
            client.version,
            len(client.securities),
        )
    except _protobuf_message.DecodeError:  # type: ignore[union-attr]
        PARSER_LOGGER.exception("decoder error while parsing portfolio '%s'", path)
    except Exception:  # noqa: BLE001 - catch-all keeps legacy callers tolerant
        PARSER_LOGGER.exception("unexpected error while parsing portfolio '%s'", path)
    else:
        return client

    return None
