1. [ ] Phase 0 – Schema & Migration Foundations
   a) [x] Extend `custom_components/pp_reader/data/db_schema.py` with enrichment tables (`fx_rates`, `price_history_queue`, provenance columns) aligned with `.docs/backend_workstreams.md` M2 requirements.
      - Ziel: Persistente Ablage für Frankfurter/Yahoo Daten mit Zeitstempeln & Datenquelle.
   b) [x] Aktualisiere `custom_components/pp_reader/data/db_init.py` und Migration-Helper, damit Neuinstallationen und Upgrades die neuen Tabellen erstellen sowie bestehende Datenbanken sicher migrieren.
      - Ziel: Idempotente Migration mit WAL-Kompatibilität.
   c) [x] Ergänze `custom_components/pp_reader/data/db_access.py` um Helper zum Schreiben/Lesen der neuen Tabellen (z.B. `upsert_fx_rate`, `enqueue_price_job`).
      - Ziel: Einheitliche Zugriffsschicht für spätere Jobs.
   d) [x] Tests: Aktualisiere/erzeuge Pytests (`tests/unit/test_db_schema_enrichment.py`) zur Validierung der Migration und Basis-CRUD-Operationen.

2. [ ] Phase 1 – FX Ingestion (Frankfurter API)
   a) [x] Implementiere asynchrone FX-Fetcher (`custom_components/pp_reader/currencies/fx_async.py` oder Erweiterung der bestehenden Module) mit Retry/Timeout-Strategie.
   b) [x] Integriere Cache-Schicht: schreibe aktualisierte Raten mit Zeitstempel in `fx_rates`, stelle Loader für normalization/metrics bereit.
   c) [x] Ergänze Konfiguration/Flags (falls nötig) zur Steuerung des Aktualisierungsintervalls; dokumentiere Standardwerte.
   d) [x] Tests: `tests/currencies/test_fx_async.py` (API-Stubs, Cache-Verhalten, Fehlerpfade).

3. [ ] Phase 2 – Yahoo Price History Ingestion
   a) [x] Baue `custom_components/pp_reader/prices/history_ingest.py` (oder erweitere vorhandene Services) für asynchrone Candle-Fetches inkl. Batch-Planer.
   b) [x] Ergänze Queue-Management: schreibe Jobs in `price_history_queue` (oder analog) und persistiere Ergebnisse nach `ingestion_historical_prices`.
   c) [x] Verwende bestehende Parser-Properties (z.B. `ParsedSecurity.properties`) für Feed-Typen/IDs; definiere Fallback-Strategien.
   d) [x] Tests: `tests/prices/test_history_ingest.py` (Mock-Yahoo Client, Persistenz, Fehlerhandling).

4. [ ] Phase 3 – Coordinator & Pipeline Integration
   a) [ ] Aktualisiere `custom_components/pp_reader/data/coordinator.py`, um nach erfolgreichem Import Enrichment-Jobs zu planen (FX + Preise) – Feature-Flag-gestützt.
   b) [ ] Ergänze Telemetrie (Dispatcher/Event-Bus) für Enrichment-Fortschritt analog Parser-Progress.
   c) [ ] Sicherstellen, dass Legacy Sync und neue Pipelines gemeinsam arbeiten (Feature-Flag/Toggles für schrittweise Aktivierung).
   d) [ ] Integrationstests: `tests/integration/test_enrichment_pipeline.py` (Mock-Netzwerk, Job Scheduling, Telemetrie).

5. [ ] Phase 4 – Diagnostics & Observability
   a) [ ] Erweitere `custom_components/pp_reader/util/diagnostics.py` um Enrichment-Metadaten (letzter FX-Refresh, offene Price-Jobs, Fehlermeldungen).
   b) [ ] Ergänze Persistent Notifications/Logger-Erweiterungen für wiederholte Enrichment-Fehler (analog Parser).
   c) [ ] Tests für Diagnostics/Notifications (`tests/util/test_diagnostics_enrichment.py`).

6. [ ] Phase 5 – Tooling & QA
   a) [ ] CLI-Erweiterung (`custom_components/pp_reader/cli/import_portfolio.py` oder neue Subcommands) zum optionalen Triggern von Enrichment-Replays nach einem Import.
   b) [ ] Skript `scripts/enrichment_smoketest.py`: Führt Parser + Enrichment für Sample-Portfolio aus, schreibt Diagnostik-Log.
   c) [ ] QA-Docs: Abschnitt in `.docs/qa_docs_comms.md` für Enrichment-Testmatrix (Frankfurter/Yahoo Stubs, Telemetrieprüfung).

7. [ ] Phase 6 – Dokumentation & Cleanup Vorbereitung
   a) [ ] Aktualisiere `.docs/backend_workstreams.md` (Enrichment Services) mit tatsächlichen Modulen/Artefakten nach Implementierung.
   b) [ ] Ergänze `.docs/legacy_cleanup_strategy.md` um Kriterien zum Entfernen synchroner FX-/History-Helfer sobald neue Pfade aktiv sind.
   c) [ ] Nutzer-Dokumentation (`README.md`, `README-dev.md`): Hinweise zu neuen Abhängigkeiten, Fehlerdiagnose und CLI-Bedienung.
