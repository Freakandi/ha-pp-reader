# Changelog
Alle erwähnenswerten Änderungen an diesem Projekt werden in dieser Datei festgehalten.

Format orientiert sich an: Keep a Changelog
Versionierung: SemVer (Minor-Bump für neue Funktionalität ohne Breaking Changes).

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
- Neue Module: [`prices.provider_base`](custom_components/pp_reader/prices/provider_base.py), [`prices.yahooquery_provider`](custom_components/pp_reader/prices/yahooquery_provider.py), [`prices.price_service`](custom_components/pp_reader/prices/price_service.py), [`prices.revaluation`](custom_components/pp_reader/prices/revaluation.py).
- Laufzeit-State isoliert unter `hass.data[DOMAIN][entry_id]` (Lock, Fehlerzähler, Drift-Cache, Intervall-Handle).

## [0.9.x] - Vorher
- Vorbereitende Funktionen für Portfolio Synchronisation, Sensoren & Dashboard.
- Kein Live-Preis Feature.
