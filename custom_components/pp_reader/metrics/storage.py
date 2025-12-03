"""Persistence helpers for metric engine runs and batch writes."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import suppress
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import uuid4

from custom_components.pp_reader.data.db_access import (
    AccountMetricRecord,
    MetricRunMetadata,
    PortfolioMetricRecord,
    SecurityMetricRecord,
    fetch_account_metrics,
    fetch_portfolio_metrics,
    fetch_security_metrics,
    load_latest_completed_metric_run_uuid,
    load_metric_run,
    upsert_account_metrics,
    upsert_metric_run_metadata,
    upsert_portfolio_metrics,
    upsert_security_metrics,
)
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from collections.abc import Sequence

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback for type hints
    from collections import abc as _abc

    Sequence = _abc.Sequence  # type: ignore[assignment]

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.storage")


@dataclass(slots=True)
class MetricBatch:
    """Container bundling metric records per entity type."""

    portfolios: tuple[PortfolioMetricRecord, ...] = ()
    accounts: tuple[AccountMetricRecord, ...] = ()
    securities: tuple[SecurityMetricRecord, ...] = ()


async def async_create_metric_run(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    status: str = "pending",
    trigger: str | None = None,
    provenance: str | None = None,
) -> MetricRunMetadata:
    """Create and persist an initial metric run entry."""
    return await async_run_executor_job(
        hass,
        _create_metric_run_sync,
        Path(db_path),
        status,
        trigger,
        provenance,
    )


async def async_store_metric_batch(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    run: MetricRunMetadata,
    batch: MetricBatch,
) -> MetricRunMetadata:
    """Persist metric records and update the associated run atomically."""
    return await async_run_executor_job(
        hass,
        _store_metric_batch_sync,
        Path(db_path),
        run,
        batch,
    )


def load_metric_batch(
    db_path: Path | str,
    run_uuid: str | None,
) -> tuple[MetricRunMetadata | None, MetricBatch]:
    """Load persisted metrics for a specific run."""
    resolved_path = Path(db_path)
    if not run_uuid:
        return None, MetricBatch()

    run = load_metric_run(resolved_path, run_uuid)
    if run is None:
        _LOGGER.warning(
            "metrics.storage: Metric-Run %s nicht gefunden - gebe leeres Batch zurück",
            run_uuid,
        )
        return None, MetricBatch()

    try:
        portfolio_metrics = fetch_portfolio_metrics(resolved_path, run_uuid)
    except Exception:  # pragma: no cover - defensive fallback
        _LOGGER.exception(
            "metrics.storage: Fehler beim Laden der Portfolio-Metriken (run_uuid=%s)",
            run_uuid,
        )
        portfolio_metrics = []

    try:
        account_metrics = fetch_account_metrics(resolved_path, run_uuid)
    except Exception:  # pragma: no cover - defensive fallback
        _LOGGER.exception(
            "metrics.storage: Fehler beim Laden der Konto-Metriken (run_uuid=%s)",
            run_uuid,
        )
        account_metrics = []

    try:
        security_metrics = fetch_security_metrics(resolved_path, run_uuid)
    except Exception:  # pragma: no cover - defensive fallback
        _LOGGER.exception(
            "metrics.storage: Fehler beim Laden der Wertpapier-Metriken (run_uuid=%s)",
            run_uuid,
        )
        security_metrics = []

    batch = MetricBatch(
        portfolios=tuple(portfolio_metrics),
        accounts=tuple(account_metrics),
        securities=tuple(security_metrics),
    )
    return run, batch


def load_latest_metric_batch(
    db_path: Path | str,
) -> tuple[MetricRunMetadata | None, MetricBatch]:
    """Return the most recent completed metric batch and metadata."""
    resolved_path = Path(db_path)
    run_uuid = load_latest_completed_metric_run_uuid(resolved_path)
    return load_metric_batch(resolved_path, run_uuid)


def _create_metric_run_sync(
    db_path: Path,
    status: str,
    trigger: str | None,
    provenance: str | None,
) -> MetricRunMetadata:
    run_uuid = uuid4().hex
    started = _utc_now_isoformat()

    run = MetricRunMetadata(
        run_uuid=run_uuid,
        status=status,
        trigger=trigger,
        started_at=started,
        provenance=provenance,
    )

    upsert_metric_run_metadata(db_path, run)
    return run


def _store_metric_batch_sync(
    db_path: Path,
    run: MetricRunMetadata,
    batch: MetricBatch,
) -> MetricRunMetadata:
    portfolios = tuple(batch.portfolios or ())
    accounts = tuple(batch.accounts or ())
    securities = tuple(batch.securities or ())

    prepared_run = _prepare_run_metadata(run, portfolios, accounts, securities)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute("PRAGMA foreign_keys = ON")

        upsert_metric_run_metadata(db_path, prepared_run, conn=conn)

        if portfolios:
            upsert_portfolio_metrics(db_path, portfolios, conn=conn)
        if accounts:
            upsert_account_metrics(db_path, accounts, conn=conn)
        if securities:
            upsert_security_metrics(db_path, securities, conn=conn)

        conn.commit()
    except Exception:
        conn.rollback()
        _LOGGER.exception(
            "Fehler beim Persistieren der Metric-Batch (run_uuid=%s)",
            run.run_uuid,
        )
        raise
    finally:
        with suppress(sqlite3.Error):
            conn.close()

    return prepared_run


def _prepare_run_metadata(
    run: MetricRunMetadata,
    portfolios: Sequence[PortfolioMetricRecord],
    accounts: Sequence[AccountMetricRecord],
    securities: Sequence[SecurityMetricRecord],
) -> MetricRunMetadata:
    processed_portfolios = (
        run.processed_portfolios
        if run.processed_portfolios is not None
        else len(portfolios)
    )
    processed_accounts = (
        run.processed_accounts if run.processed_accounts is not None else len(accounts)
    )
    processed_securities = (
        run.processed_securities
        if run.processed_securities is not None
        else len(securities)
    )

    total_entities = run.total_entities
    if total_entities is None:
        total_entities = (
            processed_portfolios + processed_accounts + processed_securities
        )

    started_at = _normalize_timestamp(run.started_at) or _utc_now_isoformat()
    finished_at = _normalize_timestamp(run.finished_at) or _utc_now_isoformat()

    duration_ms = run.duration_ms
    if duration_ms is None:
        duration_ms = _compute_duration_ms(started_at, finished_at)

    return replace(
        run,
        started_at=started_at,
        finished_at=finished_at,
        duration_ms=duration_ms,
        total_entities=total_entities,
        processed_portfolios=processed_portfolios,
        processed_accounts=processed_accounts,
        processed_securities=processed_securities,
    )


def _normalize_timestamp(value: datetime | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        aware = value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
        return aware.replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    return value


def _compute_duration_ms(start: str | None, finish: str | None) -> int | None:
    start_dt = _parse_timestamp(start)
    finish_dt = _parse_timestamp(finish)
    if start_dt is None or finish_dt is None:
        return None
    return int((finish_dt - start_dt).total_seconds() * 1000)


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        iso_value = value[:-1] + "+00:00" if value.endswith("Z") else value
        return datetime.fromisoformat(iso_value)
    except ValueError:
        return None


def _utc_now_isoformat() -> str:
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
