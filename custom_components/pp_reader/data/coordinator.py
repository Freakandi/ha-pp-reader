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
from datetime import UTC, datetime, timedelta
from importlib import import_module
from typing import TYPE_CHECKING, Any

from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from custom_components.pp_reader import metrics
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
from custom_components.pp_reader.logic import accounting as _accounting_module
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
from custom_components.pp_reader.util.currency import cent_to_eur, round_currency

from . import ingestion_reader
from .db_access import fetch_live_portfolios, get_accounts, get_transactions
from .ingestion_writer import async_ingestion_session
from .normalization_pipeline import (
    NormalizationResult,
    PortfolioSnapshot,
    async_normalize_snapshot,
)

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback for typing only
    HomeAssistant = Any  # type: ignore[assignment]

try:
    from . import reader as _reader_module
except ModuleNotFoundError:  # pragma: no cover - optional dep for tests
    _reader_module = None

_LOGGER = logging.getLogger(__name__)
_ENRICHMENT_FAILURE_THRESHOLD = 2


def _get_last_db_update(db_path: Path) -> datetime | None:
    """Read the last known file timestamp from the metadata table."""
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()
        cur.execute("SELECT date FROM metadata WHERE key = 'last_file_update'")
        result = cur.fetchone()
    if result and result[0]:
        return datetime.fromisoformat(result[0])
    return None


def _load_staging_proto_snapshot(db_path: Path) -> Any | None:
    """Return a protobuf client reconstructed from staging tables."""
    with sqlite3.connect(str(db_path)) as conn:
        return ingestion_reader.load_proto_snapshot(conn)


def _legacy_sync_to_db(
    data: Mapping[str, Any],
    hass: HomeAssistant,
    entry_id: str,
    last_update_iso: str,
    db_path: Path,
) -> None:
    """Persist parsed portfolio data to SQLite using the legacy sync helper."""
    try:
        sync_module = import_module(
            "custom_components.pp_reader.data.sync_from_pclient"
        )
    except ModuleNotFoundError as err:  # pragma: no cover - optional dep for tests
        msg = "protobuf runtime is required to synchronize Portfolio Performance data"
        raise RuntimeError(msg) from err

    sync_from_pclient = sync_module.sync_from_pclient

    with sqlite3.connect(str(db_path)) as conn:
        sync_from_pclient(
            data,
            conn,
            hass,
            entry_id,
            last_update_iso,
            db_path,
        )


