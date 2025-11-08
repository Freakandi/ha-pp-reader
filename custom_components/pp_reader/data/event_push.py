"""Helpers to push compacted data updates into the Home Assistant event bus."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping, Sequence
from dataclasses import asdict, is_dataclass
from typing import Any

from homeassistant.const import EVENT_PANELS_UPDATED
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from custom_components.pp_reader.const import DOMAIN

_LOGGER = logging.getLogger(__name__)

EVENT_DATA_MAX_BYTES = 32_768
_EVENT_SIZE_MARGIN = 512


def _is_sequence(value: Any) -> bool:
    """Return True for non-string sequences."""
    return isinstance(value, Sequence) and not isinstance(
        value, (str, bytes, bytearray)
    )


def _estimate_event_size(payload: dict[str, Any]) -> int:
    """Return the JSON encoded size of an event payload in bytes."""
    try:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError):
        return 0
    return len(encoded.encode("utf-8"))


def _ensure_serializable(value: Any) -> Any:
    """Convert payloads into JSON-serializable primitives without dropping metadata."""
    if is_dataclass(value):
        return _ensure_serializable(asdict(value))

    if isinstance(value, Mapping):
        return {key: _ensure_serializable(val) for key, val in value.items()}

    if _is_sequence(value):
        return [_ensure_serializable(item) for item in value]

    return value


def _compact_event_data(_data_type: str, data: Any) -> Any:
    """Return an event payload with canonical structures preserved."""
    return _ensure_serializable(data)


@callback
def _push_update(
    hass: HomeAssistant | None,
    entry_id: str | None,
    data_type: str,
    data: Any,
) -> None:
    """Thread-sicheres Pushen eines Update-Events in den HA Event Loop."""
    if not hass or not entry_id:
        return

    compact_data = _compact_event_data(data_type, data)
    payload = {
        "domain": DOMAIN,
        "entry_id": entry_id,
        "data_type": data_type,
        "data": compact_data,
        "synced_at": dt_util.utcnow().isoformat(timespec="seconds"),
    }

    payload_size = _estimate_event_size(payload)
    if payload_size > EVENT_DATA_MAX_BYTES:
        _LOGGER.warning(
            (
                "Event payload for %s exceeds recorder limit (%d > %d bytes). "
                "Content was compacted but will still be dropped by the recorder."
            ),
            data_type,
            payload_size,
            EVENT_DATA_MAX_BYTES,
        )
    elif payload_size > (EVENT_DATA_MAX_BYTES - _EVENT_SIZE_MARGIN):
        _LOGGER.debug(
            "Event payload for %s is close to recorder limit (%d bytes)",
            data_type,
            payload_size,
        )
    try:
        hass.loop.call_soon_threadsafe(hass.bus.fire, EVENT_PANELS_UPDATED, payload)
    except Exception:  # pragma: no cover - defensive logging
        _LOGGER.exception("Fehler beim Schedulen des Events %s", data_type)


__all__ = [
    "EVENT_DATA_MAX_BYTES",
    "_compact_event_data",
    "_push_update",
]
