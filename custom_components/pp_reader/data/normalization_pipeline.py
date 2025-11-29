"""Normalization pipeline assembling canonical snapshot dataclasses."""

from __future__ import annotations

import functools
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable, Collection, Iterable, Mapping, Sequence

    from homeassistant.core import HomeAssistant
else:  # pragma: no cover - runtime fallback for type hints
    HomeAssistant = Any  # type: ignore[assignment]

from custom_components.pp_reader.logic.securities import get_missing_fx_diagnostics
from custom_components.pp_reader.metrics.storage import load_latest_metric_batch
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    normalize_price_to_eur_sync,
    normalize_raw_price,
    round_currency,
    round_price,
)

from .db_access import (
    Account,
    AccountMetricRecord,
    Portfolio,
    PortfolioMetricRecord,
    Security,
    SecurityMetricRecord,
    get_accounts,
    get_portfolios,
    get_securities,
    fetch_previous_close,
    get_security_snapshot,
    iter_security_close_prices,
)
from .snapshot_writer import persist_normalization_result

_LOGGER = logging.getLogger("custom_components.pp_reader.data.normalization")

__all__ = [
    "AccountSnapshot",
    "NormalizationResult",
    "PortfolioSnapshot",
    "PositionSnapshot",
    "SnapshotDataState",
    "async_fetch_security_history",
    "async_normalize_security_snapshot",
    "async_normalize_snapshot",
    "load_portfolio_position_snapshots",
    "serialize_account_snapshot",
    "serialize_normalization_result",
    "serialize_portfolio_snapshot",
    "serialize_position_snapshot",
]


@dataclass(slots=True)
class SnapshotDataState:
    """Data-state metadata for snapshot payloads."""

    status: str = "ok"
    message: str | None = None


@dataclass(slots=True)
class AccountSnapshot:
    """Canonical snapshot structure for an investment account."""

    uuid: str
    name: str
    currency_code: str
    orig_balance: float
    balance: float | None
    fx_rate: float | None = None
    fx_rate_source: str | None = None
    fx_rate_timestamp: str | None = None
    coverage_ratio: float | None = None
    provenance: str | None = None
    fx_unavailable: bool = False


@dataclass(slots=True)
class PositionSnapshot:
    """Canonical representation of a single portfolio position."""

    portfolio_uuid: str
    security_uuid: str
    name: str
    currency_code: str
    current_holdings: float
    purchase_value: float
    current_value: float
    average_cost: dict[str, Any]
    performance: dict[str, Any]
    aggregation: dict[str, Any]
    coverage_ratio: float | None = None
    provenance: str | None = None
    metric_run_uuid: str | None = None
    last_price_native: float | None = None
    last_price_eur: float | None = None
    last_close_native: float | None = None
    last_close_eur: float | None = None
    data_state: SnapshotDataState = field(default_factory=SnapshotDataState)


@dataclass(slots=True)
class PortfolioSnapshot:
    """Canonical snapshot for a portfolio and its aggregates."""

    uuid: str
    name: str
    current_value: float
    purchase_value: float
    position_count: int
    missing_value_positions: int
    performance: dict[str, Any]
    day_change_abs: float | None = None
    day_change_pct: float | None = None
    coverage_ratio: float | None = None
    provenance: str | None = None
    metric_run_uuid: str | None = None
    positions: tuple[PositionSnapshot, ...] = ()
    data_state: SnapshotDataState = field(default_factory=SnapshotDataState)

    @property
    def has_current_value(self) -> bool:
        """Expose the legacy convenience flag for downstream consumers."""
        return self.missing_value_positions == 0


@dataclass(slots=True)
class NormalizationResult:
    """Aggregate result returned by the normalization pipeline."""

    generated_at: str
    metric_run_uuid: str | None
    accounts: tuple[AccountSnapshot, ...] = ()
    portfolios: tuple[PortfolioSnapshot, ...] = ()
    diagnostics: dict[str, Any] | None = None


@dataclass(frozen=True)
class _PositionContext:
    """Context bundle for loading position snapshots."""

    db_path: Path
    securities: Mapping[str, Security]
    index: Mapping[str, tuple[SecurityMetricRecord, ...]]
    reference_date: datetime


def _is_recent_close(date_epoch: int | None, reference_date: datetime) -> bool:
    return True


async def async_normalize_snapshot(
    hass: HomeAssistant,
    db_path: Path | str,
    *,
    include_positions: bool = False,
) -> NormalizationResult:
    """Asynchronously assemble the canonical snapshot."""
    resolved_path = Path(db_path)
    normalize = functools.partial(
        _normalize_snapshot_sync,
        include_positions=include_positions,
    )
    return await async_run_executor_job(
        hass,
        normalize,
        resolved_path,
    )


