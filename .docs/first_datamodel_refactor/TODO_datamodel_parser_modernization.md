1. [ ] Phase 0 – Modul- und Modell-Scaffolding
   a) [x] Lege das Paket `custom_components/pp_reader/models` an und exportiere die Parser-Datamodelle über `__all__`.
      - Dateipfad(e): custom_components/pp_reader/models/__init__.py
      - Betroffene Funktion(en)/Abschnitt(e): Modulinitialisierung, `__all__`
      - Ziel/Ergebnis der Änderung: Einheitlicher Import-Pfad für alle Parser-Dataclasses (z.B. `from custom_components.pp_reader.models import parsed`)
   b) [x] Implementiere in `custom_components/pp_reader/models/parsed.py` dataclasses für Accounts, Portfolios, Securities, Transactions, TransactionUnits, HistoricalPrices und einen Container `ParsedClient` inkl. `from_proto`-Klassenmethoden.
      - Dateipfad(e): custom_components/pp_reader/models/parsed.py
      - Betroffene Funktion(en)/Abschnitt(e): Dataclasses `ParsedAccount`, `ParsedPortfolio`, `ParsedSecurity`, `ParsedTransaction`, `ParsedTransactionUnit`, `ParsedHistoricalPrice`, `ParsedClient`
      - Ziel/Ergebnis der Änderung: Typisierte Repräsentation der Portfolio-Performance-Payloads gemäss `.docs/backend_workstreams.md` (Abschnitt „Parser Modernization“) als Basis für Staging-Writes
   c) [x] Ergänze zugehörige Unit-Tests, die Beispiel-`PClient`-Fixtures aus `datamodel/parsed_pp_data.md` in die neuen Dataclasses überführen und Feldwerte verifizieren.
      - Dateipfad(e): tests/models/test_parsed_models.py (neu); ggf. tests/fixtures/portfolio/
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_parsed_client_from_proto_accounts`, `test_parsed_client_from_proto_securities`, `test_parsed_client_from_proto_transactions`
      - Ziel/Ergebnis der Änderung: Sicherstellung, dass `from_proto` alle Pflichtfelder und optionale Strukturen korrekt mappt

2. [ ] Phase 1 – Asynchrone Datei-Einlesung & Fehlerdomäne
   a) [x] Erstelle `custom_components/pp_reader/services/__init__.py` mit Exporten für `parser_pipeline` und eigene Fehlerklassen (`PortfolioParseError`, `PortfolioValidationError`).
      - Dateipfad(e): custom_components/pp_reader/services/__init__.py
      - Betroffene Funktion(en)/Abschnitt(e): Modulkonstanten, Exception-Deklarationen, `__all__`
      - Ziel/Ergebnis der Änderung: Zentraler Einstiegspunkt für Parser-Services gemäss `.docs/backend_workstreams.md`
   b) [x] Verschiebe die bisherige ZIP-/protobuf-Einleselogik aus `data/reader.py` nach `services/portfolio_file.py` und statte sie mit `async_read_portfolio_bytes` (nutzt `asyncio.to_thread`) sowie synchronem Fallback `read_portfolio_bytes` aus.
      - Dateipfad(e): custom_components/pp_reader/services/portfolio_file.py (neu), custom_components/pp_reader/data/reader.py (Umbau auf Thin-Wrapper)
      - Betroffene Funktion(en)/Abschnitt(e): Funktionen `async_read_portfolio_bytes`, `read_portfolio_bytes`, Ablösung des Legacy-Readers
      - Ziel/Ergebnis der Änderung: Nicht-blockierende Dateizugriffe mit sauberem Fehler-Handling und Wiederverwendung in Pipeline und CLI
   c) [x] Implementiere Validierungsfehler für fehlende `data.portfolio`, beschädigte ZIPs, fehlende protobuf-Laufzeit und unerwartete Nachrichtentypen; logge die Fehler über den Logger-Namespace `custom_components.pp_reader.services.parser`.
      - Dateipfad(e): custom_components/pp_reader/services/portfolio_file.py, custom_components/pp_reader/services/__init__.py
      - Betroffene Funktion(en)/Abschnitt(e): Exception-Klassen, Log-Ausgaben, Guard-Pfade
      - Ziel/Ergebnis der Änderung: Frühzeitige, strukturierte Fehlerdiagnose vor dem eigentlichen Parsen

3. [ ] Phase 2 – Parser-Pipeline & Fortschrittsmeldungen
   a) [x] Implementiere `custom_components/pp_reader/services/parser_pipeline.py` mit `async_parse_portfolio(hass, path, writer, progress_cb)`.
      - Dateipfad(e): custom_components/pp_reader/services/parser_pipeline.py
      - Betroffene Funktion(en)/Abschnitt(e): Funktion `async_parse_portfolio`, Hilfsfunktionen `_iter_accounts`, `_iter_securities`, `_iter_transactions`, Progress-Dataclass `ParseProgress`
      - Ziel/Ergebnis der Änderung: Streaming-Parser, der `ParsedClient` aus Bytes erzeugt, Validierungen durchführt (UUID-Pflicht, unterstützte Security-Typen) und Fortschritt via Callback meldet
   b) [x] Ergänze Emission strukturierter Fortschrittsereignisse (`ParseProgress` mit Feldern `stage`, `processed`, `total`) auf dem Home-Assistant-Bus (`hass.bus.async_fire("pp_reader_parser_progress", {...})`).
      - Dateipfad(e): custom_components/pp_reader/services/parser_pipeline.py
      - Betroffene Funktion(en)/Abschnitt(e): Fortschritts-Callback, Bus-Event-Dispatch
      - Ziel/Ergebnis der Änderung: Sichtbarkeit für UI/Diagnose wie in `.docs/refactor_roadmap.md` Milestone M1 gefordert
   c) [x] Schreibe Unit-Tests für die Pipeline, die ein kompaktes `.portfolio`-Fixture parsen, Ereignisse aufzeichnen und den Aufruf des Writers mittels Mocks prüfen.
      - Dateipfad(e): tests/services/test_parser_pipeline.py; tests/fixtures/portfolio/sample_client.portfolio
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_async_parse_portfolio_emits_progress`, `test_async_parse_portfolio_writes_expected_batches`
      - Ziel/Ergebnis der Änderung: Absicherung der Streaming-Logik und Fortschrittsmeldungen

