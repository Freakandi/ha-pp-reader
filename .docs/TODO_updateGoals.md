# Migration Checkliste: On-Demand DB Aggregation & Entfernung Override-Cache

Ziel: Umstellung auf ausschließlich DB-basierte, On-Demand Aggregationen für Portfolio-Werte (keine Client-Seitigen Overrides), Beibehaltung Lazy-Positions-Laden, konsistente Events & WebSocket Responses.

---

Legende: [ ] offen | [x] fertig

## 1. Backend: On-Demand Aggregation Infrastruktur

a) [x] Neue Funktion `fetch_live_portfolios`
   - Datei: `custom_components/pp_reader/data/db_access.py`
   - Abschnitt: Am Ende der Datei oder bei anderen Fetch-Hilfsfunktionen
   - Inhalt: SQL Join/Queries zur Ermittlung aktueller Portfolio-Werte:
     - Summe `portfolio_securities.current_value`
     - Summe `portfolio_securities.purchase_value`
     - Anzahl aktiver Positionen (Holdings > 0 oder definierte Logik analog bestehender Aggregation)
     - Nutzung `securities.last_price` (falls vorhanden) – ansonsten Fallback bestehender gespeicherter `current_value`
   - Ziel: Single Source of Truth für aktuelle Portfolio-Aggregationen (reduziert Divergenz)

b) [x] Ergänzung: Mikro-Index Validierung
   - Datei: `custom_components/pp_reader/data/db_schema.py`
   - Ziel: Index `idx_portfolio_securities_portfolio` (IF NOT EXISTS) für schnellere Aggregation

c) [ ] Utility `fetch_portfolio_positions_live` (Optional)
   - Datei: `custom_components/pp_reader/data/db_access.py`
   - Ziel: Positionsliste (Name, current_holdings, purchase_value, current_value, Gains) direkt aus DB (für potenzielles späteres Reuse)
   - Optional (Vorbereitung für konsistenten Server-Side Reuse)

d) [x] Fehlerbehandlung & Rückgabeformat vereinheitlichen
   - Datei: `custom_components/pp_reader/data/db_access.py`
   - Ziel: Rückgabe `List[Dict]` analog bestehendem WebSocket Format (`uuid,name,current_value,purchase_sum,position_count`)

---

## 2. Backend: WebSocket Handlers auf On-Demand Aggregation umstellen

a) [x] `ws_get_portfolio_data` nutzt `fetch_live_portfolios`
b) [x] `ws_get_dashboard_data` nutzt `fetch_live_portfolios`
   - Datei: `custom_components/pp_reader/data/websocket.py`
   - Ziel: Kombiniertes Payload nutzt neue Aggregation (Accounts unverändert)

c) [ ] Einheitliche Helper-Funktion `_live_portfolios_payload(hass, entry_id)`
   - Datei: `custom_components/pp_reader/data/websocket.py`
   - Ziel: Duplication vermeiden (DRY)

d) [ ] Anpassung `ws_get_portfolio_positions` (Optional)
   - Datei: `custom_components/pp_reader/data/websocket.py`
   - Ziel: Nutzung `fetch_portfolio_positions_live` falls implementiert

---

## 3. Backend: Event Push Pfad angleichen

a) [ ] Datei-Sync (`sync_from_pclient.py`) – Ersetzung Aggregationsquelle
   - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
   - ZIEL: Nutzung `fetch_live_portfolios` für `portfolio_values` Event (Single Source of Truth)

b) [ ] Preis-Revaluation (`revaluation.py`) – vereinheitlichen
   - Datei: `custom_components/pp_reader/prices/revaluation.py`
   - Abschnitt: Rückgabe der `portfolio_values`
   - Ziel: Verwendung der gleichen Aggregationslogik oder (falls Performance kritisch) Bestätigung identischer Berechnungswege (Kommentar ergänzen)

c) [ ] `_push_update` Aufrufe überprüfen (Reihenfolge unverändert)
   - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
   - Ziel: Reihenfolge bleibt: `portfolio_values` → einzelne `portfolio_positions`

d) [ ] Konsolidierung: Code-Duplizierung für Portfolio Aggregation entfernen
   - Dateien: `coordinator.py`, `sync_from_pclient.py`
   - Ziel: Kommentar + Verweis auf `fetch_live_portfolios` als einzige Quelle

---

## 4. Backend: Coordinator Konsistenz / Legacy Sicherung

a) [ ] Beibehalten bestehender `coordinator.data["portfolios"]` für Sensoren
   - Datei: `custom_components/pp_reader/data/coordinator.py`
   - Ziel: Keine Breaking Changes Sensor-Vertrag (Dokumentation ergänzen)

