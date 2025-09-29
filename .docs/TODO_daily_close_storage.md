# Daily Close Storage – Implementierungs-Checkliste

1. Datenbankschema absichern
   a) [x] Index-Migration für `historical_prices`
      - Datei: `custom_components/pp_reader/data/db_init.py`
      - Abschnitt/Funktion: `initialize_database_schema`, Hilfsfunktionen für Migrationslogik
      - Ziel: Sicherstellen, dass beim Initialisieren/Upgraden ein `CREATE INDEX IF NOT EXISTS idx_historical_prices_security_date ON historical_prices(security_uuid, date)` ausgeführt wird, damit Abfragen auf Zeitreihen performant laufen.
   b) [x] Schema-Kommentar zu Retention ergänzen
      - Datei: `custom_components/pp_reader/data/db_schema.py`
      - Abschnitt/Funktion: Definition von `historical_prices` in `SECURITY_SCHEMA`
      - Ziel: Dokumentieren, dass Close-Werte für aktive Wertpapiere vollständig gehalten werden und welche (ggf. spätere) Aufbewahrungsregeln gelten.

2. Importer für Tages-Schlusskurse härten
   a) [x] Aktive Wertpapiere vor Persistenz filtern
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_securities`
      - Ziel: Nur Securities mit `retired = 0` für neue Einträge in `historical_prices` berücksichtigen und trotzdem bestehende Historie für bereits archivierte Papiere bewahren.
   b) [x] Preislisten pro Security deduplizieren und sortieren
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_securities`
      - Ziel: Preise nach Datum sortieren, Duplikate pro `(security_uuid, date)` entfernen und fehlende Pflichtfelder (`close`) validieren, bevor geschrieben wird.
   c) [x] Batch-Insert via `executemany`
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_securities`
      - Ziel: Gesäuberte Preislisten gesammelt per `executemany` mit `INSERT OR REPLACE` einspielen, damit große Dateien performant verarbeitet werden.
   d) [x] Future-Dates und Inkonsistenzen bereinigen
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_securities`
      - Ziel: Datensätze mit Datum > heutiger Tag oder außerhalb des importierten Bereichs verwerfen bzw. protokollieren.
   e) [x] Import-Statistiken um Historien-Counter erweitern
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: Stats-/Logging-Block im Importer
      - Ziel: Anzahl neu geschriebener bzw. übersprungener Close-Zeilen erfassen, um spätere Validierung zu erleichtern.

3. Datenzugriff auf Close-Serien bereitstellen
   a) [x] Generator-Helfer `iter_security_close_prices`
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: Neuer Funktionsblock unterhalb bestehender Getter
      - Ziel: Reihenweise `(date, close)` für eine Security optional gefiltert nach `start_date`/`end_date` in aufsteigender Reihenfolge liefern; Eingabewerte validieren.
   b) [x] Komfortfunktion `get_security_close_prices`
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: Direkt neben dem Generator
      - Ziel: Vollständige Liste der Close-Paare auf Basis des Generators materialisieren, damit Consumer ohne Generator-Handling arbeiten können.
   c) [x] Fehlerbehandlung und Logging ergänzen
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: Neue Helper aus 3a/3b
      - Ziel: Einheitliches Logging bei SQLite-Fehlern, damit Tests und Nutzer Fehlerursachen nachvollziehen können.

4. Feature-Flag & WebSocket-Schnittstelle vorbereiten
   a) [x] Feature-Flag-Helfer anlegen
      - Datei: `custom_components/pp_reader/feature_flags.py` (neu)
      - Abschnitt/Funktion: `is_enabled(name: str, hass: HomeAssistant)` bzw. Getter/Registry
      - Ziel: Zentrales Flag `pp_reader_history` verwalten (Konfigurationsquelle: `config_entry.options` oder `hass.data`), Default = `False`.
   b) [x] WebSocket-Schema erweitern
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt/Funktion: Neuer Handler `ws_get_security_history`
      - Ziel: Bei aktivem Feature-Flag Close-Serien über `iter_security_close_prices` liefern; andernfalls Fehler `feature_not_enabled` zurückgeben.
   c) [x] Feature-Flag im Entry-Setup dokumentieren
      - Datei: `custom_components/pp_reader/__init__.py`
      - Abschnitt/Funktion: `async_setup_entry`
      - Ziel: Optionen/Defaultwerte für `pp_reader_history` setzen und interne Ablage (`hass.data[DOMAIN][entry_id]["feature_flags"]`) vorbereiten.
   d) [x] CLI-/Dev-Dokumentation zum Flag ergänzen
      - Datei: `README-dev.md`
      - Abschnitt/Funktion: Neuer Unterabschnitt "Feature Flags"
      - Ziel: Schritte erläutern, wie das History-Flag aktiviert wird (z.B. via YAML/Optionsflow), bis UI-Unterstützung folgt.

