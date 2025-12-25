"""Pipeline orchestration helpers for the metrics engine."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.backdating.live_update import update_today_wealth
from custom_components.pp_reader.backdating.pipeline import (
    BackdatingResult,
    async_run_backdating_rebuild,
)
from custom_components.pp_reader.data.db_access import (
    MetricRunMetadata,
    load_metric_run,
    upsert_metric_run_metadata,
)
from custom_components.pp_reader.metrics import accounts as metrics_accounts
from custom_components.pp_reader.metrics import portfolio as metrics_portfolio
from custom_components.pp_reader.metrics import securities as metrics_securities
from custom_components.pp_reader.metrics.storage import (
    MetricBatch,
    async_create_metric_run,
    async_store_metric_batch,
)
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

ProgressCallback = Callable[[str, Mapping[str, Any]], None]
StageRunner = Callable[["HomeAssistant", Path, str], Awaitable[list[Any]]]

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.pipeline")


@dataclass(slots=True)
class MetricsPipelineResult:
    """Aggregate metrics and optional backdating outcomes."""

    metric_run: MetricRunMetadata
    backdating: BackdatingResult | None = None


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

    async def _run_stage(stage: str, runner: StageRunner) -> list[Any]:
        try:
            return await runner(hass, db_path, run.run_uuid)
        except Exception as exc:
            _emit(f"{stage}_failed", run_uuid=run.run_uuid, error=str(exc))
            raise

    try:
        portfolio_records = await _run_stage(
            "portfolios",
            metrics_portfolio.async_compute_portfolio_metrics,
        )
        _emit(
            "portfolios_computed",
            run_uuid=run.run_uuid,
            portfolio_count=len(portfolio_records),
        )

        account_records = await _run_stage(
            "accounts",
            metrics_accounts.async_compute_account_metrics,
        )
        _emit(
            "accounts_computed",
            run_uuid=run.run_uuid,
            account_count=len(account_records),
        )

        security_records = await _run_stage(
            "securities",
            metrics_securities.async_compute_security_metrics,
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
        run = _apply_processed_counts(run, batch)
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
        persisted_run = _apply_processed_counts(persisted_run, batch)
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
        # --- NEW: Live Update for Daily Wealth (Today) ---
        try:
            await async_run_executor_job(
                hass,
                update_today_wealth,
                db_path,
                final_run.run_uuid,
            )
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "Live-Update für daily_wealth fehlgeschlagen (non-critical)",
                exc_info=True,
            )
        # -------------------------------------------------

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


async def async_refresh_all_with_backdating(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    trigger: str = "coordinator",
    provenance: str | None = None,
    emit_progress: ProgressCallback | None = None,
    backdating_today: date | None = None,
) -> MetricsPipelineResult:
    """Run the metrics pipeline and then orchestrate a backdating rebuild."""
    metric_run = await async_refresh_all(
        hass,
        db_path,
        trigger=trigger,
        provenance=provenance,
        emit_progress=emit_progress,
    )

    backdating_result = await async_run_backdating_rebuild(
        hass,
        db_path,
        trigger=trigger,
        ingestion_run_uuid=provenance,
        provenance=provenance,
        emit_progress=emit_progress,
        today=backdating_today,
    )

    return MetricsPipelineResult(metric_run=metric_run, backdating=backdating_result)


def _utc_now_isoformat() -> str:
    """Return an ISO8601 UTC timestamp."""
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def _apply_processed_counts(
    run: MetricRunMetadata,
    batch: MetricBatch,
) -> MetricRunMetadata:
    """Ensure processed counters and totals reflect the persisted batch."""
    processed_portfolios = (
        run.processed_portfolios
        if run.processed_portfolios is not None
        else len(batch.portfolios)
    )
    processed_accounts = (
        run.processed_accounts
        if run.processed_accounts is not None
        else len(batch.accounts)
    )
    processed_securities = (
        run.processed_securities
        if run.processed_securities is not None
        else len(batch.securities)
    )
    total_entities = (
        run.total_entities
        if run.total_entities is not None
        else processed_portfolios + processed_accounts + processed_securities
    )

    return replace(
        run,
        processed_portfolios=processed_portfolios,
        processed_accounts=processed_accounts,
        processed_securities=processed_securities,
        total_entities=total_entities,
    )