4. [ ] Phase 3 – Staging-Persistenz & Writer
   a) [x] Ergänze `custom_components/pp_reader/data/db_schema.py` um dedizierte Staging-Tabellen (`ingestion_accounts`, `ingestion_portfolios`, `ingestion_securities`, `ingestion_transactions`, `ingestion_transaction_units`, `ingestion_historical_prices`, `ingestion_metadata`).
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py
      - Betroffene Funktion(en)/Abschnitt(e): Schema-Deklarationen, Tabellen-Definitionen inkl. Primärschlüssel/Foreign Keys
      - Ziel/Ergebnis der Änderung: Persistente Ablage der Rohdaten gemäss canonical ingestion → normalization Trennung
   b) [x] Aktualisiere `custom_components/pp_reader/data/db_init.py`, damit Neuinstallationen und Migrationen die Staging-Tabellen erzeugen und bei Bedarf leeren (`clear_ingestion_stage`).
      - Dateipfad(e): custom_components/pp_reader/data/db_init.py
      - Betroffene Funktion(en)/Abschnitt(e): Funktionen `initialize_database_schema`, neue Helper `ensure_ingestion_tables`, `reset_ingestion_stage`
      - Ziel/Ergebnis der Änderung: Deterministischer Aufbau/Reset der Staging-Schicht bei jedem Importlauf
   c) [x] Implementiere `custom_components/pp_reader/data/ingestion_writer.py` mit batchfähigen Upsert-Methoden für jede Dataclass sowie Kontextmanager `async_ingestion_session` (öffnet SQLite-Verbindung im Write-Ahead-Logging-Modus).
      - Dateipfad(e): custom_components/pp_reader/data/ingestion_writer.py (neu)
      - Betroffene Funktion(en)/Abschnitt(e): Klassen `IngestionWriter`, Methoden `write_accounts`, `write_securities`, `write_transactions`, `finalize_ingestion`
      - Ziel/Ergebnis der Änderung: Getrennter Persistenzpfad für Parser-Rohdaten inklusive Import-Metadaten (`file_path`, `parsed_at`, `pp_version`)
   d) [x] Ergänze Integrationstests, die den Writer gegen eine temporäre SQLite-DB ausführen und Einträge sowie Foreign-Key-Beziehungen prüfen.
      - Dateipfad(e): tests/integration/test_ingestion_writer.py
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_writer_persists_accounts`, `test_writer_links_transactions_to_units`
      - Ziel/Ergebnis der Änderung: Sicherstellung korrekter Staging-Speicherung und referentieller Integrität

5. [ ] Phase 4 – Coordinator-Integration & Telemetrie
   a) [x] Ersetze in `custom_components/pp_reader/data/coordinator.py` den Aufruf von `_sync_data_to_db` durch `async_parse_portfolio` inklusive Fortschritts-Callback und Reset der Staging-Tabellen vor jedem Lauf.
      - Dateipfad(e): custom_components/pp_reader/data/coordinator.py
      - Betroffene Funktion(en)/Abschnitt(e): `_sync_portfolio_file`, `_async_update_data`
      - Ziel/Ergebnis der Änderung: Coordinator nutzt die neue Streaming-Pipeline und hält den UI-Datenfluss stabil
   b) [x] Ergänze Telemetrie über `self.async_set_updated_data` und `async_dispatcher_send`, sodass UI/Sensoren Fortschritts- und Abschlussereignisse erhalten ohne bestehende Payload-Keys zu verändern.
      - Dateipfad(e): custom_components/pp_reader/data/coordinator.py
      - Betroffene Funktion(en)/Abschnitt(e): Fortschritts-Callback-Implementierung, Dispatcher-Aufrufe
      - Ziel/Ergebnis der Änderung: Sichtbare Parser-Statusaktualisierungen für nachgelagerte Komponenten
   c) [x] Passe `custom_components/pp_reader/data/reader.py` auf die neue Pipeline an (Deprecated-Markierung für direkte Nutzung, Weiterleitung auf `async_parse_portfolio`).
      - Dateipfad(e): custom_components/pp_reader/data/reader.py
      - Betroffene Funktion(en)/Abschnitt(e): Legacy-Wrapper im Modul `data.reader`, Modul-Dokumentation
      - Ziel/Ergebnis der Änderung: Altaufrufe funktionieren vorerst, weisen aber auf den neuen Weg hin

6. [ ] Phase 5 – Übergangspfad für Legacy-Sync
   a) [x] Refaktoriere `custom_components/pp_reader/data/sync_from_pclient.py`, sodass Normalisierung/Push nicht mehr direkt `PClient` konsumiert, sondern aus den Staging-Tabellen liest (zunächst über Hilfsfunktionen).
      - Dateipfad(e): custom_components/pp_reader/data/sync_from_pclient.py
      - Betroffene Funktion(en)/Abschnitt(e): `_sync_accounts`, `_sync_portfolios`, `_sync_securities`, `_sync_transactions`, Event-Emitter
      - Ziel/Ergebnis der Änderung: Schrittweise Entkopplung vom unmittelbaren Proto-Objekt bei Erhalt bestehender Events
   b) [x] Ergänze Übergangshelfer `load_ingestion_snapshot` (z.B. in `custom_components/pp_reader/data/ingestion_reader.py`), um die Staging-Tabellen für Normalisierungsläufe aufzubereiten.
      - Dateipfad(e): custom_components/pp_reader/data/ingestion_reader.py (neu)
      - Betroffene Funktion(en)/Abschnitt(e): Funktionen `load_accounts`, `load_portfolios`, `load_transactions`
      - Ziel/Ergebnis der Änderung: Einheitliche Datenquelle für Legacy-Sync und kommende Normalisierungsschicht
   c) [x] Schreibe Regressionstests, die nach einem Parserlauf `sync_from_pclient` mit Staging-Daten ausführen und die bekannten Push-Payloads (`accounts`, `portfolio_values`, `portfolio_positions`) vergleichen.
      - Dateipfad(e): tests/integration/test_sync_from_staging.py
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_accounts_payload_matches_legacy`, `test_portfolio_values_payload_matches_legacy`
      - Ziel/Ergebnis der Änderung: Nachweis, dass der Zwischenzustand funktional gleichwertig zum Legacy-Pfad bleibt

