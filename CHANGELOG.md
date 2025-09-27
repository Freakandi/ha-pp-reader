# Changelog
Alle erwähnenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Format orientiert sich an: Keep a Changelog
Versionierung: SemVer (Minor-Bump für neue Funktionalität ohne Breaking Changes).

## [0.11.0] - 2025-09-27
### Added
- Neue DB-Hilfsfunktion `fetch_live_portfolios` aggregiert aktuelle Depotwerte und Positionszahlen on demand als Single Source of Truth für WebSocket-Antworten und Dashboard-Ladepfade.【F:custom_components/pp_reader/data/db_access.py†L428-L484】
- Regressionstests sichern die Live-Aggregation sowie die WebSocket-Flows für Portfolios und FX-Konten ab.【F:tests/test_fetch_live_portfolios.py†L1-L72】【F:tests/test_ws_portfolios_live.py†L1-L94】【F:tests/test_ws_accounts_fx.py†L120-L191】
### Changed
- WebSocket-Kommandos (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_last_file_update`) laden Portfolios jetzt on demand aus der Datenbank, holen fehlende FX-Kurse nach und besitzen Coordinator-Fallbacks für fehlerfreie Antworten.【F:custom_components/pp_reader/data/websocket.py†L65-L341】
- Revaluation und Preis-Events greifen auf `fetch_live_portfolios` zurück, um betroffene Portfolios mit konsistenten Summen zu füllen und bei Problemen auf Einzelaggregation zurückzufallen.【F:custom_components/pp_reader/prices/revaluation.py†L1-L118】
- Das Dashboard rendert eine expandierbare Tabelle mit DOM-basiertem Summen-Footer und cached nur noch Positionsdaten, sodass Aktualisierungen ohne manuelle Override-Caches funktionieren.【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js†L4-L160】【F:custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js†L203-L263】
### Removed
- Client-Override-Caches für Depotwerte entfallen, das UI verlässt sich vollständig auf die serverseitige Aggregation und DOM-Neuberechnungen.【F:README.md†L82-L93】
### Internal
- Erweiterte Tests für Revaluation und Sync sichern den Refactor der Aggregationspfade ab.【F:tests/prices/test_revaluation_live_aggregation.py†L1-L62】【F:tests/test_sync_from_pclient.py†L1-L60】

## [0.10.7] - 2025-09-26
### Added
- Automatische Invalidierung des Portfolio Override-Caches bei Datei-Sync (`last_file_update` Event) sowie bei erkannten Full-Sync `portfolio_values` Events (Heuristik: `value` ohne `current_value`).
### Fixed
- Verhindert Persistenz veralteter Live-Preis Overrides nach vollständigem Rebuild der Tabellen.
### Internal
- Utility `_clearPortfolioOverrides(reason)` für konsistentes Logging.

## [0.10.6] - 2025-09-26
### Fixed
- JS Fehler: `parseNum is not defined` in `handlePortfolioUpdate` verhinderte Footer-/Total-Wealth-Update nach Events.
- Live-Preis / Event-Patches verschwanden nach Re-Render, da ursprüngliche Backend-Werte erneut gerendert wurden. Client-seitiger Override-Cache (`__ppReaderPortfolioValueOverrides`) eingeführt und beim Render angewendet.

### Internal
- Gemeinsame Parsing-Utility `parseNumLoose`.
- Stabilere Footer-Berechnung ohne Exceptions.

## [0.10.5] - 2025-09-25
### Fixed
- Frontend erhielt zwar `panels_updated` Events, abonnierte aber den falschen Literal-Eventnamen (`EVENT_PANELS_UPDATED`) → keine Live-Aktualisierung der Depotwerte. Subscription in `dashboard.js` korrigiert.
- Inkrementelle Depot-Updates wurden nicht gepatcht, da initiale Tabelle `value` nutzte, Events aber `current_value` senden. Normalisierung (`current_value`/`value`, `purchase_sum`/`purchaseSum`, `count`/`position_count`) in `handlePortfolioUpdate`.
- Key-Mismatch bei `portfolio_values` aus partielle Revaluation (Mapping `value`→`current_value`, `count`→`position_count`) führte zu ignorierten Updates – Transformations- & Fallback-Logik im Preiszyklus ergänzt.

### Added
- Erweiterte Debug-Logs für Price-Cycle (`pv_event push`, Payload-Länge, Fallback-Indikatoren).
- Visuelles Highlight (CSS-Klasse `flash-update`) beim Aktualisieren einzelner Depotzeilen.

### Internal
- Robustere DOM-Selektion & defensive Parser für numerische Werte in `updateConfigsWS.js`.
- Fallback-Aggregation, falls Revaluation keine `portfolio_values` liefert, obwohl Preisänderungen vorliegen.
- Kein Breaking Change der bestehenden Daten-/Event-Contracts; ausschließlich Patch-Verhalten verbessert.

## [0.10.4] - 2025-09-25
### Fixed
- Crash beim Initial-Sync auf frischer DB: Verwendete `HasField('high')` / `low` / `volume` auf `PHistoricalPrice` (hat nur `date`, `close`). Jetzt Descriptor-basiert optional.

## [0.10.3] - 2025-09-25
### Fixed
- Entfernt fehlerhafte Annahme einer nicht existierenden `securities.note` Spalte; Startup auf frischer DB schlug sonst mit `OperationalError: no column named note` fehl.
- Umstellung auf differenzierte UPDATE-Logik für `securities` statt `INSERT OR REPLACE`, damit `last_price` / `last_price_source` / `last_price_fetched_at` nicht verloren gehen.

### Internal
- Dokumentiert bewusste Nicht-Persistenz von Notizen für Wertpapiere (keine Schema-Erweiterung notwendig).

## [0.10.2] - 2025-09-25
### Changed
- Vereinheitlichte Batchgröße: Verwendung von `CHUNK_SIZE` aus Provider statt hartkodiertem Wert.
- Resilienz: Äußerer try/except im Preiszyklus verhindert ungefangene Ausnahmen; Fehlerzähler wird erhöht.

### Added
- INFO Log beim ersten Skip wegen leerer Symbol-Liste (separat vom Discovery-INFO).
- Regressionstest `test_batches_count_regression` (Batch-Anzahl & Metadaten).

### Fixed
- Potentielle künftige Drift zwischen Provider-Chunkgröße und Orchestrator.

## [0.10.1] - 2025-09-25
### Fixed
- Added explicit dependency `lxml>=5.2.1` to ensure a Python 3.13 compatible wheel is installed (previous implicit pull of `lxml==4.9.4` via `yahooquery==2.3.7` caused build failure in the dev container).

## [0.10.0] - 2025-09-25
### Added
- Live-Preis Integration (Yahoo Finance via `yahooquery`) – Aktualisierung von `last_price`, `last_price_source`, `last_price_fetched_at` in der `securities` Tabelle.
- Partielle Revaluation nur bei mindestens einer Preisänderung mit Event-Push Reihenfolge:
  1. `portfolio_values`
  2. je betroffenes Portfolio `portfolio_positions`
- Options Flow:
  - `price_update_interval_seconds` (Default 900s, Minimum 300s)
  - `enable_price_debug` (grenzt DEBUG Logs auf Namespace `custom_components.pp_reader.prices.*`)
- Logging & Fehlertoleranz:
  - INFO Zyklus-Metadaten (symbols_total, batches, quotes_returned, changed, errors, duration_ms, skipped_running)
  - WARN: Chunk-Fehler, wiederholte Fehlschläge (≥3), Zero-Quotes (dedupliziert), Currency Drift (einmal pro Symbol), Watchdog >25s
  - ERROR: Importfehler `yahooquery` → Feature deaktiviert
- Currency Drift Prüfung (einmalige WARN pro Symbol, keine Prüfung bei fehlender Currency).
- Tests für Provider, Orchestrator (Change/NoChange, Drift, Overlap, Fehlerzähler Reset, Migration).

### Changed
- Manifest: Abhängigkeit `yahooquery==2.3.7` hinzugefügt.
- Minor Version Bump auf 0.10.0.

### Notable Behavior
- Persistenz ausschließlich letzter Preis (`last_price`) + Quelle + Fetch-Timestamp; keine Historie, keine zusätzlichen Quote-Felder.
- Intervall-Empfehlung: ≥15 Minuten (verzögerte Daten, Rate-Limit Schonung).
- Events nur bei tatsächlicher Preisänderung (Reduktion unnötiger Frontend Updates).

### Internal
- Neue Module: `prices.provider_base`, `prices.yahooquery_provider`, `prices.price_service`, `prices.revaluation`.
- Laufzeit-State isoliert unter `hass.data[DOMAIN][entry_id]` (Lock, Fehlerzähler, Drift-Cache, Intervall-Handle).

## [0.9.x] - Vorher
- Vorbereitende Funktionen für Portfolio Synchronisation, Sensoren & Dashboard.
- Kein Live-Preis Feature.