def _normalize_portfolio_amount(value: Any) -> float:
    """Normalize mixed cent/float values to a rounded EUR float."""
    if value is None:
        return 0.0

    if isinstance(value, float):
        normalized_float = round_currency(value, default=None)
        return normalized_float if normalized_float is not None else 0.0

    cent_value: int | None
    if isinstance(value, int):
        cent_value = value
    else:
        try:
            cent_value = int(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            cent_value = None

    if cent_value is not None:
        normalized_cent = cent_to_eur(cent_value, default=None)
        if normalized_cent is not None:
            return normalized_cent

    normalized_generic = round_currency(value, default=None)
    if normalized_generic is not None:
        return normalized_generic

    return 0.0


def _portfolio_contract_entry(
    entry: Mapping[str, Any] | None,
) -> tuple[str, dict[str, Any]] | None:
    """Normalize aggregation rows to the coordinator sensor contract (item 4a)."""
    if not isinstance(entry, Mapping):
        return None

    portfolio_uuid = entry.get("uuid") or entry.get("portfolio_uuid")
    if not portfolio_uuid:
        return None

    current_value_raw = entry.get("current_value")
    if current_value_raw is None:
        current_value_raw = entry.get("value")

    purchase_sum_raw = entry.get("purchase_sum")
    if purchase_sum_raw is None:
        purchase_sum_raw = entry.get("purchaseSum")

    position_count_raw = entry.get("position_count")
    if position_count_raw is None:
        position_count_raw = entry.get("count")
    if position_count_raw is None:
        position_count_raw = 0
    try:
        position_count = int(position_count_raw or 0)
    except (TypeError, ValueError):
        position_count = 0

    current_value = _normalize_portfolio_amount(current_value_raw)
    purchase_sum = _normalize_portfolio_amount(purchase_sum_raw)

    performance_metrics, day_change_metrics = metrics.select_performance_metrics(
        current_value=current_value_raw,
        purchase_value=purchase_sum_raw,
        holdings=position_count,
    )

    performance_mapping = entry.get("performance")
    if isinstance(performance_mapping, Mapping):
        performance_payload = metrics.compose_performance_payload(
            performance_mapping,
            metrics=performance_metrics,
            day_change=day_change_metrics,
        )
    else:
        performance_payload = metrics.compose_performance_payload(
            None,
            metrics=performance_metrics,
            day_change=day_change_metrics,
        )

    return portfolio_uuid, {
        "name": entry.get("name"),
        "value": current_value,
        "count": position_count,
        "purchase_sum": purchase_sum,
        "performance": performance_payload,
    }


def _coerce_live_portfolios(raw_portfolios: Any) -> list[Any]:
    """Convert the aggregation result into an iterable list."""
    if isinstance(raw_portfolios, dict):
        return list(raw_portfolios.values())
    if isinstance(raw_portfolios, list):
        return raw_portfolios
    if raw_portfolios:
        return list(raw_portfolios)
    return []


def _build_portfolio_data(live_portfolios: Iterable[Any]) -> dict[str, dict[str, Any]]:
    """Create the coordinator contract for portfolio entries."""
    portfolio_data: dict[str, dict[str, Any]] = {}
    for entry in live_portfolios:
        normalized = _portfolio_contract_entry(entry)
        if not normalized:
            continue
        portfolio_uuid, payload = normalized
        portfolio_data[portfolio_uuid] = payload
    return portfolio_data


def _build_portfolio_data_from_snapshot(
    snapshot: NormalizationResult,
) -> dict[str, dict[str, Any]]:
    """Reuse normalized portfolio snapshots for the coordinator contract."""
    portfolio_data: dict[str, dict[str, Any]] = {}
    for portfolio in snapshot.portfolios:
        payload = _portfolio_payload_from_snapshot(portfolio)
        portfolio_data[portfolio.uuid] = payload
    return portfolio_data


def _portfolio_payload_from_snapshot(portfolio: PortfolioSnapshot) -> dict[str, Any]:
    """Convert a PortfolioSnapshot into the coordinator payload format."""
    return {
        "name": portfolio.name,
        "value": _normalize_portfolio_amount(portfolio.current_value),
        "count": int(portfolio.position_count or 0),
        "purchase_sum": _normalize_portfolio_amount(portfolio.purchase_value),
        "performance": dict(portfolio.performance),
    }


# NOTE (On-Demand Aggregation Migration):
# The dashboard / WebSocket layer now obtains live portfolio aggregates via the
# on-demand helper (fetch_live_portfolios) to ensure a single source of truth
# that already reflects the latest persisted live prices. This coordinator
# instance remains the authoritative (legacy) data source ONLY for sensor entities.
# DO NOT:
# - Mutate key names or nested shapes in self.data (accounts, portfolios,
#   transactions, last_update).
# - Introduce divergent aggregation logic here; if aggregation changes are
#   required they must be implemented centrally in the shared DB helpers and/or
#   fetch_live_portfolios to avoid drift between sensor and UI values.
# Any refactor touching aggregation should reference this comment and the
# migration checklist in .docs/cleanup/live_aggregation/TODO_updateGoals.md (section 4).
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
        self.data = {
            "accounts": [],
            "portfolios": [],
            "transactions": [],
            "last_update": None,
        }
        self.last_file_update = None  # Initialisierung des Attributs
        self._last_parser_progress: tuple[str, int, int] | None = None
        self._last_ingestion_run_id: str | None = None
        self._last_metric_run_id: str | None = None
        self._normalized_snapshot: NormalizationResult | None = None
        self._enrichment_failure_streak = 0
        self._enrichment_failure_notified = False

    async def _async_update_data(self) -> dict:
        """Daten aus der SQLite-Datenbank laden und aktualisieren."""
        try:
            last_update_truncated = self._get_last_file_update()
            last_db_update = await async_run_executor_job(
                self.hass, _get_last_db_update, self.db_path
            )

            if self._should_sync(last_db_update, last_update_truncated):
                await self._sync_portfolio_file(last_update_truncated)

            accounts = await async_run_executor_job(
                self.hass, get_accounts, self.db_path
            )
            transactions = await async_run_executor_job(
                self.hass, get_transactions, self.db_path
            )

            account_balances = self._calculate_account_balances(accounts, transactions)

            portfolio_data = None
            normalized_enabled = is_enabled(
                "normalized_pipeline",
                self.hass,
                entry_id=self.entry_id,
                default=False,
            )
            snapshot: NormalizationResult | None = None
            if normalized_enabled:
                snapshot = await self._ensure_normalized_snapshot()
                if snapshot is not None:
                    portfolio_data = _build_portfolio_data_from_snapshot(snapshot)

            if portfolio_data is None:
                live_portfolios = await self._load_live_portfolios()
                portfolio_data = _build_portfolio_data(live_portfolios)

            self.data = {
                "accounts": {
                    account.uuid: {
                        "name": account.name,
                        "balance": account_balances[account.uuid],
                        "is_retired": account.is_retired,
                    }
                    for account in accounts
                },
                "portfolios": portfolio_data,
                "transactions": transactions,
                "last_update": last_update_truncated.isoformat(),
            }

        except FileNotFoundError:
            message = f"Portfolio-Datei nicht gefunden: {self.file_path}"
            _LOGGER.error(message)  # noqa: TRY400 - bewusst ohne Traceback
            raise UpdateFailed(message) from None
        except Exception as e:
            _LOGGER.exception("Fehler beim Laden der Daten")
            msg = f"Update fehlgeschlagen: {e}"
            raise UpdateFailed(msg) from e

        return self.data

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
                    file_path=str(self.file_path),
                    parsed_at=datetime.now(UTC),
                    pp_version=parsed_client.version,
                    base_currency=parsed_client.base_currency,
                    properties=parsed_client.properties,
                )
        except (PortfolioParseError, PortfolioValidationError) as err:
            if notify_parser_failures:
                self.hass.async_create_task(
                    notifications_util.async_create_parser_failure_notification(
                        self.hass,
                        entry_id=self.entry_id,
                        title="Portfolio Performance Import fehlgeschlagen",
                        message=(
                            f"Fehler: {err}\n"
                            f"Quelle: {self.file_path}"
                        ),
                    )
                )
            msg = f"Parserlauf fehlgeschlagen: {err}"
            raise UpdateFailed(msg) from err
        except Exception as exc:  # pragma: no cover - defensive fallback
            _LOGGER.exception("Unerwarteter Fehler im Parserlauf")
            msg = "Parserlauf fehlgeschlagen"
            raise UpdateFailed(msg) from exc

        use_staging_importer = is_enabled(
            "use_staging_importer",
            self.hass,
            entry_id=self.entry_id,
            default=False,
        )

        legacy_client: Any | None = None
        if use_staging_importer:
            staging_client = await async_run_executor_job(
                self.hass,
                _load_staging_proto_snapshot,
                self.db_path,
            )
            if staging_client is not None:
                legacy_client = staging_client
                _LOGGER.info(
                    "Nutze Staging-Snapshot für Synchronisation (USE_STAGING_IMPORTER)"
                )
            else:
                _LOGGER.warning(
                    "USE_STAGING_IMPORTER aktiv, aber kein Staging-Snapshot vorhanden;"
                    " falle auf Legacy-Protopfad zurück."
                )

        if legacy_client is None:
            if _reader_module is None:  # pragma: no cover - optional dep for tests
                msg = (
                    "protobuf runtime is required to parse Portfolio Performance files"
                )
                raise UpdateFailed(msg)

            legacy_client = await async_run_executor_job(
                self.hass,
                _reader_module.parse_data_portfolio,
                str(self.file_path),
            )
            if not legacy_client:
                msg = "Portfolio-Daten konnten nicht geladen werden"
                raise UpdateFailed(msg)

        try:
            _LOGGER.info("📥 Synchronisiere Daten mit SQLite DB (Legacy-Pfad)...")
            await async_run_executor_job(
                self.hass,
                _legacy_sync_to_db,
                legacy_client,
                self.hass,
                self.entry_id,
                last_update_truncated.isoformat(),
                self.db_path,
            )
        except Exception as exc:
            msg = "DB-Synchronisation fehlgeschlagen"
            raise UpdateFailed(msg) from exc

        self.last_file_update = last_update_truncated
        await self._schedule_enrichment_jobs(parsed_client)
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
        self.async_set_updated_data(self.data)

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
        self.async_set_updated_data(self.data)

    def _emit_enrichment_progress(self, stage: str, **details: Any) -> None:
        """Emit enrichment progress payload over dispatcher and event bus."""
        payload: dict[str, Any] = {
            "entry_id": self.entry_id,
            "stage": stage,
            "timestamp": datetime.now(UTC).isoformat(),
        }
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

    async def _schedule_enrichment_jobs(self, parsed_client: Any) -> None:
        """Plan FX refresh and price history jobs after imports."""
        enriched_enabled = is_enabled(
            "enrichment_pipeline",
            self.hass,
            entry_id=self.entry_id,
            default=False,
        )
        if not enriched_enabled:
            _LOGGER.debug(
                "Enrichment-Pipeline deaktiviert, überspringe Planung (entry_id=%s)",
                self.entry_id,
            )
            return

        self._emit_enrichment_progress("start")

        summary: dict[str, Any] = {}
        errors: list[str] = []

        fx_enabled = is_enabled(
            "enrichment_fx_refresh",
            self.hass,
            entry_id=self.entry_id,
            default=True,
        )
        history_enabled = is_enabled(
            "enrichment_history_jobs",
            self.hass,
            entry_id=self.entry_id,
            default=True,
        )

        if fx_enabled:
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
            else:
                if isinstance(fx_result, Mapping):
                    summary.update(fx_result)
        else:
            summary["fx_status"] = "disabled"
            self._emit_enrichment_progress("fx_skipped_disabled")

        if history_enabled:
            try:
                history_result = await self._schedule_price_history_jobs(parsed_client)
            except Exception as err:  # pragma: no cover - defensive
                _LOGGER.exception(
                    "Enrichment-Pipeline: History-Planung fehlgeschlagen (entry_id=%s)",
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
        else:
            summary["history_status"] = "disabled"
            summary["history_jobs_enqueued"] = 0
            self._emit_enrichment_progress("history_skipped_disabled")

        if errors:
            summary["errors"] = errors

        self._process_enrichment_outcome(summary, errors)

        await self._schedule_metrics_refresh(summary, errors=errors)
        await self._schedule_normalization_refresh(summary)

        self._emit_enrichment_completed(summary)

    async def _schedule_metrics_refresh(
        self,
        summary: dict[str, Any],
        *,
        errors: Iterable[str],
    ) -> None:
        """Trigger the metrics engine when the feature flag is enabled."""
        metrics_enabled = is_enabled(
            "metrics_pipeline",
            self.hass,
            entry_id=self.entry_id,
            default=False,
        )
        if not metrics_enabled:
            summary["metrics_status"] = "disabled"
            self._emit_metrics_progress(
                "disabled",
                {"reason": "feature_flag_disabled"},
            )
            return

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
        self._emit_metrics_progress(
            "scheduled",
            {
                "ingestion_run_uuid": self._last_ingestion_run_id,
            },
        )

        try:
            run = await metrics.async_refresh_all(
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
        normalized_enabled = is_enabled(
            "normalized_pipeline",
            self.hass,
            entry_id=self.entry_id,
            default=False,
        )
        if not normalized_enabled:
            summary["normalized_status"] = "disabled"
            self._emit_normalization_progress(
                "disabled",
                {"reason": "feature_flag_disabled"},
            )
            return

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

    async def _ensure_normalized_snapshot(self) -> NormalizationResult | None:
        """Load and cache a normalization snapshot when the feature flag is on."""
        if self._normalized_snapshot is not None:
            return self._normalized_snapshot

        self._emit_normalization_progress(
            "refresh_requested",
            {"reason": "coordinator_update"},
        )

        try:
            snapshot = await async_normalize_snapshot(
                self.hass,
                self.db_path,
                include_positions=False,
            )
        except Exception as err:  # pragma: no cover - defensive fallback
            _LOGGER.exception(
                "Normalization pipeline: Fehler beim Aktualisieren (entry_id=%s)",
                self.entry_id,
            )
            self._emit_normalization_progress(
                "refresh_failed",
                {"error": str(err)},
            )
            return None

        self._normalized_snapshot = snapshot
        self._emit_normalization_progress(
            "refresh_completed",
            {
                "metric_run_uuid": snapshot.metric_run_uuid,
                "generated_at": snapshot.generated_at,
            },
        )
        return snapshot

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
                        self.hass,
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

    def _calculate_account_balances(
        self, accounts: Iterable[Any], transactions: Iterable[Any]
    ) -> dict[str, Any]:
        """Aggregate balances for each account using the shared helper."""
        calculate_account_balance = _accounting_module.calculate_account_balance

        return {
            account.uuid: calculate_account_balance(account.uuid, transactions)
            for account in accounts
        }

    async def _load_live_portfolios(self) -> list[Any]:
        """Fetch live portfolio aggregates while shielding coordinator errors."""
        try:
            raw_portfolios = await async_run_executor_job(
                self.hass, fetch_live_portfolios, self.db_path
            )
        except Exception:
            _LOGGER.exception(
                "PPReaderCoordinator: fetch_live_portfolios fehlgeschlagen - "
                "verwende leeren Snapshot"
            )
            return []
        return _coerce_live_portfolios(raw_portfolios)
