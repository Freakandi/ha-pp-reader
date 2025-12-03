"""Datetime utilities ensuring consistent UTC handling across Python versions."""

from __future__ import annotations

from datetime import datetime, timezone, tzinfo

__all__ = ["UTC"]


try:
    UTC: tzinfo = datetime.UTC  # type: ignore[attr-defined]
except AttributeError:  # pragma: no cover - fallback for Python < 3.11
    UTC = timezone.utc  # noqa: UP017
