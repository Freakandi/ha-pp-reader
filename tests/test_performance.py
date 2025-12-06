"""Unit tests for performance metric helpers."""

from __future__ import annotations

import pytest

from custom_components.pp_reader.metrics.common import (
    DayChangeMetrics,
    PerformanceMetrics,
    select_performance_metrics,
)


def test_select_performance_metrics_with_full_inputs() -> None:
    """Helper should return rounded gain and day-change metrics when all inputs are present."""
    performance, day_change = select_performance_metrics(
        current_value=1234.567,
        purchase_value=1000.432,
        holdings=10,
        last_price_native=12.34,
        last_close_native=12.0,
        fx_rate=1.1,
    )

    assert isinstance(performance, PerformanceMetrics)
    assert performance.gain_abs == pytest.approx(234.13)
    assert performance.gain_pct == pytest.approx(23.40)
    assert performance.total_change_eur == pytest.approx(234.13)
    assert performance.total_change_pct == pytest.approx(23.40)
    assert performance.source == "calculated"
    assert performance.coverage_ratio == pytest.approx(1.0)

    assert isinstance(day_change, DayChangeMetrics)
    assert day_change.price_change_native == pytest.approx(0.34)
    assert day_change.price_change_eur == pytest.approx(0.3091)
    assert day_change.change_pct == pytest.approx(2.83)
    assert day_change.source == "native"
    assert day_change.coverage_ratio == pytest.approx(1.0)


def test_select_performance_metrics_handles_missing_values() -> None:
    """Missing values should fall back to defaults and report limited coverage."""
    performance, day_change = select_performance_metrics(
        current_value=None,
        purchase_value=None,
        holdings=None,
        last_price_native=None,
        last_close_native=None,
        fx_rate=None,
    )

    assert performance.gain_abs == pytest.approx(0.0)
    assert performance.gain_pct == pytest.approx(0.0)
    assert performance.total_change_eur == pytest.approx(0.0)
    assert performance.total_change_pct == pytest.approx(0.0)
    assert performance.source == "defaulted"
    assert performance.coverage_ratio == pytest.approx(0.0)

    assert day_change.price_change_native is None
    assert day_change.price_change_eur is None
    assert day_change.change_pct is None
    assert day_change.source == "unavailable"
    assert day_change.coverage_ratio == pytest.approx(0.0)


def test_select_performance_metrics_partial_inputs_track_coverage() -> None:
    """Partial inputs should yield calculated metrics with proportional coverage ratios."""
    performance, day_change = select_performance_metrics(
        current_value="500.25",
        purchase_value="400.15",
        holdings=None,
        last_price_native=9.75,
        last_close_native=9.5,
        fx_rate=None,
    )

    assert performance.gain_abs == pytest.approx(100.1)
    assert performance.gain_pct == pytest.approx(25.02)
    assert performance.total_change_eur == pytest.approx(100.1)
    assert performance.total_change_pct == pytest.approx(25.02)
    assert performance.source == "calculated"
    assert performance.coverage_ratio == pytest.approx(0.6667)

    assert day_change.price_change_native == pytest.approx(0.25)
    assert day_change.price_change_eur is None
    assert day_change.change_pct == pytest.approx(2.63)
    assert day_change.source == "native"
    assert day_change.coverage_ratio == pytest.approx(1.0)


def test_select_performance_metrics_fx_based_day_deltas() -> None:
    """FX rates should convert native day changes into EUR and retain native-based percentages."""
    performance, day_change = select_performance_metrics(
        current_value=2000,
        purchase_value=1500,
        holdings=5,
        last_price_native=101.2345,
        last_close_native=100.0,
        fx_rate=1.2345,
    )

    assert performance.gain_abs == pytest.approx(500.0)
    assert performance.gain_pct == pytest.approx(33.33)
    assert performance.total_change_eur == pytest.approx(500.0)
    assert performance.total_change_pct == pytest.approx(33.33)
    assert performance.coverage_ratio == pytest.approx(1.0)

    assert day_change.price_change_native == pytest.approx(1.2345)
    assert day_change.price_change_eur == pytest.approx(1.0)
    assert day_change.change_pct == pytest.approx(1.23)
    assert day_change.source == "native"
    assert day_change.coverage_ratio == pytest.approx(1.0)
