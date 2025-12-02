"""
Define the PPReaderCoordinator class.

Manage data updates from a portfolio file and synchronize it with an SQLite database.

It includes functionality to:
- Detect changes in the portfolio file.
- Parse and synchronize portfolio data with the database.
- Load and calculate account balances, portfolio values, and transactions.
"""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from custom_components.pp_reader.const import (
    EVENT_ENRICHMENT_PROGRESS,
    EVENT_METRICS_PROGRESS,
    EVENT_NORMALIZATION_PROGRESS,
    SIGNAL_ENRICHMENT_COMPLETED,
    SIGNAL_ENRICHMENT_PROGRESS,
    SIGNAL_METRICS_PROGRESS,
    SIGNAL_NORMALIZATION_PROGRESS,
    SIGNAL_PARSER_COMPLETED,
    SIGNAL_PARSER_PROGRESS,
)
from custom_components.pp_reader.currencies import fx as fx_module
from custom_components.pp_reader.feature_flags import is_enabled
from custom_components.pp_reader.metrics.pipeline import async_refresh_all
from custom_components.pp_reader.prices.history_queue import (
    HistoryQueueManager,
    build_history_targets_from_parsed,
)
from custom_components.pp_reader.services import (
    PortfolioParseError,
    PortfolioValidationError,
    parser_pipeline,
)
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util import diagnostics as diagnostics_util
from custom_components.pp_reader.util import notifications as notifications_util

from .canonical_sync import async_sync_ingestion_to_canonical
from .db_init import ensure_metric_tables
from .ingestion_writer import IngestionMetadata, async_ingestion_session
from .normalization_pipeline import (
    NormalizationResult,
    async_normalize_snapshot,
)

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback for typing only
    HomeAssistant = Any  # type: ignore[assignment]

_LOGGER = logging.getLogger(__name__)
_ENRICHMENT_FAILURE_THRESHOLD = 2


@dataclass(slots=True)
class CoordinatorTelemetry:
    """Minimal telemetry payload exposed via DataUpdateCoordinator."""

    last_update: str | None = None
    ingestion_run_id: str | None = None
    parser_stage: str | None = None
    parser_processed: int | None = None
    parser_total: int | None = None
    metric_run_id: str | None = None
    normalized_generated_at: str | None = None
    normalized_metric_run_uuid: str | None = None
    enrichment_summary: Mapping[str, Any] | None = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        """Serialize the telemetry contract into JSON-friendly primitives."""
        return {
            "last_update": self.last_update,
            "ingestion": {
                "run_id": self.ingestion_run_id,
                "parser": {
                    "stage": self.parser_stage,
                    "processed": self.parser_processed,
                    "total": self.parser_total,
                },
            },
            "metrics": {
                "run_id": self.metric_run_id,
            },
            "normalization": {
                "metric_run_uuid": self.normalized_metric_run_uuid,
                "generated_at": self.normalized_generated_at,
            },
            "enrichment": dict(self.enrichment_summary or {}),
        }


def _get_last_db_update(db_path: Path) -> datetime | None:
    """Read the last known file timestamp from the metadata table."""
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT date FROM metadata WHERE key = 'last_file_update'")
        result = cur.fetchone()
    if result and result[0]:
        return datetime.fromisoformat(result[0])
    return None


def _set_last_db_update(db_path: Path, file_update: datetime) -> None:
    """Persist the last processed file timestamp into the metadata table."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO metadata (key, date)
            VALUES ('last_file_update', ?)
            ON CONFLICT(key) DO UPDATE SET date=excluded.date
            """,
            (file_update.isoformat(),),
        )


def _ensure_metric_schema(db_path: Path) -> None:
    """Create metric tables when missing."""
    conn = sqlite3.connect(str(db_path))
    try:
        ensure_metric_tables(conn)
        conn.commit()
    finally:
        conn.close()


