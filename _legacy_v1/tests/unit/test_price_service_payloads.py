from __future__ import annotations

from custom_components.pp_reader.prices.price_service import (
    _compose_portfolio_payload_from_snapshots,
)


def test_compose_portfolio_payload_filters_snapshot_positions() -> None:
    """Snapshot positions/history must not bloat portfolio_values push payloads."""
    portfolio_uuid = "portfolio-1"
    pv_dict = {
        portfolio_uuid: {
            "uuid": portfolio_uuid,
            "name": "Live Portfolio",
            "current_value": 1234.56,
            "purchase_value": 1200.0,
            "position_count": 2,
            "performance": {"gain_abs": 34.56},
        }
    }
    snapshot_map = {
        portfolio_uuid: {
            "uuid": portfolio_uuid,
            "name": "Snapshot Name",
            "positions": [
                {"security_uuid": "sec-1", "price_history": [1, 2, 3]},
                {"security_uuid": "sec-2", "price_history": [4, 5, 6]},
            ],
            "coverage_ratio": 0.9,
            "provenance": "snapshot",
            "metric_run_uuid": "run-123",
            "generated_at": "2025-01-01T00:00:00Z",
            "data_state": {"status": "ok"},
        }
    }

    payload = _compose_portfolio_payload_from_snapshots(pv_dict, snapshot_map, None)

    assert len(payload) == 1
    entry = payload[0]
    # Data overrides snapshot defaults, heavy fields (positions/history) are stripped.
    assert entry["uuid"] == portfolio_uuid
    assert entry["name"] == "Live Portfolio"
    assert entry["current_value"] == 1234.56
    assert entry["purchase_value"] == 1200.0
    assert entry["purchase_sum"] == 1200.0
    assert entry["position_count"] == 2
    assert entry["performance"] == {"gain_abs": 34.56}
    assert "positions" not in entry
    assert "data_state" not in entry
    # Metadata from snapshots stays compact.
    assert entry["coverage_ratio"] == 0.9
    assert entry["provenance"] == "snapshot"
    assert entry["metric_run_uuid"] == "run-123"
    assert entry["generated_at"] == "2025-01-01T00:00:00Z"
