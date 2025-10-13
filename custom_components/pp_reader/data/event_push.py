"""Helpers to push compacted data updates into the Home Assistant event bus."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from collections.abc import Mapping, Sequence
from typing import Any

from homeassistant.const import EVENT_PANELS_UPDATED
from homeassistant.core import HomeAssistant, callback

from ..const import DOMAIN
from ..util.currency import cent_to_eur, round_currency
from .aggregations import HoldingsAggregation, compute_holdings_aggregation, select_average_cost
from .performance import select_performance_metrics

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


def _normalize_currency_amount(value: Any, *, default: float = 0.0) -> float:
    """Return a consistently rounded EUR amount from raw or cent values."""

    if isinstance(value, bool):
        return default

    if isinstance(value, int):
        normalized = cent_to_eur(value, default=None)
        if normalized is not None:
            return normalized

    rounded = round_currency(value, default=None)
    if rounded is not None:
        return rounded

    return default


def _normalize_portfolio_value_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Compact a raw portfolio aggregation entry for event transport."""
    uuid = item.get("uuid") or item.get("portfolio_uuid")
    if not uuid:
        return None

    def _int(value_key: str, fallback_key: str | None = None) -> int:
        raw = item.get(value_key)
        if raw is None and fallback_key is not None:
            raw = item.get(fallback_key)
        try:
            return int(raw or 0)
        except (TypeError, ValueError):
            return 0

    raw_current_value = item.get("current_value")
    if raw_current_value is None:
        raw_current_value = item.get("value")
    current_value = _normalize_currency_amount(raw_current_value)

    raw_purchase_sum = item.get("purchase_sum")
    if raw_purchase_sum is None:
        raw_purchase_sum = item.get("purchaseSum")
    purchase_sum = _normalize_currency_amount(raw_purchase_sum)

    performance_mapping = item.get("performance")
    performance_payload: dict[str, Any]
    if isinstance(performance_mapping, Mapping):
        performance_payload = dict(performance_mapping)
    else:
        performance_metrics, day_change_metrics = select_performance_metrics(
            current_value=raw_current_value,
            purchase_value=raw_purchase_sum,
        )
        performance_payload = asdict(performance_metrics)
        performance_payload["day_change"] = asdict(day_change_metrics)

    gain_abs = round_currency(performance_payload.get("gain_abs"), default=0.0) or 0.0
    gain_pct = round_currency(performance_payload.get("gain_pct"), default=0.0) or 0.0

    normalized = {
        "uuid": str(uuid),
        "position_count": _int("position_count", "count"),
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
    }

    if performance_payload:
        normalized["performance"] = performance_payload

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


