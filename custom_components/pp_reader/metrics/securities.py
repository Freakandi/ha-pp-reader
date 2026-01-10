"""Security metric computation helpers."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from custom_components.pp_reader.const import EIGHT_DECIMAL_SCALE
from custom_components.pp_reader.data.db_access import SecurityMetricRecord
from custom_components.pp_reader.metrics.calculator import PerformanceEngine
from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver
from custom_components.pp_reader.util import async_run_executor_job

if TYPE_CHECKING:
    from pathlib import Path

    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger("custom_components.pp_reader.metrics.securities")


async def async_compute_security_metrics(
    hass: HomeAssistant,
    db_path: Path,
    run_uuid: str,
) -> list[SecurityMetricRecord]:
    """Compute security metrics for each portfolio/security combination."""
    if not run_uuid:
        msg = "run_uuid cannot be empty"
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
    """
    Compute security metrics by delegating to the PerformanceEngine.

    This function replaces the previous direct SQL aggregation with calls to the
    PerformanceEngine to get holdings, cost basis (via active lots), and current
    valuation. This ensures that the metrics are consistent with all other
    performance calculations in the system.
    """
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    records: list[SecurityMetricRecord] = []

    try:
        market_resolver = MarketResolver(conn)
        market_resolver.load_data()
        engine = PerformanceEngine(conn, market_resolver)
        engine.load_data()

        portfolios_query = "SELECT uuid FROM portfolios"
        portfolios = [row[0] for row in conn.execute(portfolios_query).fetchall()]
        today = datetime.now(UTC).date()
        # Use tomorrow to get holdings at the end of today
        holdings_date = today + timedelta(days=1)

        for p_uuid in portfolios:
            holdings = engine._get_holdings_at_date(  # noqa: SLF001
                holdings_date, portfolio_uuid=p_uuid
            )
            active_lots = engine.get_fifo_active_lots(scope_uuid=p_uuid)

            for sec_uuid, quantity in holdings.items():
                record = _create_security_record(
                    run_uuid,
                    p_uuid,
                    sec_uuid,
                    quantity,
                    active_lots,
                    market_resolver,
                )
                records.append(record)

    except sqlite3.Error:
        _LOGGER.exception("Error aggregating security metrics (run_uuid=%s)", run_uuid)
        return []
    finally:
        with suppress(sqlite3.Error):
            conn.close()

    return records


def _create_security_record(
    run_uuid: str,
    p_uuid: str,
    sec_uuid: str,
    quantity: float,
    active_lots: dict[str, list],
    market_resolver: MarketResolver,
) -> SecurityMetricRecord:
    """Create a single SecurityMetricRecord with calculating values."""
    now_ts = datetime.now(UTC)
    price = market_resolver.get_price(sec_uuid, now_ts)
    currency = market_resolver.get_security_currency(sec_uuid)
    fx_rate = market_resolver.get_fx(currency, now_ts)
    current_value = (quantity * price) / fx_rate if fx_rate else 0.0

    cost_basis = 0.0
    if sec_uuid in active_lots:
        for lot in active_lots[sec_uuid]:
            # Use gross price if available, else fallback to net
            p_input = (
                lot.price_gross_native
                if lot.price_gross_native > 0
                else lot.price_native
            )
            cost_basis += (
                lot.shares * p_input / lot.fx_rate if lot.fx_rate else 0.0
            )

    unrealized_gain = current_value - cost_basis
    gain_pct = (unrealized_gain / cost_basis) * 100 if cost_basis > 0 else 0.0

    # Day change calculation
    prev_date = now_ts - timedelta(days=1)
    prev_price = market_resolver.get_price(sec_uuid, prev_date)
    prev_fx = market_resolver.get_fx(currency, prev_date)

    day_change_native = None
    day_change_percent = None
    day_change_eur = None
    last_close_native_raw = None

    if price is not None and prev_price is not None:
        day_change_native = price - prev_price
        # Handle prev_price being 0 to avoid division by zero
        if prev_price != 0:
            day_change_percent = (day_change_native / prev_price) * 100
        else:
            day_change_percent = 0.0

        last_close_native_raw = int(prev_price * EIGHT_DECIMAL_SCALE)

        # Calculate EUR day change accounting for FX
        # Current EUR value is already calculated as `current_value`
        # Previous EUR value:
        if prev_fx:
            prev_value_eur = (quantity * prev_price) / prev_fx
            day_change_eur = current_value - prev_value_eur
        else:
            day_change_eur = 0.0

    return SecurityMetricRecord(
        metric_run_uuid=run_uuid,
        portfolio_uuid=p_uuid,
        security_uuid=sec_uuid,
        security_currency_code=currency,
        holdings_raw=int(quantity * EIGHT_DECIMAL_SCALE),
        current_value_cents=int(current_value * 100),
        purchase_value_cents=int(cost_basis * 100),
        gain_abs_cents=int(unrealized_gain * 100),
        gain_pct=gain_pct,
        # The fields below are deprecated or will be calculated
        # elsewhere, providing default values for now.
        purchase_security_value_raw=0,
        purchase_account_value_cents=0,
        total_change_eur_cents=int(unrealized_gain * 100),
        total_change_pct=gain_pct,
        source="FIFO",
        coverage_ratio=1.0,
        day_change_native=day_change_native,
        day_change_eur=day_change_eur,
        day_change_pct=day_change_percent,
        day_change_source="FIFO/Market",
        day_change_coverage=1.0,
        last_price_native_raw=int(price * EIGHT_DECIMAL_SCALE) if price else None,
        last_close_native_raw=last_close_native_raw,
    )
