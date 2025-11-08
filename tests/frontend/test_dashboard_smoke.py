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

    assert payload["footerGain"] == "50,00\u00a0€"
    assert "positive" in payload["footerGainHtml"], (
        "footer gain markup should signal positive gains"
    )
    assert payload["footerGainPct"] == "10,00 %"
    assert payload["footerGainSign"] == "positive"
    assert payload["flushApplied"] is True
    assert payload["positionsMarkupIncludesTable"] is True
    assert payload["positionsMarkupLength"] > 0
    assert payload["positionsMarkupHasPurchaseValue"] is True
    assert payload["pendingSizeBefore"] == 1
    assert payload["pendingSizeAfter"] == 0
    assert payload["detailsFound"] is True

    normalized_positions = payload["normalizedPositions"]
    assert isinstance(normalized_positions, list)
    assert len(normalized_positions) == 1

    first_normalized = normalized_positions[0]
    assert first_normalized["security_uuid"] == "sec-smoke"
    assert first_normalized["aggregation"]["total_holdings"] == 5
    assert first_normalized["aggregation"]["purchase_value_eur"] == 500
    assert first_normalized["average_cost"]["security"] == 100
    assert first_normalized["performance"]["gain_pct"] == 10
    assert first_normalized["coverage_ratio"] == 1
    assert first_normalized["metric_run_uuid"] == "run-normalization-smoke"
    assert first_normalized["provenance"] == "snapshot"

    diagnostics = payload["diagnostics"]
    assert diagnostics["ingestionAccounts"] == 1
    assert diagnostics["ingestionPortfolios"] == 1
    assert diagnostics["normalizationPositions"] == 1
