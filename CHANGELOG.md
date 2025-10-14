# Changelog
All noteworthy changes to this project are recorded in this file.

Format follows: Keep a Changelog
Versioning: SemVer (minor bump for new functionality without breaking changes).

## [Unreleased]

### Added
- Centralised performance metric helpers, including `select_performance_metrics` and
  `compose_performance_payload`, to compute rounded gain and day-change data with
  coverage metadata plus dedicated unit tests covering edge cases.【F:custom_components/pp_reader/data/performance.py†L1-L195】【F:tests/test_performance.py†L1-L116】

### Changed
- Portfolio snapshots, WebSocket responses, coordinator events, sensors, and price-cycle
  payloads reuse the shared performance payload so gain/day-change fields stay aligned
  and embed optional overrides when provided.【F:custom_components/pp_reader/data/db_access.py†L645-L677】【F:custom_components/pp_reader/data/websocket.py†L315-L356】【F:custom_components/pp_reader/data/event_push.py†L83-L110】【F:custom_components/pp_reader/prices/price_service.py†L787-L833】【F:custom_components/pp_reader/sensors/gain_sensors.py†L91-L145】

### Breaking Changes
- Removed legacy flat payload fields (`avg_price_security`, `avg_price_account`,
  `gain_abs`, `gain_pct`, `day_price_change_*`) from coordinator events, WebSocket
  serializers, and dashboard APIs. Consumers must rely on the structured
  `average_cost` and `performance` blocks to access purchase and performance
  metrics going forward.【F:custom_components/pp_reader/data/websocket.py†L160-L356】【F:custom_components/pp_reader/data/event_push.py†L24-L118】【F:src/data/api.ts†L1-L211】【F:src/tabs/overview.ts†L78-L344】

## [0.13.0] - 2025-10-09

### Added
- Dashboard-Websocket-Kommandos aggregieren Portfolio-Werte jetzt direkt aus
  der SQLite-Datenbank und fallen bei Fehlern kontrolliert auf den
  Koordinator-Snapshot zurück, damit Start- und Live-Ansichten stets aktuelle
  Summen liefern.【F:custom_components/pp_reader/data/db_access.py†L856-L918】【F:custom_components/pp_reader/data/websocket.py†L363-L498】
- Websocket- und Event-Payloads transportieren Kaufwertsummen sowie
  Durchschnittspreise in Wertpapier- und Kontowährung, wodurch Frontend und
  API nativen Kaufpreis, FX-Kennzeichnung und Summen vollständig anzeigen
  können.【F:custom_components/pp_reader/data/websocket.py†L160-L232】【F:custom_components/pp_reader/data/event_push.py†L24-L120】【F:src/tabs/overview.ts†L206-L317】【F:src/tabs/security_detail.ts†L748-L833】

### Changed
- Die Depotübersicht priorisiert Kaufpreise in der Wertpapierwährung, ergänzt
  Konto- bzw. EUR-Werte nur bei Bedarf und verbessert damit die Darstellung
  mehrwährungsfähiger Positionen in Tabelle und Screenreader-Texten.【F:src/tabs/overview.ts†L206-L317】
- Die Wertpapierdetailansicht ordnet Kaufmetriken neu, berechnet Kennzahlen für
  alle Währungen und blendet einen FX-Tooltip mit Kurs- und Datumsangabe ein, um
  Abweichungen zwischen nativen und Konto-Werten transparenter zu machen.【F:src/tabs/security_detail.ts†L748-L833】【F:src/tabs/security_detail.ts†L1340-L1394】

### Fixed
- Korrigierte die Kaufpreisberechnung für native Wertpapiere: FIFO-Lose nutzen
  nun die aufbereiteten Transaktionsbeträge (`security_currency_total`,
  `account_currency_total`) und liefern Durchschnittspreise pro Aktie in der
  Sicherheits- und Kontowährung bis in Websocket-, Event- und
  Dashboard-Payloads.【F:custom_components/pp_reader/logic/securities.py†L410-L562】【F:custom_components/pp_reader/data/websocket.py†L160-L232】【F:src/tabs/overview.ts†L206-L317】

### Breaking Changes
- Die Laufzeit-Migration erweitert `portfolio_securities` um native
  Kaufspaltensummen (`security_currency_total`, `account_currency_total`,
  `avg_price_security`, `avg_price_account`). Nach einem Upgrade auf diese
  Version lassen sich ältere Releases ohne manuelles Zurücksetzen der Datenbank
  nicht mehr starten.【F:custom_components/pp_reader/data/db_schema.py†L92-L123】【F:custom_components/pp_reader/data/db_init.py†L111-L191】

