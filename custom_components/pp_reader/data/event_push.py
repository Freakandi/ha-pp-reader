"""Helpers to push compacted data updates into the Home Assistant event bus."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping, Sequence
from typing import Any

from homeassistant.const import EVENT_PANELS_UPDATED
from homeassistant.core import HomeAssistant, callback

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

EVENT_DATA_MAX_BYTES = 32_768
_EVENT_SIZE_MARGIN = 512


def _is_sequence(value: Any) -> bool:
    """Return True for non-string sequences."""
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray))


def _estimate_event_size(payload: dict[str, Any]) -> int:
    """Return the JSON encoded size of an event payload in bytes."""
    try:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError):
        return 0
    return len(encoded.encode("utf-8"))


def _normalize_portfolio_value_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Compact a raw portfolio aggregation entry for event transport."""
    uuid = item.get("uuid") or item.get("portfolio_uuid")
    if not uuid:
        return None

    def _float(value_key: str, fallback_key: str | None = None) -> float:
        raw = item.get(value_key)
        if raw is None and fallback_key is not None:
            raw = item.get(fallback_key)
        try:
            return round(float(raw or 0.0), 2)
        except (TypeError, ValueError):
            return 0.0

    def _int(value_key: str, fallback_key: str | None = None) -> int:
        raw = item.get(value_key)
        if raw is None and fallback_key is not None:
            raw = item.get(fallback_key)
        try:
            return int(raw or 0)
        except (TypeError, ValueError):
            return 0

    current_value = _float("current_value", "value")
    purchase_sum = _float("purchase_sum")
    gain_abs = round(current_value - purchase_sum, 2)
    gain_pct = round((gain_abs / purchase_sum * 100) if purchase_sum else 0.0, 2)

    return {
        "uuid": str(uuid),
        "position_count": _int("position_count", "count"),
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
    }


def _compact_portfolio_values_payload(data: Any) -> Any:
    """Remove unused fields from portfolio value updates to keep payloads small."""

    def _compact_items(items: Sequence[Any]) -> list[dict[str, Any]]:
        compacted: list[dict[str, Any]] = []
        for item in items:
            if isinstance(item, Mapping):
                normalized = _normalize_portfolio_value_entry(item)
                if normalized is not None:
                    compacted.append(normalized)
        return compacted

    if isinstance(data, Mapping):
        result: dict[str, Any] = {}
        portfolios = data.get("portfolios")
        if _is_sequence(portfolios):
            result["portfolios"] = _compact_items(portfolios)
        else:
            normalized = _normalize_portfolio_value_entry(data)
            if normalized is not None:
                result["portfolios"] = [normalized]

        for optional_key in ("error",):
            if optional_key in data:
                result[optional_key] = data[optional_key]
        return result

    if _is_sequence(data):
        return _compact_items(data)

    return data


def _normalize_position_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Keep only the fields required for position updates."""
    security_uuid = item.get("security_uuid")
    if security_uuid:
        security_uuid = str(security_uuid)

    def _float(value_key: str) -> float:
        raw = item.get(value_key)
        try:
            return round(float(raw or 0.0), 2)
        except (TypeError, ValueError):
            return 0.0

    normalized: dict[str, Any] = {
        "security_uuid": security_uuid,
        "name": item.get("name"),
        "current_holdings": item.get("current_holdings", 0),
        "purchase_value": _float("purchase_value"),
        "current_value": _float("current_value"),
        "gain_abs": _float("gain_abs"),
        "gain_pct": _float("gain_pct"),
    }

    return normalized


def _compact_portfolio_positions_payload(data: Any) -> Any:
    """Ensure position updates only transport the necessary keys."""
    if not isinstance(data, Mapping):
        return data

    positions = data.get("positions")
    compacted: list[dict[str, Any]] = []
    if _is_sequence(positions):
        for item in positions:
            if isinstance(item, Mapping):
                normalized = _normalize_position_entry(item)
                if normalized is not None:
                    compacted.append(normalized)

    result: dict[str, Any] = {
        "portfolio_uuid": data.get("portfolio_uuid"),
        "positions": compacted,
    }
    if "error" in data:
        result["error"] = data["error"]
    return result


def _compact_event_data(data_type: str, data: Any) -> Any:
    """Return an event payload with redundant fields stripped out."""
    if data_type == "portfolio_values":
        return _compact_portfolio_values_payload(data)

    if data_type == "portfolio_positions":
        return _compact_portfolio_positions_payload(data)

    return data


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
