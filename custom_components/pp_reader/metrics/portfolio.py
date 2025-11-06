"""Portfolio metric computation helpers."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import suppress
from typing import TYPE_CHECKING, Any

from custom_components.pp_reader.data.db_access import PortfolioMetricRecord
from custom_components.pp_reader.metrics.common import select_performance_metrics
from custom_components.pp_reader.util import async_run_executor_job
from custom_components.pp_reader.util.currency import cent_to_eur

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.portfolio")

_PORTFOLIO_AGGREGATION_SQL = """
    SELECT
        p.uuid AS uuid,
        p.name AS name,
        COALESCE(SUM(ps.current_value), 0) AS current_value,
        COALESCE(SUM(ps.purchase_value), 0) AS purchase_sum,
        COUNT(CASE WHEN ps.current_holdings > 0 THEN 1 END) AS position_count,
        SUM(
            CASE
                WHEN ps.current_holdings > 0 AND ps.current_value IS NULL THEN 1
                ELSE 0
            END
        ) AS missing_value_positions
    FROM portfolios p
    LEFT JOIN portfolio_securities ps
      ON p.uuid = ps.portfolio_uuid
    GROUP BY p.uuid, p.name
    ORDER BY p.name COLLATE NOCASE
"""


async def async_compute_portfolio_metrics(
    hass: HomeAssistant,
    db_path: Path,
    run_uuid: str,
) -> list[PortfolioMetricRecord]:
    """Compute portfolio level metrics for the provided run."""
    if not run_uuid:
        msg = "run_uuid darf nicht leer sein"
        raise ValueError(msg)

    return await async_run_executor_job(
        hass,
        _compute_portfolio_metrics_sync,
        db_path,
        run_uuid,
    )


def _compute_portfolio_metrics_sync(
    db_path: Path,
    run_uuid: str,
) -> list[PortfolioMetricRecord]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    rows: list[sqlite3.Row] = []
    try:
        rows = conn.execute(_PORTFOLIO_AGGREGATION_SQL).fetchall()
    except sqlite3.Error:
        _LOGGER.exception(
            "Fehler beim Aggregieren der Portfolio-Metriken (run_uuid=%s)", run_uuid
        )
        return []
    finally:
        with suppress(sqlite3.Error):
            conn.close()

    records: list[PortfolioMetricRecord] = []
    for row in rows:
        portfolio_uuid = row["uuid"]
        if not portfolio_uuid:
            continue

        current_value_cents = _coerce_int(row["current_value"])
        purchase_value_cents = _coerce_int(row["purchase_sum"])
        position_count = _coerce_int(row["position_count"])
        missing_value_positions = _coerce_int(row["missing_value_positions"])

        current_value_eur = cent_to_eur(current_value_cents, default=None)
        purchase_value_eur = cent_to_eur(purchase_value_cents, default=None)

        performance_metrics, _ = select_performance_metrics(
            current_value=current_value_eur,
            purchase_value=purchase_value_eur,
            holdings=position_count,
        )

        gain_abs_cents = current_value_cents - purchase_value_cents

        records.append(
            PortfolioMetricRecord(
                metric_run_uuid=run_uuid,
                portfolio_uuid=portfolio_uuid,
                current_value_cents=current_value_cents,
                purchase_value_cents=purchase_value_cents,
                gain_abs_cents=gain_abs_cents,
                gain_pct=performance_metrics.gain_pct,
                total_change_eur_cents=gain_abs_cents,
                total_change_pct=performance_metrics.total_change_pct,
                source=performance_metrics.source,
                coverage_ratio=performance_metrics.coverage_ratio,
                position_count=position_count,
                missing_value_positions=missing_value_positions,
            )
        )

    return records


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
