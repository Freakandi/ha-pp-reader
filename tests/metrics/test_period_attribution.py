"""Test the period attribution logic in the PerformanceEngine."""

import sqlite3
from dataclasses import asdict
from datetime import UTC, date, datetime
from unittest.mock import MagicMock

import pandas as pd
import pytest

from custom_components.pp_reader.const import TransactionType
from custom_components.pp_reader.data.db_access import Transaction
from custom_components.pp_reader.metrics.calculator import PerformanceEngine
from custom_components.pp_reader.metrics.core.market_resolver import MarketResolver


@pytest.fixture
def mock_db_connection():
    """Fixture for an in-memory SQLite connection."""
    return MagicMock(spec=sqlite3.Connection)


@pytest.fixture
def mock_market_resolver():
    """Fixture for a mocked MarketResolver."""
    resolver = MagicMock(spec=MarketResolver)

    def get_price(sec_uuid, ts):
        if sec_uuid != "aapl_uuid":
            return 1.0
        dt = ts if isinstance(ts, datetime) else ts.to_pydatetime()
        d = dt.date()
        if d <= date(2022, 12, 31):
            return 150.0
        if d <= date(2023, 1, 15):
            return 155.0
        if d <= date(2023, 1, 31):
            return 160.0
        return 1.0

    def get_fx(currency, ts):
        if currency == "EUR":
            return 1.0
        if currency != "USD":
            return 1.0
        dt = ts if isinstance(ts, datetime) else ts.to_pydatetime()
        d = dt.date()
        if d <= date(2022, 12, 31):
            return 1.10
        if d <= date(2023, 1, 15):
            return 1.08
        if d <= date(2023, 1, 20):
            return 1.09
        if d <= date(2023, 1, 31):
            return 1.12
        return 1.0

    resolver.get_price.side_effect = get_price
    resolver.get_fx.side_effect = get_fx
    resolver.get_security_currency.return_value = "USD"
    return resolver


def test_period_attribution_invariant(mock_db_connection, mock_market_resolver):
    """
    Tests that (End Wealth - Start Wealth - Net Flows) == Sum of Components.
    """
    conn = mock_db_connection
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 31)

    txs = [
        Transaction(
            uuid="tx1",
            type=TransactionType.BUY,
            date=datetime(2022, 10, 1, tzinfo=UTC),
            account="acc_usd",
            security="aapl_uuid",
            shares=100_00000000,
            amount=14000_00,
            currency_code="USD",
            other_account=None,
            portfolio=None,
            other_portfolio=None,
            fees=0,
            taxes=0,
        ),
        Transaction(
            uuid="tx2",
            type=TransactionType.DEPOSIT,
            date=datetime(2022, 10, 1, tzinfo=UTC),
            account="acc_usd",
            security=None,
            shares=0,
            amount=1000_00,
            currency_code="USD",
            other_account=None,
            portfolio=None,
            other_portfolio=None,
            fees=0,
            taxes=0,
        ),
        Transaction(
            uuid="tx3",
            type=TransactionType.SELL,
            date=datetime(2023, 1, 15, tzinfo=UTC),
            account="acc_usd",
            security="aapl_uuid",
            shares=20_00000000,
            amount=3100_00,
            currency_code="USD",
            other_account=None,
            portfolio=None,
            other_portfolio=None,
            fees=0,
            taxes=0,
        ),
        Transaction(
            uuid="tx4",
            type=TransactionType.DIVIDEND,
            date=datetime(2023, 1, 20, tzinfo=UTC),
            account="acc_usd",
            security="aapl_uuid",
            shares=0,
            amount=10_00,
            currency_code="USD",
            other_account=None,
            portfolio=None,
            other_portfolio=None,
            fees=0,
            taxes=0,
        ),
        Transaction(
            uuid="tx5",
            type=TransactionType.FEE,
            date=datetime(2023, 1, 25, tzinfo=UTC),
            account="acc_usd",
            security=None,
            shares=0,
            amount=5_00,
            currency_code="USD",
            other_account=None,
            portfolio=None,
            other_portfolio=None,
            fees=0,
            taxes=0,
        ),
    ]

    engine = PerformanceEngine(conn, mock_market_resolver)

    df_txs = pd.DataFrame([asdict(t) for t in txs])
    df_txs["date"] = pd.to_datetime(df_txs["date"])
    df_txs["shares_norm"] = df_txs["shares"] / 1e8
    df_txs["amount_norm"] = df_txs["amount"] / 100.0
    engine._df_txs = df_txs
    engine._account_currencies = {"acc_usd": "USD"}

    def mock_get_txs_up_to(snapshot_date: date):
        return [tx for tx in txs if tx.date.date() <= snapshot_date]

    engine._get_transactions_up_to = MagicMock(side_effect=mock_get_txs_up_to)

    metrics = engine.calculate_period_performance(start_date, end_date)

    # Expected values based on correct attribution logic
    # System Delta = End Wealth (2593.75) - Start Wealth (1818.18) - Net Flows (0) = 775.57 EUR
    assert metrics.absolute_performance == pytest.approx(775.57, abs=0.01)

    # Realized Gain: 20sh * (Sale:155/1.08 - MTM Cost:150/1.10) = 20 * (143.52 - 136.36) = 143.2 EUR
    assert metrics.realized_gains == pytest.approx(143.1, abs=0.01)

    # Unrealized Gain: (80sh*160/1.12) - (80sh*150/1.10) = 11428.57 - 10909.09 = 519.48 EUR
    assert metrics.unrealized_gains == pytest.approx(519.48, abs=0.01)

    # FX Gain on Cash = (End Val - Start Val) - Net Flows
    # (-9895/1.12 - (-13000/1.10)) - (3100/1.08 + 10/1.09 - 5/1.12) = 108.28 EUR
    assert metrics.fx_gains_cash == pytest.approx(108.28, abs=0.01)

    # Invariant Check: Abs Perf should equal Sum of Components
    dividends = 10 / 1.09
    fees = 5 / 1.12
    sum_components = (
        metrics.realized_gains
        + metrics.unrealized_gains
        + metrics.fx_gains_cash
        + dividends
        - fees
    )
    assert metrics.absolute_performance == pytest.approx(sum_components, abs=0.01)
