"""Regression harness that drives the Node-based jsdom simulation for gain updates."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


def test_portfolio_update_gain_abs_handles_zero_purchase() -> None:
    """ensure websocket updates keep gain when purchase_sum is zero."""
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "frontend" / "portfolio_update_gain_abs.mjs"
    result = subprocess.run(
        ["node", str(script_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert lines, "node script produced no output"
    data = json.loads(lines[-1])

    assert data["footerGain"] == "1.500,00\u00a0€"
    assert "positive" in data["footerGainHtml"]
    assert data["footerGainPct"] in ("", "0,00 %", "—")
