"""Smoke tests for the bundled dashboard helpers."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


def test_dashboard_bundle_smoke() -> None:
    """Ensure key DOM helpers from the bundled dashboard behave as expected."""
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "frontend" / "dashboard_smoke.mjs"

    result = subprocess.run(
        ["node", str(script_path)],
        check=True,
        capture_output=True,
        text=True,
    )

    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert lines, "node script produced no output"

    payload = json.loads(lines[-1])

    assert payload["footerGain"] == "1.500,00\u00a0€"
    assert "positive" in payload["footerGainHtml"], "footer gain markup should signal positive gains"
    assert payload["footerGainPct"] in ("", "0,00 %", "—"), "zero purchase should yield neutral gain pct"
    assert payload["footerGainSign"] in ("", "positive", "neutral")
    assert payload["flushApplied"] is True
    assert payload["positionsMarkupIncludesTable"] is True
    assert payload["positionsMarkupLength"] > 0
    assert payload["positionsMarkupHasPurchaseValue"] is True
    assert payload["pendingSizeBefore"] == 1
    assert payload["pendingSizeAfter"] == 0
    assert payload["detailsFound"] is True

    normalized_positions = payload["normalizedPositions"]
    assert isinstance(normalized_positions, list)
    assert len(normalized_positions) >= 2

    first_normalized = normalized_positions[0]
    assert first_normalized["aggregation"]["total_holdings"] == 0
    assert first_normalized["aggregation"]["purchase_value_eur"] == 3400
    assert first_normalized["aggregation"]["purchase_total_security"] == 3500.25
    assert first_normalized["aggregation"]["avg_price_account"] == 13.37
    assert "avg_price_security" not in first_normalized["aggregation"]
    assert first_normalized["average_cost"]["native"] is None
    assert first_normalized["average_cost"]["security"] == 45.67
    assert first_normalized["average_cost"]["eur"] is None
    assert first_normalized["average_cost"]["source"] == "aggregation"
    assert first_normalized["average_cost"]["coverage_ratio"] is None
    assert first_normalized["performance"] is None

    second_normalized = normalized_positions[1]
    assert second_normalized["aggregation"] is None
    assert second_normalized["average_cost"] is None
    assert second_normalized["performance"] is None
