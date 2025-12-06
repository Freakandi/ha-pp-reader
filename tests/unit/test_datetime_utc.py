"""Ensure the UTC helper works across supported Python versions."""

from __future__ import annotations

import importlib.util
from datetime import datetime, timezone
from pathlib import Path

_MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "custom_components"
    / "pp_reader"
    / "util"
    / "datetime.py"
)

_SPEC = importlib.util.spec_from_file_location("pp_reader_util_datetime", _MODULE_PATH)
if _SPEC is None or _SPEC.loader is None:  # pragma: no cover - sanity guard
    error_message = f"Unable to load module from {_MODULE_PATH}"
    raise RuntimeError(error_message)

_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)
UTC = _MODULE.UTC


def test_utc_matches_runtime_capabilities() -> None:
    """UTC sentinel must mirror the runtime's available tzinfo."""
    runtime_has_datetime_utc = hasattr(datetime, "UTC")

    if runtime_has_datetime_utc:
        assert UTC is datetime.UTC
        return

    assert not runtime_has_datetime_utc
    assert timezone.utc == UTC  # noqa: UP017
    assert timezone.utc is UTC  # noqa: UP017