def serialize_normalization_result(result: NormalizationResult) -> dict[str, Any]:
    """Serialize the normalization result into JSON-friendly primitives."""
    payload: dict[str, Any] = {
        "generated_at": result.generated_at,
        "metric_run_uuid": result.metric_run_uuid,
        "accounts": [
            serialize_account_snapshot(account) for account in result.accounts
        ],
        "portfolios": [
            serialize_portfolio_snapshot(portfolio) for portfolio in result.portfolios
        ],
    }
    if result.diagnostics:
        payload["diagnostics"] = result.diagnostics
    return payload


def serialize_account_snapshot(snapshot: AccountSnapshot) -> dict[str, Any]:
    """Convert an AccountSnapshot dataclass into a serializable dict."""
    data: dict[str, Any] = {
        "uuid": snapshot.uuid,
        "name": snapshot.name,
        "currency_code": snapshot.currency_code,
        "orig_balance": snapshot.orig_balance,
        "balance": snapshot.balance,
    }
    optional_fields = (
        "fx_rate",
        "fx_rate_source",
        "fx_rate_timestamp",
        "coverage_ratio",
        "provenance",
    )
    for field_name in optional_fields:
        value = getattr(snapshot, field_name)
        if value not in (None, ""):
            data[field_name] = value

    if snapshot.fx_unavailable:
        data["fx_unavailable"] = True
    return data


def serialize_portfolio_snapshot(snapshot: PortfolioSnapshot) -> dict[str, Any]:
    """Convert a PortfolioSnapshot dataclass into a serializable dict."""
    data: dict[str, Any] = {
        "uuid": snapshot.uuid,
        "name": snapshot.name,
        "current_value": snapshot.current_value,
        "purchase_value": snapshot.purchase_value,
        "position_count": snapshot.position_count,
        "missing_value_positions": snapshot.missing_value_positions,
        "has_current_value": snapshot.has_current_value,
        "performance": dict(snapshot.performance),
    }
    if snapshot.day_change_abs is not None:
        data["day_change_abs"] = snapshot.day_change_abs
    if snapshot.day_change_pct is not None:
        data["day_change_pct"] = snapshot.day_change_pct
    optional_fields = ("coverage_ratio", "provenance", "metric_run_uuid")
    for field_name in optional_fields:
        value = getattr(snapshot, field_name)
        if value not in (None, ""):
            data[field_name] = value

    if snapshot.positions:
        data["positions"] = [
            serialize_position_snapshot(position) for position in snapshot.positions
        ]

    if snapshot.data_state.status != "ok" or snapshot.data_state.message:
        data["data_state"] = {
            "status": snapshot.data_state.status,
            "message": snapshot.data_state.message,
        }
    return data


def serialize_position_snapshot(snapshot: PositionSnapshot) -> dict[str, Any]:
    """Convert a PositionSnapshot dataclass into a dictionary."""
    data: dict[str, Any] = {
        "portfolio_uuid": snapshot.portfolio_uuid,
        "security_uuid": snapshot.security_uuid,
        "name": snapshot.name,
        "currency_code": snapshot.currency_code,
        "current_holdings": snapshot.current_holdings,
        "purchase_value": snapshot.purchase_value,
        "current_value": snapshot.current_value,
        "average_cost": dict(snapshot.average_cost),
        "performance": dict(snapshot.performance),
        "aggregation": dict(snapshot.aggregation),
    }

    optional_fields = ("coverage_ratio", "provenance", "metric_run_uuid")
    for field_name in optional_fields:
        value = getattr(snapshot, field_name)
        if value not in (None, ""):
            data[field_name] = value

    if snapshot.data_state.status != "ok" or snapshot.data_state.message:
        data["data_state"] = {
            "status": snapshot.data_state.status,
            "message": snapshot.data_state.message,
        }
    return data


async def async_normalize_security_snapshot(
    hass: HomeAssistant,
    db_path: Path | str,
    security_uuid: str,
) -> dict[str, Any]:
    """Return a security snapshot, preferring normalization data."""
    resolved_path = Path(db_path)
    normalized = await async_normalize_snapshot(
        hass,
        resolved_path,
        include_positions=True,
    )
    snapshot = _build_security_snapshot_from_positions(normalized, security_uuid)
    if snapshot is not None:
        snapshot["metric_run_uuid"] = normalized.metric_run_uuid
        return snapshot

    return await async_run_executor_job(
        hass,
        get_security_snapshot,
        resolved_path,
        security_uuid,
    )


async def async_fetch_security_history(
    hass: HomeAssistant,
    db_path: Path | str,
    security_uuid: str,
    *,
    start_date: int | None = None,
    end_date: int | None = None,
) -> list[dict[str, Any]]:
    """Return historical close prices for a security."""
    resolved_path = Path(db_path)

    def _collect_history() -> list[tuple[int, float | None, int | None]]:
        return list(
            iter_security_close_prices(
                db_path=resolved_path,
                security_uuid=security_uuid,
                start_date=start_date,
                end_date=end_date,
            )
        )

    rows = await async_run_executor_job(hass, _collect_history)
    payload: list[dict[str, Any]] = []
    for date_value, close_value, close_raw in rows:
        entry: dict[str, Any] = {"date": date_value}
        if close_value is not None:
            entry["close"] = close_value
        if close_raw is not None:
            entry["close_raw"] = close_raw
        payload.append(entry)
    return payload


