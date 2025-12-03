"""Helpers for reading Portfolio Performance archives."""

from __future__ import annotations

import asyncio
import logging
import zipfile
from pathlib import Path
from typing import Final

from . import PortfolioParseError, PortfolioValidationError

LOGGER = logging.getLogger("custom_components.pp_reader.services.parser")

DATA_MEMBER: Final = "data.portfolio"
PREFIX_MARKER: Final = b"PPPBV1"
PREFIX_LENGTH: Final = 8
ERR_FILE_MISSING: Final = "missing portfolio file"
ERR_MEMBER_MISSING: Final = "archive lacks data.portfolio member"
ERR_EMPTY_PAYLOAD: Final = "portfolio payload is empty"
ERR_INVALID_ARCHIVE: Final = "invalid portfolio archive"
ERR_ARCHIVE_IO: Final = "unable to read portfolio archive"


def read_portfolio_bytes(path: str | Path) -> bytes:
    """Read and normalise the raw protobuf payload from a .portfolio archive."""
    path_obj = Path(path)
    if not path_obj.exists():
        LOGGER.error("Portfolio file does not exist: %s", path_obj)
        raise PortfolioParseError(ERR_FILE_MISSING)

    try:
        with zipfile.ZipFile(path_obj, "r") as archive:
            if DATA_MEMBER not in archive.namelist():
                LOGGER.error("Archive %s missing '%s'", path_obj, DATA_MEMBER)
                raise PortfolioValidationError(ERR_MEMBER_MISSING)

            with archive.open(DATA_MEMBER) as handle:
                raw_data = handle.read()
    except zipfile.BadZipFile as err:
        LOGGER.exception("Invalid ZIP archive for %s", path_obj)
        raise PortfolioParseError(ERR_INVALID_ARCHIVE) from err
    except OSError as err:
        LOGGER.exception("Unable to read portfolio archive %s", path_obj)
        raise PortfolioParseError(ERR_ARCHIVE_IO) from err

    if raw_data.startswith(PREFIX_MARKER) and len(raw_data) > PREFIX_LENGTH:
        raw_data = raw_data[PREFIX_LENGTH:]

    if not raw_data:
        LOGGER.error("Portfolio payload empty after stripping headers: %s", path_obj)
        raise PortfolioValidationError(ERR_EMPTY_PAYLOAD)

    return raw_data


async def async_read_portfolio_bytes(path: str | Path) -> bytes:
    """Offload archive reading to a worker thread for non-blocking IO."""
    return await asyncio.to_thread(read_portfolio_bytes, path)