b) [x] Kommentar ergänzen: "UI/WS nutzt On-Demand; Coordinator nur für Sensoren"
   - Datei: `custom_components/pp_reader/data/coordinator.py`

c) [ ] (Optional) Kennzeichnung veralteter Aggregationspfad (WARN nur im Debug)
   - Datei: `custom_components/pp_reader/data/coordinator.py`

---

## 5. Frontend: Entfernung Override-Cache

a) [ ] Entfernen Merge-Anwendung beim Initial-Render
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
   - Funktion: `renderDashboard`
   - Schritte:
     - Entferne Block: Lesen `window.__ppReaderPortfolioValueOverrides`
     - Entferne Berechnung "Overrides Merge fehlgeschlagen"
     - Ziel: Rein serverseitige Werte anzeigen

b) [ ] Entfernen Definition / Initialisierung globaler Map
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Code: `window.__ppReaderPortfolioValueOverrides = new Map()`
   - Ziel: Kein globaler Override-State mehr

c) [ ] Entfernen aller Schreibzugriffe auf Override-Map
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Funktion: `handlePortfolioUpdate`
   - Ziel: Patch-Logik nur DOM, kein Cache

d) [ ] Entfernen `_clearPortfolioOverrides`
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Ziel: Vollständige Bereinigung; Aufrufer (z.B. `handleLastFileUpdate`) anpassen

e) [ ] Entfernen Heuristik `looksLikeFullSync` die Cache invalidiert
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Ziel: Vereinfachung – kein Baseline/Delta Konzept mehr nötig

f) [ ] Kommentare & Debug Logs aktualisieren
   - Dateien: beide obigen JS Dateien
   - Ziel: Keine Referenzen auf "Overrides", "Baseline", "Cache leeren"

g) [ ] Visuelles Update-Verhalten (`flash-update`) unverändert lassen
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Ziel: Nutzerfeedback bei Preisänderungen bleibt

---

## 6. Frontend: Positions-Lazy-Load Sicherstellung

a) [ ] Review `attachPortfolioToggleHandler` & `reloadPortfolioPositions`
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
   - Ziel: Keine unbeabsichtigte Vorab-Ladung durch andere Änderungen

