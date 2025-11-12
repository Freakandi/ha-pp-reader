"""Generate canonical smoketest fixtures for backend/frontend contract tests."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sqlite3
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

try:
    from custom_components.pp_reader.data import normalization_pipeline
    from custom_components.pp_reader.data.db_init import initialize_database_schema
    from custom_components.pp_reader.metrics import storage as metrics_storage
    from scripts import enrichment_smoketest as smoketest
    from tests.integration import test_normalization_smoketest as normalization_test
    from tests.metrics.helpers import install_fx_stubs
except ModuleNotFoundError:  # pragma: no cover
    _project_root = Path(__file__).resolve().parents[1]
    if str(_project_root) not in sys.path:
        sys.path.insert(0, str(_project_root))
    from custom_components.pp_reader.data import normalization_pipeline
    from custom_components.pp_reader.data.db_init import initialize_database_schema
    from custom_components.pp_reader.metrics import storage as metrics_storage
    from scripts import enrichment_smoketest as smoketest
    from tests.integration import test_normalization_smoketest as normalization_test
    from tests.metrics.helpers import install_fx_stubs
else:
    _project_root = Path(__file__).resolve().parents[1]

PROJECT_ROOT = _project_root
LOGGER = logging.getLogger(__name__)
FIXTURES_DIR = PROJECT_ROOT / "tests" / "dashboard" / "fixtures"
DEFAULT_NORMALIZATION_PATH = FIXTURES_DIR / "normalization_smoketest_snapshot.json"
DEFAULT_DIAGNOSTICS_PATH = FIXTURES_DIR / "diagnostics_smoketest.json"

NORMALIZATION_TIMESTAMP = "2024-01-11T10:00:00Z"
METRIC_RUN_UUID = "run-normalization-smoke"
METRIC_RUN_STARTED = "2024-01-11T09:55:00Z"
METRIC_RUN_FINISHED = "2024-01-11T09:55:05Z"
FX_RATE = 1.05
PORTFOLIO_UUID = "port-smoke"
ACCOUNT_UUID = "acc-smoke"
SECURITY_UUID = "sec-smoke"
PURCHASE_VALUE_EUR = 500.0
CURRENT_VALUE_EUR = 550.0
GAIN_ABS_EUR = CURRENT_VALUE_EUR - PURCHASE_VALUE_EUR
GAIN_PCT = 10.0
DAY_CHANGE_NATIVE = 0.5
DAY_CHANGE_EUR = 0.45
DAY_CHANGE_PCT = 0.95
LAST_PRICE_NATIVE = 110.0
LAST_CLOSE_NATIVE = 109.0
HOLDINGS = 5.0
AVERAGE_COST = 100.0


class _StaticUuid:
    """Simple helper mirroring uuid.UUID but exposing a deterministic .hex value."""

    def __init__(self, value: str) -> None:
        self.hex = value


def _patched_uuid(value: str) -> Any:
    """Return a callable that mimics uuid4() with a fixed hex payload."""

    def _factory() -> _StaticUuid:
        return _StaticUuid(value)

    return _factory


def _patch_metric_timestamps(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure metric storage returns deterministic timestamps."""

    def _utc_now_isoformat() -> str:
        return METRIC_RUN_FINISHED

    monkeypatch.setattr(metrics_storage, "_utc_now_isoformat", _utc_now_isoformat)


def _eur_to_cents(value: float) -> int:
    """Convert a EUR float into integer cents."""
    return round(value * 100)


def _scale_price(value: float) -> int:
    """Convert a price into the stored 10^-8 fixed-point representation."""
    return round(value * 10**8)


