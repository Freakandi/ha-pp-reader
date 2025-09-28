"""Feature flag helpers for the Portfolio Performance Reader integration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from homeassistant.core import HomeAssistant

from .const import DOMAIN

_DEFAULT_FLAGS: dict[str, bool] = {
    "pp_reader_history": False,
}


def _normalize_name(name: str) -> str:
    """Return a lowercase flag identifier stripped from whitespace."""
    if not isinstance(name, str):
        message = "feature flag name must be a string"
        raise TypeError(message)
    normalized = name.strip().lower()
    if not normalized:
        message = "feature flag name must not be empty"
        raise ValueError(message)
    return normalized


def _get_flag_mapping(source: Mapping[str, Any] | None) -> dict[str, bool]:
    """Extract a normalized flag mapping from the provided source mapping."""
    if not isinstance(source, Mapping):
        return {}

    flags: dict[str, bool] = {}
    for raw_name, raw_value in source.items():
        if not isinstance(raw_name, str):
            continue
        try:
            name = _normalize_name(raw_name)
        except ValueError:
            continue
        flags[name] = bool(raw_value)

    return flags


def _resolve_entry_store(
    hass: HomeAssistant,
    *,
    entry_id: str | None = None,
) -> Mapping[str, Any] | None:
    """Return the stored mapping for the given entry id (if available)."""
    domain_store = hass.data.get(DOMAIN)
    if not isinstance(domain_store, Mapping):
        return None

    if entry_id is None:
        # When no entry is provided, fall back to a global feature flag store.
        raw = domain_store.get("feature_flags")
        return raw if isinstance(raw, Mapping) else None

    entry_store = domain_store.get(entry_id)
    if isinstance(entry_store, Mapping):
        return entry_store

    return None


def is_enabled(
    name: str,
    hass: HomeAssistant,
    *,
    entry_id: str | None = None,
    default: bool | None = None,
) -> bool:
    """Return whether a feature flag is enabled for the given entry."""
    normalized = _normalize_name(name)

    store = _resolve_entry_store(hass, entry_id=entry_id)
    flags = _get_flag_mapping(store.get("feature_flags")) if store else {}

    if normalized in flags:
        return flags[normalized]

    if default is not None:
        return default

    return _DEFAULT_FLAGS.get(normalized, False)


def snapshot(
    hass: HomeAssistant,
    *,
    entry_id: str | None = None,
) -> dict[str, bool]:
    """Return a snapshot of the resolved flags for the given entry or global scope."""
    store = _resolve_entry_store(hass, entry_id=entry_id)
    flags = _get_flag_mapping(store.get("feature_flags")) if store else {}
    merged = dict(_DEFAULT_FLAGS)
    merged.update(flags)
    return merged
