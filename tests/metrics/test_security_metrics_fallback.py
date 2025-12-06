from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from custom_components.pp_reader.metrics import securities


def test_security_metric_uses_precomputed_purchase_value(tmp_path: Path) -> None:
    """Use stored EUR purchase totals without downstream derivation."""
    db_path = tmp_path / "metrics.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        # Create a synthetic row matching the aggregation query.
        row = conn.execute(
            """
            SELECT
                ? AS portfolio_uuid,
                ? AS security_uuid,
                ? AS current_holdings,
                ? AS purchase_value,
                ? AS current_value,
                ? AS security_currency_total,
                ? AS account_currency_total,
                ? AS currency_code,
                ? AS last_price,
                ? AS last_price_date
            """,
            (
                "p-1",
                "s-1",
                100,  # holdings_raw
                12_34,  # purchase_value (EUR cents) precomputed
                50_000,  # current_value cents
                0.0,
                1234.56,  # account currency total
                "HKD",
                None,
                None,
            ),
        ).fetchone()

        assert row is not None

        record = securities._build_security_metric_record(  # type: ignore[attr-defined]
            row=row,
            run_uuid="run-1",
            db_path=db_path,
            reference_date=datetime.now(UTC),
            conn=conn,
        )

        assert record is not None
        assert record.purchase_value_cents == 1234
    finally:
        conn.close()
