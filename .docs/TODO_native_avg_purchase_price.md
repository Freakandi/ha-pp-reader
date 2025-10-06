1. Schema & Models
   a) [x] Add native average column to portfolio securities schema
      - Datei: `custom_components/pp_reader/data/db_schema.py`
      - Abschnitt/Funktion: `PORTFOLIO_SECURITIES_SCHEMA`
      - Ziel: Ergänzt `avg_price_native` REAL (nullable) pro Position und hält Indizes konsistent.
   b) [x] Implement runtime migration for avg_price_native
      - Datei: `custom_components/pp_reader/data/db_init.py`
      - Abschnitt/Funktion: Schema-Migrationsroutine (`_ensure_schema` / `ensure_portfolio_tables`)
      - Ziel: Fügt `avg_price_native` via `ALTER TABLE` hinzu und verhindert doppelte Ausführung.
   c) [ ] Erweitere PortfolioSecurity-Datenmodell um native Durchschnittspreise
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: `PortfolioSecurity` Dataclass & Loader (`get_security_snapshot`, `iter_portfolio_securities`)
      - Ziel: Liest neue Spalte, initialisiert mit `None` und stellt Rückwärtskompatibilität sicher.
   d) [ ] Aktualisiere zugehörige Tests/Fixtures für erweitertes Datenmodell
      - Datei: `tests/` (relevante Module für `db_access`)
      - Abschnitt/Funktion: Snapshot-/Dataclass-Tests
      - Ziel: Deckung für neue Spalte herstellen und Nullwerte berücksichtigen.

2. Calculation Pipeline
   a) [ ] Erweitere FIFO-Hilfsfunktion zur Berechnung nativer Durchschnittspreise
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Abschnitt/Funktion: `db_calculate_sec_purchase_value` (oder neue Helper-Funktion)
      - Ziel: Liefert sowohl EUR-Gesamten als auch gewichteten nativen Durchschnitt pro Security.
   b) [ ] Nutze native Kaufpreise während Portfolio-Sync
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_portfolio_securities`
      - Ziel: Persistiert `avg_price_native` zusammen mit bestehenden Feldern; setzt auf NULL bei null Beständen.
   c) [ ] Stelle Zugriff auf `transaction_units` FX-Metadaten sicher
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: Transaktionsvorbereitung innerhalb `_sync_portfolio_securities`
      - Ziel: Verknüpft native Beträge/FX-Daten mit FIFO-Berechnung ohne zusätzliche RPCs.
   d) [ ] Ergänze Tests für FIFO-Native-Aggregation
      - Datei: `tests/` (Logik & Sync Szenarien)
      - Abschnitt/Funktion: Unit- und Integrationstests zu `logic.securities` und Sync
      - Ziel: Deckt Käufe/Verkäufe in EUR und Fremdwährungen inklusive FX-Lücken ab.

3. API Surface & Serialization
   a) [ ] Liefere gespeicherten native average in Snapshot-Routinen
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: `get_security_snapshot`
      - Ziel: Gibt `avg_price_native` unverändert zurück und entfernt EUR→Native Umrechnungen.
   b) [ ] Aktualisiere WebSocket/REST Payloads
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt/Funktion: Serializer für `portfolio_security`/`security_snapshot`
      - Ziel: Überträgt `avg_price_native`, toleriert NULL, behält bestehende Felder.
   c) [ ] Passe API Tests an
      - Datei: `tests/` (Websocket/API Tests)
      - Abschnitt/Funktion: Snapshot/Endpoint-Assertions
      - Ziel: Erwartet neue Feldwerte und prüft Nullverhalten.

4. Frontend Integration
   a) [ ] Verwende gelieferten nativen Durchschnittspreis ohne Fallbacks
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt/Funktion: `ensureSnapshotMetrics`
      - Ziel: Entfernt FX-Heuristiken, vertraut auf `average_purchase_price_native` und behandelt `null` korrekt.
   b) [ ] Aktualisiere Visualisierungskomponenten
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt/Funktion: Rendering der Detailmetrik & Chart-Baseline
      - Ziel: Verwendet native Werte für Achsen/Baselines; behält EUR Vergleichswerte.
   c) [ ] Ergänze Frontend Tests/Typen
      - Datei: `tests/` oder `src/__tests__/` (TS Testdateien) & `src/types/`
      - Abschnitt/Funktion: Snapshot/Chart Tests & Typdefinitionen
      - Ziel: Erwartet `average_purchase_price_native` als optionales Feld und deckt Rendering ab.

5. Dokumentation & Migration Hinweise
   a) [ ] Dokumentiere Schemaänderung & Datenfluss
      - Datei: `ARCHITECTURE.md`
      - Abschnitt/Funktion: Datenmodell / Berechnungsmodell
      - Ziel: Beschreibt neues Feld, Sync-Pipeline und Frontend-Verbrauch.
   b) [ ] Ergänze CHANGELOG-Eintrag
      - Datei: `CHANGELOG.md`
      - Abschnitt/Funktion: Unreleased / kommende Version
      - Ziel: Notiert Einführung nativer Durchschnittspreise und Migration.
   c) [ ] Aktualisiere Entwickler-Doku bei Bedarf
      - Datei: `README-dev.md` oder `README.md`
      - Abschnitt/Funktion: Setup/Feature Beschreibung
      - Ziel: Weist auf neue Felder und Testabdeckung hin.

6. Verifikation & Migration Tests
   a) [ ] Führe Migration gegen Beispiel-DB aus
      - Datei: `scripts/` (Migration Helper) / manuelle DB-Datei
      - Abschnitt/Funktion: QA-Schritte
      - Ziel: Prüft, dass `ALTER TABLE` sauber läuft (`PRAGMA table_info`).
   b) [ ] Manuelle Validierung von USD/CHF Positionen
      - Datei: QA-Protokoll
      - Abschnitt/Funktion: Manual Testing Checklist
      - Ziel: Bestätigt, dass Chart-Baseline und Kennzahlen native Werte verwenden.
   c) [ ] Automatisierte Testläufe ausführen
      - Datei: N/A
      - Abschnitt/Funktion: `pytest`, `npm run test`, `npm run typecheck`
      - Ziel: Sicherstellen, dass Backend/Frontend Tests nach Änderungen bestehen.

Optional
   a) [ ] Logging verbessern, wenn FX-Daten fehlen
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Abschnitt/Funktion: Native Durchschnittsberechnung
      - Ziel: Warnt bei Rückfall auf EUR-basierte Preise.
   b) [ ] Cache-Invalidierung für alte Snapshots prüfen
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt/Funktion: Snapshot Cache Management
      - Ziel: Ungültige ältere Snapshots entfernen, sobald neue Spalte verfügbar ist.
