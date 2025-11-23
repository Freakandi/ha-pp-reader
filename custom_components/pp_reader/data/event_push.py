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
    if _is_sequence(data):
        return [_ensure_serializable(item) for item in data]
    return _ensure_serializable(data)


def _chunk_sequence_payload(
    base_payload: dict[str, Any],
    items: Sequence[Any],
    max_bytes: int,
) -> list[dict[str, Any]]:
    """Split a sequence payload into recorder-safe chunks."""
    if not items:
        return []

    chunks: list[dict[str, Any]] = []
    current: list[Any] = []

    for item in items:
        current.append(item)
        candidate = dict(base_payload)
        candidate["data"] = list(current)

        if _estimate_event_size(candidate) > max_bytes:
            # If a single item already exceeds the limit, emit it as-is so the
            # consumer still receives the update (recorder may still drop it).
            if len(current) == 1:
                chunks.append(candidate)
                current = []
                continue

            # Flush the previous chunk without the oversized item.
            current.pop()
            chunks.append(
                {**base_payload, "data": list(current)},
            )
            current = [item]

    if current:
        chunks.append({**base_payload, "data": list(current)})

    return chunks


def _chunk_positions_entry_payloads(
    base_payload: dict[str, Any],
    entries: Sequence[Any],
    max_bytes: int,
) -> list[dict[str, Any]]:
    """Split portfolio_positions entries into recorder-safe chunks."""
    chunked_payloads: list[dict[str, Any]] = []

    for entry in entries:
        if not isinstance(entry, Mapping):
            continue

        positions = entry.get("positions")
        if not _is_sequence(positions):
            continue

        entry_base = {k: v for k, v in entry.items() if k != "positions"}
        pos_list = list(positions)
        if not pos_list:
            continue

        position_chunks: list[list[Any]] = []
        current: list[Any] = []

        for position in pos_list:
            current.append(position)
            candidate_entry = {**entry_base, "positions": list(current)}
            candidate_payload = {**base_payload, "data": [candidate_entry]}
            if _estimate_event_size(candidate_payload) > max_bytes:
                if len(current) == 1:
                    # Single position already exceeds the limit, emit as-is.
                    position_chunks.append(list(current))
                    current = []
                    continue

                # Flush previous chunk without the oversized item.
                current.pop()
                position_chunks.append(list(current))
                current = [position]

        if current:
            position_chunks.append(list(current))

        if not position_chunks:
            continue

        if len(position_chunks) == 1:
            chunk_entry = {**entry_base, "positions": position_chunks[0]}
            chunked_payloads.append({**base_payload, "data": [chunk_entry]})
            continue

        chunk_count = len(position_chunks)
        for idx, chunk in enumerate(position_chunks, start=1):
            chunk_entry = {
                **entry_base,
                "positions": chunk,
                "chunk_index": idx,
                "chunk_count": chunk_count,
            }
            chunked_payloads.append({**base_payload, "data": [chunk_entry]})

    return chunked_payloads


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
    base_payload = {
        "domain": DOMAIN,
        "entry_id": entry_id,
        "data_type": data_type,
        "synced_at": dt_util.utcnow().isoformat(timespec="seconds"),
    }
    payload = {**base_payload, "data": compact_data}

    payload_size = _estimate_event_size(payload)
    if payload_size > EVENT_DATA_MAX_BYTES and data_type == "portfolio_positions":
        chunk_payloads = _chunk_positions_entry_payloads(
            base_payload,
            compact_data if _is_sequence(compact_data) else [compact_data],
            EVENT_DATA_MAX_BYTES - _EVENT_SIZE_MARGIN,
        )
        if chunk_payloads:
            _LOGGER.warning(
                (
                    "Event payload for %s exceeds recorder limit (%d > %d bytes). "
                    "Split portfolio_positions into %d chunk(s)."
                ),
                data_type,
                payload_size,
                EVENT_DATA_MAX_BYTES,
                len(chunk_payloads),
            )
            for chunk_payload in chunk_payloads:
                chunk_size = _estimate_event_size(chunk_payload)
                if chunk_size > EVENT_DATA_MAX_BYTES:
                    _LOGGER.warning(
                        (
                            "Chunked %s payload still exceeds recorder limit "
                            "(%d bytes) - event data may be dropped"
                        ),
                        data_type,
                        chunk_size,
                    )
                hass.loop.call_soon_threadsafe(
                    hass.bus.fire,
                    EVENT_PANELS_UPDATED,
                    chunk_payload,
                )
            return

    if payload_size > EVENT_DATA_MAX_BYTES and _is_sequence(compact_data):
        chunk_payloads = _chunk_sequence_payload(
            base_payload,
            list(compact_data),
            EVENT_DATA_MAX_BYTES - _EVENT_SIZE_MARGIN,
        )
        if len(chunk_payloads) > 1:
            _LOGGER.warning(
                (
                    "Event payload for %s exceeds recorder limit (%d > %d bytes). "
                    "Split into %d chunk(s) to keep events recorder-safe."
                ),
                data_type,
                payload_size,
                EVENT_DATA_MAX_BYTES,
                len(chunk_payloads),
            )
            for chunk in chunk_payloads:
                chunk_size = _estimate_event_size(chunk)
                if chunk_size > EVENT_DATA_MAX_BYTES:
                    _LOGGER.warning(
                        (
                            "Chunked %s payload still exceeds recorder limit "
                            "(%d bytes) - event data may be dropped"
                        ),
                        data_type,
                        chunk_size,
                    )
                hass.loop.call_soon_threadsafe(
                    hass.bus.fire,
                    EVENT_PANELS_UPDATED,
                    chunk,
                )
            return

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