7. [ ] Phase 6 – Tooling & CLI-Anpassungen
   a) [x] Aktualisiere CLI-/Skript-Unterstützung (`custom_components/pp_reader/cli/import_portfolio.py` bzw. `scripts/`), damit lokale Imports ebenfalls `async_parse_portfolio` nutzen und Fortschrittsmeldungen anzeigen.
      - Dateipfad(e): custom_components/pp_reader/cli/import_portfolio.py; scripts/import_portfolio.py (falls vorhanden)
      - Betroffene Funktion(en)/Abschnitt(e): CLI-Command `main`, Logging-Ausgaben, Argument-Parser
      - Ziel/Ergebnis der Änderung: Konsistentes Verhalten zwischen HA-Integration und manuellen Importen
   b) [x] Ergänze Telemetrie-/Debug-Ausgabe in `custom_components/pp_reader/util/diagnostics.py` (oder neuem Modul), die den letzten Parserlauf (`parsed_at`, `processed_entities`) aus den Staging-Metadaten anzeigt.
      - Dateipfad(e): custom_components/pp_reader/util/diagnostics.py (neu oder erweitert)
      - Betroffene Funktion(en)/Abschnitt(e): Funktion `async_get_diagnostics`
      - Ziel/Ergebnis der Änderung: Anwender können Parserstatus über das HA-Diagnosepanel prüfen

