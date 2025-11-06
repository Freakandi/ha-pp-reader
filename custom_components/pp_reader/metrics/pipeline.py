"""Pipeline orchestration helpers for the metrics engine."""

from __future__ import annotations

import logging
from collections.abc import Callable, Mapping
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import (
    MetricRunMetadata,
    load_metric_run,
    upsert_metric_run_metadata,
)
from custom_components.pp_reader.metrics.accounts import async_compute_account_metrics
from custom_components.pp_reader.metrics.portfolio import (
    async_compute_portfolio_metrics,
)
from custom_components.pp_reader.metrics.securities import (
    async_compute_security_metrics,
)
from custom_components.pp_reader.metrics.storage import (
    MetricBatch,
    async_create_metric_run,
    async_store_metric_batch,
)
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

ProgressCallback = Callable[[str, Mapping[str, Any]], None]

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.pipeline")


async def async_refresh_all(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    trigger: str = "coordinator",
    provenance: str | None = None,
    emit_progress: ProgressCallback | None = None,
) -> MetricRunMetadata:
    """Compute and persist metrics for all entity scopes."""
    db_path = Path(db_path)

    def _emit(stage: str, **details: Any) -> None:
        if emit_progress is None:
            return
        emit_progress(stage, dict(details))

    run = await async_create_metric_run(
        hass,
        db_path,
        status="running",
        trigger=trigger,
        provenance=provenance,
    )
    _emit("start", run_uuid=run.run_uuid, trigger=trigger, provenance=provenance)

    try:
        portfolio_records = await async_compute_portfolio_metrics(
            hass,
            db_path,
            run.run_uuid,
        )
        _emit(
            "portfolios_computed",
            run_uuid=run.run_uuid,
            portfolio_count=len(portfolio_records),
        )

        account_records = await async_compute_account_metrics(
            hass,
            db_path,
            run.run_uuid,
        )
        _emit(
            "accounts_computed",
            run_uuid=run.run_uuid,
            account_count=len(account_records),
        )

        security_records = await async_compute_security_metrics(
            hass,
            db_path,
            run.run_uuid,
        )
        _emit(
            "securities_computed",
            run_uuid=run.run_uuid,
            security_count=len(security_records),
        )

        batch = MetricBatch(
            portfolios=tuple(portfolio_records),
            accounts=tuple(account_records),
            securities=tuple(security_records),
        )
        _emit(
            "persistence_started",
            run_uuid=run.run_uuid,
            portfolio_count=len(batch.portfolios),
            account_count=len(batch.accounts),
            security_count=len(batch.securities),
        )

        persisted_run = await async_store_metric_batch(
            hass,
            db_path,
            run=run,
            batch=batch,
        )
        _emit(
            "persistence_completed",
            run_uuid=run.run_uuid,
            processed_portfolios=persisted_run.processed_portfolios,
            processed_accounts=persisted_run.processed_accounts,
            processed_securities=persisted_run.processed_securities,
        )

        completed_run = replace(
            persisted_run,
            status="completed",
            error_message=None,
        )
        await async_run_executor_job(
            hass,
            upsert_metric_run_metadata,
            db_path,
            completed_run,
        )

        stored_run = await async_run_executor_job(
            hass,
            load_metric_run,
            db_path,
            completed_run.run_uuid,
        )
        final_run = stored_run or completed_run
    except Exception as exc:  # pragma: no cover - defensive logging
        failure_run = replace(
            run,
            status="failed",
            error_message=str(exc),
            finished_at=_utc_now_isoformat(),
        )
        await async_run_executor_job(
            hass,
            upsert_metric_run_metadata,
            db_path,
            failure_run,
        )
        _emit("failed", run_uuid=run.run_uuid, error=str(exc))
        _LOGGER.exception("Metric run failed (run_uuid=%s)", run.run_uuid)
        raise
    else:
        _emit(
            "completed",
            run_uuid=final_run.run_uuid,
            status=final_run.status,
            processed_portfolios=final_run.processed_portfolios,
            processed_accounts=final_run.processed_accounts,
            processed_securities=final_run.processed_securities,
            duration_ms=final_run.duration_ms,
        )
        return final_run


def _utc_now_isoformat() -> str:
    """Return an ISO8601 UTC timestamp."""
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
