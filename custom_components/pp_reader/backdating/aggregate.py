"""Aggregate backdating component snapshots into daily wealth records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Sequence

    from custom_components.pp_reader.backdating.accounts import DailyAccountSnapshot
    from custom_components.pp_reader.backdating.cashflows import DailyCashflowSnapshot
    from custom_components.pp_reader.backdating.holdings import DailyHoldingsSnapshot


@dataclass(slots=True)
class DailyWealthAggregate:
    """Consolidated daily wealth record combining all scopes."""

    date: str
    total_wealth_eur: float
    portfolio_wealth_eur: float
    account_wealth_eur: float
    dividends_eur: float
    interest_eur: float
    inbound_transfers_eur: float
    outbound_transfers_eur: float

    invested_capital_eur: float
    performance_neutral_movements: float
    fees_eur: float
    taxes_eur: float
    fx_coverage_ratio: float
    price_coverage_ratio: float
    stale_price: bool
    provenance: str | None


def build_daily_wealth_records(
    start_date: date,
    end_date: date,
    *,
    holdings: Sequence[DailyHoldingsSnapshot] | None = None,
    accounts: Sequence[DailyAccountSnapshot] | None = None,
    cashflows: Sequence[DailyCashflowSnapshot] | None = None,
    provenance: str | None = None,
) -> list[DailyWealthAggregate]:
    """
    Combine component snapshots into per-day wealth records.

    Missing components default to zeroed buckets and full coverage (1.0) to
    keep aggregation resilient; coverage ratios are the minimum of available
    component ratios to err on the side of caution.
    """
    if start_date > end_date:
        message = "start_date must be on or before end_date"
        raise ValueError(message)

    holdings_by_date = {snap.date: snap for snap in holdings or ()}
    accounts_by_date = {snap.date: snap for snap in accounts or ()}
    cashflows_by_date = {snap.date: snap for snap in cashflows or ()}

    records: list[DailyWealthAggregate] = []
    cursor = start_date
    while cursor <= end_date:
        date_iso = cursor.isoformat()
        holdings_snap = holdings_by_date.get(date_iso)
        accounts_snap = accounts_by_date.get(date_iso)
        cashflow_snap = cashflows_by_date.get(date_iso)

        portfolio_wealth = holdings_snap.total_wealth_eur if holdings_snap else 0.0
        account_wealth = accounts_snap.account_wealth_eur if accounts_snap else 0.0
        dividends = cashflow_snap.dividends_eur if cashflow_snap else 0.0
        interest = cashflow_snap.interest_eur if cashflow_snap else 0.0
        inbound = cashflow_snap.inbound_transfers_eur if cashflow_snap else 0.0
        outbound = cashflow_snap.outbound_transfers_eur if cashflow_snap else 0.0
        fees = cashflow_snap.fees_eur if cashflow_snap else 0.0
        taxes = cashflow_snap.taxes_eur if cashflow_snap else 0.0

        invested_capital = holdings_snap.invested_capital_eur if holdings_snap else 0.0

        total_wealth = round(portfolio_wealth + account_wealth, 6)

        fx_ratios = []
        if holdings_snap:
            val = holdings_snap.fx_coverage_ratio
            if val is not None and 0 <= val <= 1:
                fx_ratios.append(val)
        if accounts_snap:
            val = accounts_snap.fx_coverage_ratio
            if val is not None and 0 <= val <= 1:
                fx_ratios.append(val)
        if cashflow_snap:
            val = cashflow_snap.fx_coverage_ratio
            if val is not None and 0 <= val <= 1:
                fx_ratios.append(val)
        fx_coverage_ratio = min(fx_ratios) if fx_ratios else 1.0

        price_coverage_ratio = 1.0
        if holdings_snap:
            val = holdings_snap.price_coverage_ratio
            if val is not None and 0 <= val <= 1:
                price_coverage_ratio = val

        stale_price = holdings_snap.stale_price if holdings_snap else False

        records.append(
            DailyWealthAggregate(
                date=date_iso,
                total_wealth_eur=total_wealth,
                portfolio_wealth_eur=portfolio_wealth,
                account_wealth_eur=account_wealth,
                dividends_eur=round(dividends, 6),
                interest_eur=round(interest, 6),
                inbound_transfers_eur=round(inbound, 6),
                outbound_transfers_eur=round(outbound, 6),
                invested_capital_eur=round(invested_capital, 6),
                performance_neutral_movements=round(
                    (
                        holdings_snap.performance_neutral_movements
                        if holdings_snap
                        else 0.0
                    )
                    - outbound,
                    6,
                ),
                fees_eur=round(fees, 6),
                taxes_eur=round(taxes, 6),
                fx_coverage_ratio=fx_coverage_ratio,
                price_coverage_ratio=price_coverage_ratio,
                stale_price=stale_price,
                provenance=provenance,
            )
        )

        cursor += timedelta(days=1)

    return records