def _normalize_position_entry(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Keep only the fields required for position updates."""

    security_uuid = item.get("security_uuid")
    if security_uuid:
        security_uuid = str(security_uuid)

    aggregation_raw = item.get("aggregation")
    average_cost_raw = item.get("average_cost")

    def _coerce_float(value: Any) -> float | None:
        if isinstance(value, bool):
            return None
        if value in (None, ""):
            return None
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _coerce_int(value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _aggregation_from_mapping(mapping: Mapping[str, Any]) -> HoldingsAggregation:
        return HoldingsAggregation(
            total_holdings=_coerce_float(mapping.get("total_holdings")) or 0.0,
            positive_holdings=_coerce_float(mapping.get("positive_holdings")) or 0.0,
            purchase_value_cents=_coerce_int(mapping.get("purchase_value_cents")) or 0,
            purchase_value_eur=_coerce_float(mapping.get("purchase_value_eur")) or 0.0,
            security_currency_total=_coerce_float(
                mapping.get("security_currency_total")
            )
            or _coerce_float(mapping.get("purchase_total_security"))
            or 0.0,
            account_currency_total=_coerce_float(
                mapping.get("account_currency_total")
            )
            or _coerce_float(mapping.get("purchase_total_account"))
            or 0.0,
            average_purchase_price_native=_coerce_float(
                mapping.get("average_purchase_price_native")
            ),
            avg_price_account=_coerce_float(mapping.get("avg_price_account")),
        )

    def _build_aggregation_from_item() -> HoldingsAggregation:
        holdings_value = _coerce_float(item.get("current_holdings"))
        purchase_value_cents = _coerce_int(item.get("purchase_value_cents"))
        if purchase_value_cents is None:
            purchase_value_eur = round_currency(
                item.get("purchase_value"), default=None
            )
            if purchase_value_eur is None:
                purchase_value_eur = round_currency(
                    item.get("purchase_value_eur"), default=None
                )
            if purchase_value_eur is not None:
                try:
                    purchase_value_cents = int(round(float(purchase_value_eur) * 100))
                except (TypeError, ValueError):
                    purchase_value_cents = None

        row: dict[str, Any] = {}
        if holdings_value is not None:
            row["current_holdings"] = holdings_value
        if purchase_value_cents is not None:
            row["purchase_value"] = purchase_value_cents

        security_total = _coerce_float(item.get("purchase_total_security"))
        if security_total is None:
            security_total = _coerce_float(item.get("security_currency_total"))
        if security_total is not None:
            row["security_currency_total"] = security_total

        account_total = _coerce_float(item.get("purchase_total_account"))
        if account_total is None:
            account_total = _coerce_float(item.get("account_currency_total"))
        if account_total is not None:
            row["account_currency_total"] = account_total

        avg_native = _coerce_float(item.get("average_purchase_price_native"))
        if avg_native is not None:
            row["avg_price_native"] = avg_native

        if not row:
            return compute_holdings_aggregation([])
        return compute_holdings_aggregation([row])

    def _select_aggregation() -> HoldingsAggregation:
        if isinstance(aggregation_raw, HoldingsAggregation):
            return aggregation_raw
        if isinstance(aggregation_raw, Mapping):
            return _aggregation_from_mapping(aggregation_raw)
        return _build_aggregation_from_item()

    aggregation_obj = _select_aggregation()

    aggregation_payload = asdict(aggregation_obj)
    aggregation_payload["purchase_total_security"] = (
        aggregation_obj.purchase_total_security
    )
    aggregation_payload["purchase_total_account"] = (
        aggregation_obj.purchase_total_account
    )
    aggregation_payload.pop("avg_price_account", None)

    if isinstance(aggregation_raw, Mapping):
        for key, value in aggregation_raw.items():
            if key == "avg_price_account":
                continue
            if value in (None, ""):
                continue
            if key in {"purchase_value_cents"}:
                coerced_int = _coerce_int(value)
                if coerced_int is not None:
                    aggregation_payload[key] = coerced_int
                continue
            coerced_float = _coerce_float(value)
            if coerced_float is not None:
                aggregation_payload[key] = coerced_float
                continue
            aggregation_payload[key] = value

    holdings_value = _coerce_float(item.get("current_holdings"))
    holdings = aggregation_obj.total_holdings or holdings_value or 0.0

    purchase_value = round_currency(aggregation_obj.purchase_value_eur, default=None)
    if purchase_value in (None, 0.0):
        fallback_value = round_currency(item.get("purchase_value"), default=None)
        if fallback_value is None:
            fallback_value = round_currency(item.get("purchase_value_eur"), default=None)
        if fallback_value is not None:
            purchase_value = fallback_value
    if purchase_value is None:
        purchase_value = 0.0

    average_cost_selection = select_average_cost(
        aggregation_obj,
        holdings=holdings if holdings else None,
    )
    average_cost_payload = asdict(average_cost_selection)
    if isinstance(average_cost_raw, Mapping):
        for key, value in average_cost_raw.items():
            if value not in (None, ""):
                if key in {"native", "security", "account", "eur"}:
                    coerced = _coerce_float(value)
                    if coerced is not None:
                        average_cost_payload[key] = coerced
                    continue
                average_cost_payload[key] = value

    current_value_raw = item.get("current_value")
    current_value = _normalize_currency_amount(current_value_raw)

    performance_mapping = item.get("performance")
    if isinstance(performance_mapping, Mapping):
        performance_payload = dict(performance_mapping)
    else:
        performance_metrics, day_change_metrics = select_performance_metrics(
            current_value=current_value_raw,
            purchase_value=purchase_value,
            holdings=holdings,
        )
        performance_payload = asdict(performance_metrics)
        performance_payload["day_change"] = asdict(day_change_metrics)

    gain_abs = round_currency(performance_payload.get("gain_abs"), default=0.0) or 0.0
    gain_pct = round_currency(performance_payload.get("gain_pct"), default=0.0) or 0.0

    purchase_total_security = aggregation_obj.purchase_total_security
    purchase_total_account = aggregation_obj.purchase_total_account

    normalized: dict[str, Any] = {
        "security_uuid": security_uuid,
        "name": item.get("name"),
        "current_holdings": holdings,
        "purchase_value": purchase_value,
        "current_value": current_value,
        "gain_abs": gain_abs,
        "gain_pct": gain_pct,
        "purchase_total_security": purchase_total_security,
        "purchase_total_account": purchase_total_account,
    }

    if aggregation_payload:
        aggregation_payload.pop("avg_price_account", None)
        aggregation_payload.pop("average_purchase_price_native", None)
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
