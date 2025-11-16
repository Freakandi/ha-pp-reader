"""SQLite migration helpers for the canonical pp_reader data store."""

from __future__ import annotations

from .snapshot_tables import ensure_snapshot_tables

__all__ = ["ensure_snapshot_tables"]
