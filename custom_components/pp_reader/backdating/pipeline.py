"""Plan and orchestrate backdated wealth rebuilds."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.backdating.accounts import (
    async_compute_daily_account_snapshots,
)
from custom_components.pp_reader.currencies.fx import (
    async_prepare_exchange_rates_for_backdating,
)
from custom_components.pp_reader.backdating.aggregate import build_daily_wealth_records
from custom_components.pp_reader.backdating.cashflows import (
    async_compute_daily_cashflows,
)
from custom_components.pp_reader.backdating.holdings import (
    async_compute_daily_holdings_snapshots,
)
from custom_components.pp_reader.backdating.persist import persist_daily_wealth
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

ProgressCallback = Callable[[str, Mapping[str, Any]], None]

_LOGGER = logging.getLogger("custom_components.pp_reader.backdating.pipeline")
_BACKDATING_LOCK = asyncio.Lock()


@dataclass(slots=True)
class BackdatingPlan:
    """Describe the requested backdating window."""

    start_date: date
    end_date: date
    trigger: str
    ingestion_run_uuid: str | None = None
    reason: str = "full_rebuild"


@dataclass(slots=True)
class BackdatingResult:
    """Outcome metadata for a backdating orchestration attempt."""

    status: str
    plan: BackdatingPlan | None = None
    reason: str | None = None
    error: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    provenance: str | None = None

    def as_summary(self) -> dict[str, Any]:
        """Serialize the run outcome into a telemetry-friendly mapping."""
        summary: dict[str, Any] = {"status": self.status}
        if self.reason:
            summary["reason"] = self.reason
        if self.plan is not None:
            summary.update(
                {
                    "start_date": self.plan.start_date.isoformat(),
                    "end_date": self.plan.end_date.isoformat(),
                    "trigger": self.plan.trigger,
                }
            )
            if self.plan.ingestion_run_uuid:
                summary["ingestion_run_uuid"] = self.plan.ingestion_run_uuid
        if self.error:
            summary["error"] = self.error
        if self.started_at:
            summary["started_at"] = self.started_at
        if self.finished_at:
            summary["finished_at"] = self.finished_at
        if self.provenance:
            summary["provenance"] = self.provenance
        return summary


async def async_plan_backdating_window(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    trigger: str,
    ingestion_run_uuid: str | None = None,
    today: date | None = None,
) -> BackdatingPlan | None:
    """Resolve the earliest and latest dates relevant for a backdating run."""
    db_path = Path(db_path)
    start_date, latest_transaction = await async_run_executor_job(
        hass,
        _transaction_date_bounds,
        db_path,
    )
    if start_date is None:
        return None

    effective_today = today or datetime.now(UTC).date()
    end_date = max(effective_today, latest_transaction or effective_today)
    reason = "full_rebuild" if start_date != end_date else "single_day_rebuild"
    return BackdatingPlan(
        start_date=start_date,
        end_date=end_date,
        trigger=trigger,
        ingestion_run_uuid=ingestion_run_uuid,
        reason=reason,
    )


async def async_run_backdating_rebuild(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    trigger: str,
    ingestion_run_uuid: str | None = None,
    provenance: str | None = None,
    emit_progress: ProgressCallback | None = None,
    today: date | None = None,
) -> BackdatingResult:
    """Execute the backdating process for the calculated window."""

    def _emit(stage: str, **details: Any) -> None:
        if emit_progress is None:
            return
        payload: dict[str, Any] = dict(details)
        emit_progress(stage, payload)

    plan = await async_plan_backdating_window(
        hass,
        db_path,
        trigger=trigger,
        ingestion_run_uuid=ingestion_run_uuid,
        today=today,
    )
    provenance_value = provenance or ingestion_run_uuid

    if plan is None:
        _LOGGER.debug(
            "Backdating skipped: no transactions available (trigger=%s)", trigger
        )
        finished_at = _utc_now_isoformat()
        _emit(
            "backdating_skipped",
            reason="no_transactions",
            finished_at=finished_at,
        )
        return BackdatingResult(
            status="skipped",
            reason="no_transactions",
            finished_at=finished_at,
            provenance=provenance_value,
        )

    if _BACKDATING_LOCK.locked():
        _LOGGER.info(
            "Backdating already running, skip duplicate trigger=%s window=%s->%s",
            trigger,
            plan.start_date,
            plan.end_date,
        )
        finished_at = _utc_now_isoformat()
        _emit(
            "backdating_skipped",
            reason="already_running",
            start_date=plan.start_date.isoformat(),
            end_date=plan.end_date.isoformat(),
            finished_at=finished_at,
        )
        return BackdatingResult(
            status="skipped",
            plan=plan,
            reason="already_running",
            finished_at=finished_at,
            provenance=provenance_value,
        )

    async with _BACKDATING_LOCK:
        started_at = _utc_now_isoformat()
        _emit(
            "backdating_start",
            start_date=plan.start_date.isoformat(),
            end_date=plan.end_date.isoformat(),
            started_at=started_at,
        )
        _LOGGER.info(
            "Backdating planned window %s->%s (trigger=%s)",
            plan.start_date,
            plan.end_date,
            trigger,
        )
        try:
            # Ensure FX rates are available for the entire window
            await async_prepare_exchange_rates_for_backdating(
                hass,
                Path(db_path),
                until=plan.end_date,
                emit_progress=(
                    lambda stage, payload: _emit(f"fx_{stage}", **payload)
                ),
            )

            holdings = await async_compute_daily_holdings_snapshots(
                hass,
                db_path,
                plan.start_date,
                plan.end_date,
                emit_progress=(
                    lambda stage, payload: _emit(
                        f"backdating_holdings_{stage}", **payload
                    )
                ),
            )
            _emit("backdating_holdings_completed", days=len(holdings))

            accounts = await async_compute_daily_account_snapshots(
                hass,
                db_path,
                plan.start_date,
                plan.end_date,
                emit_progress=(
                    lambda stage, payload: _emit(
                        f"backdating_accounts_{stage}", **payload
                    )
                ),
            )
            _emit("backdating_accounts_completed", days=len(accounts))

            cashflows = await async_compute_daily_cashflows(
                hass,
                db_path,
                plan.start_date,
                plan.end_date,
                emit_progress=(
                    lambda stage, payload: _emit(
                        f"backdating_cashflows_{stage}", **payload
                    )
                ),
            )
            _emit("backdating_cashflows_completed", days=len(cashflows))

            aggregates = build_daily_wealth_records(
                plan.start_date,
                plan.end_date,
                holdings=holdings,
                accounts=accounts,
                cashflows=cashflows,
                provenance=provenance_value,
            )
            _emit("backdating_aggregate_completed", days=len(aggregates))

            def _persist(
                db_path_param: Path,
                aggregates_param: Any,
                holdings_param: Any,
                accounts_param: Any,
                provenance_param: str | None,
            ) -> None:
                persist_daily_wealth(
                    db_path_param,
                    aggregates_param,
                    holdings_snapshots=holdings_param,
                    account_snapshots=accounts_param,
                    provenance=provenance_param,
                )

            await async_run_executor_job(
                hass,
                _persist,
                Path(db_path),
                aggregates,
                holdings,
                accounts,
                provenance_value,
            )
        except Exception as err:
            finished_at = _utc_now_isoformat()
            _LOGGER.exception(
                "Backdating failed (window=%s->%s trigger=%s)",
                plan.start_date,
                plan.end_date,
                trigger,
            )
            _emit(
                "backdating_failed",
                error=str(err),
                finished_at=finished_at,
            )
            return BackdatingResult(
                status="failed",
                plan=plan,
                reason="error",
                error=str(err),
                started_at=started_at,
                finished_at=finished_at,
                provenance=provenance_value,
            )

        finished_at = _utc_now_isoformat()
        _emit(
            "backdating_completed",
            start_date=plan.start_date.isoformat(),
            end_date=plan.end_date.isoformat(),
            finished_at=finished_at,
        )
        return BackdatingResult(
            status="completed",
            plan=plan,
            started_at=started_at,
            finished_at=finished_at,
            provenance=provenance_value,
        )


def _transaction_date_bounds(db_path: Path) -> tuple[date | None, date | None]:
    """Return earliest and latest transaction dates stored in the database."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT MIN(date) as start_date, MAX(date) as end_date FROM transactions"
        ).fetchone()
    if row is None:
        return None, None

    start_date = _parse_date_value(row["start_date"])
    end_date = _parse_date_value(row["end_date"])
    return start_date, end_date


def _parse_date_value(value: Any) -> date | None:  # noqa: PLR0911
    """Best-effort parsing for transaction date values stored as TEXT or int."""
    if value in (None, ""):
        return None
    text_value = str(value).strip()
    if not text_value:
        return None

    if text_value.isdigit() and len(text_value) == 8:  # noqa: PLR2004
        try:
            return date(
                int(text_value[0:4]),
                int(text_value[4:6]),
                int(text_value[6:8]),
            )
        except ValueError:
            return None

    sanitized = text_value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(sanitized).date()
    except ValueError:
        try:
            return date.fromisoformat(text_value[:10])
        except ValueError:
            return None


def _utc_now_isoformat() -> str:
    """Return an ISO8601 UTC timestamp."""
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