def _normalize_snapshot_sync(
    db_path: Path,
    *,
    include_positions: bool,
) -> NormalizationResult:
    """Build the snapshot synchronously for executor execution."""
    run_metadata, metric_batch = load_latest_metric_batch(db_path)
    run_uuid = run_metadata.run_uuid if run_metadata else None

    accounts = _safe_load(get_accounts, db_path, "accounts")
    portfolios = _safe_load(get_portfolios, db_path, "portfolios")
    position_context: _PositionContext | None = None
    reference_date = datetime.now(UTC)
    if include_positions:
        securities = _load_securities(db_path)
        position_context = _build_position_context(
            db_path,
            metric_batch.securities,
            securities,
            reference_date,
        )

    account_snapshots = _compose_account_snapshots(accounts, metric_batch.accounts)
    portfolio_snapshots = _compose_portfolio_snapshots(
        portfolios,
        metric_batch.portfolios,
        metric_batch.securities,
        db_path,
        reference_date,
        include_positions=include_positions,
        position_context=position_context,
    )

    result = NormalizationResult(
        generated_at=_utc_now_isoformat(),
        metric_run_uuid=run_uuid,
        accounts=tuple(account_snapshots),
        portfolios=tuple(portfolio_snapshots),
        diagnostics=get_missing_fx_diagnostics(),
    )
    try:
        persist_normalization_result(
            db_path,
            result,
            account_serializer=serialize_account_snapshot,
            portfolio_serializer=serialize_portfolio_snapshot,
        )
    except Exception:
        _LOGGER.exception(
            "normalization_pipeline: Fehler beim Persistieren der Canonical Snapshots "
            "(run_uuid=%s)",
            run_uuid,
        )
    return result


def _compose_account_snapshots(
    accounts: Sequence[Account],
    account_metrics: Sequence[AccountMetricRecord],
) -> list[AccountSnapshot]:
    """Combine staged account metadata with persisted metrics."""
    metric_index = {
        record.account_uuid: record for record in account_metrics if record.account_uuid
    }

    snapshots: list[AccountSnapshot] = []
    for account in accounts:
        if getattr(account, "is_retired", False):
            continue

        currency = (account.currency_code or "EUR").strip().upper()
        metric = metric_index.get(account.uuid)
        orig_balance = cent_to_eur(getattr(account, "balance", 0), default=0.0) or 0.0

        if metric and metric.balance_eur_cents is not None:
            eur_balance = cent_to_eur(metric.balance_eur_cents, default=None)
        elif currency == "EUR":
            eur_balance = orig_balance
        else:
            eur_balance = None

        fx_unavailable = currency != "EUR" and eur_balance is None

        snapshots.append(
            AccountSnapshot(
                uuid=account.uuid,
                name=account.name,
                currency_code=currency,
                orig_balance=round_currency(orig_balance) or 0.0,
                balance=(
                    round_currency(eur_balance) if eur_balance is not None else None
                ),
                fx_rate=metric.fx_rate if metric else None,
                fx_rate_source=metric.fx_rate_source if metric else None,
                fx_rate_timestamp=metric.fx_rate_timestamp if metric else None,
                coverage_ratio=metric.coverage_ratio if metric else None,
                provenance=metric.provenance if metric else None,
                fx_unavailable=fx_unavailable,
            )
        )

    return snapshots


def _compose_portfolio_snapshots(
    portfolios: Sequence[Portfolio],
    portfolio_metrics: Sequence[PortfolioMetricRecord],
    security_metrics: Sequence[SecurityMetricRecord],
    db_path: Path,
    reference_date: datetime,
    *,
    include_positions: bool,
    position_context: _PositionContext | None,
) -> list[PortfolioSnapshot]:
    """Combine staged portfolios with persisted aggregate metrics."""
    portfolio_index = {
        portfolio.uuid: portfolio
        for portfolio in portfolios
        if not getattr(portfolio, "is_retired", False)
    }
    metric_index = {
        record.portfolio_uuid: record
        for record in portfolio_metrics
        if record.portfolio_uuid
    }
    context = position_context if include_positions else None
    day_changes = _aggregate_portfolio_day_change(security_metrics, db_path, reference_date)

    snapshots: list[PortfolioSnapshot] = []
    for uuid, portfolio in portfolio_index.items():
        metric = metric_index.get(uuid)
        snapshots.append(
            _build_portfolio_snapshot(
                portfolio=portfolio,
                metric=metric,
                include_positions=include_positions,
                position_context=context,
                day_change=day_changes.get(uuid),
            )
        )

    snapshots.sort(key=lambda snapshot: snapshot.name.lower())
    return snapshots


