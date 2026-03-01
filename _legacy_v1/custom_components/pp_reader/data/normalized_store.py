"""Async-safe helpers to load canonical snapshots and metrics from SQLite."""

from __future__ import annotations

import json
import logging
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, TypedDict

from custom_components.pp_reader.metrics.storage import (
    MetricBatch,
    MetricRunMetadata,
    load_latest_metric_batch,
)
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:  # pragma: no cover - only for type checking
    from collections.abc import Sequence

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback for typing only
    HomeAssistant = Any  # type: ignore[assignment]

_LOGGER = logging.getLogger("custom_components.pp_reader.data.normalized_store")


class _SnapshotRow(TypedDict):
    payload: str
    snapshot_at: str
    metric_run_uuid: str


@dataclass(slots=True)
class SnapshotBundle:
    """Container bundling decoded account and portfolio snapshots."""

    metric_run_uuid: str | None
    snapshot_at: str | None
    accounts: tuple[dict[str, Any], ...]
    portfolios: tuple[dict[str, Any], ...]


@dataclass(slots=True)
class MetricSummary:
    """Wrapper for the latest completed metric run and batch."""

    run: MetricRunMetadata | None
    batch: MetricBatch


async def async_load_latest_snapshot_bundle(
    hass: HomeAssistant,
    db_path: Path | str,
) -> SnapshotBundle:
    """Read the latest persisted account + portfolio snapshots from SQLite."""

    def _load() -> SnapshotBundle:
        resolved_path = Path(db_path)
        run_uuid, snapshot_at = _resolve_latest_snapshot_metadata(resolved_path)
        accounts = _load_snapshot_payloads(resolved_path, "account_snapshots", run_uuid)
        portfolios = _load_snapshot_payloads(
            resolved_path,
            "portfolio_snapshots",
            run_uuid,
        )
        return SnapshotBundle(
            metric_run_uuid=run_uuid,
            snapshot_at=snapshot_at,
            accounts=tuple(accounts),
            portfolios=tuple(portfolios),
        )

    return await async_run_executor_job(hass, _load)


async def async_load_metric_summary(
    hass: HomeAssistant,
    db_path: Path | str,
) -> MetricSummary:
    """Return metadata and batches for the latest completed metric run."""

    def _load() -> MetricSummary:
        run, batch = load_latest_metric_batch(Path(db_path))
        return MetricSummary(run=run, batch=batch)

    return await async_run_executor_job(hass, _load)


def _resolve_latest_snapshot_metadata(db_path: Path) -> tuple[str | None, str | None]:
    conn = sqlite3.connect(str(db_path))
    try:
        cursor = conn.execute(
            """
            SELECT metric_run_uuid, snapshot_at
            FROM portfolio_snapshots
            ORDER BY snapshot_at DESC, id DESC
            LIMIT 1
            """,
        )
        row = cursor.fetchone()
        metadata = (row[0], row[1]) if row else (None, None)
    except sqlite3.Error:
        _LOGGER.exception(
            "normalized_store: Fehler beim Lesen der Snapshot-Metadaten",
        )
        return None, None
    finally:
        conn.close()
    return metadata


def _load_snapshot_payloads(
    db_path: Path,
    table: str,
    run_uuid: str | None,
) -> list[dict[str, Any]]:
    if not run_uuid:
        return []

    query_map = {
        "account_snapshots": (
            "SELECT payload, metric_run_uuid, snapshot_at "
            "FROM account_snapshots WHERE metric_run_uuid = ?"
        ),
        "portfolio_snapshots": (
            "SELECT payload, metric_run_uuid, snapshot_at "
            "FROM portfolio_snapshots WHERE metric_run_uuid = ?"
        ),
    }
    try:
        query = query_map[table]
    except KeyError as err:  # pragma: no cover - defensive guard
        message = f"Unzulässiger Snapshot-Table: {table}"
        raise ValueError(message) from err

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    snapshots: list[dict[str, Any]] = []
    try:
        cursor = conn.execute(query, (run_uuid,))
        rows: Sequence[_SnapshotRow] = cursor.fetchall()
        for row in rows:
            try:
                payload = json.loads(row["payload"])
            except (TypeError, json.JSONDecodeError):
                _LOGGER.warning(
                    "normalized_store: Konnte Snapshot-Payload aus %s nicht parsen",
                    table,
                )
                continue
            snapshots.append(payload)
    except sqlite3.Error:
        _LOGGER.exception(
            "normalized_store: Fehler beim Laden von %s (run_uuid=%s)",
            table,
            run_uuid,
        )
        return []
    finally:
        conn.close()
    return snapshots
