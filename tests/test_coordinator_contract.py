from __future__ import annotations

import pytest

from custom_components.pp_reader.data.coordinator import _portfolio_contract_entry


def _build_entry(
    *,
    uuid: str = "pf-1",
    current_value: float = 200.0,
    purchase_sum: float = 150.0,
    position_count: int = 1,
    performance: dict[str, object] | None = None,
    name: str = "Alpha Portfolio",
) -> dict[str, object]:
    entry: dict[str, object] = {
        "uuid": uuid,
        "name": name,
        "current_value": current_value,
        "purchase_sum": purchase_sum,
        "position_count": position_count,
    }
    if performance is not None:
        entry["performance"] = performance
    return entry


def test_portfolio_contract_entry_preserves_precision_overrides() -> None:
    """Custom performance overrides should remain untouched in the payload."""

    override = {
        "gain_abs": "12.3456",
        "gain_pct": "3.210987",
        "day_change": {},
    }
    normalized = _portfolio_contract_entry(
        _build_entry(performance=override)
    )
    assert normalized is not None
    _, payload = normalized

    assert "gain_abs" not in payload
    assert "gain_pct" not in payload
    performance_payload = payload["performance"]
    assert isinstance(performance_payload, dict)
    assert performance_payload["gain_abs"] == override["gain_abs"]
    assert performance_payload["gain_pct"] == override["gain_pct"]


def test_portfolio_contract_entry_falls_back_to_calculated_metrics() -> None:
    """Invalid overrides should fall back to the calculated performance metrics."""

    normalized = _portfolio_contract_entry(
        _build_entry(performance={"gain_abs": object(), "gain_pct": None})
    )
    assert normalized is not None
    _, payload = normalized

    assert "gain_abs" not in payload
    assert "gain_pct" not in payload
    performance_payload = payload["performance"]
    assert pytest.approx(performance_payload["gain_abs"]) == 50.0
    assert pytest.approx(performance_payload["gain_pct"], rel=0, abs=1e-2) == 33.33
