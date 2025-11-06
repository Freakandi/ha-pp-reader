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


def _normalize_portfolio_value_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Forward canonical portfolio aggregates without recomputation."""
    uuid = item.get("uuid") or item.get("portfolio_uuid")
    if not uuid:
        return None

    normalized: dict[str, Any] = {"uuid": str(uuid)}

    for key in ("name", "current_value", "purchase_sum", "missing_value_positions"):
        if key in item:
            normalized[key] = item[key]

    position_count = item.get("position_count")
    if position_count is None and "count" in item:
        position_count = item.get("count")
    if position_count is not None:
        normalized["position_count"] = position_count

    has_current_value = item.get("has_current_value")
    if has_current_value is not None:
        normalized["has_current_value"] = has_current_value

    metric_run_uuid = item.get("metric_run_uuid")
    if metric_run_uuid:
        normalized["metric_run_uuid"] = metric_run_uuid

    coverage_ratio = item.get("coverage_ratio")
    if coverage_ratio is not None:
        normalized["coverage_ratio"] = coverage_ratio

    provenance = item.get("provenance")
    if provenance:
        normalized["provenance"] = provenance

    performance = item.get("performance")
    if isinstance(performance, Mapping):
        normalized["performance"] = dict(performance)
    elif is_dataclass(performance):
        normalized["performance"] = asdict(performance)

    return normalized


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


def _normalize_position_entry(  # noqa: PLR0912, PLR0915
    item: Mapping[str, Any],
) -> dict[str, Any] | None:
    """Keep only the fields required for position updates."""
    security_uuid = item.get("security_uuid")
    if not security_uuid:
        return None

    aggregation_payload: dict[str, Any] | None = None
    raw_aggregation = item.get("aggregation")
    if isinstance(raw_aggregation, Mapping):
        aggregation_payload = dict(raw_aggregation)
    elif is_dataclass(raw_aggregation):
        aggregation_payload = asdict(raw_aggregation)

    if aggregation_payload is not None:
        aggregation_payload.pop("average_purchase_price_native", None)

    average_cost_payload: dict[str, Any] | None = None
    raw_average_cost = item.get("average_cost")
    if isinstance(raw_average_cost, Mapping):
        average_cost_payload = dict(raw_average_cost)
    elif is_dataclass(raw_average_cost):
        average_cost_payload = asdict(raw_average_cost)

    performance_payload: dict[str, Any] | None = None
    raw_performance = item.get("performance")
    if isinstance(raw_performance, Mapping):
        performance_payload = dict(raw_performance)
        day_change_raw = performance_payload.get("day_change")
        if isinstance(day_change_raw, Mapping):
            performance_payload["day_change"] = dict(day_change_raw)
        elif is_dataclass(day_change_raw):
            performance_payload["day_change"] = asdict(day_change_raw)
    elif is_dataclass(raw_performance):
        performance_payload = asdict(raw_performance)

    def _resolve_from_sources(*keys: str) -> Any | None:
        for key in keys:
            value = item.get(key)
            if value not in (None, ""):
                return value
        if aggregation_payload is None:
            return None
        for key in keys:
            value = aggregation_payload.get(key)
            if value not in (None, ""):
                return value
        return None

    normalized: dict[str, Any] = {
        "security_uuid": str(security_uuid),
        "name": item.get("name"),
        "current_holdings": _resolve_from_sources("current_holdings", "total_holdings"),
        "purchase_value": _resolve_from_sources("purchase_value", "purchase_value_eur"),
        "current_value": item.get("current_value"),
    }

    normalized = {key: value for key, value in normalized.items() if value is not None}

    metric_run_uuid = item.get("metric_run_uuid")
    if metric_run_uuid:
        normalized["metric_run_uuid"] = metric_run_uuid

    coverage_ratio = item.get("coverage_ratio")
    if coverage_ratio is not None:
        normalized["coverage_ratio"] = coverage_ratio

    provenance = item.get("provenance")
    if provenance:
        normalized["provenance"] = provenance

    if aggregation_payload:
        normalized["aggregation"] = aggregation_payload

    if average_cost_payload:
        normalized["average_cost"] = average_cost_payload

    if performance_payload:
        normalized["performance"] = performance_payload

    return normalized


def _compact_portfolio_positions_payload(data: Any) -> Any:
    """Ensure position updates only transport the necessary keys."""
    if isinstance(data, Mapping):
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

    if _is_sequence(data):
        compacted_items: list[dict[str, Any]] = []
        for item in data:
            if isinstance(item, Mapping):
                compacted_item = _compact_portfolio_positions_payload(item)
                if compacted_item:
                    compacted_items.append(compacted_item)
        return compacted_items

    return data


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