def _build_position_context(
    db_path: Path,
    security_metrics: Sequence[SecurityMetricRecord],
    securities: Mapping[str, Security],
    reference_date: datetime,
) -> _PositionContext:
    """Prepare the lookup tables required for loading position snapshots."""
    index = {
        portfolio_uuid: tuple(records)
        for portfolio_uuid, records in _index_security_metrics_by_portfolio(
            security_metrics
        ).items()
    }
    return _PositionContext(db_path=db_path, securities=securities, index=index, reference_date=reference_date)


def _build_portfolio_snapshot(
    portfolio: Portfolio,
    metric: PortfolioMetricRecord | None,
    *,
    include_positions: bool,
    position_context: _PositionContext | None,
    day_change: tuple[float | None, float | None, float | None] | None,
) -> PortfolioSnapshot:
    """Return a PortfolioSnapshot derived from metadata and metrics."""
    current_value = _metric_value(metric, "current_value_cents")
    purchase_value = _metric_value(metric, "purchase_value_cents")
    position_count = int(getattr(metric, "position_count", 0) or 0)
    missing_value_positions = int(getattr(metric, "missing_value_positions", 0) or 0)

    performance = _compose_performance_payload(metric)
    day_change_value: float | None = None
    day_change_pct: float | None = None
    day_change_coverage: float | None = None
    if day_change:
        day_change_value, day_change_pct, day_change_coverage = day_change
        if day_change_value is not None or day_change_pct is not None:
            performance["day_change"] = {
                "value_change_eur": day_change_value,
                "change_pct": day_change_pct,
                "coverage_ratio": day_change_coverage,
                "source": performance.get("source") or "aggregated",
            }
    data_state = _portfolio_data_state(missing_value_positions)

    positions: tuple[PositionSnapshot, ...] = ()
    if include_positions and position_context is not None:
        metric_rows = position_context.index.get(portfolio.uuid, ())
        positions = tuple(
            _load_position_snapshots(
                db_path=position_context.db_path,
                portfolio_uuid=portfolio.uuid,
                metric_rows=metric_rows,
                securities=position_context.securities,
                reference_date=position_context.reference_date,
            )
        )

    return PortfolioSnapshot(
        uuid=portfolio.uuid,
        name=portfolio.name,
        current_value=current_value,
        purchase_value=purchase_value,
        position_count=position_count,
        missing_value_positions=missing_value_positions,
        performance=performance,
        day_change_abs=day_change_value,
        day_change_pct=day_change_pct,
        coverage_ratio=getattr(metric, "coverage_ratio", None),
        provenance=getattr(metric, "provenance", None),
        metric_run_uuid=getattr(metric, "metric_run_uuid", None),
        positions=positions,
        data_state=data_state,
    )