class PPReaderCoordinator(DataUpdateCoordinator):
    """
    A coordinator for data updates from a file, synching to an SQLite database.

    This class handles:
    - Detecting changes in the portfolio file.
    - Parsing and synchronizing portfolio data with the database.
    - Loading and calculating account balances, portfolio values,
      and transactions.
    """

    def __init__(
        self, hass: HomeAssistant, *, db_path: Path, file_path: Path, entry_id: str
    ) -> None:
        """
        Initialisiere den Coordinator.

        Args:
            hass: HomeAssistant Instanz
            db_path: Pfad zur SQLite-Datenbank
            file_path: Pfad zur Portfolio-Datei
            entry_id: Die Entry-ID des Frontend-Panels für websocket-subscription

        """
        super().__init__(
            hass,
            _LOGGER,
            name="pp_reader",
            update_interval=timedelta(minutes=1),
        )
        self.db_path = db_path
        self.file_path = file_path
        self.entry_id = entry_id
        self.hass = hass
        self.data = CoordinatorTelemetry().as_dict()
        self.last_file_update = None  # Initialisierung des Attributs
        self._last_parser_progress: tuple[str, int, int] | None = None
        self._last_ingestion_run_id: str | None = None
        self._last_metric_run_id: str | None = None
        self._normalized_snapshot: NormalizationResult | None = None
        self._last_pipeline_summary: dict[str, Any] | None = None
        self._enrichment_failure_streak = 0
        self._enrichment_failure_notified = False
        self._manual_update_log_handle: asyncio.TimerHandle | None = None
        self._manual_update_log_count = 0
        self._manual_update_window_started: float | None = None
        self._history_lock = asyncio.Lock()

    async def _async_update_data(self) -> dict:
        """Überwache Dateiänderungen und orchestriere den Pipeline-Status."""
        try:
            last_update_truncated = self._get_last_file_update()
            last_db_update = await async_run_executor_job(
                self.hass, _get_last_db_update, self.db_path
            )

            if self._should_sync(last_db_update, last_update_truncated):
                await self._sync_portfolio_file(last_update_truncated)

            payload = self._build_telemetry_payload(
                last_update=last_update_truncated,
            )
        except FileNotFoundError:
            message = f"Portfolio-Datei nicht gefunden: {self.file_path}"
            _LOGGER.error(message)  # noqa: TRY400 - bewusst ohne Traceback
            raise UpdateFailed(message) from None
        except Exception as err:  # pragma: no cover - defensive logging
            _LOGGER.exception("Fehler beim Laden der Pipeline-Telemetrie")
            msg = f"Update fehlgeschlagen: {err}"
            raise UpdateFailed(msg) from err

        return payload

    def _get_last_file_update(self) -> datetime:
        """Truncate the file's last modification timestamp to the minute."""
        last_update = self.file_path.stat().st_mtime
        return datetime.fromtimestamp(last_update).replace(  # noqa: DTZ006
            second=0, microsecond=0
        )

    @staticmethod
    def _should_sync(last_db_update: datetime | None, file_update: datetime) -> bool:
        """Return True when the DB snapshot is older than the file on disk."""
        return not last_db_update or file_update > last_db_update

    async def async_get_diagnostics(self) -> dict[str, Any]:
        """Return diagnostics including staging parser metadata."""
        return await diagnostics_util.async_get_parser_diagnostics(
            self.hass,
            self.db_path,
            entry_id=self.entry_id,
        )

    async def _sync_portfolio_file(self, last_update_truncated: datetime) -> None:
        """Parse and persist the portfolio when the file has changed."""
        _LOGGER.info("Dateiänderung erkannt, starte Datenaktualisierung...")

        self._last_parser_progress = None
        self._last_ingestion_run_id = None
        notify_parser_failures = is_enabled(
            "notify_parser_failures",
            self.hass,
            entry_id=self.entry_id,
            default=False,
        )
        try:
            async with async_ingestion_session(self.db_path) as writer:
                parsed_client = await parser_pipeline.async_parse_portfolio(
                    hass=self.hass,
                    path=str(self.file_path),
                    writer=writer,
                    progress_cb=self._handle_parser_progress,
                )
                self._last_ingestion_run_id = writer.finalize_ingestion(
                    IngestionMetadata(
                        file_path=str(self.file_path),
                        parsed_at=datetime.now(UTC),
                        pp_version=parsed_client.version,
                        base_currency=parsed_client.base_currency,
                        properties=parsed_client.properties,
                        parsed_client=parsed_client,
                    )
                )
        except (PortfolioParseError, PortfolioValidationError) as err:
            if notify_parser_failures:
                self.hass.async_create_task(
                    notifications_util.async_create_parser_failure_notification(
                        self.hass,
                        entry_id=self.entry_id,
                        title="Portfolio Performance Import fehlgeschlagen",
                        message=(f"Fehler: {err}\nQuelle: {self.file_path}"),
                    )
                )
            msg = f"Parserlauf fehlgeschlagen: {err}"
            raise UpdateFailed(msg) from err
        except Exception as exc:  # pragma: no cover - defensive fallback
            _LOGGER.exception("Unerwarteter Fehler im Parserlauf")
            msg = "Parserlauf fehlgeschlagen"
            raise UpdateFailed(msg) from exc

        await async_sync_ingestion_to_canonical(self.hass, self.db_path)
        self.last_file_update = last_update_truncated
        await async_run_executor_job(
            self.hass,
            _set_last_db_update,
            self.db_path,
            last_update_truncated,
        )
        summary = await self._schedule_enrichment_jobs(parsed_client)
        self._last_pipeline_summary = summary
        self._notify_parser_completed()
        _LOGGER.info("Daten erfolgreich aktualisiert.")

    async def _handle_parser_progress(
        self, progress: parser_pipeline.ParseProgress
    ) -> None:
        """Store progress updates for later telemetry dispatch."""
        self._last_parser_progress = (
            progress.stage,
            progress.processed,
            progress.total,
        )
        payload = {
            "entry_id": self.entry_id,
            "stage": progress.stage,
            "processed": progress.processed,
            "total": progress.total,
        }
        async_dispatcher_send(self.hass, SIGNAL_PARSER_PROGRESS, payload)
        self.async_set_updated_data(self._build_telemetry_payload())

    def _notify_parser_completed(self) -> None:
        """Publish completion telemetry once processing finished."""
        stage = processed = total = None
        if self._last_parser_progress is not None:
            stage, processed, total = self._last_parser_progress

        payload = {
            "entry_id": self.entry_id,
            "run_id": self._last_ingestion_run_id,
            "file_path": str(self.file_path),
            "stage": stage,
            "processed": processed,
            "total": total,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        async_dispatcher_send(self.hass, SIGNAL_PARSER_COMPLETED, payload)
        self.async_set_updated_data(self._build_telemetry_payload())

    def _cancel_manual_update_log_handle(self) -> None:
        """Cancel a scheduled manual update summary."""
        if self._manual_update_log_handle is not None:
            self._manual_update_log_handle.cancel()
            self._manual_update_log_handle = None
        self._manual_update_log_count = 0
        self._manual_update_window_started = None

    def _emit_manual_update_summary(self) -> None:
        """Emit a condensed debug log for telemetry refresh bursts."""
        self._manual_update_log_handle = None
        count = self._manual_update_log_count
        self._manual_update_log_count = 0
        started = self._manual_update_window_started
        self._manual_update_window_started = None
        if not count:
            return
        if count == 1:
            _LOGGER.debug(
                "Telemetry snapshot refreshed (entry_id=%s)",
                self.entry_id,
            )
            return
        duration = 0.0
        if started is not None:
            duration = max(self.hass.loop.time() - started, 0.0)
        _LOGGER.debug(
            "Telemetry snapshot refreshed %s times within %.2fs (entry_id=%s)",
            count,
            duration or 0.0,
            self.entry_id,
        )

    def _track_manual_update(self) -> None:
        """Debounce noisy debug logs when telemetry updates rapidly."""
        self._manual_update_log_count += 1
        if self._manual_update_log_handle is not None:
            return
        loop = self.hass.loop
        self._manual_update_window_started = loop.time()
        self._manual_update_log_handle = loop.call_later(
            1.0,
            self._emit_manual_update_summary,
        )

    async def async_shutdown(self) -> None:
        """Cancel scheduled updates and clear manual log debouncers."""
        self._cancel_manual_update_log_handle()
        await super().async_shutdown()

    def async_set_updated_data(self, data: dict[str, Any]) -> None:
        """Update coordinator telemetry without emitting per-call debug logs."""
        self._async_unsub_refresh()
        self._debounced_refresh.async_cancel()

        self.data = data
        self.last_update_success = True
        self._track_manual_update()

        if self._listeners:
            self._schedule_refresh()

        self.async_update_listeners()

    def _build_telemetry_payload(
        self,
        *,
        last_update: datetime | None = None,
    ) -> dict[str, Any]:
        """Assemble the coordinator telemetry contract."""
        parser_stage = parser_processed = parser_total = None
        if self._last_parser_progress is not None:
            parser_stage, parser_processed, parser_total = self._last_parser_progress

        normalized_generated_at = None
        normalized_metric_run_uuid = None
        if self._normalized_snapshot is not None:
            normalized_generated_at = self._normalized_snapshot.generated_at
            normalized_metric_run_uuid = self._normalized_snapshot.metric_run_uuid

        snapshot_candidate = last_update or self.last_file_update
        snapshot_iso = (
            snapshot_candidate.isoformat() if snapshot_candidate is not None else None
        )

        telemetry = CoordinatorTelemetry(
            last_update=snapshot_iso,
            ingestion_run_id=self._last_ingestion_run_id,
            parser_stage=parser_stage,
            parser_processed=parser_processed,
            parser_total=parser_total,
            metric_run_id=self._last_metric_run_id,
            normalized_generated_at=normalized_generated_at,
            normalized_metric_run_uuid=normalized_metric_run_uuid,
            enrichment_summary=self._last_pipeline_summary or {},
        )
        return telemetry.as_dict()

    def _emit_enrichment_progress(self, stage: str, **details: Any) -> None:
        """Emit enrichment progress payload over dispatcher and event bus."""
        payload: dict[str, Any] = {
            "entry_id": self.entry_id,
            "stage": stage,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        _LOGGER.debug("Enrichment progress stage=%s details=%s", stage, details)
        if details:
            payload.update(details)
        async_dispatcher_send(self.hass, SIGNAL_ENRICHMENT_PROGRESS, payload)
        self.hass.bus.async_fire(EVENT_ENRICHMENT_PROGRESS, payload)

    def _emit_enrichment_completed(
        self, summary: Mapping[str, Any] | None = None
    ) -> None:
        """Emit enrichment completion payload."""
        payload: dict[str, Any] = {
            "entry_id": self.entry_id,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        if summary:
            payload["summary"] = dict(summary)
        async_dispatcher_send(self.hass, SIGNAL_ENRICHMENT_COMPLETED, payload)
        completed_event = dict(payload)
        completed_event["stage"] = "completed"
        self.hass.bus.async_fire(EVENT_ENRICHMENT_PROGRESS, completed_event)

    def _emit_metrics_progress(
        self,
        stage: str,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        """Emit metrics pipeline progress over dispatcher and event bus."""
        payload: dict[str, Any] = {
            "entry_id": self.entry_id,
            "stage": stage,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        if details:
            payload.update(details)
        async_dispatcher_send(self.hass, SIGNAL_METRICS_PROGRESS, payload)
        self.hass.bus.async_fire(EVENT_METRICS_PROGRESS, payload)

    def _emit_normalization_progress(
        self,
        stage: str,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        """Emit normalization pipeline progress events."""
        payload: dict[str, Any] = {
            "entry_id": self.entry_id,
            "stage": stage,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        if details:
            payload.update(details)
        async_dispatcher_send(self.hass, SIGNAL_NORMALIZATION_PROGRESS, payload)
        self.hass.bus.async_fire(EVENT_NORMALIZATION_PROGRESS, payload)

    async def _schedule_enrichment_jobs(self, parsed_client: Any) -> dict[str, Any]:
        """Plan FX refresh and price history jobs after imports."""
        summary: dict[str, Any] = {}
        errors: list[str] = []
        self._emit_enrichment_progress("start")
        await asyncio.sleep(0)
        await self.hass.async_block_till_done()
        # Flush bus callbacks so observers always see the initial "start" signal.

        try:
            fx_result = await self._schedule_fx_refresh()
        except Exception as err:  # pragma: no cover - defensive
            _LOGGER.exception(
                "Enrichment-Pipeline: FX-Planung fehlgeschlagen (entry_id=%s)",
                self.entry_id,
            )
            errors.append(str(err))
            self._emit_enrichment_progress(
                "fx_refresh_exception",
                error=str(err),
            )
            await asyncio.sleep(0)
        else:
            if isinstance(fx_result, Mapping):
                summary.update(fx_result)

        try:
            history_result = await self._schedule_price_history_jobs(parsed_client)
        except Exception as err:  # pragma: no cover - defensive
            _LOGGER.exception(
                ("Enrichment-Pipeline: History-Planung fehlgeschlagen (entry_id=%s)"),
                self.entry_id,
            )
            errors.append(str(err))
            self._emit_enrichment_progress(
                "history_jobs_exception",
                error=str(err),
            )
        else:
            if isinstance(history_result, Mapping):
                summary.update(history_result)

        if errors:
            summary["errors"] = errors

        self._process_enrichment_outcome(summary, errors)

        await self._schedule_metrics_refresh(summary, errors=errors)
        await self._schedule_normalization_refresh(summary)

        # Ensure progress events from earlier stages flush before emitting completion.
        await asyncio.sleep(0)
        self._emit_enrichment_completed(summary)
        return summary

    async def _schedule_metrics_refresh(
        self,
        summary: dict[str, Any],
        *,
        errors: Iterable[str],
    ) -> None:
        """Trigger the metrics engine after enrichment tasks finished."""
        error_list = list(errors)
        failure_reasons = summary.get("failure_reasons") or ()
        if error_list or failure_reasons:
            summary["metrics_status"] = "skipped"
            summary["metrics_reason"] = "enrichment_failed"
            self._emit_metrics_progress(
                "skipped",
                {
                    "reason": "enrichment_failed",
                    "error_count": len(error_list),
                },
            )
            return

        summary["metrics_status"] = "running"

        try:
            await asyncio.to_thread(_ensure_metric_schema, self.db_path)
        except Exception as err:  # pragma: no cover - defensive fallback
            summary["metrics_status"] = "failed"
            summary["metrics_error"] = str(err)
            _LOGGER.exception(
                "Metric-Engine: Schema-Initialisierung fehlgeschlagen (entry_id=%s)",
                self.entry_id,
            )
            return

        self._emit_metrics_progress(
            "scheduled",
            {
                "ingestion_run_uuid": self._last_ingestion_run_id,
            },
        )

        try:
            run = await async_refresh_all(
                self.hass,
                self.db_path,
                trigger="coordinator",
                provenance=self._last_ingestion_run_id,
                emit_progress=self._emit_metrics_progress,
            )
        except Exception as err:  # pragma: no cover - defensive fallback
            summary["metrics_status"] = "failed"
            summary["metrics_error"] = str(err)
            _LOGGER.exception(
                "Metric-Engine: Fehler bei der Aktualisierung (entry_id=%s)",
                self.entry_id,
            )
            return

        self._last_metric_run_id = run.run_uuid
        summary["metrics_status"] = run.status or "completed"
        summary.pop("metrics_reason", None)
        summary["metrics_run_uuid"] = run.run_uuid
        summary["metrics_processed_portfolios"] = run.processed_portfolios or 0
        summary["metrics_processed_accounts"] = run.processed_accounts or 0
        summary["metrics_processed_securities"] = run.processed_securities or 0
        summary["metrics_total_entities"] = run.total_entities
        summary["metrics_duration_ms"] = run.duration_ms
        if run.error_message:
            summary["metrics_error"] = run.error_message
        else:
            summary.pop("metrics_error", None)

    async def _schedule_normalization_refresh(self, summary: dict[str, Any]) -> None:
        """Run the normalization pipeline once metrics finished."""
        self._normalized_snapshot = None

        metrics_status = summary.get("metrics_status")
        if metrics_status != "completed" or not self._last_metric_run_id:
            summary["normalized_status"] = "skipped"
            summary["normalized_reason"] = "metrics_unavailable"
            self._emit_normalization_progress(
                "skipped",
                {
                    "reason": "metrics_unavailable",
                    "metrics_status": metrics_status,
                },
            )
            return

        summary["normalized_status"] = "running"
        self._emit_normalization_progress(
            "scheduled",
            {"metric_run_uuid": self._last_metric_run_id},
        )

        try:
            snapshot = await async_normalize_snapshot(
                self.hass,
                self.db_path,
                include_positions=False,
            )
        except Exception as err:  # noqa: BLE001 - defensive fallback
            summary["normalized_status"] = "failed"
            summary["normalized_error"] = str(err)
            self._emit_normalization_progress(
                "failed",
                {"error": str(err)},
            )
            return

        self._normalized_snapshot = snapshot
        summary["normalized_status"] = "completed"
        summary["normalized_metric_run_uuid"] = snapshot.metric_run_uuid
        summary["normalized_generated_at"] = snapshot.generated_at
        summary.pop("normalized_reason", None)
        summary.pop("normalized_error", None)
        self._emit_normalization_progress(
            "completed",
            {
                "metric_run_uuid": snapshot.metric_run_uuid,
                "generated_at": snapshot.generated_at,
            },
        )

    async def _process_history_queue_once(self, *, reason: str) -> None:
        """Drain pending price-history jobs and persist retrieved candles."""
        if self._history_lock.locked():
            _LOGGER.debug(
                "History-Queue: Skip (busy) entry_id=%s reason=%s",
                self.entry_id,
                reason,
            )
            return

        async with self._history_lock:
            manager = HistoryQueueManager(self.db_path)
            total_jobs = 0
            total_candles = 0
            iterations = 0

            while True:
                iterations += 1
                try:
                    # Keep batches small to avoid long-running executor slots and
                    # allow interleaving with other work.
                    results = await manager.process_pending_jobs(limit=15)
                except Exception:  # noqa: BLE001 - defensive logging
                    _LOGGER.warning(
                        (
                            "History-Queue: Verarbeitung fehlgeschlagen "
                            "(entry_id=%s reason=%s batch=%s)"
                        ),
                        self.entry_id,
                        reason,
                        iterations,
                        exc_info=True,
                    )
                    return

                if not results:
                    break

                total_jobs += len(results)
                total_candles += sum(len(candles) for candles in results.values())

            if total_jobs:
                _LOGGER.info(
                    (
                        "History-Queue: verarbeitet jobs=%s candles=%s batches=%s "
                        "(entry_id=%s reason=%s)"
                    ),
                    total_jobs,
                    total_candles,
                    iterations,
                    self.entry_id,
                    reason,
                )
            else:
                _LOGGER.debug(
                    "History-Queue: keine pending Jobs (entry_id=%s reason=%s)",
                    self.entry_id,
                    reason,
                )

    async def _plan_and_process_history_jobs(self, *, reason: str) -> None:
        """Plan missing history from canonical securities and then drain queue."""
        manager = HistoryQueueManager(self.db_path)
        enqueued = 0
        try:
            enqueued = await manager.plan_jobs_for_securities_table()
        except Exception:  # noqa: BLE001 - defensive logging
            _LOGGER.warning(
                "History-Queue: Planung aus securities-Tabelle fehlgeschlagen "
                "(entry_id=%s reason=%s)",
                self.entry_id,
                reason,
                exc_info=True,
            )
        else:
            if enqueued:
                _LOGGER.info(
                    "History-Queue: %s Jobs aus securities-Tabelle eingeplant "
                    "(entry_id=%s reason=%s)",
                    enqueued,
                    self.entry_id,
                    reason,
                )
        await self._process_history_queue_once(reason=reason)

    async def _schedule_fx_refresh(self) -> dict[str, Any] | None:
        """Schedule an FX refresh for active non-EUR currencies."""
        try:
            currencies = await async_run_executor_job(
                self.hass,
                fx_module.discover_active_currencies,
                self.db_path,
            )
        except Exception:
            _LOGGER.exception(
                "Enrichment-Pipeline: Fehler beim Ermitteln aktiver FX-Währungen "
                "(entry_id=%s)",
                self.entry_id,
            )
            self._emit_enrichment_progress(
                "fx_discovery_failed",
                error="discover_active_currencies_failed",
            )
            return {"fx_status": "discovery_failed"}

        if not currencies:
            _LOGGER.debug(
                "Enrichment-Pipeline: Keine FX-Währungen zu aktualisieren "
                "(entry_id=%s)",
                self.entry_id,
            )
            self._emit_enrichment_progress("fx_skipped_no_currencies")
            return {"fx_status": "skipped"}

        reference = datetime.now(UTC)
        sorted_currencies = sorted(currencies)
        self._emit_enrichment_progress(
            "fx_refresh_scheduled",
            currency_count=len(sorted_currencies),
            currencies=sorted_currencies,
        )

        async def _execute_fx_refresh() -> None:
            try:
                await fx_module.ensure_exchange_rates_for_dates(
                    [reference],
                    currencies,
                    self.db_path,
                )
            except Exception:
                _LOGGER.exception(
                    "Enrichment-Pipeline: FX-Aktualisierung fehlgeschlagen "
                    "(entry_id=%s)",
                    self.entry_id,
                )
                self._emit_enrichment_progress(
                    "fx_refresh_failed",
                    currency_count=len(sorted_currencies),
                )
            else:
                _LOGGER.debug(
                    "Enrichment-Pipeline: FX-Refresh durchgeführt für %s (entry_id=%s)",
                    sorted(currencies),
                    self.entry_id,
                )
                self._emit_enrichment_progress(
                    "fx_refresh_completed",
                    currency_count=len(sorted_currencies),
                )

        self.hass.async_create_task(_execute_fx_refresh())
        return {
            "fx_status": "scheduled",
            "fx_currency_count": len(sorted_currencies),
        }

    async def _schedule_price_history_jobs(
        self, parsed_client: Any
    ) -> dict[str, Any] | None:
        """Enqueue price history jobs for Yahoo-backed securities."""
        securities = getattr(parsed_client, "securities", None)
        if not securities:
            _LOGGER.debug(
                "Enrichment-Pipeline: Keine Wertpapiere für Preis-Historienplanung "
                "(entry_id=%s)",
                self.entry_id,
            )
            self._emit_enrichment_progress("history_skipped_no_securities")
            return {"history_status": "no_securities"}

        targets = build_history_targets_from_parsed(securities)
        self._emit_enrichment_progress(
            "history_targets_resolved",
            target_count=len(targets),
        )
        if not targets:
            _LOGGER.debug(
                "Enrichment-Pipeline: Keine passenden Wertpapiere für Yahoo-Historie "
                "(entry_id=%s)",
                self.entry_id,
            )
            self._emit_enrichment_progress("history_skipped_no_targets")
            return {"history_status": "no_targets"}

        def _plan_jobs_sync() -> int:
            manager = HistoryQueueManager(self.db_path)
            loop = asyncio.new_event_loop()
            try:
                asyncio.set_event_loop(loop)
                return loop.run_until_complete(manager.plan_jobs(targets))
            finally:
                asyncio.set_event_loop(None)
                loop.close()

        try:
            enqueued = await asyncio.to_thread(_plan_jobs_sync)
        except Exception:
            _LOGGER.exception(
                "Enrichment-Pipeline: Planung der Price-History-Jobs fehlgeschlagen "
                "(entry_id=%s)",
                self.entry_id,
            )
            self._emit_enrichment_progress("history_jobs_failed")
            return {"history_status": "failed"}

        if enqueued:
            _LOGGER.info(
                "Enrichment-Pipeline: %s Price-History-Jobs eingeplant (entry_id=%s)",
                enqueued,
                self.entry_id,
            )
            self._emit_enrichment_progress(
                "history_jobs_enqueued",
                jobs_enqueued=enqueued,
            )
            self.hass.async_create_task(
                self._process_history_queue_once(reason="enrichment")
            )
            return {
                "history_status": "jobs_enqueued",
                "history_jobs_enqueued": enqueued,
            }
        _LOGGER.debug(
            "Enrichment-Pipeline: Keine zusätzlichen Price-History-Jobs "
            "erforderlich (entry_id=%s)",
            self.entry_id,
        )
        self._emit_enrichment_progress("history_jobs_not_required")
        return {
            "history_status": "up_to_date",
            "history_jobs_enqueued": 0,
        }

    def _process_enrichment_outcome(
        self,
        summary: dict[str, Any],
        errors: list[str],
    ) -> None:
        """Update failure bookkeeping and raise notifications when needed."""
        failure_reasons: list[str] = []

        fx_status = summary.get("fx_status")
        history_status = summary.get("history_status")
        if fx_status == "discovery_failed":
            failure_reasons.append("FX refresh scheduling failed")
        if history_status == "failed":
            failure_reasons.append("Price history job scheduling failed")
        failure_reasons.extend(errors)

        if failure_reasons:
            self._enrichment_failure_streak += 1
            summary["failure_streak"] = self._enrichment_failure_streak
            summary["failure_reasons"] = failure_reasons
            _LOGGER.warning(
                "Enrichment-Pipeline: Fehler erkannt (entry_id=%s, streak=%s): %s",
                self.entry_id,
                self._enrichment_failure_streak,
                failure_reasons,
            )
            if (
                self._enrichment_failure_streak >= _ENRICHMENT_FAILURE_THRESHOLD
                and not self._enrichment_failure_notified
            ):
                reason_lines = "\n".join(f"- {reason}" for reason in failure_reasons)
                message = (
                    "Wiederholte Fehler in der Enrichment-Pipeline erkannt.\n"
                    f"Aktuelle Gründe:\n{reason_lines}"
                )
                self.hass.async_create_task(
                    notifications_util.async_create_enrichment_failure_notification(
                        hass=self.hass,
                        entry_id=self.entry_id,
                        title="PP Reader Enrichment-Pipeline fehlgeschlagen",
                        message=message,
                    )
                )
                self._enrichment_failure_notified = True
        else:
            if self._enrichment_failure_streak:
                _LOGGER.info(
                    (
                        "Enrichment-Pipeline: Fehlerzähler zurückgesetzt "
                        "(entry_id=%s, vorher=%s)"
                    ),
                    self.entry_id,
                    self._enrichment_failure_streak,
                )
            self._enrichment_failure_streak = 0
            self._enrichment_failure_notified = False
            summary.pop("failure_streak", None)
            summary.pop("failure_reasons", None)