### Internal
- Ergänzte Diagnosezähler für fehlende FX-Kurse und native Kaufdaten, um Tests
  und Fehlersuche bei mehrwährungsfähigen Transaktionen zu erleichtern.【F:custom_components/pp_reader/logic/securities.py†L32-L87】

## [0.12.2] - 2025-10-07
### Added
- Persistiert den nativen Durchschnittskaufpreis jeder Depotposition, migriert
  bestehende Datenbanken und liefert das Feld über Sync-, Preis- und Websocket-
  Pfade sowie Event-Payloads.【F:custom_components/pp_reader/data/db_schema.py†L94-L114】【F:custom_components/pp_reader/data/db_init.py†L75-L160】【F:custom_components/pp_reader/logic/securities.py†L31-L274】【F:custom_components/pp_reader/data/sync_from_pclient.py†L983-L1056】【F:custom_components/pp_reader/prices/price_service.py†L360-L578】【F:custom_components/pp_reader/data/event_push.py†L52-L140】【F:custom_components/pp_reader/data/websocket.py†L160-L212】

### Changed
- Das Security-Detail stellt native Durchschnittskaufpreise neben EUR-Werten
  dar, mischt den jüngsten Snapshot-Kurs in die Historie und rendert eine
  Baseline im Chart, sodass Tooltips und Skalen am Referenzwert ausgerichtet
  bleiben.【F:src/tabs/security_detail.ts†L700-L1392】【F:src/content/charting.ts†L303-L346】【F:src/content/charting.ts†L470-L505】

### Fixed
- Portfolio- und Positionsaktualisierungen markieren fehlende Bewertungen und
  behalten Gewinne konsistent, wodurch Gesamtwerte und Events bei
  unvollständigen Kursen nicht länger divergieren.【F:custom_components/pp_reader/data/db_access.py†L721-L803】【F:src/tabs/overview.ts†L1122-L1200】【F:custom_components/pp_reader/data/event_push.py†L52-L140】
- Mehrfache Warnungen zu fehlenden Wechselkursen werden unterdrückt und die
  Oberfläche zeigt bei fehlenden FX-Daten neutrale Platzhalter, sodass Kaufpreis-
  und Tagesänderungen keine ungesicherten Werte mehr anzeigen.【F:custom_components/pp_reader/logic/securities.py†L206-L269】【F:src/tabs/security_detail.ts†L1157-L1270】

## [0.12.1] - 2025-10-06
### Fixed
- Korrigierte die Kennzahlen im Security-Detail-Header: Tagesänderungen übernehmen jetzt native Preisbewegungen (oder einen EUR-Fallback) inklusive Währungskennzeichnung, und Gesamtgewinne fallen auf den Vergleich von Markt- zu Kaufwert zurück, wenn direkte Summen fehlen.【F:src/tabs/security_detail.ts†L560-L618】【F:src/tabs/security_detail.ts†L833-L938】
- Registriert das Dashboard-Verzeichnis bereits während der Einrichtung als statischen Pfad, sodass das Panel auch vor dem ersten Datenabgleich ohne 404 erreichbar ist.【F:custom_components/pp_reader/__init__.py†L302-L336】

### Changed
- Übernahm Versionsparameter und aufgelöste URLs beim Laden der Dashboard-Bundles, damit Cache-Busting und Legacy-Fallbacks zuverlässig funktionieren.【F:custom_components/pp_reader/www/pp_reader_dashboard/panel.js†L120-L179】
- Ergänzte das Aktualisierungsskript für `dashboard.module.js` um das Bereinigen veralteter Hash-Bundles und Source-Maps nach einem Build.【F:scripts/update_dashboard_module.mjs†L1-L86】
- Zentrierte die Überschriften innerhalb der Dashboard-Karten für ein konsistentes Layout, auch im Sticky-Zustand.【F:custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css†L41-L96】

### Internal
- Erweiterte die Test-Fixtures, um registrierte statische Pfade zu erfassen, und ergänzte Prüfungen, die die Panel-Registrierung vor dem ersten Koordinatorlauf absichern.【F:tests/conftest.py†L5-L58】【F:tests/test_panel_registration.py†L1-L70】

