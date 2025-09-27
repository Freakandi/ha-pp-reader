"""Tests for the foreign exchange helper functions."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest

from custom_components.pp_reader.currencies import fx

pytestmark = pytest.mark.anyio

RETRY_THRESHOLD = 2
LOCK_MESSAGE = "database is locked"


@pytest.fixture
def anyio_backend() -> str:
    """Force the anyio plugin to use asyncio for async tests."""
    return "asyncio"


if TYPE_CHECKING:
    from collections.abc import Callable


async def test_save_rates_retries_on_locked(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure _save_rates retries when the SQLite database is locked."""
    call_count = 0
    lock_error = sqlite3.OperationalError(LOCK_MESSAGE)

    async def fake_execute_db(
        _fn: Callable[..., Any],
        _db_path: Path,
        _date: str,
        _rates: dict[str, float],
    ) -> None:
        nonlocal call_count
        call_count += 1
        if call_count < RETRY_THRESHOLD:
            raise lock_error

    async def fake_sleep(_delay: float) -> None:
        return None

    monkeypatch.setattr(fx, "_execute_db", fake_execute_db)
    monkeypatch.setattr(fx.asyncio, "sleep", fake_sleep)

    await fx._save_rates(Path("dummy.db"), "2025-01-01", {"USD": 1.1})  # noqa: SLF001

    assert call_count == RETRY_THRESHOLD  # noqa: S101


async def test_save_rates_raises_after_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure the original error surfaces when retries are exhausted."""
    lock_error = sqlite3.OperationalError(LOCK_MESSAGE)

    async def always_locked(
        _fn: Callable[..., Any],
        _db_path: Path,
        _date: str,
        _rates: dict[str, float],
    ) -> None:
        raise lock_error

    async def fake_sleep(_delay: float) -> None:
        return None

    monkeypatch.setattr(fx, "_execute_db", always_locked)
    monkeypatch.setattr(fx.asyncio, "sleep", fake_sleep)

    with pytest.raises(sqlite3.OperationalError):
        await fx._save_rates(  # noqa: SLF001
            Path("dummy.db"),
            "2025-01-01",
            {"USD": 1.1},
            retries=RETRY_THRESHOLD,
        )
