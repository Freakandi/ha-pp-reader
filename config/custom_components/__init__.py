"""Home Assistant config-level custom component helpers."""

from __future__ import annotations

import logging

_LOGGER = logging.getLogger(__name__)
_LOADER_LOGGER_NAME = "homeassistant.loader"
_PP_READER_DOMAIN = "pp_reader"
_CUSTOM_WARNING_TEMPLATE = (
    "We found a custom integration %s which has not been tested by Home Assistant. "
    "This component might cause stability problems, be sure to disable it if you "
    "experience issues with Home Assistant"
)


class _LoaderWarningFilter(logging.Filter):
    """Filter that drops the generic custom integration warning for pp_reader."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Return ``False`` when the loader warning targets pp_reader."""
        if record.name != _LOADER_LOGGER_NAME:
            return True

        if (
            isinstance(record.msg, str)
            and record.msg == _CUSTOM_WARNING_TEMPLATE
            and record.args
        ):
            first_arg = record.args[0]
            if isinstance(first_arg, str) and first_arg == _PP_READER_DOMAIN:
                _LOGGER.debug(
                    "Suppressing boilerplate custom integration warning for %s",
                    _PP_READER_DOMAIN,
                )
                return False

        return True


_loader_logger = logging.getLogger(_LOADER_LOGGER_NAME)
if not any(isinstance(f, _LoaderWarningFilter) for f in _loader_logger.filters):
    _loader_logger.addFilter(_LoaderWarningFilter())