## [0.12.0] - 2025-10-05
### Added
- Persist daily Close prices for active securities during Portfolio Performance imports and provide helpers to query their time series for future dashboards.【F:custom_components/pp_reader/data/sync_from_pclient.py†L559-L676】【F:custom_components/pp_reader/data/db_access.py†L204-L289】
- Delivered a security detail dashboard tab that opens from portfolio positions, renders snapshot metrics, and charts range-selectable history with lightweight SVG tooling and cache invalidation for live updates.【F:src/dashboard.ts†L1-L230】【F:src/tabs/security_detail.ts†L1-L210】【F:src/content/charting.ts†L1-L210】
- Exposed always-on WebSocket commands for security drilldowns, including snapshot aggregation and history queries consumed by new frontend API wrappers.【F:custom_components/pp_reader/data/websocket.py†L574-L755】【F:custom_components/pp_reader/data/db_access.py†L291-L384】【F:src/data/api.ts†L60-L150】

### Changed
- Migrated the dashboard frontend to a TypeScript build pipeline powered by Vite, emitting hashed bundles and declaration files while keeping the module loader in sync for cache busting without altering Home Assistant imports.【F:vite.config.mjs†L1-L34】【F:tsconfig.json†L1-L39】【F:scripts/update_dashboard_module.mjs†L1-L70】【F:src/dashboard.ts†L1-L105】
- Removed the deprecated `pp_reader_history` feature flag so historical price access is part of the core experience without configuration toggles.【F:custom_components/pp_reader/feature_flags.py†L1-L67】【F:custom_components/pp_reader/data/websocket.py†L537-L755】
- Refreshed the security detail header with snapshot-based day/total gain metrics, added an `ALL` range selector, and overlaid an average purchase price baseline on the chart for consistent comparisons.【F:src/tabs/security_detail.ts†L32-L611】【F:src/content/charting.ts†L1-L261】【F:custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css†L1-L221】

### Internal
- Added Node-based CI workflow, bundle integrity checks, and dashboard smoke tests to guard the new TypeScript dashboard pipeline.【F:.github/workflows/frontend.yml†L1-L40】【F:tests/frontend/test_build_artifacts.py†L1-L49】【F:tests/frontend/test_dashboard_smoke.py†L1-L36】

## [0.11.0] - 2025-09-27
### Added
- New database helper `fetch_live_portfolios` aggregates current portfolio values and position counts on demand as the single source of truth for WebSocket responses and dashboard load paths.【F:custom_components/pp_reader/data/db_access.py†L428-L484】
- Regression tests safeguard the live aggregation as well as the WebSocket flows for portfolios and FX accounts.【F:tests/test_fetch_live_portfolios.py†L1-L72】【F:tests/test_ws_portfolios_live.py†L1-L94】【F:tests/test_ws_accounts_fx.py†L120-L191】
### Changed
- WebSocket commands (`pp_reader/get_dashboard_data`, `pp_reader/get_portfolio_data`, `pp_reader/get_accounts`, `pp_reader/get_last_file_update`) now load portfolios on demand from the database, fetch missing FX rates, and include coordinator fallbacks for graceful responses.【F:custom_components/pp_reader/data/websocket.py†L65-L341】
- Revaluation and price events rely on `fetch_live_portfolios` to populate affected portfolios with consistent totals and fall back to per-portfolio aggregation when necessary.【F:custom_components/pp_reader/prices/revaluation.py†L1-L118】
- The dashboard renders an expandable table with a DOM-based total footer and now caches only position data so updates work without manual override caches.【F:src/tabs/overview.ts†L1-L200】【F:src/tabs/overview.ts†L420-L720】
- Event handling is unified: `_push_update` emits compact `EVENT_PANELS_UPDATED` payloads through the event loop, and the dashboard subscribes to `panels_updated`, filters by `entry_id`, and queues bus updates for replay after re-renders.【F:custom_components/pp_reader/data/event_push.py†L1-L200】【F:src/dashboard.ts†L230-L520】
### Removed
- Client override caches for portfolio values were removed; the UI now relies entirely on server-side aggregation and DOM recalculations.【F:README.md†L82-L93】
### Internal
- Extended tests for revaluation and sync safeguard the aggregation refactor.【F:tests/prices/test_revaluation_live_aggregation.py†L1-L62】【F:tests/test_sync_from_pclient.py†L1-L60】

## [0.10.7] - 2025-09-26
### Added
- Automatic invalidation of the portfolio override cache when file sync emits a `last_file_update` event as well as when heuristic full-sync `portfolio_values` events (`value` without `current_value`) are detected.
### Fixed
- Prevents persisting stale live price overrides after a full rebuild of the tables.
### Internal
- Utility `_clearPortfolioOverrides(reason)` consolidates logging.

## [0.10.6] - 2025-09-26
### Fixed
- JavaScript error `parseNum is not defined` in `handlePortfolioUpdate` blocked footer/total-wealth updates after events.
- Live price and event patches disappeared after re-render because original backend values were rendered again. Introduced a client-side override cache (`__ppReaderPortfolioValueOverrides`) and reapplied it during render.

