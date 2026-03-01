"""WAL-safe helpers to provision canonical snapshot tables."""

from __future__ import annotations

import logging
import sqlite3
from typing import TYPE_CHECKING

from custom_components.pp_reader.data.db_schema import (
    ACCOUNT_SNAPSHOT_SCHEMA,
    PORTFOLIO_SNAPSHOT_SCHEMA,
)

if TYPE_CHECKING:
    from collections.abc import Iterable

_LOGGER = logging.getLogger(__name__)


def _iter_snapshot_ddls() -> Iterable[str]:
    """Yield DDL statements required for snapshot tables."""
    yield from (*PORTFOLIO_SNAPSHOT_SCHEMA, *ACCOUNT_SNAPSHOT_SCHEMA)


def ensure_snapshot_tables(conn: sqlite3.Connection) -> None:
    """Create canonical snapshot tables and indexes if they are missing."""
    for ddl in _iter_snapshot_ddls():
        try:
            conn.execute(ddl)
        except sqlite3.Error:
            _LOGGER.exception(
                "Snapshot schema migration failed for statement:\n%s",
                ddl,
            )
            raise
