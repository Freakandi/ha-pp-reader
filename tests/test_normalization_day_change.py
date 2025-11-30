"""Tests for portfolio day-change aggregation."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from custom_components.pp_reader.data.db_access import SecurityMetricRecord
from custom_components.pp_reader.data import normalization_pipeline as nm


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
