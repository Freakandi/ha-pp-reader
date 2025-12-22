"""Aggregation tests combining holdings, accounts, and cashflows."""

from __future__ import annotations

from datetime import date

from custom_components.pp_reader.backdating.accounts import (
    AccountValuation,
    DailyAccountSnapshot,
)
from custom_components.pp_reader.backdating.aggregate import build_daily_wealth_records
from custom_components.pp_reader.backdating.cashflows import DailyCashflowSnapshot
from custom_components.pp_reader.backdating.holdings import (
    DailyHoldingsSnapshot,
    HoldingValuation,
)


def test_aggregate_combines_components_and_coverage():
    holdings_snap = DailyHoldingsSnapshot(
        date="2024-01-02",
        holdings=[
            HoldingValuation(
                portfolio_uuid="p1",
                security_uuid="s1",
                currency="USD",
                shares=1.0,
                price_native=100.0,
                price_date="2024-01-02",
                price_eur=50.0,
                value_eur=50.0,
                purchase_value_eur=50.0,
                purchase_value_native=100.0,
                unrealized_price_gains_eur=0.0,
                fx_rate=2.0,
                stale_price=False,
            )
        ],
        price_coverage_ratio=1.0,
        fx_coverage_ratio=1.0,
        stale_price=False,
        total_wealth_eur=50.0,
        invested_capital_eur=50.0,
        realized_gains_eur=0.0,
        unrealized_price_gains_eur=0.0,
        realized_price_gains_eur=0.0,
        portfolio_realized_gains={},
        performance_neutral_movements=0.0,
    )
    accounts_snap = DailyAccountSnapshot(
        date="2024-01-02",
        accounts=[
            AccountValuation(
                account_uuid="acct-eur",
                currency="EUR",
                balance_native=100.0,
                fx_rate=1.0,
                balance_eur=100.0,
            )
        ],
        account_wealth_eur=100.0,
        fx_coverage_ratio=1.0,
    )
    cashflow_snap = DailyCashflowSnapshot(
        date="2024-01-02",
        dividends_eur=5.0,
        interest_eur=2.0,
        inbound_transfers_eur=3.0,
        outbound_transfers_eur=1.0,
        fees_eur=0.5,
        taxes_eur=0.2,
        fx_coverage_ratio=1.0,
    )

    records = build_daily_wealth_records(
        date(2024, 1, 2),
        date(2024, 1, 2),
        holdings=[holdings_snap],
        accounts=[accounts_snap],
        cashflows=[cashflow_snap],
        provenance="backdating-test",
    )

    record = records[0]
    assert record.date == "2024-01-02"
    assert record.total_wealth_eur == 150.0
    assert record.portfolio_wealth_eur == 50.0
    assert record.account_wealth_eur == 100.0
    assert record.dividends_eur == 5.0
    assert record.interest_eur == 2.0
    assert record.inbound_transfers_eur == 3.0
    assert record.outbound_transfers_eur == 1.0
    assert record.fees_eur == 0.5
    assert record.taxes_eur == 0.2
    assert record.fx_coverage_ratio == 1.0
    assert record.price_coverage_ratio == 1.0
    assert record.stale_price is False
    assert record.provenance == "backdating-test"


def test_aggregate_defaults_to_conservative_coverage():
    holdings_snap = DailyHoldingsSnapshot(
        date="2024-01-03",
        holdings=[
            HoldingValuation(
                portfolio_uuid="p1",
                security_uuid="s1",
                currency="USD",
                shares=1.0,
                price_native=None,
                price_date=None,
                price_eur=None,
                value_eur=None,
                purchase_value_eur=None,
                purchase_value_native=None,
                unrealized_price_gains_eur=None,
                fx_rate=None,
                stale_price=True,
            )
        ],
        price_coverage_ratio=0.0,
        fx_coverage_ratio=0.0,
        stale_price=True,
        total_wealth_eur=0.0,
        invested_capital_eur=0.0,
        realized_gains_eur=0.0,
        unrealized_price_gains_eur=0.0,
        realized_price_gains_eur=0.0,
        portfolio_realized_gains={},
        performance_neutral_movements=0.0,
    )
    accounts_snap = DailyAccountSnapshot(
        date="2024-01-03",
        accounts=[],
        account_wealth_eur=0.0,
        fx_coverage_ratio=1.0,
    )

    records = build_daily_wealth_records(
        date(2024, 1, 3),
        date(2024, 1, 3),
        holdings=[holdings_snap],
        accounts=[accounts_snap],
        cashflows=[],
    )

    record = records[0]
    assert record.fx_coverage_ratio == 0.0
    assert record.price_coverage_ratio == 0.0
    assert record.stale_price is True
    assert record.total_wealth_eur == 0.0
