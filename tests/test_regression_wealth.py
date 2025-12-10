"""Regression tests for wealth calculation backward compatibility."""

import sqlite3
from datetime import date

import pytest

from custom_components.pp_reader.metrics.pipeline import (
    async_refresh_all,
    async_refresh_all_with_backdating,
)
from tests.metrics.helpers import install_fx_stubs, seed_metrics_database


@pytest.fixture
def regression_db(tmp_path):
    """Create a database with standard metrics data plus transactions for backdating."""
    db_path = tmp_path / "regression.db"
    seed_metrics_database(db_path)

    # Inject transactions to ensure backdating finds a valid window
    # We need transactions for the `sec-usd` or similar to trigger meaningful backdating logic
    # although simpler is better: just ensure a transaction exists.
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            INSERT INTO transactions (uuid, date, type, security, portfolio)
            VALUES ('tx-001', '2024-01-01T12:00:00', 0, 'sec-eur', 'portfolio-main')
            """
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


@pytest.mark.asyncio
async def test_backdating_preserves_current_wealth(hass, regression_db, monkeypatch):
    """Ensure that running the backdating pipeline does not alter the current wealth metrics."""
    install_fx_stubs(monkeypatch)

    # Step 1: Run standard metrics pipeline (current state only)
    run_standard = await async_refresh_all(hass, regression_db, trigger="test_standard")

    # Capture the specific metric result we care about (e.g., portfolio-main)
    conn = sqlite3.connect(str(regression_db))
    conn.row_factory = sqlite3.Row
    row_std = conn.execute(
        "SELECT * FROM portfolio_metrics WHERE metric_run_uuid = ? AND portfolio_uuid = 'portfolio-main'",
        (run_standard.run_uuid,),
    ).fetchone()
    conn.close()

    assert row_std is not None
    std_current_value = row_std["current_value_cents"]
    std_gain_abs = row_std["gain_abs_cents"]

    # Step 2: Run combined pipeline (metrics + backdating)
    # We pretend this is a later run or a triggered rebuild
    result_combined = await async_refresh_all_with_backdating(
        hass,
        regression_db,
        trigger="test_backdating",
        backdating_today=date(2024, 1, 5),
    )
    run_combined = result_combined.metric_run

    conn = sqlite3.connect(str(regression_db))
    conn.row_factory = sqlite3.Row
    row_comb = conn.execute(
        "SELECT * FROM portfolio_metrics WHERE metric_run_uuid = ? AND portfolio_uuid = 'portfolio-main'",
        (run_combined.run_uuid,),
    ).fetchone()

    # Verify backdating actually happened
    # The `daily_wealth` table should be populated for the window [2024-01-01, 2024-01-05]
    daily_rows = conn.execute("SELECT COUNT(*) as cnt FROM daily_wealth").fetchone()
    conn.close()

    assert row_comb is not None
    comb_current_value = row_comb["current_value_cents"]
    comb_gain_abs = row_comb["gain_abs_cents"]

    # Step 3: Assert identity
    assert std_current_value == comb_current_value, (
        "Current value changed after backdating pipeline!"
    )
    assert std_gain_abs == comb_gain_abs, "Gain changed after backdating pipeline!"

    # Step 4: Assert backdating occurred
    # We expect some rows. The pipeline produces one row per day per scope.
    # Window is approx 5 days.
    assert daily_rows["cnt"] > 0, (
        "Backdating pipeline did not populate daily_wealth table"
    )
    assert result_combined.backdating.status == "completed"
