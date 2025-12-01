"""Persistence helpers for canonical normalization snapshots."""

from __future__ import annotations

import json
import logging
import sqlite3
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from custom_components.pp_reader.data.migrations import ensure_snapshot_tables
from custom_components.pp_reader.util.datetime import UTC

if TYPE_CHECKING:
    from .normalization_pipeline import (
        AccountSnapshot,
        NormalizationResult,
        PortfolioSnapshot,
    )

_LOGGER = logging.getLogger("custom_components.pp_reader.data.snapshot_writer")

JsonMapping = Mapping[str, object]


@dataclass(slots=True)
class _SnapshotPersistenceContext:
    conn: sqlite3.Connection
    run_uuid: str
    snapshot_at: str
    timestamp: str


def persist_normalization_result(
    db_path: Path | str,
    result: NormalizationResult,
    *,
    account_serializer: Callable[[AccountSnapshot], JsonMapping],
    portfolio_serializer: Callable[[PortfolioSnapshot], JsonMapping],
) -> bool:
    """Store the provided NormalizationResult in account/portfolio snapshot tables."""
    run_uuid = (result.metric_run_uuid or "").strip()
    if not run_uuid:
        _LOGGER.debug(
            (
                "snapshot_writer: metric_run_uuid fehlt - "
                "Snapshots werden nicht gespeichert"
            ),
        )
        return False

    snapshot_at = result.generated_at or _utc_now_isoformat()
    timestamp = _utc_now_isoformat()

    conn = sqlite3.connect(str(Path(db_path)))
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        ensure_snapshot_tables(conn)
        context = _SnapshotPersistenceContext(
            conn=conn,
            run_uuid=run_uuid,
            snapshot_at=snapshot_at,
            timestamp=timestamp,
        )
        _persist_account_snapshots(
            ctx=context,
            snapshots=result.accounts,
            serializer=account_serializer,
        )
        _persist_portfolio_snapshots(
            ctx=context,
            snapshots=result.portfolios,
            serializer=portfolio_serializer,
        )
        conn.commit()
    except Exception:
        conn.rollback()
        _LOGGER.exception(
            "snapshot_writer: Fehler beim Persistieren der Snapshots (run_uuid=%s)",
            run_uuid,
        )
        raise
    finally:
        conn.close()

    return True


def _persist_account_snapshots(
    *,
    ctx: _SnapshotPersistenceContext,
    snapshots: Sequence[AccountSnapshot],
    serializer: Callable[[AccountSnapshot], JsonMapping],
) -> None:
    """Insert or update account snapshot rows within the active transaction."""
    for account in snapshots:
        payload = serializer(account)
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        ctx.conn.execute(
            """
            INSERT INTO account_snapshots (
                metric_run_uuid,
                account_uuid,
                snapshot_at,
                name,
                currency_code,
                orig_balance,
                balance,
                fx_unavailable,
                fx_rate,
                fx_rate_source,
                fx_rate_timestamp,
                coverage_ratio,
                provenance,
                payload,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_run_uuid, account_uuid) DO UPDATE SET
                snapshot_at = excluded.snapshot_at,
                name = excluded.name,
                currency_code = excluded.currency_code,
                orig_balance = excluded.orig_balance,
                balance = excluded.balance,
                fx_unavailable = excluded.fx_unavailable,
                fx_rate = excluded.fx_rate,
                fx_rate_source = excluded.fx_rate_source,
                fx_rate_timestamp = excluded.fx_rate_timestamp,
                coverage_ratio = excluded.coverage_ratio,
                provenance = excluded.provenance,
                payload = excluded.payload,
                updated_at = excluded.updated_at
            """,
            (
                ctx.run_uuid,
                account.uuid,
                ctx.snapshot_at,
                account.name,
                account.currency_code,
                account.orig_balance,
                account.balance,
                1 if account.fx_unavailable else 0,
                account.fx_rate,
                account.fx_rate_source,
                account.fx_rate_timestamp,
                account.coverage_ratio,
                account.provenance,
                payload_json,
                ctx.timestamp,
                ctx.timestamp,
            ),
        )


def _persist_portfolio_snapshots(
    *,
    ctx: _SnapshotPersistenceContext,
    snapshots: Sequence[PortfolioSnapshot],
    serializer: Callable[[PortfolioSnapshot], JsonMapping],
) -> None:
    """Insert or update portfolio snapshot rows within the active transaction."""
    for portfolio in snapshots:
        payload = serializer(portfolio)
        payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        performance = portfolio.performance or {}
        ctx.conn.execute(
            """
            INSERT INTO portfolio_snapshots (
                metric_run_uuid,
                portfolio_uuid,
                snapshot_at,
                name,
                currency_code,
                current_value,
                purchase_sum,
                gain_abs,
                gain_pct,
                total_change_eur,
                total_change_pct,
                position_count,
                missing_value_positions,
                has_current_value,
                coverage_ratio,
                performance_source,
                performance_provenance,
                provenance,
                payload,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_run_uuid, portfolio_uuid) DO UPDATE SET
                snapshot_at = excluded.snapshot_at,
                name = excluded.name,
                currency_code = excluded.currency_code,
                current_value = excluded.current_value,
                purchase_sum = excluded.purchase_sum,
                gain_abs = excluded.gain_abs,
                gain_pct = excluded.gain_pct,
                total_change_eur = excluded.total_change_eur,
                total_change_pct = excluded.total_change_pct,
                position_count = excluded.position_count,
                missing_value_positions = excluded.missing_value_positions,
                has_current_value = excluded.has_current_value,
                coverage_ratio = excluded.coverage_ratio,
                performance_source = excluded.performance_source,
                performance_provenance = excluded.performance_provenance,
                provenance = excluded.provenance,
                payload = excluded.payload,
                updated_at = excluded.updated_at
            """,
            (
                ctx.run_uuid,
                portfolio.uuid,
                ctx.snapshot_at,
                portfolio.name,
                "EUR",
                portfolio.current_value,
                portfolio.purchase_value,
                performance.get("gain_abs"),
                performance.get("gain_pct"),
                performance.get("total_change_eur"),
                performance.get("total_change_pct"),
                portfolio.position_count,
                portfolio.missing_value_positions,
                1 if portfolio.has_current_value else 0,
                portfolio.coverage_ratio,
                performance.get("source"),
                performance.get("provenance"),
                portfolio.provenance,
                payload_json,
                ctx.timestamp,
                ctx.timestamp,
            ),
        )


def _utc_now_isoformat() -> str:
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
