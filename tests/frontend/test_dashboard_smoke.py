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
    assert payload["footerGainPct"] in ("", "0,00 %"), "zero purchase should yield neutral gain pct"
    assert payload["footerGainSign"] in ("", "positive")
    assert payload["flushApplied"] is True
    assert payload["positionsMarkupIncludesTable"] is True
    assert payload["positionsMarkupLength"] > 0
    assert payload["pendingSizeBefore"] == 1
    assert payload["pendingSizeAfter"] == 0
    assert payload["detailsFound"] is True