b) [ ] Kommentar ergänzen: "On-Demand Aggregation ersetzt Client Overrides; Lazy-Positions unverändert"
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`

c) [ ] (Optional) Retry-Button Behavior bestätigen (Fehlerfall)
   - Datei: `overview.js` (Bereich `reloadPortfolioPositions`)
   - Ziel: UX unverändert

---

## 7. Frontend: Total-Wealth Berechnung Update

a) [ ] Prüfen ob Total-Wealth Recalc weiterhin funktioniert ohne Overrides
   - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
   - Funktion: `handlePortfolioUpdate`
   - Ziel: Nutzung reiner DOM Werte; kein toString aus Cache

b) [ ] Entferne toString / dataset.purchaseSum Fallback falls ausschließlich DOM genutzt
   - Datei: obige
   - Ziel: Vereinfachung (nur wenn sicher entbehrlich)

c) [ ] (Optional) Footer "Summe" konsolidieren: Neu-Berechnung aus DOM statt State
   - Datei: `overview.js`
   - Ziel: Einheitlicher Mechanismus

---

## 8. Dokumentation

a) [x] ARCHITEKTURENTRY: Neuer Abschnitt "Berechnungsmodell (On-Demand)"
   - Datei: `ARCHITECTURE.md`
   - Inhalt:
     - Server-Side Single Source via `fetch_live_portfolios`
     - Coordinator weiterhin für Sensoren (Legacy Compatibility)
     - Keine Client Overrides
     - Event Patch Flow unverändert

b) [ ] Anpassung bestehender Abschnitte (Control Flow & Datenfluss)
   - Datei: `ARCHITECTURE.md`
   - Ziel: Ergänze Schritt "Frontend ruft WebSocket → On-Demand Aggregation"

c) [ ] Entferne/aktualisiere Hinweis auf Override-Cache in "Frontend Update"
   - Datei: `ARCHITECTURE.md`

d) [ ] CHANGELOG Eintrag hinzufügen
   - Datei: `CHANGELOG.md`
   - Version: +0.0.1 (Minor)
   - Punkte:
     - Added: On-Demand Portfolio Aggregation
     - Removed: Client Override Cache
     - Internal: Unified aggregation path

e) [ ] Optional: `README.md` Abschnitt "Architektur / Live-Preise" anpassen
   - Datei: `README.md`
   - Ziel: Hinweis auf Echtzeit ohne Client Cache

f) [ ] (Optional) `.docs/updateGoals.md` Fortschrittsmarkierung / Referenz
   - Datei: `.docs/updateGoals.md`
   - Ziel: Migrationstatus dokumentiert

---

## 9. Manifest & Versionierung

a) [ ] Version erhöhen
   - Datei: `custom_components/pp_reader/manifest.json`
   - Ziel: Konsistent mit CHANGELOG

b) [ ] Prüfen ob neue Abhängigkeiten unnötig → keine Änderung
   - Datei: `manifest.json`

---

## 10. Tests

a) [ ] Neuer Test: `test_fetch_live_portfolios_basic`
   - Datei: `tests/test_fetch_live_portfolios.py`
   - Ziel: Korrekte Summen & Counts (Mock DB)

b) [ ] Neuer Test: WebSocket `pp_reader/get_portfolio_data`
   - Datei: `tests/test_ws_portfolios_live.py`
   - Ziel: Antwortstruktur stimmt; keine Coordinator-Abhängigkeit (Patch/MagicMock)

c) [ ] Anpassung existierender Tests falls `coordinator.data["portfolios"]` Assertions -> unverändert lassen (Backward Compatibility)

d) [ ] (Optional) Performance Test (≥100 Positionen) – Messung Laufzeit
   - Datei: `tests/perf/test_live_aggregation_perf.py`
   - Ziel: Basis-Metrik für spätere Optimierungen

e) [ ] Revaluation Pfad Test: Preisänderung → Event nutzt neue Werte
   - Datei: `tests/prices/test_revaluation_live_aggregation.py`

f) [ ] Grep Sicherung: Keine `__ppReaderPortfolioValueOverrides` Referenzen mehr
   - Skript: `grep -R "__ppReaderPortfolioValueOverrides" .` (manuell)
   - Ziel: Vollständige Entfernung

---

## 11. Manuelle Validierung

a) [ ] Ablauf: Start → Dashboard öffnen → Preise ändern (Fake) → Event Patch sichtbar → Reload Panel → Werte identisch
   - Ziel: Persistenz-Konsistenz

b) [ ] Dateiänderung (Full Sync) → Tabelle stimmt (keine "Baseline" Logs mehr)

c) [ ] Expand/Collapse Verhalten unverändert nach mehreren Preiszyklen

d) [ ] Accessibility: ARIA Attribute unverändert (Positions Region)

---

## 12. Bereinigung & Kommentare

a) [ ] Entferne alte Kommentare über "Baseline/Overrides"
   - Dateien: `overview.js`, `updateConfigsWS.js`

b) [ ] Ergänze TODO Marker falls Micro-Caching geplant
   - Datei: `db_access.py` (über `fetch_live_portfolios`)

c) [ ] CODE STYLE: Ruff / ESLint laufen lassen
   - Skripte: `./scripts/lint`

---

## 13. Optionale Optimierungen (nicht Blocker)

a) [ ] Micro-Caching (TTL 2–5s) für `fetch_live_portfolios`
   - Datei: `db_access.py`
   - Ziel: Reduktion DB Load bei schnellem Tab-Wechsel

b) [ ] Batch Positions Prefetch (wenn mehrere Portfolios expandiert)
   - Datei: `websocket.py` (neuer optionaler Command)
   - Ziel: Latenzoptimierung

c) [ ] Frontend Skeleton Loader für erste Portfolio-Werte (falls spürbare Verzögerung)
   - Datei: `overview.js`

d) [ ] Metrics Hook (DEBUG) – Zeitmessung Aggregation
   - Datei: `db_access.py`
   - Ziel: zukünftiges Tuning

---

## 14. Abschluss

a) [ ] Finaler Review / Diff Audit (kein Override Code mehr)
b) [ ] CHANGELOG & Manifest konsistent
c) [ ] Merge in `dev` → später in `main` (Release Flow unverändert)

---

## Referenzen (Dateien)

- `custom_components/pp_reader/data/db_access.py`
- `custom_components/pp_reader/data/websocket.py`
- `custom_components/pp_reader/data/sync_from_pclient.py`
- `custom_components/pp_reader/prices/revaluation.py`
- `custom_components/pp_reader/data/coordinator.py`
- `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
- `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
- `custom_components/pp_reader/manifest.json`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `README.md` (optional)
- `.docs/updateGoals.md` (Statuspflege optional)

---

Statusfelder (manuell pflegen):
- Startdatum:
- Verantwortlich:
- Geplanter Merge:
- Risiken: Performance Regression / Event Reihenfolge
- Mitigation: Tests + Manuelle Validierung

Ende der Checkliste.