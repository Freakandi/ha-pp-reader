"""Tests for portfolio day-change aggregation."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from custom_components.pp_reader.data import normalization_pipeline as nm
from custom_components.pp_reader.data.db_access import Security, SecurityMetricRecord
from custom_components.pp_reader.data.db_init import initialize_database_schema


def test_portfolio_day_change_uses_eur_converted_prices(monkeypatch: object) -> None:
    """Day change aggregation should convert native price deltas to EUR."""

    # Use a simple FX map to convert raw price (scaled by 1e4) to EUR.
    def _normalize_price(raw: int | None, currency_code: str, *_args) -> float | None:
        if raw is None:
            return None
        fx = {"USD": 0.5, "EUR": 1.0}.get(currency_code.upper(), 1.0)
        return round(raw / 10000 * fx, 6)

    # Pretend the previous close was 1.0000 (raw=10000) in native terms.
    monkeypatch.setattr(
        nm,
        "fetch_previous_close",
        lambda *_args, **_kwargs: (0, 10000, 1.0),
    )
    monkeypatch.setattr(nm, "normalize_price_to_eur_sync", _normalize_price)

    record = SecurityMetricRecord(
        metric_run_uuid="run",
        portfolio_uuid="p1",
        security_uuid="s1",
        security_currency_code="USD",
        holdings_raw=int(10 * 10**8),  # 10 shares
        current_value_cents=2000,  # €20.00 current total
        purchase_value_cents=1500,
        last_price_native_raw=11000,  # 1.1000 native
    )

    result = nm._aggregate_portfolio_day_change(  # pylint: disable=protected-access
        [record],
        db_path=Path("irrelevant.db"),
        reference_date=datetime(2024, 1, 1, tzinfo=UTC),
    )

    day_change_value, day_change_pct, coverage = result["p1"]

    # Native delta is 0.1, but FX (0.5) means EUR delta per share is 0.05 -> total 0.5
    assert day_change_value == 0.5
    assert round(day_change_pct or 0, 2) == 2.56  # 0.5 / 19.5
    assert coverage == 1.0


def test_portfolio_day_change_uses_price_date_for_previous_close(
    tmp_path: Path,
) -> None:
    """Normalization should derive the comparison close from the stored price date."""
    db_path = tmp_path / "norm.db"
    initialize_database_schema(db_path)

    friday_ts = int(datetime(2025, 12, 5, 21, 0, 1, tzinfo=UTC).timestamp())

    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO securities (uuid, name, ticker_symbol, currency_code, retired, last_price, last_price_date)
            VALUES (?, ?, ?, ?, 0, ?, ?)
            """,
            ("sec1", "Sample", "SMP", "EUR", int(round(95.0 * 1e8)), friday_ts),
        )
        conn.executemany(
            "INSERT INTO historical_prices (security_uuid, date, close) VALUES (?, ?, ?)",
            [
                ("sec1", 20251205, int(round(95.0 * 1e8))),  # Friday close
                ("sec1", 20251204, int(round(90.0 * 1e8))),  # Thursday close
            ],
        )
        conn.commit()

    metric = SecurityMetricRecord(
        metric_run_uuid="run-weekend",
        portfolio_uuid="pf1",
        security_uuid="sec1",
        security_currency_code="EUR",
        holdings_raw=int(round(2.0 * 10**8)),
        current_value_cents=19_000,  # €190.00
        purchase_value_cents=18_000,
        purchase_security_value_raw=None,
        purchase_account_value_cents=None,
        gain_abs_cents=1_000,
        gain_pct=None,
        total_change_eur_cents=1_000,
        total_change_pct=None,
        source="metrics",
        coverage_ratio=1.0,
        day_change_native=None,
        day_change_eur=None,
        day_change_pct=None,
        day_change_source=None,
        day_change_coverage=None,
        last_price_native_raw=int(round(95.0 * 1e8)),
        last_close_native_raw=None,
        provenance=None,
    )

    aggregates = nm._aggregate_portfolio_day_change(  # type: ignore[attr-defined]
        [metric],
        db_path=db_path,
        reference_date=datetime(2025, 12, 6, tzinfo=UTC),
    )

    day_change_value, day_change_pct, coverage = aggregates["pf1"]

    assert day_change_value == pytest.approx(10.0)
    assert day_change_pct == pytest.approx(5.56, rel=0, abs=1e-2)
    assert coverage == pytest.approx(1.0)


def test_position_snapshot_carries_price_date(monkeypatch: object, tmp_path: Path):
    """Position snapshots should expose last_price_date for downstream consumers."""
    db_path = tmp_path / "positions.db"
    initialize_database_schema(db_path)

    price_ts = int(datetime(2025, 12, 5, 21, 0, 1, tzinfo=UTC).timestamp())

    metric = SecurityMetricRecord(
        metric_run_uuid="run-ts",
        portfolio_uuid="pf1",
        security_uuid="sec1",
        security_currency_code="EUR",
        holdings_raw=int(round(1.0 * 10**8)),
        current_value_cents=9_500,
        purchase_value_cents=9_000,
        purchase_security_value_raw=None,
        purchase_account_value_cents=None,
        gain_abs_cents=500,
        gain_pct=None,
        total_change_eur_cents=500,
        total_change_pct=None,
        source="metrics",
        coverage_ratio=1.0,
        day_change_native=None,
        day_change_eur=None,
        day_change_pct=None,
        day_change_source=None,
        day_change_coverage=None,
        last_price_native_raw=int(round(95.0 * 1e8)),
        last_close_native_raw=None,
        provenance=None,
    )

    securities = {"sec1": Security(uuid="sec1", name="Sample", currency_code="EUR")}

    # Avoid DB-backed FX lookups for this test.
    monkeypatch.setattr(nm, "normalize_price_to_eur_sync", lambda *args, **kwargs: 95.0)

    snapshots = tuple(
        nm._load_position_snapshots(  # type: ignore[attr-defined]
            db_path=db_path,
            portfolio_uuid="pf1",
            metric_rows=(metric,),
            securities=securities,
            reference_date=datetime(2025, 12, 6, tzinfo=UTC),
            price_dates={"sec1": price_ts},
        )
    )
    assert len(snapshots) == 1
    snapshot = snapshots[0]
    assert snapshot.last_price_date == price_ts

    serialized = nm.serialize_position_snapshot(snapshot)
    assert serialized["last_price_date"] == price_ts