8. [ ] Phase 7 – Dokumentation & Governance
   a) [x] Aktualisiere `.docs/refactor_roadmap.md` (Milestone M1) mit konkreten Implementierungsschritten, Status-Checkboxen und Verweisen auf neue Module.
      - Dateipfad(e): .docs/refactor_roadmap.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „M1 — Parser & Ingestion Rewrite“, Deliverables
      - Ziel/Ergebnis der Änderung: Roadmap spiegelt den implementierten Parserpfad wider
   b) [x] Ergänze `.docs/backend_workstreams.md` im Abschnitt „Parser Modernization“ um kurze Hinweise zur tatsächlichen Modulstruktur (services/, models/, ingestion_writer).
      - Dateipfad(e): .docs/backend_workstreams.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „Parser Modernization“ (New/updated modules, Behaviour updates)
      - Ziel/Ergebnis der Änderung: Konzeptdokument dokumentiert die Umsetzung und Referenzen
   c) [x] Dokumentiere in `.docs/legacy_cleanup_strategy.md` unter „Cleanup Tracker“, dass `custom_components/pp_reader/pclient/*` erst nach Abschluss der Staging-Verbraucher entfernt werden darf; ergänze Nachweise/Tests.
      - Dateipfad(e): .docs/legacy_cleanup_strategy.md
      - Betroffene Funktion(en)/Abschnitt(e): Tabelle „Cleanup Tracker“ (Zeile Parser ingestion)
      - Ziel/Ergebnis der Änderung: Gating-Kriterien für das Entfernen der Legacy-Pfade explizit festgehalten
   d) [x] Aktualisiere `.docs/qa_docs_comms.md` um QA-Schritte für den Parser (z.B. Regression mit Beispiel-`.portfolio`, Dokumentations-Update für Diagnosepanel).
      - Dateipfad(e): .docs/qa_docs_comms.md
      - Betroffene Funktion(en)/Abschnitt(e): QA-Backlog, Dokumentationsmaßnahmen
      - Ziel/Ergebnis der Änderung: QA- und Kommunikationsplan deckt Parser-Neuerungen ab

9. [ ] Phase 8 – Legacy-Rückbau vorbereiten
   a) [x] Ergänze Feature-Flag oder Config-Option (`feature_flags.py`), um den Legacy-Importer testweise abzuschalten und nur die Staging-Pipeline zu verwenden.
      - Dateipfad(e): custom_components/pp_reader/feature_flags.py
      - Betroffene Funktion(en)/Abschnitt(e): Flag-Definition `USE_STAGING_IMPORTER` (neu)
      - Ziel/Ergebnis der Änderung: Kontrollierter Rollout der neuen Pipeline für Testnutzer
   b) [x] Plane Telemetrie, die Warndialoge im Frontend auslöst, falls Parser-Validierungen fehlschlagen (z.B. über persistent_notifications).
      - Dateipfad(e): custom_components/pp_reader/data/coordinator.py; custom_components/pp_reader/util/notifications.py (neu)
      - Betroffene Funktion(en)/Abschnitt(e): Fehler-Handling im Fortschritts-Callback, Notification-Hilfen
      - Ziel/Ergebnis der Änderung: Nutzer erhalten klare Hinweise bei Parserproblemen (optional, wenn vom Release-Plan gewünscht)
