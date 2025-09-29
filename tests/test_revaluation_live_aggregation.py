"""Ensure revaluation events reuse live DB aggregation after price updates."""

import asyncio
import sqlite3
from pathlib import Path

import pytest

from custom_components.pp_reader.data.db_init import initialize_database_schema
from custom_components.pp_reader.prices.revaluation import revalue_after_price_updates


class StubHass:
    """Minimal Home Assistant stub exposing async_add_executor_job."""

    async def async_add_executor_job(self, func, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, func, *args)

    def async_create_background_task(
        self, coro, _task_name=None, *, eager_start: bool = False
    ):
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)


@pytest.mark.asyncio
async def test_revaluation_uses_live_portfolio_values(tmp_path: Path) -> None:
    """A price update should yield fresh portfolio aggregates in the event payload."""
    db_path = tmp_path / "portfolio.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            ("p1", "Alpha Depot"),
        )
        conn.execute(
            "INSERT INTO securities (uuid, name, currency_code) VALUES (?, ?, ?)",
            ("s1", "Equity One", "EUR"),
        )
        conn.execute(
            "INSERT INTO portfolio_securities (portfolio_uuid, security_uuid, current_holdings, purchase_value, current_value) "
            "VALUES (?, ?, ?, ?, ?)",
            ("p1", "s1", 10.0, 200_000, 250_000),
        )
        conn.commit()

        hass = StubHass()
        result = await revalue_after_price_updates(hass, conn, ["s1"])
    finally:
        conn.close()

    portfolio_values = result["portfolio_values"]
    assert portfolio_values is not None
    assert "p1" in portfolio_values
    assert portfolio_values["p1"]["value"] == 2500.0
    assert portfolio_values["p1"]["purchase_sum"] == 2000.0
    assert portfolio_values["p1"]["count"] == 1

    positions = result["portfolio_positions"]
    assert positions is not None
    assert "p1" in positions
    assert positions["p1"][0]["current_value"] == pytest.approx(2500.0)
    assert positions["p1"][0]["purchase_value"] == pytest.approx(2000.0)
    assert positions["p1"][0]["gain_abs"] == pytest.approx(500.0)
    assert positions["p1"][0]["gain_pct"] == pytest.approx(25.0)