5. Tests erweitern
   a) [x] Migrationstest für Index hinzufügen
      - Datei: `tests/test_migration.py`
      - Abschnitt/Funktion: Neuer Testfall `test_creates_historical_price_index`
      - Ziel: Verifizieren, dass Initialisierung/Migration den Index `idx_historical_prices_security_date` anlegt.
   b) [x] Import-Deduplikation testen
      - Datei: `tests/test_sync_from_pclient.py`
      - Abschnitt/Funktion: Neuer Testblock für `_sync_securities`
      - Ziel: Sicherstellen, dass doppelte Close-Daten nicht mehrfach persistiert werden und retired-Securities übersprungen werden.
   c) [x] Datenzugriff-Helper testen
      - Datei: `tests/test_db_access.py` (neu)
      - Abschnitt/Funktion: Tests für `iter_security_close_prices` und `get_security_close_prices`
      - Ziel: Grenzen (`start_date`, `end_date`), Sortierung und leere Resultate abdecken.
   d) [x] WebSocket-Feature-Flag testen
      - Datei: `tests/test_ws_security_history.py` (neu)
      - Abschnitt/Funktion: Async-Testcases für `ws_get_security_history`
      - Ziel: Erfolgsfall bei aktivem Flag sowie Fehlerantwort bei deaktiviertem Flag validieren.

6. Dokumentation aktualisieren
   a) [x] Architektur-Übersicht ergänzen
      - Datei: `ARCHITECTURE.md`
      - Abschnitt/Funktion: Kapitel zu Persistenz/Storage
      - Ziel: Datenfluss des Daily-Close-Speichers, Interaktion mit Importer & WebSocket beschreiben.
   b) [ ] Änderungsprotokoll aktualisieren
      - Datei: `CHANGELOG.md`
      - Abschnitt/Funktion: Neuer Eintrag unter "Unreleased"
      - Ziel: Einführung der historischen Close-Speicherung und des optionalen History-WebSockets dokumentieren.

7. Validierung & QA
   a) [ ] Unit- und Integrations-Tests ausführen
      - Datei/Command: `pytest`
      - Ziel: Alle neuen Testfälle bestehen.
   b) [ ] Manuelle Importprobe
      - Datei/Command: Portfolio-Export in Testinstanz laden
      - Ziel: Prüfen, dass `historical_prices` nach Import gefüllt ist und Re-Import ohne Duplikate bleibt.
   c) [ ] WebSocket-Handschlag prüfen
      - Datei/Command: `ws`-Request via `websocket_client.py`/DevTools
      - Ziel: Sicherstellen, dass `pp_reader/get_security_history` bei aktivem Flag Daten liefert.

8. Optionale Nacharbeiten
   a) [ ] Warnungen bei fehlenden Tagesdaten instrumentieren *(Optional)*
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Abschnitt/Funktion: `_sync_securities`
      - Ziel: Logging/Telemetry aufbauen, das Lücken in Zeitreihen erkennt und meldet.
   b) [ ] Retention-Konfiguration einführen *(Optional)*
      - Datei: `custom_components/pp_reader/const.py` + `custom_components/pp_reader/__init__.py`
      - Abschnitt/Funktion: Konstante & Optionshandling
      - Ziel: Optional begrenzte Aufbewahrungsdauer (z.B. Jahre) steuerbar machen.

