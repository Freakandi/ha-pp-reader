"""Tests for the foreign exchange helper functions."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
import threading
import time
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


async def test_concurrent_writes_are_serialized(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ensure concurrent calls to _save_rates are serialized via a threading lock."""
    active_calls = 0
    max_concurrent = 0
    state_lock = threading.Lock()

    def fake_connect(*_args: Any, **_kwargs: Any) -> Any:
        class DummyConnection:
            def executemany(self, *_exec_args: Any, **_exec_kwargs: Any) -> None:
                nonlocal active_calls, max_concurrent
                with state_lock:
                    active_calls += 1
                    max_concurrent = max(max_concurrent, active_calls)
                try:
                    time.sleep(0.05)
                finally:
                    with state_lock:
                        active_calls -= 1

            def commit(self) -> None:
                """No-op commit stub."""

            def close(self) -> None:
                """No-op close stub."""

        return DummyConnection()

    monkeypatch.setattr(fx.sqlite3, "connect", fake_connect)

    async def call_save() -> None:
        await fx._save_rates(  # noqa: SLF001
            Path("dummy.db"),
            "2025-01-01",
            {"USD": 1.1},
        )

    await asyncio.gather(*(call_save() for _ in range(3)))

    assert max_concurrent == 1  # noqa: S101


async def test_fetch_exchange_rates_handles_network_issues(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Network errors should be logged as warnings without raising exceptions."""

    class FailingRequest:
        async def __aenter__(self) -> None:  # noqa: D401 - simple stub
            raise OSError("Network is unreachable")

        async def __aexit__(self, *_exc: Any) -> bool:
            return False

    class FakeSession:
        def __init__(self, *_args: Any, **_kwargs: Any) -> None:
            return None

        async def __aenter__(self) -> "FakeSession":
            return self

        async def __aexit__(self, *_exc: Any) -> bool:
            return False

        def get(self, *_args: Any, **_kwargs: Any) -> FailingRequest:
            return FailingRequest()

    monkeypatch.setattr(fx.aiohttp, "ClientSession", FakeSession)

    caplog.set_level(logging.WARNING)

    result = await fx._fetch_exchange_rates("2025-01-01", {"USD"})  # noqa: SLF001

    assert result == {}  # noqa: S101
    assert any(  # noqa: S101
        "Netzwerkproblem" in message for message in caplog.messages
    )
    assert all(record.levelno < logging.ERROR for record in caplog.records)  # noqa: S101
