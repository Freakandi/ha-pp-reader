"""Utility helpers for Home Assistant executor interoperability."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from inspect import isawaitable
from typing import Any, TypeVar

from homeassistant.core import HomeAssistant

_T = TypeVar("_T")


async def async_run_executor_job(
    hass: HomeAssistant, func: Callable[..., _T], *args: Any
) -> _T:
    """Execute a blocking job and gracefully handle non-awaitable fallbacks."""

    result = hass.async_add_executor_job(func, *args)

    if isinstance(result, Awaitable) or isawaitable(result):
        return await result  # type: ignore[no-any-return]

    if result is not None:
        return result  # type: ignore[no-any-return]

    return func(*args)
