"""Persistence tests for backdating daily wealth storage."""

from __future__ import annotations

import pytest

from custom_components.pp_reader.backdating.accounts import (
    AccountValuation,
    DailyAccountSnapshot,
)
from custom_components.pp_reader.backdating.aggregate import DailyWealthAggregate
from custom_components.pp_reader.backdating.holdings import (
    DailyHoldingsSnapshot,
    HoldingValuation,
)
from custom_components.pp_reader.backdating.persist import persist_daily_wealth
from custom_components.pp_reader.data.db_access import (
    fetch_daily_wealth,
    fetch_daily_wealth_scopes,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.mark.asyncio
async def test_persist_daily_wealth_and_scopes(tmp_path):
    """Aggregates should be written with upsert semantics for totals and scopes."""
    db_path = tmp_path / "persist.db"
    initialize_database_schema(db_path)

    aggregates = [
        DailyWealthAggregate(
            date="2024-01-02",
            total_wealth_eur=150.0,
            portfolio_wealth_eur=50.0,
            account_wealth_eur=100.0,
            dividends_eur=5.0,
            interest_eur=2.0,
            inbound_transfers_eur=1.0,
            outbound_transfers_eur=0.5,
            performance_neutral_movements=0.0,
            fees_eur=0.2,
            taxes_eur=0.1,
            fx_coverage_ratio=0.9,
            price_coverage_ratio=0.8,
            stale_price=False,
            provenance="backdating-test",
        )
    ]
    holdings = [
        DailyHoldingsSnapshot(
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
                    fx_rate=2.0,
                    stale_price=False,
                )
            ],
            price_coverage_ratio=1.0,
            fx_coverage_ratio=1.0,
            stale_price=False,
            total_wealth_eur=50.0,
        )
    ]
    accounts = [
        DailyAccountSnapshot(
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
    ]

    persist_daily_wealth(
        db_path,
        aggregates,
        holdings_snapshots=holdings,
        account_snapshots=accounts,
        provenance="backdating-test",
    )

    totals = fetch_daily_wealth(db_path)
    assert len(totals) == 1
    assert totals[0].total_wealth_eur == 150.0
    assert totals[0].price_coverage_ratio == 0.8
    assert totals[0].fx_coverage_ratio == 0.9
    assert totals[0].provenance == "backdating-test"

    scopes = fetch_daily_wealth_scopes(db_path)
    assert len(scopes) == 2
    portfolio_scope = next(scope for scope in scopes if scope.scope_type == "portfolio")
    account_scope = next(scope for scope in scopes if scope.scope_type == "account")
    assert portfolio_scope.total_wealth_eur == 50.0
    assert account_scope.total_wealth_eur == 100.0
    assert portfolio_scope.price_coverage_ratio == 1.0
    assert portfolio_scope.fx_coverage_ratio == 1.0
