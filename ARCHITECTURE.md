# ARCHITEKTUR-DOKUMENTATION – Portfolio Performance Reader (pp_reader)

## Inhaltsverzeichnis
1. [Überblick](#überblick)
2. [Externe Abhängigkeiten (Packages)](#externe-abhängigkeiten-packages)
3. [Interne Modulstruktur](#interne-modulstruktur)
4. [Home Assistant Integration](#home-assistant-integration)
5. [Daten & Persistenz](#daten--persistenz)
6. [Domänenmodell](#domänenmodell)
7. [Control Flow & Datenfluss](#control-flow--datenfluss)
8. [Schnittstellen](#schnittstellen)
9. [Konfiguration](#konfiguration)
10. [Fehlerbehandlung & Beobachtbarkeit](#fehlerbehandlung--beobachtbarkeit)
11. [Leistung & Nebenläufigkeit](#leistung--nebenläufigkeit)
12. [Sicherheit](#sicherheit)
13. [Teststrategie](#teststrategie)
14. [Erweiterbarkeit & Architektur-Entscheidungen](#erweiterbarkeit--architektur-entscheidungen)
15. [Bekannte Lücken/Schulden](#bekannte-lückenschulden)
16. [Glossar](#glossar)
17. [Abdeckungs-Checkliste](#abdeckungs-checkliste)

---

## Überblick
Der Home Assistant Custom Component `pp_reader` (Domain: `pp_reader`) integriert Portfolio- und Finanzdaten aus einer lokalen Portfolio Performance (`.portfolio`) Datei in Home Assistant.
Hauptziele:
- Periodisches Einlesen & Synchronisieren strukturierter Finanzdaten (Konten, Depots, Wertpapiere, Transaktionen).
- Persistenz in einer SQLite-Datenbank für schnelle Aggregationen.
- Bereitstellung von Sensoren und eines benutzerdefinierten Dashboards (Web Component + inkrementelle Updates via WebSocket Events).
- Live-Preisaktualisierung (Yahoo Finance via `yahooquery`) mit minimal-invasiver Aktualisierung nur geänderter Kurse und partieller Revaluation betroffener Portfolios.

Wichtigste Anwendungsfälle:
- Anzeige aktueller Kontostände und Depotwerte in HA.
- Drilldown in Depot-Positionen (Lazy Load).
- Automatische Neuberechnung bei Dateiänderungen (Change Detection per mtime).
- Optionale zyklische Marktpreis-Updates (nur letzter Preis, keine Historie).
- Backup & Wiederherstellung der SQLite-Datenbank.

High-Level Architektur:
Die Architektur besteht aus:
- Import- & Sync-Schicht (Parsing Protobuf → SQLite Sync).
- Datenhaltung (SQLite Schema, Backup Mechanismus).
- Berechnungslogik (Aggregation, Kennzahlen).
- Integration Layer (Coordinator, WebSockets, Events).
- Frontend Panel (Shadow DOM, inkrementelles Patchen).
- Preis-Service (Orchestrator + Provider-Abstraktion).
<!-- DIAGRAMS-PLACEHOLDER -->

---

## Externe Abhängigkeiten (Packages)
Quellen:
- `requirements.txt` (Root)
- `custom_components/pp_reader/manifest.json` (Runtime für HA Integration)

| Paket | Version (manifest/req) | Rolle | Verwendung (Module) |
|-------|------------------------|-------|----------------------|
| homeassistant | 2025.2.4 (requirements.txt) | Host-Framework | Plattform, Config Flow, Entities |
| protobuf | >=4.25.0 | Protobuf Deserialisierung | `data/reader.py`, `name/abuchen/portfolio/client_pb2.*` |
| pandas | >=2.2.0 | (Potentielle Aggregation / evtl. Historik) | Noch nicht prominent sichtbar (evtl. zukünftige Erweiterung) |
| numpy | >=1.26.0 | Numerik | Potenziell für Berechnungen (kein direkter Code-Auszug gezeigt) |
| yahooquery | 2.3.7 | Live-Preis Provider | `prices/` (Provider & Fetch Orchestrator) |
| colorlog | 6.9.0 | Farbige Logs | Globales Logging |
| ruff | 0.11.13 | Linting (Dev) | Entwicklungs-Tooling |
| sqlite3 (Stdlib) | (System) | Persistenz | DB Zugriff in `data/*` |
| asyncio (Stdlib) | - | Nebenläufigkeit | Preis-Orchestrator, Coordinator |

Laufzeit- vs. Entwicklungs-Abhängigkeiten:
- Dev: `ruff`, (Tooling / Lint).
- Runtime: alle anderen (manifest.json definiert HA-relevante requirements; `homeassistant` selbst wird durch HA-Host normalerweise bereitgestellt—hier für Dev Container fixiert).

---

## Interne Modulstruktur
Kompakter Verzeichnisüberblick (aus Repository-Stand):

```
custom_components/pp_reader/
  __init__.py              # HA Entry Points, Panel-Registrierung, Preis-Task Setup
  const.py                 # Domain-Konstanten
  config_flow.py           # Config- & OptionsFlow
  manifest.json            # HA Manifest
  sensor.py                # Sensor Setup Aggregator
  sensors/                 # Einzelne Sensor-Klassen (Accounts, Depots, Gains ...)
  data/
    db_schema.py           # SQL DDL (Tabellen-Schema)
    db_init.py             # Initialisierung ALL_SCHEMAS
    db_access.py           # (implizit) CRUD / Query (Referenzen via Imports)
    reader.py              # Protobuf Parsing (.portfolio)
    coordinator.py         # DataUpdateCoordinator für File→DB Sync
    sync_from_pclient.py   # Diff-Sync aus PClient in DB
    websocket.py           # WebSocket Commands + Event Push Helpers
    backup_db.py           # Backup & Integritätsprüfung
  logic/
    accounting.py          # Aggregation Kontostände
    portfolio.py           # Depot-Bewertungen
    validators.py          # Datenvalidierung
  prices/
    provider_base.py       # Provider-Protocol & Quote Dataclass
    yahooquery_provider.py # Yahoo Finance Implementation (aus Doku referenziert)
    price_service.py       # Orchestrator (Intervall, Lock, DB Updates, Events)
    revaluation.py         # Partielle Revaluation nach Preisänderungen
  www/pp_reader_dashboard/ # Frontend (Panel, JS, CSS)
    panel.js               # Einstieg für Custom Panel
    js/                    # Tabs, Data APIs, Update Handler
    css/                   # Styles
  translations/            # i18n Strings (en/de)
  name/abuchen/portfolio/  # Generierte Protobuf Typen (.pyi)
```

Kurzbeschreibung Hauptmodule:

| Modul | Zweck | Kern-Outputs | Abhängigkeiten |
|-------|-------|--------------|----------------|
| `data/reader.py` | Entpackt & parsed `.portfolio` ZIP/Protobuf | `PClient` Objekt | Protobuf Klassen |
| `data/sync_from_pclient.py` | Diff-Synchronisation nach SQLite | DB Mutationen | `db_access`, `db_schema` |
| `data/coordinator.py` | Taktung & Change Detection Datei (mtime) | `coordinator.data` Struktur (Accounts/Portfolios/Transactions/last_update) | `reader`, `sync_from_pclient`, Aggregationen |
| `data/db_schema.py` | DDL Definition | SQL Statements | - |
| `data/websocket.py` | WebSocket Commands (accounts, portfolios, positions, file update) | JSON Payloads / HA Events | HA websocket_api, db_access |
| `prices/price_service.py` | Preis-Orchestrator (Lock, Scheduling) | Event-Push bei Änderungen | `provider_base`, `yahooquery_provider`, `revaluation` |
| `prices/revaluation.py` | Partielle Neubewertung betroffener Portfolios | Dict mit `portfolio_values`, `portfolio_positions` | DB, Aggregationslogik |
| `sensors/*` | HA Sensor Entities | HA State Updates | Coordinator Data |
| `logic/accounting.py` | Kontostandsberechnungen (inkl. FX-Layer Hinweis) | Summen/Balances | DB Rows / FX |
| `logic/portfolio.py` | Depot-Werte, Kauf-Summen | Aggregierte Werte | DB Rows |
| `logic/validators.py` | Validierungslogik (Transaktionen etc.) | `ValidationResult` | DB & Protobuf Typen |
| `www/...` | Frontend Dashboard mit inkrementellen Updates | DOM Patch | WebSocket Events |
| `backup_db.py` | Backup Rotation & Integrität | Kopien der DB | SQLite, Filesystem |

Konfigurations-/Verhaltens-Flags:
- Preisintervall & Debug: OptionsFlow (`config_flow.py`).
- FX Preload (aus Doku, Modul `currencies/fx.py` – nicht im Ausschnitt gezeigt, aber erwähnt).
- Change Detection: mtime minute-truncation (Coordinator).
- Preis-Live-Update: Lock + Skip bei Overlap.

---

## Home Assistant Integration
Manifest: `custom_components/pp_reader/manifest.json`
Wesentliche Felder:
```json
{
  "domain": "pp_reader",
  "name": "Portfolio Performance Reader",
  "version": "0.10.0",
  "requirements": ["protobuf>=4.25.0","pandas>=2.2.0","numpy>=1.26.0","yahooquery==2.3.7"],
  "iot_class": "local_polling",
  "loggers": ["custom_components.pp_reader","custom_components.pp_reader.prices"]
}
```

### Lifecycle Hooks
| Hook | Ort | Funktion |
|------|-----|----------|
| `async_setup` | `__init__.py` | Statische Pfade registrieren, WebSocket Commands registrieren |
| `async_setup_entry` | `__init__.py` | DB Schema init, Coordinator erstellen, Panel registrieren, Preis-Task initialisieren, Backup starten |
| `async_unload_entry` | `__init__.py` | Tasks canceln, Cleanup state keys, Plattform entladen |
| Reload Listener | `entry.add_update_listener` | Interval-/Debug-Änderungen anwenden |

### `hass.data` Struktur (erweitert)
Pro Config Entry:
```python
hass.data["pp_reader"][entry_id] = {
  "file_path": <str>,
  "db_path": <Path>,
  "coordinator": <PPReaderCoordinator>,
  # Preis-Service State (per initialize_price_state):
  "price_lock": asyncio.Lock(),
  "price_task_cancel": <callable or handle>,
  "price_error_counter": int,
  "price_currency_drift_logged": set(),
  # Weitere Caches (implizit möglich)
}
```
(Preis-spezifische Keys aus Dokumentation `.docs/nextGoals.md` / `.docs/DEV_PRICE_TODO.md` abgeleitet.)

### Config Flow & Options Flow
`config_flow.py`:
- Schritte:
  1. `user`: Eingabe `file_path`, Auswahl ob Default DB Pfad (`/config/pp_reader_data/<name>.db`).
  2. Optional `db_path`: Benutzerdefiniertes Verzeichnis validieren → DB Datei wird benannt nach Portfolio-Datei-Stem.
- Parsing-Validierung: `parse_data_portfolio` (Fehler → `parse_failed`).
- OptionsFlow Felder:
  - `price_update_interval_seconds` (≥300, Default 900).
  - `enable_price_debug` (bool).
- Reload übernimmt Änderungen (Logger-Level Anpassung für Namespace `custom_components.pp_reader.prices`).

### Sensoren
`custom_components/pp_reader/sensor.py` + `sensors/*`:
- Nutzen `CoordinatorEntity` (pull aus `coordinator.data`).
- Rounding: 2 Dezimalstellen erst am Boundary.
- Naming: slug aus UUID + semantischer Suffix (`_balance`, `_value`, `_purchase_sum`, `_gain_abs`, `_gain_pct`).
- Keine direkte Polling-Schleife; rely on Coordinator Updates (1-Min File-Check + Events bei Preis-Updates).
- Gain-Sensoren hängen von aktuellen Portfolio Werten (mögliche interne Abhängigkeit zu `PortfolioDepotSensor`).

### Events & WebSocket
- HA Event `EVENT_PANELS_UPDATED` (laut Architektur-Notiz in `.github/copilot-instructions.md` und Beschreibungen); Payload-Typen:
  - `accounts`
  - `last_file_update`
  - `portfolio_values`
  - `portfolio_positions`
- Reihenfolge bei Preisänderungen:
  1. `portfolio_values`
  2. pro betroffenes Portfolio `portfolio_positions`
- WebSocket Commands (`data/websocket.py`):
  - `pp_reader/get_dashboard_data`
  - `pp_reader/get_accounts`
  - `pp_reader/get_last_file_update`
  - `pp_reader/get_portfolio_data`
  - `pp_reader/get_portfolio_positions`
- Frontend Lazy-Load von Positionen (`fetchPortfolioPositionsWS`) bei Expand.

### Custom Panel
`www/pp_reader_dashboard/panel.js` lädt Web Component `<pp-reader-panel>` → Shadow DOM → `<pp-reader-dashboard>`.
DOM-Patch über `updateConfigsWS.js` (Handlers: `handleAccountUpdate`, `handlePortfolioUpdate`, `handlePortfolioPositionsUpdate`, `handleLastFileUpdate`).
Strikte DOM-Klassen/Attribute (z. B. `.portfolio-row[data-portfolio=UUID]`) → keine Voll-Render, inkrementelles Patchen.

---

## Daten & Persistenz
### Quellen
- Primär: Portfolio Performance `.portfolio` Datei (ZIP mit Protobuf Content) → Parsing durch `data/reader.py`.
- Live-Preise: YahooQuery (nur letzter Preis persistiert).

### SQLite Schema
Definiert in `data/db_schema.py`. Tabellen (Auszug):

| Tabelle | Zweck | Wichtige Spalten |
|---------|-------|------------------|
| `accounts` | Konten-Stammdaten | uuid, name, currency_code, balance |
| `securities` | Wertpapiere + Preisfelder | uuid, ticker_symbol, last_price (1e-8 Skala), last_price_source, last_price_fetched_at |
| `portfolios` | Depotstammdaten | uuid, name, reference_account |
| `portfolio_securities` | Bestände im Depot | portfolio_uuid, security_uuid, current_holdings, purchase_value, avg_price (generated), current_value |
| `transactions` | Bewegungen | uuid, type, date, amount, shares, security |
| `transaction_units` | Mehrwährungs-/FX-Einheiten | fx_rate_to_base, currency_code |
| `historical_prices` | Historische Kurse (nur aus PP Datei) | security_uuid, date, close |
| `plans`, `watchlists`, `taxonomies`, `dashboards` | Zusätzliche PP Entitäten | id/name/... (teils geringe Nutzung aktuell) |
| `taxonomy_*` | Klassifikationen | classifications, assignments |
| `plan_attributes`, `portfolio_attributes`, ... | Key-Value Erweiterungen | key, value |

Live-Preis Erweiterungen (aus Schema Ausschnitt):
```sql
last_price INTEGER,           -- 10^-8 Skalierung
last_price_date INTEGER,
last_price_source TEXT,
last_price_fetched_at TEXT    -- UTC 'YYYY-MM-DDTHH:MM:SSZ'
```

### Migrationsstrategie
- Neue Spalten via `CREATE TABLE IF NOT EXISTS` (Idempotenz).
- Änderungen (fehlende Spalten) lt. ToDo-Liste ggf. Try/Except ALTER (Dokumentation markiert das Item als erledigt).
- `ALL_SCHEMAS` (in `db_init.py`, nicht im Auszug, aber konzeptionell) muss erweitert werden, sonst werden Tabellen nicht erzeugt → wichtiger Pitfall.

### Backups
`data/backup_db.py`:
- Zeitgesteuerte Backups (Intervall nicht im Ausschnitt, aber Funktion `setup_backup_system` registriert Intervall).
- Integritätsprüfung via `PRAGMA integrity_check`.
- Speicherung in Unterverzeichnis `backups/` relativ zur DB (`BACKUP_SUBDIR`).

### Caching
- In-Memory:
  - `coordinator.data` für Sensors & Panel.
  - Preis-Service: `price_currency_drift_logged` Set, `price_error_counter`.
  - Frontend: Positionscache `window.__ppReaderPortfolioPositionsCache`.

### Invalidierung
- File mtime (minute-truncated) → bei Änderung: parse + diff.
- Preisänderungen → partielle Revaluation nur betroffener Portfolios.

---

## Domänenmodell
Zentrale Entitäten (Mapping Protobuf → DB → App):
| Entität | Quelle | Kerneigenschaften | Hinweise |
|---------|--------|------------------|----------|
| Account | `PAccount` | uuid, name, currency, is_retired | Balance berechnet (Aggregation) |
| Security | `PSecurity` | uuid, name, ticker_symbol, feed, currency_code, retired | Preisfelder skaliert |
| Portfolio | `PPortfolio` | uuid, name, reference_account | Wert = Summe Positionen |
| Position | (Derived) | holdings, purchase_value, current_value, gains | Aus Tabelle `portfolio_securities` |
| Transaction | `PTransaction` | type, amount, shares, date, currency | Multi-Units via `transaction_units` |
| HistoricalPrice | `PHistoricalPrice` / `PFullHistoricalPrice` | date, close, high, low | Nur aus Datei, keine Yahoo Persistenz |

Invarianten / Regeln:
- Preis-Skalierung: Alle externen Float-Preise → `int(round(price * 1e8))`.
- Rounding: Python "Bankers Rounding" (Standard `round()`).
- EUR-Konversion: FX Preload vor Cross-Currency Berechnungen (siehe Instruktions-Dokumentation).
- Keine Mutationen existierender Coordinator-Key-Shapes (`accounts`, `portfolios`, `transactions`, `last_update`).

---

## Control Flow & Datenfluss
### 1. Initial Setup
1. User konfiguriert Integration (Config Flow) → DB Pfad + Portfolio Datei.
2. `async_setup_entry` init DB Schema, legt Coordinator & Preis-Service-State an.
3. Sofortiger Initiallauf des Preis-Orchestrators (falls aktiv) + Panel-Registrierung.

### 2. Periodische Datei-Synchronisation
1. Coordinator `_async_update_data` jede Minute: prüft mtime (minute-truncation).
2. Wenn geändert: parse (`reader.parse_data_portfolio`).
3. Diff-Sync (`sync_from_pclient`): Upsert + harte Deletes (kein Soft Delete).
4. Aggregationen (Konten, Portfolios, Transaktionen).
5. Update `coordinator.data` + Event Push `accounts`, `portfolio_values` etc.

### 3. Preiszyklus (Live-Preise)
1. Lock prüfen (Overlap → Skip, Metadaten: `skipped_running=True`).
2. Symbol-Autodiscovery (aktive/ nicht retired Wertpapiere mit `ticker_symbol`).
3. Chunking (Größe 50) → sequential fetch via YahooQuery Provider.
4. Filter: `price > 0`, Drift-Prüfung (einmalige WARN).
5. Change Detection: nur geänderte `uuid`s persistieren.
6. Partielle Revaluation (`revaluation.revalue_after_price_updates`).
7. Event Reihenfolge: `portfolio_values` → je Portfolio `portfolio_positions`.

### 4. Frontend Update
1. WebSocket Subscription empfängt Events.
2. DOM Patch (kein Full Re-Render) über Handler.
3. Lazy Load: Bei Expand Portfolio → `pp_reader/get_portfolio_positions`.

### 5. Backup Cycle
1. Zeitgesteuerte Ausführung → Integritätsprüfung → Kopie in `backups/`.
2. Optionale Aufbewahrungslogik (implizit—Details nicht sichtbar; potenziell erweiterbar).

### 6. Unload / Reload
1. Unload: Cancel Tasks, Entferne `price_*` State Keys.
2. Reload: Reinitialisiert Preisintervall & Debug Logging.

Fehlerpfad: Exceptions im Sync → `UpdateFailed` (Coordinator) → HA Retry-Mechanismus.

---

## Schnittstellen
### Öffentliche (stabile) Python APIs (implizit genutzt)
| Signatur (Kurz) | Zweck |
|-----------------|-------|
| `parse_data_portfolio(path) -> PClient | None` (`data/reader.py`) | Protobuf Parsing |
| `PPReaderCoordinator` (`data/coordinator.py`) | Lebenszyklus & Data Contract |
| `initialize_price_state(hass, entry_id, interval)` (`prices/price_service.py`) | Preiszyklus starten (aus Doku) |
| `revalue_after_price_updates(hass, conn, updated_security_uuids) -> dict` | Partielle Revaluation |
| `setup_backup_system(hass, db_path)` (`data/backup_db.py`) | Backup Scheduling |

(Stabilität basiert auf zentraler Nutzung; formell keine „public API“ Kennzeichnung.)

### WebSocket Commands
| Type | Request Felder | Response Payload |
|------|----------------|------------------|
| `pp_reader/get_accounts` | `entry_id` | `{ accounts: [...] }` |
| `pp_reader/get_portfolio_data` | `entry_id` | `{ portfolios: [...] }` |
| `pp_reader/get_portfolio_positions` | `entry_id`, `portfolio_uuid` | `{ positions: [...] }` |
| `pp_reader/get_last_file_update` | `entry_id` | `{ last_file_update: ISO8601 }` |
| `pp_reader/get_dashboard_data` | `entry_id` | Kombi Accounts + Portfolios |

Timeout/Retry: WebSocket folgt HA Standard (keine expliziten Retry-Wrapper hier).

### Events
| HA Event | Datenfelder | Auslöser |
|----------|-------------|----------|
| `EVENT_PANELS_UPDATED` | `{"entry_id":..., "type": <data_type>, "data": ...}` | `_push_update` (Datei-/Preisänderung) |

### Services
In `translations/en.json` Service `trigger_backup_debug` dokumentiert – Implementierung (Service Registrierung) nicht im aktuellen Ausschnitt sichtbar. Mögliche Diskrepanz: Service existiert evtl. oder ist geplant.

---

## Konfiguration
| Option | Quelle | Default | Validierung | Wirkung |
|--------|--------|---------|-------------|---------|
| `file_path` | Config Flow | - | Muss existierende Datei sein | Quelle Portfolio Daten |
| `db_path` / default | Config Flow | `<DEFAULT_DB_DIR>/<stem>.db` | Verzeichnis muss existieren | Persistenz |
| `price_update_interval_seconds` | Options Flow | 900 | ≥300 | Scheduling Preiszyklus |
| `enable_price_debug` | Options Flow | False | bool | Logger Level Namespace Preise |

Weitere implizite Werte:
- `DEFAULT_DB_DIR = /config/pp_reader_data`
- Zeitformat für Persistenz & Events: `YYYY-MM-DDTHH:MM:SSZ` (UTC, ohne ms)

Credentials: Keine (externe API `yahooquery` ohne Schlüssel für Basisdaten).

---

## Fehlerbehandlung & Beobachtbarkeit
Strategien:
- Datei-Sync Fehler → `UpdateFailed` (Retry durch HA).
- Preis-Orchestrator: Broad Catch, zählt Fehler (`price_error_counter`), WARN bei wiederholtem Scheitern (>=3).
- Currency Drift: Einmalige WARN pro Symbol (`price_currency_drift_logged`).
- Overlap: DEBUG + Skip Flag.
- Zero Quotes: Dedizierte WARN (dedupliziert ≤ alle 30min, laut Doku).
- Watchdog >25s Laufzeit: WARN.

Logging Namespaces:
- `custom_components.pp_reader`
- `custom_components.pp_reader.prices.*`

Strukturierte INFO Zeile (Preis-Zyklus):
```
prices_cycle symbols=<N> batches=<B> returned=<R> changed=<C> errors=<E> duration=<ms> skipped_running=<bool>
```

Keine dedizierten Metriken / Traces (keine Observability-Frameworks im Code ersichtlich).

---

## Leistung & Nebenläufigkeit
Mechanismen:
- Coordinator im HA Event Loop (I/O Bound: SQLite, File mtime, Protobuf Parse via Executor bei Bedarf möglich).
- Preis-Orchestrator: Sequenzielle Batches (CHUNK_SIZE=50), Minimierung externer Latenz.
- Lock (`price_lock`) verhindert Überlappung.
- Revaluation partiell (nur betroffene Portfolios) → begrenzte Berechnungsarbeit.
- DB Nutzung: Einfache Indizes (`idx_transactions_security`, `idx_transaction_units_currency`) vorhanden.
- Potenzielle Bottlenecks:
  - Große `.portfolio` Datei Parse.
  - Reihenfolge serieller YahooQuery Batches (Balance Latenz vs. Rate Limit).
- Kein aggressives Caching für Positions-Join auf Serverseite (Frontend cached).

---

## Sicherheit
Aspekte:
- Lokale Dateien: Portfolio & SQLite im Container (Zugriffskontrolle durch Host/HA).
- Keine geheimen Tokens / API Keys (YahooQuery Basisscope).
- Supply Chain: Fixierte Versionsabhängigkeiten (manifest.json).
- Angriffsoberflächen:
  - WebSocket Commands (nur lesend, validieren `entry_id`).
  - Kein externer Schreib-Endpunkt.
- Backup Kopien (potenziell sensible Finanzdaten) → Empfehlung: Dateisystemberechtigungen restriktiv gestalten (nicht im Code erzwungen).

---

## Teststrategie
Referenzen (ToDo-Doku `.docs/DEV_PRICE_TODO.md`):
- Tests: `tests/prices/test_yahooquery_provider.py`, `tests/prices/test_price_service.py` (aufgeführt als erledigt).
- Fokusfälle:
  - Fehlerzähler Reset
  - Null-/0-Preis Filter
  - Chunk Fehler Toleranz
  - Currency Drift Deduplikation
  - Event-Push nur bei Änderungen
- Lokales Ausführen:
  - Virtuelle Umgebung via `./scripts/setup_container`
  - HA Start: `./scripts/develop` oder `./scripts/codex_develop`
  - (Test-Runner nicht direkt sichtbar; vermutlich `pytest` standard—Empfehlung: Ergänzung in README falls noch nicht vorhanden.)

Empfehlung (Erweiterbar):
- Unit Tests für Aggregationen (`logic/accounting.py`, `logic/portfolio.py`).
- Integration Tests: End-to-End (Dateiänderung → Sensorstate).
- Frontend: Smoke-Test Panel Aufbau (derzeit fehlend).

---

## Erweiterbarkeit & Architektur-Entscheidungen
### Extension Points
| Bereich | Mechanismus | Beschreibung |
|---------|-------------|--------------|
| Preis-Provider | `PriceProvider` Protocol (`prices/provider_base.py`) | Weitere Provider implementierbar |
| Events | `_push_update` (WebSocket/Event Layer) | Zusätzliche Datentypen möglich (Regel: keine Mutation bestehender Payloads) |
| Sensoren | Neue Klassen in `sensors/` | Nutzung `CoordinatorEntity` |
| Schema | `db_schema.py` + `ALL_SCHEMAS` | Neue Tabellen/Spalten ergänzen |

### Wichtige Entscheidungen (ADR-Stil)
| Entscheidung | Kontext | Konsequenz |
|--------------|---------|------------|
| Nur letzter Live-Preis persistiert | Minimierung DB & Scope | Keine intraday Historie / reduzierte Komplexität |
| Partielle Revaluation | Performance | Schnelle UI Reaktion bei Preisänderungen |
| Harte Deletes beim Sync | Datenkonsistenz vs. Wiederherstellung | Entfernte Entities verschwinden sofort (kein Soft-Recovery) |
| Ereignis-Patch statt Full Render (Frontend) | Vermeidung Flicker, Performance | Komplexere DOM-Selektor Logik |
| Bankers Rounding & 1e8 Skalierung | Finanzgenauigkeit | Einheitliche Darstellung / Vergleichbarkeit |
| Overlap Skip statt Queue | Einfachheit | Potenziell ausgelassene Zyklen bei Dauerlast |

---

## Bekannte Lücken/Schulden
| Bereich | Beschreibung | Auswirkung | Empfehlung |
|---------|--------------|------------|-----------|
| Service Doku vs. Implementierung | `trigger_backup_debug` in translations; Service-Registrierung nicht nachgewiesen | Inkonsistenz UI | Prüfen & ergänzen oder entfernen |
| Fehlende Tests für Coordinator Aggregationen | Nicht dokumentiert | Risiko unerkannter Regressions | Unit Tests hinzufügen |
| Fehlende Security Hardening Hinweise | Keine chmod / Zugriffskontrolle | Potenzielles Disclosure Risiko | README Sicherheitsabschnitt erweitern |
| Kein formales Migrationsframework | Nur DDL Idempotenz | Edge Cases bei Schema-Änderungen | Lightweight Migration Layer |
| Fehlende Frontend Tests | UI Regressions möglich | Niedrige Abdeckung | Cypress / Playwright Pipeline |
| Abwesenheit FX Implementations-Auszug | Nur referenziert | Verständnislücke | Dokumentation FX Quelle ergänzen |
| Keine Rate-Limit Strategie für Preise | Provider-Limits unklar | Evtl. Blockierung | Adaptive Intervalle (Future) |
| Diagramme fehlen | Geplant | Geringere Onboarding Geschwindigkeit | Nachreichen (Anker vorhanden) |

Verweis auf Diagramm-Placeholder: <!-- DIAGRAMS-PLACEHOLDER -->

---

## Glossar
| Begriff | Definition |
|---------|-----------|
| Coordinator | HA `DataUpdateCoordinator` zur periodischen Aktualisierung |
| Revaluation | Partielle Neubewertung nach Preisänderung |
| Drift (Currency Drift) | Abweichung zwischen persistierter Währung & Quote-Währung |
| Portfolio (Depot) | Sammlung von Positionen (Wertpapieren) |
| Position | Bestand (Holdings) eines Wertpapiers im Depot |
| Quote | Laufzeit-Preisobjekt eines Symbols (inkl. Metadaten) |
| Event Patch | Inkrementelle DOM-Aktualisierung auf Frontend ohne Re-Render |
| Overlap Skip | Mechanismus zur Vermeidung paralleler Preiszyklen |
| Diff-Sync | Upsert + harte Delete von entfallenen Entities (Datei→DB) |
| FX Preload | Vorab Laden von Wechselkursen zur EUR-Konversion |
| Lazy Load | Datenabruf (z. B. Positionen) erst bei Bedarf (UI Expand) |

---

## Abdeckungs-Checkliste
| Kapitel | Erfüllt |
|---------|---------|
| Überblick | ✅ |
| Externe Abhängigkeiten | ✅ |
| Interne Modulstruktur | ✅ |
| Home Assistant Integration | ✅ |
| Daten & Persistenz | ✅ |
| Domänenmodell | ✅ |
| Control Flow & Datenfluss | ✅ |
| Schnittstellen | ✅ |
| Konfiguration | ✅ |
| Fehlerbehandlung & Beobachtbarkeit | ✅ |
| Leistung & Nebenläufigkeit | ✅ |
| Sicherheit | ✅ |
| Teststrategie | ✅ |
| Erweiterbarkeit & Architektur-Entscheidungen | ✅ |
| Bekannte Lücken/Schulden | ✅ |
| Glossar | ✅ |
| Diagramm-Placeholder vorhanden | ✅ |

---

_Ende der ARCHITEKTUR-DOKUMENTATION._