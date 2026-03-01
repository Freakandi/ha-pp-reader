"""Parser service entry points and error definitions."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

__all__ = ("PortfolioParseError", "PortfolioValidationError", "parser_pipeline")


class PortfolioParseError(Exception):
    """Raised when reading a Portfolio Performance archive fails."""

    def __init__(self, message: str | None = None) -> None:
        """Attach optional context about the parse failure."""
        super().__init__(message)
        self.message = message


class PortfolioValidationError(PortfolioParseError):
    """Raised when a parsed payload violates expected invariants."""


if TYPE_CHECKING:
    from . import parser_pipeline as parser_pipeline_module  # noqa: F401


def __getattr__(name: str) -> Any:
    """Lazily resolve optional parser submodules."""
    if name == "parser_pipeline":
        try:
            return import_module("custom_components.pp_reader.services.parser_pipeline")
        except ModuleNotFoundError as err:
            raise AttributeError(name) from err
    raise AttributeError(name)


def __dir__() -> list[str]:
    """Expose dynamically available attributes for introspection tooling."""
    return sorted({*globals(), "parser_pipeline"})
