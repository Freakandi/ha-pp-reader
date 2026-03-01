"""Parser datamodel package exports for Portfolio Performance Reader."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING

__all__ = ["parsed"]


if TYPE_CHECKING:
    from types import ModuleType


def __getattr__(name: str) -> ModuleType:
    """Dynamically import parser datamodel modules on first access."""
    if name in __all__:
        module = import_module(f"{__name__}.{name}")
        globals()[name] = module
        return module
    raise AttributeError(name) from None
