"""Filesystem helpers scoped to the Home Assistant config directory."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from custom_components.pp_reader.const import DEFAULT_DB_SUBDIR

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

PathInput = str | Path
_CONTAINER_CONFIG_ROOT = Path("/config")


def resolve_storage_path(
    hass: HomeAssistant,
    configured_path: PathInput | None,
    *,
    default_relative: PathInput | None = None,
) -> Path:
    """
    Convert a configured path (relative, absolute, or None) into an absolute Path.

    Relative paths resolve against Home Assistant's config directory. When `None`
    (or an empty string) is provided, `default_relative` defines the fallback
    inside the config directory. The helper also remaps legacy absolute `/config`
    paths to the host-specific config directory when Home Assistant is not
    running inside a container.
    """
    if configured_path is None or (
        isinstance(configured_path, str) and not configured_path.strip()
    ):
        if default_relative is None:
            msg = "No path configured and no default provided"
            raise ValueError(msg)
        configured_path = default_relative

    path = Path(configured_path).expanduser()

    if path.is_absolute():
        config_root = Path(hass.config.path(""))
        if (
            path != config_root
            and path.is_relative_to(_CONTAINER_CONFIG_ROOT)
            and config_root != _CONTAINER_CONFIG_ROOT
        ):
            return config_root / path.relative_to(_CONTAINER_CONFIG_ROOT)
        return path

    return Path(hass.config.path(str(path)))


def default_database_path(hass: HomeAssistant, portfolio_stem: str) -> Path:
    """Return the default db path inside the HA config dir for a given portfolio."""
    relative_path = Path(DEFAULT_DB_SUBDIR) / f"{portfolio_stem}.db"
    return resolve_storage_path(hass, relative_path)
