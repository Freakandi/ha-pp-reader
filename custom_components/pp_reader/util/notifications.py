"""Notification helpers for the Portfolio Performance Reader integration."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


async def async_create_parser_failure_notification(
    hass: HomeAssistant,
    *,
    entry_id: str | None,
    title: str,
    message: str,
) -> None:
    """Display a persistent notification highlighting parser failures."""
    if entry_id:
        notification_id = f"pp_reader_parser_failure_{entry_id}"
    else:
        notification_id = "pp_reader_parser_failure"
    await hass.services.async_call(
        "persistent_notification",
        "create",
        {
            "title": title,
            "message": message,
            "notification_id": notification_id,
        },
        blocking=False,
    )