def _seed_fx_rate_row(db_path: Path) -> None:
    """Persist a deterministic FX rate for USD to keep diagnostics consistent."""
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO fx_rates (
                date,
                currency,
                rate,
                fetched_at,
                data_source,
                provider,
                provenance
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "2024-01-10",
                "USD",
                _scale_price(FX_RATE),
                NORMALIZATION_TIMESTAMP,
                "fixtures",
                "fixtures",
                json.dumps({"source": "fixtures"}, ensure_ascii=False),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _seed_metric_run_metadata(db_path: Path) -> None:
    """Normalize metric run metadata for deterministic diagnostics."""
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            UPDATE metric_runs
            SET
                status = 'completed',
                trigger = 'smoketest',
                provenance = 'cli',
                started_at = ?,
                finished_at = ?,
                duration_ms = ?,
                total_entities = 3,
                processed_portfolios = 1,
                processed_accounts = 1,
                processed_securities = 1,
                error_message = NULL
            WHERE run_uuid = ?
            """,
            (
                METRIC_RUN_STARTED,
                METRIC_RUN_FINISHED,
                5000,
                METRIC_RUN_UUID,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _seed_metric_records(db_path: Path) -> None:
    """Rewrite metric tables with curated values that match the datamodel spec."""
    conn = sqlite3.connect(str(db_path))
    holdings_raw = _scale_price(HOLDINGS)
    current_value_cents = _eur_to_cents(CURRENT_VALUE_EUR)
    purchase_value_cents = _eur_to_cents(PURCHASE_VALUE_EUR)
    gain_abs_cents = _eur_to_cents(GAIN_ABS_EUR)
    purchase_security_total_raw = _scale_price(PURCHASE_VALUE_EUR)
    purchase_account_cents = _eur_to_cents(PURCHASE_VALUE_EUR)
    last_price_native_raw = _scale_price(LAST_PRICE_NATIVE)
    last_close_native_raw = _scale_price(LAST_CLOSE_NATIVE)

    try:
        conn.execute(
            """
            UPDATE portfolio_metrics
            SET
                current_value_cents = ?,
                purchase_value_cents = ?,
                gain_abs_cents = ?,
                gain_pct = ?,
                total_change_eur_cents = ?,
                total_change_pct = ?,
                coverage_ratio = 1.0,
                position_count = 1,
                missing_value_positions = 0,
                source = 'snapshot',
                provenance = 'cached'
            WHERE metric_run_uuid = ? AND portfolio_uuid = ?
            """,
            (
                current_value_cents,
                purchase_value_cents,
                gain_abs_cents,
                GAIN_PCT,
                gain_abs_cents,
                GAIN_PCT,
                METRIC_RUN_UUID,
                PORTFOLIO_UUID,
            ),
        )
        conn.execute(
            """
            UPDATE account_metrics
            SET
                balance_native_cents = ?,
                balance_eur_cents = ?,
                coverage_ratio = 1.0,
                fx_rate = 1.0,
                fx_rate_source = 'fixtures',
                fx_rate_timestamp = ?,
                provenance = 'snapshot'
            WHERE metric_run_uuid = ? AND account_uuid = ?
            """,
            (
                _eur_to_cents(PURCHASE_VALUE_EUR),
                _eur_to_cents(PURCHASE_VALUE_EUR),
                NORMALIZATION_TIMESTAMP,
                METRIC_RUN_UUID,
                ACCOUNT_UUID,
            ),
        )
        conn.execute(
            """
            UPDATE security_metrics
            SET
                holdings_raw = ?,
                current_value_cents = ?,
                purchase_value_cents = ?,
                purchase_security_value_raw = ?,
                purchase_account_value_cents = ?,
                gain_abs_cents = ?,
                gain_pct = ?,
                total_change_eur_cents = ?,
                total_change_pct = ?,
                source = 'snapshot',
                coverage_ratio = 1.0,
                day_change_native = ?,
                day_change_eur = ?,
                day_change_pct = ?,
                day_change_source = 'market',
                day_change_coverage = 1.0,
                last_price_native_raw = ?,
                last_close_native_raw = ?,
                provenance = 'snapshot'
            WHERE metric_run_uuid = ?
              AND portfolio_uuid = ?
              AND security_uuid = ?
            """,
            (
                holdings_raw,
                current_value_cents,
                purchase_value_cents,
                purchase_security_total_raw,
                purchase_account_cents,
                gain_abs_cents,
                GAIN_PCT,
                gain_abs_cents,
                GAIN_PCT,
                DAY_CHANGE_NATIVE,
                DAY_CHANGE_EUR,
                DAY_CHANGE_PCT,
                last_price_native_raw,
                last_close_native_raw,
                METRIC_RUN_UUID,
                PORTFOLIO_UUID,
                SECURITY_UUID,
            ),
        )
        conn.commit()
    finally:
        conn.close()


async def _generate_smoketest_payload(  # noqa: PLR0915
    *,
    include_positions: bool,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Re-run the normalization smoketest with deterministic helpers."""
    with tempfile.TemporaryDirectory(prefix="pp_reader_fixtures_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        db_path = tmp_path / "smoketest.db"
        portfolio_path = tmp_path / "sample.portfolio"
        portfolio_path.write_text("fixture", encoding="utf-8")
        initialize_database_schema(db_path)

        parsed_client = normalization_test._build_sample_parsed_client()  # noqa: SLF001
        async def _fake_parse_portfolio(
            _hass: Any,
            *,
            path: str,
            writer: Any,
            progress_cb: Any,
        ) -> Any:
            if Path(path) != portfolio_path:
                msg = "Unexpected portfolio path during fixture generation."
                raise RuntimeError(msg)
            progress_cb(SimpleNamespace(stage="accounts", processed=1, total=1))
            writer.write_accounts(parsed_client.accounts)
            writer.write_portfolios(parsed_client.portfolios)
            writer.write_securities(parsed_client.securities)
            writer.write_transactions(parsed_client.transactions)
            writer.write_transaction_units(
                [
                    (transaction.uuid, transaction.units)
                    for transaction in parsed_client.transactions
                ]
            )
            writer.write_historical_prices(
                [
                    (security.uuid, security.prices)
                    for security in parsed_client.securities
                    if security.prices
                ]
            )
            return parsed_client

        async def _fake_ensure_fx(
            _dates: list[str],
            currencies: set[str],
            _db_path: Path,
        ) -> None:
            if currencies != {"USD"}:
                msg = f"Unexpected currency set for fixtures: {currencies}"
                raise RuntimeError(msg)

        async def _fake_plan_jobs(
            _self: Any,
            targets: list[Any],
            *,
            _lookback_days: int = 365,
            _interval: str = "1d",
        ) -> int:
            return len(targets)

        async def _fake_process_jobs(_self: Any, *, _limit: int) -> dict[str, Any]:
            return {}

        monkeypatch = pytest.MonkeyPatch()
        monkeypatch.setattr(
            smoketest.parser_pipeline,
            "async_parse_portfolio",
            _fake_parse_portfolio,
        )
        install_fx_stubs(monkeypatch, rate=1.05)
        monkeypatch.setattr(
            smoketest.fx,
            "discover_active_currencies",
            lambda _path: {"USD"},
        )
        monkeypatch.setattr(
            smoketest.fx,
            "ensure_exchange_rates_for_dates",
            _fake_ensure_fx,
        )
        monkeypatch.setattr(
            smoketest.HistoryQueueManager,
            "plan_jobs",
            _fake_plan_jobs,
        )
        monkeypatch.setattr(
            smoketest.HistoryQueueManager,
            "process_pending_jobs",
            _fake_process_jobs,
        )
        monkeypatch.setattr(
            normalization_pipeline,
            "_utc_now_isoformat",
            lambda: NORMALIZATION_TIMESTAMP,
        )
        _patch_metric_timestamps(monkeypatch)
        monkeypatch.setattr(
            metrics_storage,
            "uuid4",
            _patched_uuid(METRIC_RUN_UUID),
        )
        monkeypatch.setattr(
            normalization_pipeline,
            "load_latest_completed_metric_run_uuid",
            lambda _db_path: METRIC_RUN_UUID,
        )
        monkeypatch.setattr(
            normalization_pipeline,
            "get_missing_fx_diagnostics",
            lambda: {
                "missing_rates": [],
                "coverage": 1.0,
                "generated_at": NORMALIZATION_TIMESTAMP,
            },
        )

        loop = asyncio.get_running_loop()
        hass = smoketest._SmoketestHass(loop)  # noqa: SLF001
        metrics_summary: dict[str, Any] | None = None
        try:
            _run_id, parsed_result = await smoketest._run_parser(  # noqa: SLF001
                hass,
                portfolio_path,
                db_path,
                keep_staging=False,
            )
            if parsed_result is not parsed_client:
                msg = "Parsed client stub was not returned as expected."
                raise RuntimeError(msg)

            await smoketest._run_fx_refresh(db_path)  # noqa: SLF001
            await smoketest._run_price_history_jobs(  # noqa: SLF001
                parsed_client,
                db_path,
                limit=3,
            )
            await smoketest._run_sync(db_path)  # noqa: SLF001
            _seed_fx_rate_row(db_path)
            metrics_summary = await smoketest._run_metrics(hass, db_path)  # noqa: SLF001
            _seed_metric_run_metadata(db_path)
            _seed_metric_records(db_path)
            normalization_summary = await smoketest._run_normalization_snapshot(  # noqa: SLF001
                hass,
                db_path,
                include_positions=include_positions,
            )
            diagnostics_payload = smoketest._collect_diagnostics(db_path)  # noqa: SLF001
        finally:
            monkeypatch.undo()

    payload = normalization_summary["payload"]
    payload["metric_run_uuid"] = METRIC_RUN_UUID
    payload["generated_at"] = NORMALIZATION_TIMESTAMP
    for account in payload.get("accounts", []):
        account["metric_run_uuid"] = METRIC_RUN_UUID
    for portfolio in payload.get("portfolios", []):
        portfolio["metric_run_uuid"] = METRIC_RUN_UUID
        for position in portfolio.get("positions", []):
            position["metric_run_uuid"] = METRIC_RUN_UUID

    diagnostics_payload["normalization"] = {
        "status": normalization_summary.get("status"),
        "counts": normalization_summary.get("counts"),
        "generated_at": NORMALIZATION_TIMESTAMP,
        "metric_run_uuid": METRIC_RUN_UUID,
    }
    diagnostics_payload["metrics"]["latest_run_uuid"] = METRIC_RUN_UUID
    diagnostics_payload["metrics"]["runs"]["latest_started_at"] = METRIC_RUN_STARTED
    diagnostics_payload["metrics"]["runs"]["latest"] = {
        "run_uuid": METRIC_RUN_UUID,
        "status": "completed",
        "trigger": "smoketest",
        "started_at": METRIC_RUN_STARTED,
        "finished_at": METRIC_RUN_FINISHED,
        "duration_ms": 5000,
        "total_entities": 3,
        "processed_portfolios": 1,
        "processed_accounts": 1,
        "processed_securities": 1,
        "error_message": None,
    }
    metrics_status = (metrics_summary or {}).get("status", "completed")
    diagnostics_payload["metrics"]["status"] = metrics_status
    normalization_counts = diagnostics_payload["normalization"].setdefault("counts", {})
    total_positions = sum(
        len(portfolio.get("positions") or [])
        for portfolio in payload.get("portfolios", [])
    )
    normalization_counts["positions"] = total_positions

    return payload, diagnostics_payload


async def _async_main(args: argparse.Namespace) -> None:
    payload, diagnostics_payload = await _generate_smoketest_payload(
        include_positions=True,
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)

    normalization_path = args.normalization
    if not normalization_path.is_absolute():
        normalization_path = args.output_dir / normalization_path
    diagnostics_path = args.diagnostics
    if not diagnostics_path.is_absolute():
        diagnostics_path = args.output_dir / diagnostics_path

    normalization_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    diagnostics_path.write_text(
        json.dumps(diagnostics_payload, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    LOGGER.info("Updated %s", normalization_path.relative_to(PROJECT_ROOT))
    LOGGER.info("Updated %s", diagnostics_path.relative_to(PROJECT_ROOT))


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Regenerate smoketest fixtures shared between backend and "
            "frontend suites."
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=FIXTURES_DIR,
        help="Directory where fixture JSON files will be written.",
    )
    parser.add_argument(
        "--normalization",
        type=Path,
        default=DEFAULT_NORMALIZATION_PATH.name,
        help="Filename for the normalization snapshot JSON fixture.",
    )
    parser.add_argument(
        "--diagnostics",
        type=Path,
        default=DEFAULT_DIAGNOSTICS_PATH.name,
        help="Filename for the diagnostics summary JSON fixture.",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    """CLI entrypoint for fixture regeneration."""
    parser = _build_argument_parser()
    args = parser.parse_args(argv)
    args.output_dir = args.output_dir.resolve()

    asyncio.run(_async_main(args))


if __name__ == "__main__":
    main()
