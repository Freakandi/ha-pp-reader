"""Legacy facade for performance helpers (migrated to metrics.common)."""

from __future__ import annotations

from custom_components.pp_reader.metrics.common import (
    DayChangeMetrics,
    PerformanceMetrics,
    compose_performance_payload,
    select_performance_metrics,
)

__all__ = [
    "DayChangeMetrics",
    "PerformanceMetrics",
    "compose_performance_payload",
    "select_performance_metrics",
]
