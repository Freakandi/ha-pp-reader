1. [ ] Phase 0 – Preparation
   a) [ ] Ergänze in `.docs/uniform_precision_migration.md` eine Tabelle, die jede monetäre/quantitative Spalte aus `custom_components/pp_reader/data/db_schema.py` mit aktuellem SQLite-Typ, Skalierungsfaktor und Zielpräzision (10^-8 INTEGER) abbildet.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_schema.py“)
      - Betroffene Funktion(en)/Abschnitt(e): Tabellen `accounts`, `transactions`, `transaction_units`, `portfolio_securities`, `securities`, `historical_prices`, `plans`, `exchange_rates`, `fx_rates` innerhalb des Schemas
      - Ziel/Ergebnis der Änderung: Vollständige Dokumentation aller schema-seitig persistierten Beträge/Kurse als Grundlage für spätere Migrationen
   b) [ ] Ergänze `.docs/uniform_precision_migration.md` um einen Audit-Abschnitt zu `custom_components/pp_reader/data/db_init.py`, der jede dort per `ALTER TABLE` nachgezogene numerische Spalte mit aktuellem Typ und angestrebter 10^-8-Integer-Konvertierung erfasst.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_init.py“)
      - Betroffene Funktion(en)/Abschnitt(e): `_ensure_runtime_price_columns`; `_ensure_portfolio_securities_native_column`; `_ensure_portfolio_purchase_extensions`
      - Ziel/Ergebnis der Änderung: Sicherstellung, dass auch Laufzeit-Migrationen im Präzisionsmapping berücksichtigt werden
   c) [ ] Dokumentiere in `.docs/uniform_precision_migration.md`, welche Felder in `custom_components/pp_reader/data/db_access.py` aktuell Floats erwarten oder liefern und wie sie auf skalierte Integerwerte abgebildet werden sollen.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_access.py“)
      - Betroffene Funktion(en)/Abschnitt(e): Dataclasses `PortfolioSecurity`, `Transaction`, `Portfolio`, `Account`; Helper `_resolve_average_cost_totals`
      - Ziel/Ergebnis der Änderung: Klarer Umsetzungsplan für die Umstellung der Datenzugriffsschicht auf skalierte Ganzzahlen
   d) [ ] Implementiere `to_scaled_int` und `from_scaled_int` mit Decimal-ROUND_HALF_EVEN in neuem Hilfsmodul.
      - Dateipfad(e): custom_components/pp_reader/util/scaling.py
      - Betroffene Funktion(en)/Abschnitt(e): Modulinitialisierung; Funktionen `to_scaled_int`, `from_scaled_int`
      - Ziel/Ergebnis der Änderung: Zentrale Konvertierungshelfer zur Wiederverwendung in Schema-, Import- und Berechnungslogik
   e) [ ] Füge dedizierte Unit-Tests für die Skalierungshelfer hinzu, die typische und grenznahe Rundungsszenarien abdecken.
      - Dateipfad(e): tests/test_scaling.py
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_to_scaled_int_*`, `test_from_scaled_int_*`
      - Ziel/Ergebnis der Änderung: Abgesicherte Rundungssemantik für alle nachfolgenden Migrationsphasen

2. [ ] Phase 1 – Schema Definition Update
   a) [ ] Update SQLite schema definitions so every financial column stores INTEGER 10^-8 scaled values, removing REAL types.
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py
      - Betroffene Funktion(en)/Abschnitt(e): TABLE_DEFINITIONS; create_table_* Helfer; Schema-Migrationslogik falls vorhanden
      - Ziel/Ergebnis der Änderung: Neu erzeugte Datenbanken persistieren nur noch 10^-8 skalierte Ganzzahlen
   b) [ ] Adjust schema-related fixtures and migration utilities to align with the INTEGER schema.
      - Dateipfad(e): tests/fixtures/**; custom_components/pp_reader/data/schema_migrations.py (falls vorhanden)
      - Betroffene Funktion(en)/Abschnitt(e): Fixture-Setup für Tabellen; Schema-Migrationsfunktionen
      - Ziel/Ergebnis der Änderung: Tests und Tools erzeugen konsistente INTEGER-Schemas ohne Nachbearbeitung

3. [ ] Phase 2 – Backend Logic Updates
   a) [ ] Refactor db_access helpers to read/write scaled integers and delegate conversions to scaling helpers.
      - Dateipfad(e): custom_components/pp_reader/data/db_access.py
      - Betroffene Funktion(en)/Abschnitt(e): get_security_snapshot; update_security_position; round_currency; verwandte Speicherroutinen
      - Ziel/Ergebnis der Änderung: Alle Datenzugriffe arbeiten intern mit skalierter Ganzzahlpräzision
   b) [ ] Update portfolio valuation logic to operate on integers or Decimal intermediates until serialization.
      - Dateipfad(e): custom_components/pp_reader/logic/portfolio.py; custom_components/pp_reader/prices/revaluation.py
      - Betroffene Funktion(en)/Abschnitt(e): calculate_portfolio_value; update_security_values; weitere Durchschnitts-/Summenberechnungen
      - Ziel/Ergebnis der Änderung: Backend-Berechnungen vermeiden Float-Arithmetik und behalten Präzision bei
   c) [ ] Ensure sync/import pipelines convert incoming Portfolio Performance values into scaled integers at persistence boundaries.
      - Dateipfad(e): custom_components/pp_reader/data/sync_from_pclient.py; custom_components/pp_reader/data/importers/**
      - Betroffene Funktion(en)/Abschnitt(e): Persistenzpfade für `.portfolio`-Import; Sync-Write-Routinen
      - Ziel/Ergebnis der Änderung: Neu importierte Daten entsprechen sofort dem 10^-8-Kontrakt
   d) [ ] Adjust live price services to maintain scaled integer storage and hand off conversions to helpers.
      - Dateipfad(e): custom_components/pp_reader/prices/price_service.py; custom_components/pp_reader/prices/providers/**
      - Betroffene Funktion(en)/Abschnitt(e): update_price_cache; Provider-spezifische Konvertierungsstellen
      - Ziel/Ergebnis der Änderung: Laufende Aktualisierungen verletzen die Präzision nicht

4. [ ] Phase 3 – Backend Serialization & API
   a) [ ] Update REST and websocket serializers to emit presentation-ready decimals derived from scaled integers.
      - Dateipfad(e): custom_components/pp_reader/api/rest.py; custom_components/pp_reader/api/websocket.py
      - Betroffene Funktion(en)/Abschnitt(e): serialize_portfolio_snapshot; websocket event payload builder
      - Ziel/Ergebnis der Änderung: API liefert normierte Dezimalwerte (4 Stellen für Kurse/Anteile, 2 Stellen für Summen)
   b) [ ] Revise response dataclasses or Pydantic models to expose both raw integers (falls benötigt) und formatierte Strings.
      - Dateipfad(e): custom_components/pp_reader/api/models.py (oder gleichwertig)
      - Betroffene Funktion(en)/Abschnitt(e): Response-Modelldefinitionen
      - Ziel/Ergebnis der Änderung: Klare Trennung zwischen Rohdaten und Anzeigeformat für Clients

5. [ ] Phase 4 – Frontend Adaptation
   a) [ ] Align TypeScript API types with the new formatted decimal payloads and remove client-side scaling math.
      - Dateipfad(e): src/lib/api-types.ts; src/lib/formatters.ts
      - Betroffene Funktion(en)/Abschnitt(e): API-Datentypen; Formatierungshelfer
      - Ziel/Ergebnis der Änderung: Frontend behandelt Werte als anzeigefertige Dezimalzahlen ohne eigene Konvertierung
   b) [ ] Update Vue/Svelte/React Komponenten (je nach Implementierung) to expect formatted decimals only.
      - Dateipfad(e): src/components/**; src/views/**
      - Betroffene Funktion(en)/Abschnitt(e): Komponenten, die Portfolio-Werte rendern
      - Ziel/Ergebnis der Änderung: UI nutzt direkte Anzeige ohne Float-Schutzlogik

6. [ ] Phase 5 – Tests & Validation
   a) [ ] Refresh backend unit tests and fixtures to assert integer storage and conversion accuracy.
      - Dateipfad(e): tests/test_db_access.py; tests/data/**
      - Betroffene Funktion(en)/Abschnitt(e): Tests für get_security_snapshot & Co.; Fixture-Erzeugung
      - Ziel/Ergebnis der Änderung: Tests schlagen Alarm bei Präzisionsregressionen
   b) [ ] Extend importer and price service tests to cover scaling helpers and ROUND_HALF_EVEN Verhalten.
      - Dateipfad(e): tests/test_sync_from_pclient.py; tests/test_price_service.py
      - Betroffene Funktion(en)/Abschnitt(e): Konvertierungspfad-Tests
      - Ziel/Ergebnis der Änderung: Sicherstellung korrekter Rundung über alle Zuflüsse
   c) [ ] Update frontend tests (unit/component/e2e) to match formatted decimal expectations.
      - Dateipfad(e): tests/frontend/**
      - Betroffene Funktion(en)/Abschnitt(e): Snapshot- oder Rendering-Assertions
      - Ziel/Ergebnis der Änderung: Frontend-Tests spiegeln das neue Payload-Verhalten wider

7. [ ] Phase 6 – Documentation & Release Notes
   a) [ ] Document the 10^-8 integer precision contract, helper usage, and migration steps.
      - Dateipfad(e): ARCHITECTURE.md; README.md; README-dev.md
      - Betroffene Funktion(en)/Abschnitt(e): Datenpersistenzkapitel; Setup-/Migrationabschnitte
      - Ziel/Ergebnis der Änderung: Entwickler- und Nutzer-Dokumentation beschreibt das neue Präzisionsmodell eindeutig
   b) [ ] Update `.docs/native_price/` materials to reference scaled integer handling.
      - Dateipfad(e): .docs/native_price/**
      - Betroffene Funktion(en)/Abschnitt(e): Präzisions-/Speicherbeschreibung
      - Ziel/Ergebnis der Änderung: Begleitdokumentation konsistent mit dem Zielzustand
   c) [ ] Add release notes detailing regeneration requirements for existing databases.
      - Dateipfad(e): CHANGELOG.md; docs/release_notes.md (falls vorhanden)
      - Betroffene Funktion(en)/Abschnitt(e): Eintrag für die Präzisionsmigration
      - Ziel/Ergebnis der Änderung: Anwender wissen über notwendige Neuimporte und Präzisionsänderungen Bescheid

8. [ ] Phase 7 – Rollout & Tooling
   a) [ ] Provide migration/regen tooling to rebuild databases from `.portfolio` exports using new scaling.
      - Dateipfad(e): scripts/**; custom_components/pp_reader/scripts/**
      - Betroffene Funktion(en)/Abschnitt(e): CLI- oder Skriptlogik zur Neuinitialisierung
      - Ziel/Ergebnis der Änderung: Anwender können bestehende Daten zuverlässig migrieren
   b) [ ] Validate end-to-end sample portfolios comparing Decimal baselines vs. scaled integer outputs.
      - Dateipfad(e): tests/integration/**; .docs/uniform_precision_migration.md (Validierungsabschnitt ergänzen)
      - Betroffene Funktion(en)/Abschnitt(e): Integrations-/Smoke-Tests; Dokumentationsnachweis
      - Ziel/Ergebnis der Änderung: Nachweis, dass Migration Gleichwertigkeit wahrt

9. Optional
   a) [ ] Optional: Offer temporary duplicate API fields exposing raw integers for third-party automations during transition.
      - Dateipfad(e): custom_components/pp_reader/api/rest.py; custom_components/pp_reader/api/websocket.py
      - Betroffene Funktion(en)/Abschnitt(e): Serializer-Ausgabeoptionen
      - Ziel/Ergebnis der Änderung: Sanfter Übergang für externe Integrationen ohne sofortige Anpassungspflicht
   b) [ ] Optional: Provide SQL helper snippets in documentation for analysts to interpret scaled integer columns.
      - Dateipfad(e): .docs/uniform_precision_migration.md; README-dev.md
      - Betroffene Funktion(en)/Abschnitt(e): Troubleshooting-/FAQ-Bereiche
      - Ziel/Ergebnis der Änderung: Vereinfachte manuelle Analysen trotz Ganzzahlspeicherung
