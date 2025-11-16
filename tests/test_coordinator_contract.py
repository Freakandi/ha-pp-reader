from __future__ import annotations

from custom_components.pp_reader.data.coordinator import CoordinatorTelemetry


def test_coordinator_telemetry_serialization() -> None:
    """CoordinatorTelemetry exposes a stable schema for downstream consumers."""
    telemetry = CoordinatorTelemetry(
        last_update="2024-03-14T12:00:00",
        ingestion_run_id="ing-1",
        parser_stage="parse_portfolio",
        parser_processed=10,
        parser_total=42,
        metric_run_id="met-9",
        normalized_metric_run_uuid="met-9",
        normalized_generated_at="2024-03-14T12:05:00Z",
        enrichment_summary={"fx_status": "skipped", "history_status": "up_to_date"},
    )

    payload = telemetry.as_dict()
    assert payload["last_update"] == "2024-03-14T12:00:00"

    ingestion = payload["ingestion"]
    assert ingestion["run_id"] == "ing-1"
    assert ingestion["parser"]["stage"] == "parse_portfolio"
    assert ingestion["parser"]["processed"] == 10
    assert ingestion["parser"]["total"] == 42

    metrics = payload["metrics"]
    assert metrics["run_id"] == "met-9"

    normalization = payload["normalization"]
    assert normalization["metric_run_uuid"] == "met-9"
    assert normalization["generated_at"] == "2024-03-14T12:05:00Z"

    assert payload["enrichment"] == {
        "fx_status": "skipped",
        "history_status": "up_to_date",
    }


def test_coordinator_telemetry_enrichment_is_copied() -> None:
    """Mutating the serialized payload must not leak into the telemetry cache."""
    telemetry = CoordinatorTelemetry()
    payload = telemetry.as_dict()

    payload["enrichment"]["fx_status"] = "mutated"

    assert telemetry.enrichment_summary == {}
