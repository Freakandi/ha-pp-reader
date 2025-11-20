# TODO – Canonical Pipeline Fix Checklist

Siehe Hintergrund und Design-Details in `.docs/canonical_pipeline_fix.md`. Jedes Item ist klein genug für einen Lauf des Standard-Prompts.

## Aufgaben

- [x] **CP-01 – Coordinator führt Metrics + Normalization immer aus**  
  Entferne das Feature-Flag-Gating in `custom_components/pp_reader/data/coordinator.py` (sowohl im Parser-Run als auch bei Telemetrie-Events) und stelle sicher, dass `_schedule_metrics_refresh` sowie `_schedule_normalization_refresh` immer ausgeführt werden. Aktualisiere Logik, damit Abhängigkeiten korrekt behandelt werden und Fehlermeldungen klar bleiben.

- [x] **CP-02 – Log-Spam reduzieren**  
  Konsolidiere die massiven `“Manually updated pp_reader data”` Logs (z. B. durch Debounce oder ein zusammenfassendes Log pro Zyklus) ohne Sichtbarkeit zu verlieren.

- [x] **CP-03 – Feature Flags entfernen**  
  Entferne die Flags `enrichment_pipeline`, `enrichment_fx_refresh`, `enrichment_history_jobs`, `metrics_pipeline` aus `feature_flags.py`, Config-Flow-Optionen, Dokumentation und Tests. Update `.docs/refactor_correction.md`, README und andere betroffene Dateien.

- [x] **CP-04 – CLI & Smoke Tests aktualisieren**  
  Passe `scripts/enrichment_smoketest.py` und `custom_components/pp_reader/cli/import_portfolio.py` an, damit sie nach dem Parserlauf automatisch Metrics + Normalization ausführen (oder die Helper aufrufen) und mit klaren Fehlermeldungen abbrechen, falls die canonical tables leer bleiben.

- [x] **CP-05 – Regressionstests für canonical Tables**  
  Ergänze Tests (z. B. unter `tests/integration/`) die:  
  1. Einen Parserlauf auf einem Test-Portfolio ausführen.  
  2. Metrics + Normalization triggern.  
  3. SQL-Counts für `metric_runs`, `portfolio_metrics`, `account_snapshots` etc. prüfen.  
  4. Sicherstellen, dass die Websocket-Helpers (`async_load_latest_snapshot_bundle`) nicht länger `data_unavailable` liefern.

- [ ] **CP-06 – HA End-to-End Nachweis**  
  Dokumentiere einen manuellen E2E-Lauf: DB löschen, Integration neu anlegen, warten bis Dashboard Daten zeigt. Erzeuge aktualisierte Screenshots unter `tests/ui/playwright/` (vorher/nachher) und erläutere ggf. verbleibende Warnungen im Log.
