"""Integration tests for coverage propagation and stale price flags in daily wealth."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from custom_components.pp_reader.data import websocket as websocket_module
from custom_components.pp_reader.metrics.pipeline import (
    async_refresh_all_with_backdating,
)
from tests.metrics.helpers import seed_metrics_database  # noqa: F401

# Re-use pytest fixtures
pytestmark = pytest.mark.asyncio

DOMAIN = websocket_module.DOMAIN
WS_GET_DAILY_WEALTH = getattr(
    websocket_module.ws_get_daily_wealth,
    "__wrapped__",
    websocket_module.ws_get_daily_wealth,
)


class StubHass:
    """Minimal Home Assistant stub."""

    def __init__(self, entry_id: str, db_path: Path) -> None:
        self.data = {DOMAIN: {entry_id: {"db_path": str(db_path)}}}
        self.loop = None

    async def async_add_executor_job(self, func, *args):
        """Simulate executor job."""
        return func(*args)

    class Bus:
        """Stub for hass.bus."""

        @staticmethod
        def async_fire(*args, **kwargs) -> None:
            """Stub for async_fire."""


class StubConnection:
    """Capture websocket responses."""

    def __init__(self) -> None:
        self.sent: list[tuple[int | None, dict[str, Any]]] = []
        self.errors: list[tuple[int | None, str, str]] = []

    def send_result(self, msg_id: int | None, payload: dict[str, Any]) -> None:
        self.sent.append((msg_id, payload))

    def send_error(self, msg_id: int | None, code: str, message: str) -> None:
        self.errors.append((msg_id, code, message))


async def test_coverage_and_stale_flags_propagation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """
    Verify fx/price coverage ratios and stale flags propagate to API responses.

    Scenario:
    - Date: 2024-01-10
    - Portfolio Holdings:
        1. SEC-EUR (EUR): 10 shares. Price available (Jan 10). FX=1.0.
           -> Price Covered, FX Covered.
        2. SEC-USD (USD): 10 shares. Price available (Jan 05 -> STALE). NO FX for Jan 10.
           -> Price Covered (Stale), FX NOT Covered.
        3. SEC-GBP (GBP): 10 shares. NO Price. FX available (Jan 10).
           -> Price NOT Covered, FX Covered.
    - Accounts:
        1. ACCT-EUR (EUR): Balance 1000.
           -> FX Covered.
        2. ACCT-JPY (JPY): Balance 1000. NO FX for Jan 10.
           -> FX NOT Covered.

    Expected Ratios (Holdings):
        - Price Coverage: 2/3 covered (EUR, USD). GBP missing. -> 0.667
        - FX Coverage: 2/3 covered (EUR, GBP). USD missing. -> 0.667
        - Stale Price: True (USD is stale).

    Expected Ratios (Accounts):
        - FX Coverage: 1/2 covered (EUR). JPY missing. -> 0.500

    Expected Consolidated:
        - Price Coverage: 0.667
        - FX Coverage: min(0.667, 0.500) -> 0.500
        - Stale Price: True
    """
    entry_id = "test-coverage-prop"
    db_path = tmp_path / "coverage.db"

    # 1. Setup DB Schema
    from custom_components.pp_reader.data.db_init import initialize_database_schema

    initialize_database_schema(db_path)
    hass = StubHass(entry_id, db_path)

    import sqlite3

    with sqlite3.connect(str(db_path)) as conn:
        # Accounts
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("acct-eur", "EUR Account", "EUR"),
        )
        conn.execute(
            "INSERT INTO accounts (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("acct-jpy", "JPY Account", "JPY"),
        )

        # Portfolio
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("pf-main", "Main Portfolio"),
        )

        # Securities
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code, retired) VALUES (?, ?, ?, 0)",
            ("sec-eur", "Security EUR", "EUR"),
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code, retired) VALUES (?, ?, ?, 0)",
            ("sec-usd", "Security USD", "USD"),
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code, retired) VALUES (?, ?, ?, 0)",
            ("sec-gbp", "Security GBP", "GBP"),
        )

        # Transactions (Buy on Jan 01)
        # Type 0 = Buy
        for sec_uuid in ["sec-eur", "sec-usd", "sec-gbp"]:
            conn.execute(
                """
                INSERT INTO transactions (
                    uuid, type, date, currency_code, amount, shares,
                    account, portfolio, security, updated_at
                ) VALUES (?, 0, '2024-01-01T10:00:00Z', 'EUR', 1000, 1000000000, 'acct-eur', 'pf-main', ?, ?)
                """,
                (f"tx-{sec_uuid}", sec_uuid, "2024-01-01T10:00:00Z"),
            )

        # Account Balances (via deposits/adjustments)
        # Let's just assume initial balance or add transactions?
        # The aggregation uses transaction history.
        # Deposit to EUR account
        conn.execute(
            """
            INSERT INTO transactions (
                uuid, type, date, currency_code, amount, shares,
                account, updated_at
            ) VALUES ('tx-dep-eur', 6, '2024-01-01T10:00:00Z', 'EUR', 100000, 0, 'acct-eur', '2024-01-01T10:00:00Z')
            """
        )  # 1000 EUR
        # Deposit to JPY account
        conn.execute(
            """
            INSERT INTO transactions (
                uuid, type, date, currency_code, amount, shares,
                account, updated_at
            ) VALUES ('tx-dep-jpy', 6, '2024-01-01T10:00:00Z', 'JPY', 100000, 0, 'acct-jpy', '2024-01-01T10:00:00Z')
            """
        )  # 1000 JPY

        # Prices
        # SEC-EUR: Price for Jan 10
        conn.execute(
            "INSERT INTO historical_prices (security_uuid, date, close) VALUES (?, ?, ?)",
            ("sec-eur", "2024-01-10", 100000000),
        )  # 1.00
        # SEC-USD: Price for Jan 05 (Stale by 5 days)
        conn.execute(
            "INSERT INTO historical_prices (security_uuid, date, close) VALUES (?, ?, ?)",
            ("sec-usd", "2024-01-05", 100000000),
        )  # 1.00
        # SEC-GBP: NO Price

        # FX Rates
        # Target Date: 2024-01-10
        # GBP: Available
        conn.execute(
            "INSERT INTO fx_rates (date, currency, rate) VALUES (?, ?, ?)",
            ("2024-01-10", "GBP", 85000000),
        )  # 0.85
        # USD: Missing
        # JPY: Missing

        conn.commit()

    # 2. Run Backdating Pipeline
    # We must mock `fx_module.async_prepare_exchange_rates_for_backdating` or ensure it doesn't auto-fetch online
    # The `seed_metrics_database` might setup some things, but our db is freshish.
    # The pipeline calls `fx_module.async_prepare_exchange_rates_for_backdating`.
    # We want it to use DB only, or return what's there.
    # If we don't mock it, it might try to fetch from frankfurter API if not found.
    # We should mock `async_download_rates` inside it to do nothing.

    with monkeypatch.context() as m:
        m.setattr(
            "custom_components.pp_reader.currencies.fx._fetch_exchange_rates",
            lambda *args, **kwargs: {},  # Return empty dict for missing rates
        )

        pipeline_result = await async_refresh_all_with_backdating(
            hass,  # type: ignore[arg-type]
            db_path,
            trigger="test",
        )

    assert pipeline_result.metric_run.status == "completed"

    # 3. Query API for 2024-01-10
    connection = StubConnection()
    await WS_GET_DAILY_WEALTH(
        hass,  # type: ignore[arg-type]
        connection,
        {
            "id": 1,
            "type": "pp_reader/get_daily_wealth",
            "entry_id": entry_id,
            "range": {
                "start": "2024-01-10",
                "end": "2024-01-10",
            },
            "include_slices": True,
        },
    )

    assert not connection.errors
    payload = connection.sent[0][1]
    records = payload["records"]
    assert len(records) == 1
    record = records[0]

    # 4. Assert Coverage
    assert record["date"] == "2024-01-10"

    # Price Coverage: 2 out of 3 securities have prices (EUR, USD-stale). GBP missing.
    # Ratio = 2/3 ~= 0.667
    assert record["price_coverage_ratio"] == pytest.approx(0.667, abs=0.001)

    # FX Coverage:
    # Holdings: EUR (ok), GBP (ok), USD (missing). 2/3 = 0.667
    # Accounts: EUR (ok), JPY (missing). 1/2 = 0.5
    # Overall: min(0.667, 0.5) = 0.5
    assert record["fx_coverage_ratio"] == pytest.approx(0.5, abs=0.001)

    # Stale Price:
    # SEC-USD price is from Jan 05, target is Jan 10. Should be stale.
    assert record["stale_price"] is True