### Internal
- Shared parsing utility `parseNumLoose`.
- More robust footer calculation without exceptions.

## [0.10.5] - 2025-09-25
### Fixed
- The frontend received `panels_updated` events but subscribed to the literal name `EVENT_PANELS_UPDATED`, preventing live portfolio updates. Subscription in the dashboard module corrected.
- Incremental portfolio updates were not patched because the initial table used `value` while events sent `current_value`. Normalisation (`current_value`/`value`, `purchase_sum`/`purchaseSum`, `count`/`position_count`) in `handlePortfolioUpdate`.
- Key mismatch for `portfolio_values` from partial revaluation (mapping `value`→`current_value`, `count`→`position_count`) led to ignored updates – transformation and fallback logic added to the price cycle.

### Added
- Extended debug logs for the price cycle (`pv_event push`, payload length, fallback indicators).
- Visual highlight (CSS class `flash-update`) when updating individual portfolio rows.

### Internal
- More robust DOM selection and defensive parsers for numeric values in `updateConfigsWS.js`.
- Fallback aggregation in case revaluation does not yield `portfolio_values` even though price changes occurred.
- No breaking changes to existing data/event contracts; only patch behaviour improved.

## [0.10.4] - 2025-09-25
### Fixed
- Crash during initial sync on a fresh database: used `HasField('high')` / `low` / `volume` on `PHistoricalPrice` (only has `date`, `close`). Now descriptor-based optional access.

## [0.10.3] - 2025-09-25
### Fixed
- Removed incorrect assumption of a non-existent `securities.note` column; startup on a fresh database otherwise failed with `OperationalError: no column named note`.
- Switched to differentiated UPDATE logic for `securities` instead of `INSERT OR REPLACE` so `last_price` / `last_price_source` / `last_price_fetched_at` are not lost.

### Internal
- Documented intentional non-persistence of security notes (no schema extension required).

## [0.10.2] - 2025-09-25
### Changed
- Unified batch size: using `CHUNK_SIZE` from the provider instead of a hard-coded value.
- Resilience: outer try/except in the price cycle prevents uncaught exceptions; error counter is incremented.

### Added
- INFO log when skipping for the first time because of an empty symbol list (separate from discovery INFO).
- Regression test `test_batches_count_regression` (batch count and metadata).

### Fixed
- Potential future drift between provider chunk size and orchestrator.

## [0.10.1] - 2025-09-25
### Fixed
- Added explicit dependency `lxml>=5.2.1` to ensure a Python 3.13 compatible wheel is installed (previous implicit pull of `lxml==4.9.4` via `yahooquery==2.3.7` caused build failure in the dev container).

## [0.10.0] - 2025-09-25
### Added
- Live price integration (Yahoo Finance via `yahooquery`) – updates `last_price`, `last_price_source`, `last_price_fetched_at` in the `securities` table.
- Partial revaluation only when at least one price changes with event push order:
  1. `portfolio_values`
  2. For each affected portfolio `portfolio_positions`
- Options flow:
  - `price_update_interval_seconds` (default 900s, minimum 300s)
  - `enable_price_debug` (limits DEBUG logs to namespace `custom_components.pp_reader.prices.*`)
- Logging and fault tolerance:
  - INFO cycle metadata (symbols_total, batches, quotes_returned, changed, errors, duration_ms, skipped_running)
  - WARN: chunk failures, repeated failures (≥3), zero quotes (deduplicated), currency drift (once per symbol), watchdog >25s
  - ERROR: import failure `yahooquery` → feature disabled
- Currency drift check (single WARN per symbol, no check when currency missing).
- Tests for provider, orchestrator (change/no-change, drift, overlap, error counter reset, migration).

### Changed
- Manifest: added dependency `yahooquery==2.3.7`.
- Minor version bump to 0.10.0.

### Notable Behavior
- Persistence limited to the latest price (`last_price`) + source + fetch timestamp; no history, no additional quote fields.
- Interval recommendation: ≥15 minutes (delayed data, respect rate limits).
- Events only when price actually changes (reduces unnecessary frontend updates).

### Internal
- New modules: `prices.provider_base`, `prices.yahooquery_provider`, `prices.price_service`, `prices.revaluation`.
- Runtime state isolated under `hass.data[DOMAIN][entry_id]` (lock, error counter, drift cache, interval handle).

## [0.9.x] - Earlier
- Preparatory functions for portfolio synchronisation, sensors, and dashboard.
- No live price feature.
