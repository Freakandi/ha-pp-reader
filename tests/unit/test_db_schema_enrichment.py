"""Enrichment schema and migration regression tests."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from custom_components.pp_reader.data.db_access import (
    FxRateRecord,
    NewPriceHistoryJob,
    enqueue_price_history_job,
    get_price_history_jobs_by_status,
    load_fx_rates_for_date,
    upsert_fx_rate,
)
from custom_components.pp_reader.data.db_init import initialize_database_schema


def _get_columns(db_path: Path, table: str) -> dict[str, dict]:
    """Return table column metadata for assertions."""
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA table_xinfo('{table}')").fetchall()
        return {
            row[1]: {"type": row[2], "notnull": row[3], "pk": row[5], "hidden": row[6]}
            for row in rows
            if row[1] is not None
        }
    finally:
        conn.close()


def _get_index_names(db_path: Path, table: str) -> set[str]:
    """Return declared index names for a table."""
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(f"PRAGMA index_list('{table}')").fetchall()
        return {row[1] for row in rows}
    finally:
        conn.close()


def test_fresh_schema_contains_enrichment_tables(tmp_path):
    """Fresh installations expose enrichment metadata and queue schema."""
    db_path = tmp_path / "fresh_enrichment.db"
    initialize_database_schema(db_path)

    fx_cols = _get_columns(db_path, "fx_rates")
    for column in ("date", "currency", "rate", "fetched_at", "data_source", "provider", "provenance"):
        assert column in fx_cols, f"Spalte '{column}' fehlt in fx_rates"

    history_cols = _get_columns(db_path, "historical_prices")
    for column in ("fetched_at", "data_source", "provider", "provenance"):
        assert column in history_cols, f"Spalte '{column}' fehlt in historical_prices"

    ingestion_cols = _get_columns(db_path, "ingestion_historical_prices")
    for column in ("fetched_at", "data_source", "provider", "provenance"):
        assert column in ingestion_cols, f"Spalte '{column}' fehlt in ingestion_historical_prices"

    queue_cols = _get_columns(db_path, "price_history_queue")
    expected_queue = {
        "id",
        "security_uuid",
        "requested_date",
        "status",
        "priority",
        "attempts",
        "scheduled_at",
        "started_at",
        "finished_at",
        "last_error",
        "data_source",
        "provenance",
        "created_at",
        "updated_at",
    }
    assert expected_queue.issubset(queue_cols.keys()), "price_history_queue unvollständig"

    queue_indexes = _get_index_names(db_path, "price_history_queue")
    assert "idx_price_history_queue_status" in queue_indexes
    assert "idx_price_history_queue_security_date" in queue_indexes


def test_runtime_migration_adds_enrichment_columns(tmp_path):
    """Legacy databases gain enrichment metadata without data loss."""
    db_path = tmp_path / "legacy_enrichment.db"
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            CREATE TABLE fx_rates (
                date TEXT NOT NULL,
                currency TEXT NOT NULL,
                rate INTEGER NOT NULL,
                PRIMARY KEY (date, currency)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO fx_rates (date, currency, rate)
            VALUES ('2024-03-01', 'USD', 107654321)
            """
        )
        conn.execute(
            """
            CREATE TABLE historical_prices (
                security_uuid TEXT NOT NULL,
                date INTEGER NOT NULL,
                close INTEGER,
                PRIMARY KEY (security_uuid, date)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO historical_prices (security_uuid, date, close)
            VALUES ('sec-legacy', 19700, 123456789)
            """
        )
        conn.execute(
            """
            CREATE TABLE ingestion_historical_prices (
                security_uuid TEXT NOT NULL,
                date INTEGER NOT NULL,
                close INTEGER,
                PRIMARY KEY (security_uuid, date)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO ingestion_historical_prices (security_uuid, date, close)
            VALUES ('sec-legacy', 19700, 123456789)
            """
        )
        conn.commit()
    finally:
        conn.close()

    initialize_database_schema(db_path)

    fx_cols = _get_columns(db_path, "fx_rates")
    for column in ("fetched_at", "data_source", "provider", "provenance"):
        assert column in fx_cols, "Runtime-Migration hat FX-Metadaten nicht ergänzt"

    history_cols = _get_columns(db_path, "historical_prices")
    for column in ("fetched_at", "data_source", "provider", "provenance"):
        assert column in history_cols, "Runtime-Migration hat Historienmetadaten nicht ergänzt"

    ingestion_cols = _get_columns(db_path, "ingestion_historical_prices")
    for column in ("fetched_at", "data_source", "provider", "provenance"):
        assert column in ingestion_cols, "Runtime-Migration hat Ingestion-Metadaten nicht ergänzt"

    queue_cols = _get_columns(db_path, "price_history_queue")
    assert "id" in queue_cols, "Queue-Tabelle wurde nicht erstellt"

    # Datenintegrität prüfen.
    conn = sqlite3.connect(str(db_path))
    try:
        fx_row = conn.execute(
            "SELECT date, currency, rate FROM fx_rates WHERE currency='USD'"
        ).fetchone()
        assert fx_row == ("2024-03-01", "USD", 107654321)

        history_row = conn.execute(
            "SELECT security_uuid, date, close FROM historical_prices WHERE security_uuid='sec-legacy'"
        ).fetchone()
        assert history_row == ("sec-legacy", 19700, 123456789)
    finally:
        conn.close()

    # Helper-Funktionen nutzen (CRUD Smoke-Test).
    new_rate = FxRateRecord(
        date="2024-03-01",
        currency="USD",
        rate=109000000.0,
        fetched_at="2024-03-01T10:00:00Z",
        data_source="frankfurter",
        provider="frankfurter.app",
        provenance='{"source":"test"}',
    )
    upsert_fx_rate(db_path, new_rate)
    stored_rates = load_fx_rates_for_date(db_path, "2024-03-01")
    assert any(rate.rate == 109000000 for rate in stored_rates)
    assert stored_rates[0].fetched_at is not None

    job_payload = NewPriceHistoryJob(security_uuid="sec-legacy", requested_date=19701)
    job_id = enqueue_price_history_job(db_path, job_payload)
    assert job_id > 0

    pending_jobs = get_price_history_jobs_by_status(db_path, "pending")
    assert any(job.security_uuid == "sec-legacy" for job in pending_jobs)
