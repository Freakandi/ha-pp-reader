"""Test suite for legacy FX backdating helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock

import pytest

if TYPE_CHECKING:
    from pathlib import Path

# --- Legacy imports removed because the module is gone ---


@pytest.fixture
def mock_db_path(tmp_path: Path) -> Path:
    """Provide a temporary DB path."""
    return tmp_path / "test.db"


@pytest.fixture
def mock_hass() -> MagicMock:
    """Provide a mock HASS object."""
    hass = MagicMock()
    # Stub executor job to run synchronously
    hass.async_add_executor_job = lambda f, *args: f(*args)
    return hass


# All tests removed because the underlying code (fx_backdating_helpers) is DELETED.
# This file is kept as a placeholder if we need to port logic, otherwise can be deleted.
