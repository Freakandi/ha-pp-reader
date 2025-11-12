"""Lightweight test helpers mirroring Home Assistant fixtures."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from types import MappingProxyType
from typing import Any

from homeassistant.config_entries import (
    SOURCE_USER,
    ConfigEntries,
    ConfigEntry,
    ConfigEntryState,
    ConfigSubentryData,
    ConfigSubentryDataWithId,
)
from homeassistant.core import HomeAssistant
from homeassistant.util import ulid as ulid_util


class MockConfigEntry(ConfigEntry):
    """Minimal ConfigEntry stub for integration tests."""

    def __init__(
        self,
        *,
        data: Mapping[str, Any] | None = None,
        disabled_by: str | None = None,
        discovery_keys: Mapping[str, tuple[Any, ...]] | None = None,
        domain: str = "test",
        entry_id: str | None = None,
        minor_version: int = 1,
        options: Mapping[str, Any] | None = None,
        pref_disable_new_entities: bool | None = None,
        pref_disable_polling: bool | None = None,
        reason: str | None = None,
        source: str = SOURCE_USER,
        state: ConfigEntryState | None = None,
        subentries_data: Iterable[
            ConfigSubentryData | ConfigSubentryDataWithId
        ]
        | None = None,
        title: str = "Mock Title",
        unique_id: str | None = None,
        version: int = 1,
    ) -> None:
        """Initialise a mock config entry with safe defaults."""
        normalized_keys = {
            key: tuple(value) for key, value in (discovery_keys or {}).items()
        }
        normalized_subentries = tuple(subentries_data or ())

        super().__init__(
            data=data or {},
            disabled_by=disabled_by,
            discovery_keys=MappingProxyType(normalized_keys),
            domain=domain,
            entry_id=entry_id or ulid_util.ulid_now(),
            minor_version=minor_version,
            options=MappingProxyType(dict(options or {})),
            pref_disable_new_entities=pref_disable_new_entities,
            pref_disable_polling=pref_disable_polling,
            source=source,
            state=state or ConfigEntryState.NOT_LOADED,
            subentries_data=normalized_subentries,
            title=title,
            unique_id=unique_id,
            version=version,
        )

        if reason is not None:
            object.__setattr__(self, "reason", reason)

    def add_to_hass(self, hass: HomeAssistant) -> None:
        """Register the entry on Home Assistant's config manager."""
        hass.config_entries._entries[self.entry_id] = self

    def add_to_manager(self, manager: ConfigEntries) -> None:
        """Register the entry on an explicit config manager."""
        manager._entries[self.entry_id] = self
