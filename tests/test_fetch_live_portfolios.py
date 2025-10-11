"""Tests for fetch_live_portfolios on a minimal SQLite dataset."""

import sqlite3
from pathlib import Path

import pytest

pytest.importorskip(
    "google.protobuf", reason="protobuf runtime required for module imports"
)

from custom_components.pp_reader.data.db_access import fetch_live_portfolios
from custom_components.pp_reader.data.db_init import initialize_database_schema


@pytest.fixture
def initialized_db(tmp_path: Path) -> Path:
    """Create a temporary database with the core schema for portfolio tests."""
    db_path = tmp_path / "portfolio.db"
    initialize_database_schema(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        portfolios = [
            ("p1", "Alpha Depot"),
            ("p2", "Beta Depot"),
            ("p3", "Gamma Depot"),  # no positions → expect zeros
        ]
        conn.executemany(
            "INSERT INTO portfolios (uuid, name) VALUES (?, ?)",
            portfolios,
        )

        securities = [
            ("p1", "s1", 5.0, 150_000_000, 175_000_000),
            # holdings 0 → not counted in position_count, sums remain unchanged
            ("p1", "s2", 0.0, 0, 0),
            ("p2", "s3", 10.0, 500_000_000, 620_000_000),
        ]
        conn.executemany(
            "INSERT INTO portfolio_securities (portfolio_uuid, security_uuid, current_holdings, purchase_value, current_value) "
            "VALUES (?, ?, ?, ?, ?)",
            securities,
        )
        conn.commit()
    finally:
        conn.close()

    return db_path


def test_fetch_live_portfolios_basic(initialized_db: Path) -> None:
    """fetch_live_portfolios aggregates sums and counts per portfolio."""
    result = fetch_live_portfolios(initialized_db)

    # Should return one entry per portfolio (ordered by name)
    assert len(result) == 3

    by_uuid = {entry["uuid"]: entry for entry in result}

    assert by_uuid["p1"]["current_value"] == 1_750_000.0
    assert by_uuid["p1"]["purchase_sum"] == 1_500_000.0
    assert by_uuid["p1"]["position_count"] == 1

    assert by_uuid["p2"]["current_value"] == 6_200_000.0
    assert by_uuid["p2"]["purchase_sum"] == 5_000_000.0
    assert by_uuid["p2"]["position_count"] == 1

    # Portfolio ohne Positionen → alle Werte 0
    assert by_uuid["p3"]["current_value"] == 0.0
    assert by_uuid["p3"]["purchase_sum"] == 0.0
    assert by_uuid["p3"]["position_count"] == 0

    expected_performance = {
        "p1": {"gain_abs": 250_000.0, "gain_pct": 16.67},
        "p2": {"gain_abs": 1_200_000.0, "gain_pct": 24.0},
        "p3": {"gain_abs": 0.0, "gain_pct": 0.0},
    }

    for uuid, expectations in expected_performance.items():
        entry = by_uuid[uuid]
        assert entry["gain_abs"] == pytest.approx(
            expectations["gain_abs"], rel=0, abs=1e-2
        )
        assert entry["gain_pct"] == pytest.approx(
            expectations["gain_pct"], rel=0, abs=1e-2
        )

        performance = entry["performance"]
        assert set(performance) == {
            "gain_abs",
            "gain_pct",
            "total_change_eur",
            "total_change_pct",
            "source",
            "coverage_ratio",
        }
        assert performance["gain_abs"] == pytest.approx(entry["gain_abs"], rel=0, abs=1e-6)
        assert performance["gain_pct"] == pytest.approx(entry["gain_pct"], rel=0, abs=1e-6)
        assert performance["total_change_eur"] == pytest.approx(
            entry["gain_abs"], rel=0, abs=1e-6
        )
        assert performance["total_change_pct"] == pytest.approx(
            entry["gain_pct"], rel=0, abs=1e-6
        )
        assert performance["coverage_ratio"] == pytest.approx(1.0)
        assert performance["source"] == "calculated"
