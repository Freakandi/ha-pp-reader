"""Security metric computation helpers."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import suppress
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import (
    SecurityMetricRecord,
    fetch_previous_close,
)
from custom_components.pp_reader.metrics.common import select_performance_metrics
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import (
    cent_to_eur,
    normalize_price_to_eur_sync,
    normalize_raw_price,
    round_price,
)

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.securities")
_SCALED_INT_THRESHOLD = 10_000
_EIGHT_DECIMAL_SCALE = 10**8
_FX_GAP_WARNED: set[str] = set()

_SECURITY_AGGREGATION_SQL = """
    SELECT
        ps.portfolio_uuid,
        ps.security_uuid,
        ps.current_holdings,
        ps.purchase_value,
        ps.current_value,
        ps.security_currency_total,
        ps.account_currency_total,
        s.currency_code,
        s.last_price,
        s.last_price_date
    FROM portfolio_securities ps
    JOIN securities s ON s.uuid = ps.security_uuid
"""


async def async_compute_security_metrics(
    hass: HomeAssistant,
    db_path: Path,
    run_uuid: str,
) -> list[SecurityMetricRecord]:
    """Compute security metrics for each portfolio/security combination."""
    if not run_uuid:
        msg = "run_uuid darf nicht leer sein"
        raise ValueError(msg)

    return await async_run_executor_job(
        hass,
        _compute_security_metrics_sync,
        db_path,
        run_uuid,
    )


def _compute_security_metrics_sync(
    db_path: Path,
    run_uuid: str,
) -> list[SecurityMetricRecord]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    records: list[SecurityMetricRecord] = []
    try:
        rows = conn.execute(_SECURITY_AGGREGATION_SQL).fetchall()
        reference_date = datetime.now(UTC)

        for row in rows:
            record = _build_security_metric_record(
                row,
                run_uuid,
                db_path,
                reference_date,
                conn,
            )
            if record is not None:
                records.append(record)

    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Aggregieren der Wertpapier-Metriken (run_uuid=%s)", run_uuid
        )
        return []
    finally:
        with suppress(sqlite3.Error):
            conn.close()

    return records


def _build_security_metric_record(
    row: sqlite3.Row,
    run_uuid: str,
    db_path: Path,
    reference_date: datetime,
    conn: sqlite3.Connection,
) -> SecurityMetricRecord | None:
    portfolio_uuid = row["portfolio_uuid"]
    security_uuid = row["security_uuid"]
    if not portfolio_uuid or not security_uuid:
        return None

    try:
        current_value_cents = _normalize_currency_cents(
            _coerce_int(row["current_value"])
        )
        purchase_value_cents = _coerce_int(row["purchase_value"])
        holdings_raw = _coerce_int(row["current_holdings"])
        holdings_value = _normalize_holdings_value(
            _coerce_float(row["current_holdings"])
        )
        purchase_security_total = _coerce_float(row["security_currency_total"])
        purchase_account_total = _coerce_float(row["account_currency_total"])

        currency = (row["currency_code"] or "EUR").strip().upper()

        current_value_eur = cent_to_eur(current_value_cents, default=None)
        purchase_value_eur = cent_to_eur(purchase_value_cents, default=None)

        last_price_raw = _coerce_optional_int(row["last_price"])
        last_price_native = None
        if last_price_raw is not None:
            last_price_native = normalize_raw_price(last_price_raw, decimals=4)

        last_price_eur = None
        if last_price_raw is not None:
            last_price_eur = normalize_price_to_eur_sync(
                last_price_raw,
                currency,
                reference_date,
                db_path,
            )
        if (
            currency != "EUR"
            and last_price_raw is not None
            and last_price_eur is None
            and currency not in _FX_GAP_WARNED
        ):
            _FX_GAP_WARNED.add(currency)
            _LOGGER.warning(
                (
                    "Fehlender FX-Kurs für %s zum %s (last_price); "
                    "Metrics ggf. unvollständig"
                ),
                currency,
                reference_date.strftime("%Y-%m-%d"),
            )
        last_price_eur_value = (
            round_price(last_price_eur, decimals=4)
            if last_price_eur is not None
            else None
        )

        raw_last_close, last_close_native = fetch_previous_close(
            db_path,
            security_uuid,
            conn=conn,
        )

        last_close_eur = None
        if raw_last_close is not None:
            last_close_eur = normalize_price_to_eur_sync(
                raw_last_close,
                currency,
                reference_date,
                db_path,
            )
            if (
                currency != "EUR"
                and last_close_eur is None
                and currency not in _FX_GAP_WARNED
            ):
                _FX_GAP_WARNED.add(currency)
                _LOGGER.warning(
                    (
                        "Fehlender FX-Kurs für %s zum %s (last_close); "
                        "Metrics ggf. unvollständig"
                    ),
                    currency,
                    reference_date.strftime("%Y-%m-%d"),
                )

        day_change_eur_override = _compute_day_change_eur(
            last_price_eur_value,
            last_close_eur,
        )

        fx_rate = _determine_fx_rate(
            last_price_native,
            last_price_eur_value,
            last_close_native,
            last_close_eur,
        )

        performance_metrics, day_change_metrics = select_performance_metrics(
            current_value=current_value_eur,
            purchase_value=purchase_value_eur,
            holdings=holdings_value,
            last_price_native=last_price_native,
            last_close_native=last_close_native,
            fx_rate=fx_rate,
        )

        day_change_eur_value = (
            day_change_eur_override
            if day_change_eur_override is not None
            else day_change_metrics.price_change_eur
        )

        gain_abs_cents = current_value_cents - purchase_value_cents

        return SecurityMetricRecord(
            metric_run_uuid=run_uuid,
            portfolio_uuid=portfolio_uuid,
            security_uuid=security_uuid,
            security_currency_code=currency,
            holdings_raw=holdings_raw,
            current_value_cents=current_value_cents,
            purchase_value_cents=purchase_value_cents,
            purchase_security_value_raw=purchase_security_total,
            purchase_account_value_cents=purchase_account_total,
            gain_abs_cents=gain_abs_cents,
            gain_pct=performance_metrics.gain_pct,
            total_change_eur_cents=gain_abs_cents,
            total_change_pct=performance_metrics.total_change_pct,
            source=performance_metrics.source,
            coverage_ratio=performance_metrics.coverage_ratio,
            day_change_native=day_change_metrics.price_change_native,
            day_change_eur=day_change_eur_value,
            day_change_pct=day_change_metrics.change_pct,
            day_change_source=day_change_metrics.source,
            day_change_coverage=day_change_metrics.coverage_ratio,
            last_price_native_raw=last_price_raw,
            last_close_native_raw=raw_last_close,
        )
    except Exception:  # pragma: no cover - defensive logging
        _LOGGER.exception(
            "Fehler beim Berechnen der Wertpapier-Metrik (portfolio=%s, security=%s)",
            portfolio_uuid,
            security_uuid,
        )
        return None


def _determine_fx_rate(
    last_price_native: float | None,
    last_price_eur: float | None,
    last_close_native: float | None,
    last_close_eur: float | None,
) -> float | None:
    if last_price_native not in (None, 0) and last_price_eur not in (None, 0):
        try:
            return last_price_native / last_price_eur
        except ZeroDivisionError:  # pragma: no cover - defensive
            return None

    if last_close_native not in (None, 0) and last_close_eur not in (None, 0):
        try:
            return last_close_native / float(last_close_eur)
        except ZeroDivisionError:  # pragma: no cover - defensive
            return None

    return None


def _compute_day_change_eur(
    last_price_eur: float | None,
    last_close_eur: float | None,
) -> float | None:
    """Return the EUR-denominated day change using canonical rounding."""
    if last_price_eur is None or last_close_eur is None:
        return None

    return round_price(last_price_eur - last_close_eur, decimals=4)


def _coerce_int(value: Any) -> int:
    """Best-effort coercion of numeric values to int."""
    if value in (None, ""):
        return 0

    if isinstance(value, float):
        return round(value)

    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _coerce_optional_int(value: Any) -> int | None:
    """Best-effort coercion of optional numeric values to int."""
    if value in (None, ""):
        return None

    if isinstance(value, float):
        return round(value)

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _coerce_float(value: Any) -> float | None:
    """Best-effort coercion of numeric values to float."""
    if value in (None, ""):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_holdings_value(value: float | None) -> float:
    """Convert holdings that may be stored as 1e-8 scaled integers."""
    if value is None:
        return 0.0
    if abs(value) >= _SCALED_INT_THRESHOLD:
        return value / _EIGHT_DECIMAL_SCALE
    return value


def _normalize_currency_cents(value: int) -> int:
    """
    Decode currency amounts that might be persisted as 1e-8 scaled integers.

    Legacy data multiplied the EUR cents by 1e8, which resulted in grossly
    inflated totals. Detect obviously scaled values and downscale them so
    downstream snapshots stay in a sane range.
    """
    if abs(value) >= _SCALED_INT_THRESHOLD * _EIGHT_DECIMAL_SCALE:
        return round(value / _EIGHT_DECIMAL_SCALE)
    return value
