1. [ ] Phase 0 – Schema & Datamodel Foundations
   a) [x] Ergänze `custom_components/pp_reader/data/db_schema.py` um persistente Tabellen `portfolio_metrics`, `account_metrics`, `security_metrics` und `metric_runs` entsprechend `.docs/backend_workstreams.md` (Abschnitt „Metrics Engine“) sowie `datamodel/backend-datamodel-final.md` (Performance-Tabellen). 
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py
      - Betroffene Funktion(en)/Abschnitt(e): Schema-Definitionen, Konstanten-Listen
      - Ziel/Ergebnis der Änderung: Persistente Speicherung der berechneten Kennzahlen inkl. Coverage/Provenance ohne Rückgriff auf Legacy-Views; keine Rückwärtskompatibilität erforderlich.
   b) [x] Aktualisiere `custom_components/pp_reader/data/db_init.py` und zugehörige Migration-Helper, sodass Neuinstallationen & Upgrades die neuen Metric-Tabellen anlegen (WAL-kompatibel) und bestehende Flat-Felder optional leeren.
      - Dateipfad(e): custom_components/pp_reader/data/db_init.py, custom_components/pp_reader/data/migrations/*.py (falls neu)
      - Betroffene Funktion(en)/Abschnitt(e): `initialize_database_schema`, `_apply_runtime_migrations`
      - Ziel/Ergebnis der Änderung: Idempotente Migrationen, die Legacy-Metrikfelder entfernen dürfen (keine BC-Anforderungen) und neue Tabellen befüllen.
   c) [x] Füge in `custom_components/pp_reader/data/db_access.py` strukturierte Records/Loader (`PortfolioMetricRecord`, `AccountMetricRecord`, `SecurityMetricRecord`, `MetricRunMetadata`) für CRUD-Zugriffe hinzu.
      - Dateipfad(e): custom_components/pp_reader/data/db_access.py
      - Betroffene Funktion(en)/Abschnitt(e): Neue dataclasses, Insert/Upsert-Helper, Loader-Queries
      - Ziel/Ergebnis der Änderung: Einheitliche Zugriffsschicht auf die neuen Tabellen zur Nutzung durch die Metric-Engine und Diagnostics.

2. [ ] Phase 1 – Metric Engine Package
   a) [x] Lege das Paket `custom_components/pp_reader/metrics/` an (`__init__.py`, `portfolio.py`, `accounts.py`, `securities.py`) und exportiere zentralisierte Helper (z.B. `async_compute_portfolio_metrics`, `async_compute_account_metrics`, `async_compute_security_metrics`).
      - Dateipfad(e): custom_components/pp_reader/metrics/__init__.py, custom_components/pp_reader/metrics/portfolio.py, custom_components/pp_reader/metrics/accounts.py, custom_components/pp_reader/metrics/securities.py
      - Betroffene Funktion(en)/Abschnitt(e): Asynchrone Compute-APIs, interne Aggregations-Helper, Shared Constants
      - Ziel/Ergebnis der Änderung: Trennung der Berechnungslogik von `db_access.py`/`performance.py` mit klaren Entry-Points für Coordinator & CLI.
   b) [x] Extrahiere bestehende `select_performance_metrics`-Logik in eine wiederverwendbare Utility (neues Modul `metrics/common.py`) und überführe rounding/coverage-Helper dorthin; dekrementiere Legacy-Funktionen in `data/performance.py`.
      - Dateipfad(e): custom_components/pp_reader/metrics/common.py, custom_components/pp_reader/data/performance.py
      - Betroffene Funktion(en)/Abschnitt(e): Metric-Dataclasses, `select_performance_metrics`, Coverage-Berechnung
      - Ziel/Ergebnis der Änderung: Gemeinsamer Satz an Berechnungshilfen für Portfolio/Account/Security-Metriken ohne Rücksicht auf alte Payloads.
   c) [x] Implementiere Batch-Writer in `metrics/storage.py`, der berechnete Dataclasses in einer Transaktion persistiert und `metric_runs` mit Timestamps/Flags aktualisiert.
      - Dateipfad(e): custom_components/pp_reader/metrics/storage.py
      - Betroffene Funktion(en)/Abschnitt(e): `async_store_metric_batch`, `create_metric_run`
      - Ziel/Ergebnis der Änderung: Garantiert konsistente Writes (all-or-nothing) für jede Pipeline-Ausführung.

3. [ ] Phase 2 – Coordinator & Pipeline Integration
   a) [x] Aktualisiere `custom_components/pp_reader/data/coordinator.py`, damit nach erfolgreichem Enrichment die Metric-Engine angestoßen wird (`await metrics.async_refresh_all(...)`), inklusive Feature-Flag (`metrics_pipeline`) für gestufte Aktivierung.
      - Dateipfad(e): custom_components/pp_reader/data/coordinator.py
      - Betroffene Funktion(en)/Abschnitt(e): `_schedule_enrichment_jobs`, neue `_schedule_metrics_refresh`, Telemetrie-Emission `EVENT_METRICS_PROGRESS`
      - Ziel/Ergebnis der Änderung: Vollständiger Pipeline-Ablauf Import → Enrichment → Metrics mit Event-/Dispatcher-Hooks; keine Legacy-Rückfalle.
   b) [x] Entferne aus `custom_components/pp_reader/data/db_access.py` und `custom_components/pp_reader/data/websocket.py` sämtliche On-the-fly-Metrikberechnungen; ersetze sie durch Loader, die auf die neuen Tabellen zugreifen.
      - Dateipfad(e): custom_components/pp_reader/data/db_access.py, custom_components/pp_reader/data/websocket.py
      - Betroffene Funktion(en)/Abschnitt(e): `fetch_live_portfolios`, `get_portfolio_positions`, `_normalize_portfolio_row`, `_serialise_security_snapshot`
      - Ziel/Ergebnis der Änderung: WebSocket/Event-Payloads ziehen ausschließlich gespeicherte Metriken; keine parallelen Berechnungswege.
   c) [x] Ergänze `custom_components/pp_reader/data/event_push.py` um Payload-Felder aus den neuen Metric-Tabellen (inkl. Coverage & Provenance) und entferne Altschnittstellen (`gain_abs`, `gain_pct` Berechnung).
      - Dateipfad(e): custom_components/pp_reader/data/event_push.py
      - Betroffene Funktion(en)/Abschnitt(e): `_assemble_portfolio_payload`, `_assemble_positions_payload`, Event-Dataclasses
      - Ziel/Ergebnis der Änderung: Push-Ereignisse spiegeln gespeicherte Metriken wider und enthalten Source/Coverage-Metadaten.

4. [ ] Phase 3 – Tests & Diagnostics
   a) [x] Schreibe Unit- und Integrationstests (`tests/metrics/test_metric_engine.py`, `tests/integration/test_metrics_pipeline.py`) mit Fixture-Daten aus `datamodel/` zur Validierung von EUR-Konversionen, Coverage, Fehlerpfaden.
      - Dateipfad(e): tests/metrics/test_metric_engine.py, tests/integration/test_metrics_pipeline.py, tests/fixtures/metrics/*
      - Betroffene Funktion(en)/Abschnitt(e): Test-Szenarien für Portfolio/Account/Security-Metriken, Retry/Error Handling
      - Ziel/Ergebnis der Änderung: Vollständige Testabdeckung der neuen Metric-Engine.
   b) [x] Aktualisiere `custom_components/pp_reader/util/diagnostics.py`, um Metric-Status (`metric_runs`, Coverage-Zusammenfassung, letzte Berechnungsdauer) bereitzustellen; erweitere `tests/util/test_diagnostics_enrichment.py` bzw. neues `test_diagnostics_metrics.py`.
      - Dateipfad(e): custom_components/pp_reader/util/diagnostics.py, tests/util/test_diagnostics_metrics.py
      - Betroffene Funktion(en)/Abschnitt(e): Enrichment-/Metric-Payload, JSON-Ausgabe
      - Ziel/Ergebnis der Änderung: Diagnostics zeigen Pipeline-End-to-End inkl. Metric-Metadaten.
   c) [x] Integriere Metric-Engine in `scripts/enrichment_smoketest.py` (neuer Abschnitt „metrics“), sodass CLI-Runs Pipeline-End-to-End prüfen.
      - Dateipfad(e): scripts/enrichment_smoketest.py
      - Betroffene Funktion(en)/Abschnitt(e): `_run_metrics`, CLI-Ausgabe
      - Ziel/Ergebnis der Änderung: Manuelle Smoketests decken neue Pipeline ab.

5. [ ] Phase 4 – Documentation & Cleanup
   a) [ ] Aktualisiere `.docs/backend_workstreams.md` (Abschnitt „Metrics Engine“) mit konkreten Modulen/Tabellen; pflege `.docs/legacy_cleanup_strategy.md` um Schritte zum Entfernen alter Performance-Helfer.
      - Dateipfad(e): .docs/backend_workstreams.md, .docs/legacy_cleanup_strategy.md
      - Ziel/Ergebnis der Änderung: Dokumentation reflektiert neuen Stand, Cleanup-Tracker erhält Metric-Tasks.
   b) [ ] Überarbeite Nutzer- und Entwickler-Dokumentation (`README.md`, `README-dev.md`, `.docs/qa_docs_comms.md`, `CHANGELOG.md`) mit Hinweisen zur persistierten Metric-Schicht, neuen Diagnostikfeldern, CLI-Erweiterungen.
      - Dateipfad(e): README.md, README-dev.md, .docs/qa_docs_comms.md, CHANGELOG.md
      - Ziel/Ergebnis der Änderung: Kommunikation der Änderungen ohne BC-Anforderungen, QA-Plan aktualisiert.
   c) [ ] Entferne obsoletes Metric-bezogenes Legacy-Material (`custom_components/pp_reader/data/performance.py` Alt-Funktionen, release-notes) und archiviere ggf. alte Docs unter `.docs/cleanup/`.
      - Dateipfad(e): custom_components/pp_reader/data/performance.py, .docs/cleanup/*
      - Ziel/Ergebnis der Änderung: Reduzierter Legacy-Footprint, klarer Fokus auf neue Pipeline.