def _aggregate_portfolio_day_change(
    security_metrics: Sequence[SecurityMetricRecord],
    db_path: Path,
    reference_date: datetime,
) -> dict[str, tuple[float | None, float | None, float | None]]:
    """Aggregate portfolio-level day changes from security metrics."""
    if not security_metrics:
        return {}

    grouped: dict[str, list[SecurityMetricRecord]] = {}
    for record in security_metrics:
        portfolio_uuid = getattr(record, "portfolio_uuid", None)
        if not portfolio_uuid:
            continue
        grouped.setdefault(portfolio_uuid, []).append(record)

    aggregates: dict[str, tuple[float | None, float | None, float | None]] = {}
    for portfolio_uuid, records in grouped.items():
        total_current_cents = 0
        total_day_change_eur = 0.0
        rows_with_change = 0
        rows_missing_change = 0

        for record in records:
            try:
                total_current_cents += int(getattr(record, "current_value_cents", 0) or 0)
            except (TypeError, ValueError):
                total_current_cents += 0

            holdings = _from_holdings_raw(getattr(record, "holdings_raw", 0))
            if holdings <= 0:
                continue

            delta_eur = None
            try:
                prev_date, prev_raw, prev_native = fetch_previous_close(
                    db_path,
                    record.security_uuid,
                    before_epoch_day=int(reference_date.timestamp() // 86400),
                )
            except Exception:  # pragma: no cover - defensive
                prev_date, prev_raw, prev_native = None, None, None

            last_price_native = normalize_raw_price(
                getattr(record, "last_price_native_raw", None),
                decimals=4,
            )
            has_prev_close = prev_native is not None and last_price_native is not None
            if has_prev_close:
                price_change_native = last_price_native - prev_native
                delta_eur = round_currency(price_change_native * holdings, default=None)
            if delta_eur is None:
                # Missing previous close: treat as 0 contribution but mark as missing.
                rows_missing_change += 1
                delta_eur = 0.0

            total_day_change_eur += delta_eur
            if has_prev_close:
                rows_with_change += 1

        if rows_with_change == 0:
            coverage_ratio = 0.0 if rows_missing_change > 0 else None
            aggregates[portfolio_uuid] = (None, None, coverage_ratio)
            continue

        coverage_ratio = (
            rows_with_change / (rows_with_change + rows_missing_change)
            if rows_with_change + rows_missing_change > 0
            else None
        )

        current_value_eur = cent_to_eur(total_current_cents, default=0.0) or 0.0
        day_change_value = round_currency(total_day_change_eur, default=None)
        previous_close = current_value_eur - (day_change_value or 0)
        day_change_pct = (
            round_currency((day_change_value / previous_close) * 100, default=None)
            if previous_close not in (None, 0)
            and day_change_value is not None
            else None
        )

        aggregates[portfolio_uuid] = (day_change_value, day_change_pct, coverage_ratio)

    return aggregates


def _metric_value(metric: PortfolioMetricRecord | None, field_name: str) -> float:
    """Convert integer cent totals into rounded EUR floats."""
    cents = getattr(metric, field_name, None) if metric else None
    return cent_to_eur(cents, default=0.0) or 0.0


def _compose_performance_payload(
    metric: PortfolioMetricRecord | None,
) -> dict[str, Any]:
    """Return a normalized performance dictionary for a portfolio."""
    if not metric:
        return {
            "gain_abs": 0.0,
            "gain_pct": None,
            "total_change_eur": 0.0,
            "total_change_pct": None,
            "source": "metrics",
            "coverage_ratio": None,
        }

    gain_abs = cent_to_eur(metric.gain_abs_cents, default=0.0) or 0.0
    total_change = (
        cent_to_eur(metric.total_change_eur_cents, default=None) or gain_abs or 0.0
    )

    payload: dict[str, Any] = {
        "gain_abs": gain_abs,
        "gain_pct": metric.gain_pct,
        "total_change_eur": total_change,
        "total_change_pct": metric.total_change_pct,
        "source": metric.source or "metrics",
        "coverage_ratio": metric.coverage_ratio,
    }
    if metric.provenance:
        payload["provenance"] = metric.provenance
    return payload


def _portfolio_data_state(missing_value_positions: int) -> SnapshotDataState:
    """Return a SnapshotDataState reflecting missing valuation coverage."""
    if missing_value_positions > 0:
        return SnapshotDataState(
            status="error",
            message="Portfolio enthält Positionen ohne Bewertung.",
        )
    return SnapshotDataState()


def _load_position_snapshots(
    *,
    db_path: Path,
    portfolio_uuid: str,
    metric_rows: Sequence[SecurityMetricRecord] | tuple[()] | None,
    securities: Mapping[str, Security],
    reference_date: datetime,
) -> Iterable[PositionSnapshot]:
    """Convert persisted security metrics into PositionSnapshot dataclasses."""
    if not metric_rows:
        return []

    snapshots: list[PositionSnapshot] = []
    reference_date = datetime.now(UTC)
    for record in metric_rows:
        security_uuid = getattr(record, "security_uuid", None)
        if not security_uuid:
            continue

        security_meta = securities.get(security_uuid)
        raw_name = security_meta.name if security_meta and security_meta.name else ""
        name = raw_name.strip() or security_uuid

        currency_code = (
            (record.security_currency_code or "").strip()
            or (security_meta.currency_code if security_meta else None)
            or "EUR"
        ).upper()

        holdings = _from_holdings_raw(record.holdings_raw)
        current_value = cent_to_eur(record.current_value_cents, default=0.0) or 0.0
        purchase_value = cent_to_eur(record.purchase_value_cents, default=0.0) or 0.0
        purchase_total_account = round_currency(
            record.purchase_account_value_cents,
            default=None,
        )
        purchase_total_security = round_currency(
            record.purchase_security_value_raw,
            decimals=6,
            default=None,
        )

        average_cost_payload = {
            "eur": (
                round_currency(purchase_value / holdings, default=None)
                if holdings
                else None
            ),
            "security": (
                round_price(
                    purchase_total_security / holdings,
                    decimals=6,
                    default=None,
                )
                if holdings and purchase_total_security not in (None, 0.0)
                else None
            ),
            "account": (
                round_currency(purchase_total_account / holdings, default=None)
                if holdings and purchase_total_account not in (None, 0.0)
                else None
            ),
        }

        gain_abs = cent_to_eur(record.gain_abs_cents, default=0.0) or 0.0
        total_change_eur = (
            cent_to_eur(record.total_change_eur_cents, default=None) or gain_abs or 0.0
        )
        performance_payload: dict[str, Any] = {
            "gain_abs": gain_abs,
            "gain_pct": record.gain_pct,
            "total_change_eur": total_change_eur,
            "total_change_pct": record.total_change_pct,
            "source": record.source or "metrics",
            "coverage_ratio": record.coverage_ratio,
        }
        if record.provenance:
            performance_payload["provenance"] = record.provenance

        aggregation_payload: dict[str, Any] = {
            "total_holdings": holdings,
            "purchase_value_eur": purchase_value,
            "purchase_total_account": purchase_total_account,
            "purchase_total_security": purchase_total_security,
            "coverage_ratio": record.coverage_ratio,
        }

        last_price_native = normalize_raw_price(
            record.last_price_native_raw,
            decimals=4,
        )
        last_close_native = normalize_raw_price(
            record.last_close_native_raw,
            decimals=4,
        )
        last_price_eur = normalize_price_to_eur_sync(
            record.last_price_native_raw,
            currency_code,
            reference_date,
            db_path,
        )
        last_close_eur = normalize_price_to_eur_sync(
            record.last_close_native_raw,
            currency_code,
            reference_date,
            db_path,
        )

        # Recompute day change from history to avoid stale or missing metric deltas.
        price_change_native = None
        price_change_eur = None
        change_pct = None
        try:
            prev_date, prev_raw, prev_native = fetch_previous_close(
                db_path,
                security_uuid,
                before_epoch_day=int(reference_date.timestamp() // 86400),
            )
        except Exception:  # pragma: no cover - defensive
            prev_date, prev_raw, prev_native = None, None, None
        if prev_native is not None and last_price_native is not None:
            price_change_native = round_price(
                last_price_native - prev_native,
                decimals=6,
                default=None,
            )
            if prev_native:
                change_pct = round_currency(
                    (price_change_native or 0) / prev_native * 100,
                    default=None,
                )
            # Prefer recomputed close values
            last_close_native = prev_native
            if prev_raw is not None:
                last_close_eur = normalize_price_to_eur_sync(
                    prev_raw,
                    currency_code,
                    reference_date,
                    db_path,
                )
        else:
            # Stale or missing close: do not keep legacy close values
            last_close_native = None
            last_close_eur = None
        if last_price_eur is not None and last_close_eur is not None:
            price_change_eur = round_price(
                last_price_eur - last_close_eur,
                decimals=6,
                default=None,
            )
        if (
            price_change_native is not None
            or price_change_eur is not None
            or change_pct is not None
        ):
            performance_payload["day_change"] = {
                "price_change_native": price_change_native,
                "price_change_eur": price_change_eur,
                "change_pct": change_pct,
                "source": "derived",
                "coverage_ratio": record.coverage_ratio,
            }

        price_change_native = None
        price_change_eur = None
        change_pct = None
        if last_price_native is not None and last_close_native is not None:
            price_change_native = round_price(
                last_price_native - last_close_native,
                decimals=6,
                default=None,
            )
            if last_close_native:
                change_pct = round_currency(
                    (price_change_native or 0) / last_close_native * 100,
                    default=None,
                )
        if last_price_eur is not None and last_close_eur is not None:
            price_change_eur = round_price(
                last_price_eur - last_close_eur,
                decimals=6,
                default=None,
            )
        if price_change_native is not None or price_change_eur is not None or change_pct is not None:
            performance_payload["day_change"] = {
                "price_change_native": price_change_native,
                "price_change_eur": price_change_eur,
                "change_pct": change_pct,
                "source": "derived",
                "coverage_ratio": record.day_change_coverage
                if record.day_change_coverage not in (None, "")
                else 1.0,
            }
        elif any(
            getattr(record, field) not in (None, "")
            for field in ("day_change_native", "day_change_eur", "day_change_pct")
        ):
            performance_payload["day_change"] = {
                "price_change_native": round_price(
                    record.day_change_native,
                    decimals=6,
                    default=None,
                ),
                "price_change_eur": round_price(
                    record.day_change_eur,
                    decimals=6,
                    default=None,
                ),
                "change_pct": record.day_change_pct,
                "source": record.day_change_source or "metrics",
                "coverage_ratio": record.day_change_coverage,
            }

        snapshots.append(
            PositionSnapshot(
                portfolio_uuid=portfolio_uuid,
                security_uuid=security_uuid,
                name=name,
                currency_code=currency_code,
                current_holdings=holdings,
                purchase_value=purchase_value,
                current_value=current_value,
                average_cost=average_cost_payload,
                performance=performance_payload,
                aggregation=aggregation_payload,
                coverage_ratio=record.coverage_ratio,
                provenance=record.provenance,
                metric_run_uuid=record.metric_run_uuid,
                last_price_native=last_price_native,
                last_price_eur=last_price_eur,
                last_close_native=last_close_native,
                last_close_eur=last_close_eur,
            )
        )

    snapshots.sort(key=lambda snapshot: snapshot.name.lower())
    return snapshots


def load_portfolio_position_snapshots(
    db_path: Path | str,
    portfolio_ids: Collection[str],
) -> dict[str, tuple[PositionSnapshot, ...]]:
    """Return position snapshots grouped by portfolio UUID."""
    normalized_ids = tuple({pid for pid in portfolio_ids if pid})
    if not normalized_ids:
        return {}

    resolved_path = Path(db_path)
    try:
        run_metadata, metric_batch = load_latest_metric_batch(resolved_path)
    except Exception:  # pragma: no cover - defensive fallback
        _LOGGER.exception(
            "normalization_pipeline: Fehler beim Laden der Metric-Batch für "
            "portfolio_positions",
        )
        return dict.fromkeys(normalized_ids, ())
    run_uuid = run_metadata.run_uuid if run_metadata else None
    if not run_uuid:
        return dict.fromkeys(normalized_ids, ())

    security_metrics: Sequence[SecurityMetricRecord] | tuple[()] = (
        metric_batch.securities or ()
    )

    securities = _load_securities(resolved_path)
    grouped_metrics = _index_security_metrics_by_portfolio(security_metrics)

    snapshots: dict[str, tuple[PositionSnapshot, ...]] = {}
    reference_date = datetime.now(UTC)
    for portfolio_uuid in normalized_ids:
        rows = grouped_metrics.get(portfolio_uuid, ())
        entries = tuple(
            _load_position_snapshots(
                db_path=resolved_path,
                portfolio_uuid=portfolio_uuid,
                metric_rows=rows,
                securities=securities,
                reference_date=reference_date,
            )
        )
        snapshots[portfolio_uuid] = entries
    return snapshots


def _build_security_snapshot_from_positions(
    normalization: NormalizationResult,
    security_uuid: str,
) -> dict[str, Any] | None:
    """Aggregate a security snapshot from normalized portfolio positions."""
    if not security_uuid:
        return None

    matched: list[PositionSnapshot] = [
        position
        for portfolio in normalization.portfolios
        for position in portfolio.positions
        if position.security_uuid == security_uuid
    ]

    if not matched:
        return None

    first = matched[0]
    total_holdings = sum(position.current_holdings for position in matched)
    market_value = sum(position.current_value for position in matched)
    purchase_value = sum(position.purchase_value for position in matched)

    purchase_total_security = _sum_optional(
        position.aggregation.get("purchase_total_security") for position in matched
    )
    purchase_total_account = _sum_optional(
        position.aggregation.get("purchase_total_account") for position in matched
    )

    coverage_values = [
        value
        for value in (
            position.coverage_ratio or position.aggregation.get("coverage_ratio")
            for position in matched
        )
        if value not in (None, "")
    ]
    coverage_ratio = (
        round_currency(sum(coverage_values) / len(coverage_values), decimals=4)
        if coverage_values
        else None
    )

    performance_gain_abs = (
        _sum_optional(position.performance.get("gain_abs") for position in matched)
        or 0.0
    )
    performance_total_change = _sum_optional(
        position.performance.get("total_change_eur") for position in matched
    )
    if performance_total_change is None:
        performance_total_change = performance_gain_abs

    gain_pct = (
        round_currency(
            (performance_gain_abs / purchase_value) * 100,
            default=0.0,
        )
        if purchase_value
        else 0.0
    )
    total_change_pct = (
        round_currency(
            (performance_total_change / purchase_value) * 100,
            default=0.0,
        )
        if purchase_value
        else 0.0
    )

    day_change_payload = _first_mapping(
        position.performance.get("day_change")
        for position in matched
        if isinstance(position.performance, dict)
    )

    last_price_native = _first_value(position.last_price_native for position in matched)
    last_price_eur = _first_value(position.last_price_eur for position in matched)
    if last_price_eur is None and last_price_native is not None:
        last_price_eur = last_price_native if first.currency_code == "EUR" else None

    last_close_native = _first_value(position.last_close_native for position in matched)
    last_close_eur = _first_value(position.last_close_eur for position in matched)

    average_cost = {
        "eur": (
            round_currency(purchase_value / total_holdings, default=None)
            if total_holdings
            else None
        ),
        "security": (
            round_price(
                purchase_total_security / total_holdings,
                decimals=6,
                default=None,
            )
            if total_holdings and purchase_total_security not in (None, 0.0)
            else None
        ),
        "account": (
            round_currency(
                purchase_total_account / total_holdings,
                default=None,
            )
            if total_holdings and purchase_total_account not in (None, 0.0)
            else None
        ),
    }

    aggregation = {
        "total_holdings": total_holdings,
        "purchase_value_eur": purchase_value,
        "purchase_total_security": purchase_total_security,
        "purchase_total_account": purchase_total_account,
    }

    performance_payload: dict[str, Any] = {
        "gain_abs": round_currency(performance_gain_abs, default=0.0) or 0.0,
        "gain_pct": gain_pct or 0.0,
        "total_change_eur": round_currency(performance_total_change, default=0.0)
        or 0.0,
        "total_change_pct": total_change_pct or 0.0,
        "source": _first_string(
            position.performance.get("source")
            for position in matched
            if isinstance(position.performance, dict)
        )
        or "metrics",
        "coverage_ratio": coverage_ratio,
    }

    provenance = _first_string(position.provenance for position in matched)
    if provenance:
        performance_payload["provenance"] = provenance
    if day_change_payload:
        performance_payload["day_change"] = dict(day_change_payload)

    price_change_native = None
    price_change_eur = None
    change_pct = None
    if last_price_native is not None and last_close_native is not None:
        price_change_native = round_price(
            last_price_native - last_close_native,
            decimals=6,
            default=None,
        )
        if last_close_native:
            change_pct = round_currency(
                (price_change_native or 0) / last_close_native * 100,
                default=None,
            )
    if last_price_eur is not None and last_close_eur is not None:
        price_change_eur = round_price(
            last_price_eur - last_close_eur,
            decimals=6,
            default=None,
        )
    if price_change_native is not None or price_change_eur is not None or change_pct is not None:
        performance_payload["day_change"] = {
            "price_change_native": price_change_native,
            "price_change_eur": price_change_eur,
            "change_pct": change_pct,
            "source": "derived",
            "coverage_ratio": coverage_ratio,
        }

    return {
        "name": first.name,
        "currency_code": first.currency_code,
        "total_holdings": round_currency(
            total_holdings,
            decimals=6,
            default=0.0,
        )
        or 0.0,
        "last_price_native": round_price(last_price_native, decimals=6),
        "last_price_eur": round_price(last_price_eur, decimals=6),
        "market_value_eur": round_currency(market_value, default=0.0) or 0.0,
        "purchase_value_eur": round_currency(purchase_value, default=0.0) or 0.0,
        "average_cost": average_cost,
        "aggregation": aggregation,
        "last_close_native": round_price(last_close_native, decimals=6),
        "last_close_eur": round_price(last_close_eur, decimals=6),
        "performance": performance_payload,
    }


def _first_value(values: Iterable[float | None]) -> float | None:
    """Return the first non-empty numeric value."""
    for value in values:
        if value not in (None, ""):
            return float(value)
    return None


def _first_string(values: Iterable[str | None]) -> str | None:
    """Return the first non-empty string."""
    for value in values:
        if value:
            return str(value)
    return None


def _first_mapping(values: Iterable[dict[str, Any] | None]) -> dict[str, Any] | None:
    """Return the first mapping-like value."""
    for value in values:
        if isinstance(value, dict):
            return value
    return None


def _sum_optional(values: Iterable[float | None]) -> float | None:
    """Sum numeric values while preserving None when no entries are present."""
    total = 0.0
    seen = False
    for value in values:
        if value in (None, ""):
            continue
        total += float(value)
        seen = True
    return total if seen else None


def _index_security_metrics_by_portfolio(
    records: Sequence[SecurityMetricRecord],
) -> dict[str, list[SecurityMetricRecord]]:
    """Group security metrics by their portfolio UUID."""
    index: dict[str, list[SecurityMetricRecord]] = defaultdict(list)
    for record in records:
        portfolio_uuid = getattr(record, "portfolio_uuid", None)
        if portfolio_uuid:
            index[portfolio_uuid].append(record)
    return index


def _load_securities(db_path: Path) -> dict[str, Security]:
    """Load security metadata for downstream labeling."""
    try:
        return get_securities(db_path)
    except Exception:
        _LOGGER.exception(
            "normalization_pipeline: Fehler beim Laden der securities (db_path=%s)",
            db_path,
        )
        return {}


_EIGHT_DECIMAL_SCALE = 10**8


def _from_eight_decimal(
    value: Any,
    *,
    decimals: int = 4,
    default: float | None = None,
) -> float | None:
    """Convert a stored 10^-8 fixed-point value into a float."""
    if value in (None, ""):
        return default

    try:
        numeric = float(value) / _EIGHT_DECIMAL_SCALE
    except (TypeError, ValueError):
        return default

    return round_currency(numeric, decimals=decimals, default=default)


def _from_holdings_raw(value: Any) -> float:
    """Convert stored holdings (10^-8 shares) to a float."""
    normalized = _from_eight_decimal(value, decimals=8, default=0.0)
    return normalized or 0.0


def _safe_load(
    loader: Callable[[Path], Sequence[Any]],
    db_path: Path,
    label: str,
) -> list[Any]:
    """Execute a loader and swallow/log failures."""
    try:
        return list(loader(db_path))
    except Exception:
        _LOGGER.exception("normalization_pipeline: Fehler beim Laden der %s", label)
        return []


def _utc_now_isoformat() -> str:
    """Return a timezone-aware ISO 8601 timestamp."""
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
