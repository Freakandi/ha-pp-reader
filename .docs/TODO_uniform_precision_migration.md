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
   a) [ ] Ersetze in `custom_components/pp_reader/data/db_schema.py` alle REAL-/FLOAT-Felder der Finanztabellen durch INTEGER-Spalten mit 10^-8-Skalierung und passe abhängige Ausdrücke an.
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py
      - Betroffene Funktion(en)/Abschnitt(e): `PORTFOLIO_SECURITIES_SCHEMA` (Felder `current_holdings`, `avg_price_native`, `security_currency_total`, `account_currency_total`, `avg_price_security`, `avg_price_account`, `current_value`, generierte Spalte `avg_price`); `TRANSACTION_SCHEMA` (`transaction_units.fx_rate_to_base`); `PLAN_SCHEMA` (`amount`, `fees`, `taxes`); `EXCHANGE_SCHEMA` (`exchange_rates.rate`); `FX_SCHEMA` (`fx_rates.rate`)
      - Ziel/Ergebnis der Änderung: Alle neu erzeugten Tabellen speichern Preise, Werte, Anteile und FX-Raten ausschließlich als 10^-8-ganzzahlige Werte
   b) [ ] Aktualisiere die Laufzeit-Migrationshelfer in `custom_components/pp_reader/data/db_init.py`, damit neu erzeugte oder nachgezogene Spalten die INTEGER-Skalierung erhalten und bestehende REAL-Defaults entfernt werden.
      - Dateipfad(e): custom_components/pp_reader/data/db_init.py
      - Betroffene Funktion(en)/Abschnitt(e): `_ensure_portfolio_securities_native_column`, `_ensure_portfolio_purchase_extensions`, `_backfill_portfolio_purchase_extension_defaults`, `initialize_database_schema`
      - Ziel/Ergebnis der Änderung: Schema-Initialisierung und Best-effort-Migration erzeugen integer-skalierte Spalten ohne Float-Rückstände
   c) [ ] Passe die Schema-Prüfungen in `tests/test_migration.py` an, sodass sie die neuen INTEGER-Typen und Spalteninhalte validieren.
      - Dateipfad(e): tests/test_migration.py
      - Betroffene Funktion(en)/Abschnitt(e): `_get_columns`; Tests `test_fresh_schema_contains_price_columns`, `test_legacy_schema_migrated`
      - Ziel/Ergebnis der Änderung: Tests schlagen an, sobald Schema-Definitionen von der integer-skalierten Vorgabe abweichen
   d) [ ] Überarbeite die Inline-Schema-Fixtures in `tests/test_price_service.py`, damit sie die INTEGER-Skalierung für Portfolio- und Transaktionstabellen widerspiegeln.
      - Dateipfad(e): tests/test_price_service.py
      - Betroffene Funktion(en)/Abschnitt(e): Hilfsfunktion `_create_db_with_security`; temporäre Tabellen in `test_refresh_impacted_portfolio_securities_*`
      - Ziel/Ergebnis der Änderung: Testdatenbanken spiegeln die integer-skalierten Tabellen und verhindern Float-Rückfälle

3. [ ] Phase 2 – Backend Logic Updates
   a) [ ] Stelle `custom_components/pp_reader/data/db_access.py` auf skalierte Integerlese- und -schreibpfade um und verwende die Rundungshelfer konsistent.
      - Dateipfad(e): custom_components/pp_reader/data/db_access.py
      - Betroffene Funktion(en)/Abschnitt(e): Dataclasses `Transaction`, `PortfolioSecurity`; Helper `_resolve_average_cost_totals`; Funktionen `get_security_snapshot`, `fetch_previous_close`, `get_portfolio_positions`, `_normalize_portfolio_row`, `fetch_live_portfolios`
      - Ziel/Ergebnis der Änderung: Datenzugriffsschicht persistiert und liefert Beträge/Bestände ausschließlich als 10^-8-Integer mit zentralen Konvertierungen
   b) [ ] Richte `custom_components/pp_reader/data/aggregations.py` auf skalierte Integerwerte aus und ersetze Float-Coercion durch Skalierungshelfer.
      - Dateipfad(e): custom_components/pp_reader/data/aggregations.py
      - Betroffene Funktion(en)/Abschnitt(e): Dataclasses `HoldingsAggregation`, `AverageCostSelection`; Funktionen `_coerce_float`, `compute_holdings_aggregation`, `select_average_cost`
      - Ziel/Ergebnis der Änderung: Aggregationen nutzen skalierte Eingaben/Ausgaben und behalten Rundung per `to_scaled_int`/`from_scaled_int` bei
   c) [ ] Aktualisiere `custom_components/pp_reader/data/performance.py`, sodass Kennzahlen ausschließlich aus skalierten Integern bzw. Decimal-Zwischenwerten berechnet werden.
      - Dateipfad(e): custom_components/pp_reader/data/performance.py
      - Betroffene Funktion(en)/Abschnitt(e): `_to_scaled_decimal` (neu), `_round_percentage`, `select_performance_metrics`, `compose_performance_payload`
      - Ziel/Ergebnis der Änderung: Performance-Berechnung übernimmt skalierte Eingaben verlustfrei und gibt normierte Dezimalwerte zurück
   d) [ ] Passe `custom_components/pp_reader/data/coordinator.py` an, damit Sensoraufbereitung und Performance-Payloads mit skalierten Integern arbeiten.
      - Dateipfad(e): custom_components/pp_reader/data/coordinator.py
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_amount`, `_portfolio_contract_entry`, `_build_portfolio_data`
      - Ziel/Ergebnis der Änderung: Coordinator-Daten für Home Assistant basieren auf Integerwerten und vermeiden Float-Lecks
   e) [ ] Überführe `custom_components/pp_reader/data/sync_from_pclient.py` in skalierte Persistenzpfade für Import und Synchronisation.
      - Dateipfad(e): custom_components/pp_reader/data/sync_from_pclient.py
      - Betroffene Funktion(en)/Abschnitt(e): `normalize_shares`, `normalize_amount`, `extract_exchange_rate`, `sync_from_pclient`, `fetch_positions_for_portfolios`
      - Ziel/Ergebnis der Änderung: Eingehende `.portfolio`-Daten werden vor dem Schreiben vollständig auf 10^-8-Integer abgebildet
   f) [ ] Ersetze in `custom_components/pp_reader/logic/portfolio.py` Float-Normalisierungen durch Integer-/Decimal-Konvertierungen via Skalierungshelfer.
      - Dateipfad(e): custom_components/pp_reader/logic/portfolio.py
      - Betroffene Funktion(en)/Abschnitt(e): `normalize_shares`
      - Ziel/Ergebnis der Änderung: Portfolio-Helfer liefern deterministische Mengen auf Basis skalierter Ganzzahlen
   g) [ ] Aktualisiere `custom_components/pp_reader/logic/securities.py` auf skalierte Berechnungen für Kaufwerte, Gebühren und Bestände.
      - Dateipfad(e): custom_components/pp_reader/logic/securities.py
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_transaction_amounts`, `db_calculate_current_holdings`, `_resolve_native_amount`, `db_calculate_sec_purchase_value`, `db_calculate_holdings_value`
      - Ziel/Ergebnis der Änderung: Bewertungslogik rechnet ohne Float-Drift und gibt skalierte Totale zurück
   h) [ ] Lasse `custom_components/pp_reader/prices/revaluation.py` skalierte Integerwerte von `fetch_live_portfolios` übernehmen und nur für Ausgabe dekonvertieren.
      - Dateipfad(e): custom_components/pp_reader/prices/revaluation.py
      - Betroffene Funktion(en)/Abschnitt(e): `_load_live_entries`, `_build_portfolio_values_from_live_entries`, `_load_portfolio_positions`
      - Ziel/Ergebnis der Änderung: Revaluationspfad behält Integerpräzision bis zur Seriendaten-Erzeugung
   i) [ ] Überarbeite `custom_components/pp_reader/prices/price_service.py`, damit Preisupdates, Aggregat-Rebuilds und Payloads skalierte Integer nutzen.
      - Dateipfad(e): custom_components/pp_reader/prices/price_service.py
      - Betroffene Funktion(en)/Abschnitt(e): `_load_old_prices`, `_detect_price_changes`, `_apply_price_updates`, `_refresh_impacted_portfolio_securities`, `_build_portfolio_values_payload`
      - Ziel/Ergebnis der Änderung: Laufende Preiszyklen aktualisieren ausschließlich skalierte Werte und erzeugen integerbasierte Aggregationen
   j) [ ] Passe `custom_components/pp_reader/prices/provider_base.py` an, sodass Quotes skalierte Integerpreise bereitstellen oder explizit als Rohwerte markiert werden.
      - Dateipfad(e): custom_components/pp_reader/prices/provider_base.py
      - Betroffene Funktion(en)/Abschnitt(e): Dataclass `Quote`, Methode `is_price_valid`
      - Ziel/Ergebnis der Änderung: Provider-Schnittstelle definiert klar, wann Rohwerte vs. skalierte Preise erwartet werden

4. [ ] Phase 3 – Backend Serialization & API
   a) [ ] Aktualisiere `custom_components/pp_reader/data/websocket.py`, damit alle Payload-Builder skalierte Integer via `from_scaled_int` in formatierte Dezimalwerte (4 Nachkommastellen für Kurse/Anteile, 2 für Summen) wandeln und parallel Rohwerte bereitstellen.
      - Dateipfad(e): custom_components/pp_reader/data/websocket.py
      - Betroffene Funktion(en)/Abschnitt(e): `_load_accounts_payload`, `_serialise_security_snapshot`, `_normalize_portfolio_positions`, `_live_portfolios_payload`, `ws_get_dashboard_data`, `ws_get_portfolio_data`, `ws_get_portfolio_positions`, `ws_get_security_snapshot`
      - Ziel/Ergebnis der Änderung: Websocket-Antworten liefern konsistent formatierte Dezimalwerte plus Integer-Felder für weiterverarbeitende Clients
   b) [ ] Passe `custom_components/pp_reader/data/event_push.py` an, damit Event-Payloads aus skalierten Integern generiert werden und sowohl formatierte Beträge als auch Rohwerte enthalten.
      - Dateipfad(e): custom_components/pp_reader/data/event_push.py
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_value_entry`, `_normalize_position_entry`, `_compact_portfolio_values_payload`, `_compact_portfolio_positions_payload`, `_push_update`
      - Ziel/Ergebnis der Änderung: Über den Event-Bus veröffentlichte Updates transportieren anzeigefertige Dezimalwerte ohne Präzisionsverlust
   c) [ ] Überarbeite `custom_components/pp_reader/prices/price_service.py`, sodass Revaluations-Payloads bei `_build_portfolio_values_payload` und den daran anschließenden `_push_update`-Aufrufen skalierte Integer in Dezimalwerte umwandeln und bei Bedarf beide Darstellungen ausliefern.
      - Dateipfad(e): custom_components/pp_reader/prices/price_service.py
      - Betroffene Funktion(en)/Abschnitt(e): `_build_portfolio_values_payload`, `_refresh_impacted_portfolio_securities`, `_run_price_cycle`
      - Ziel/Ergebnis der Änderung: Preis-Zyklen erzeugen API/Event-Payloads mit kanonischem 4/2-Dezimalformat auf Basis der Integerdaten

5. [ ] Phase 4 – Frontend Adaptation
   a) [ ] Passe `src/data/api.ts` an die neuen Payloads mit formatierten Dezimalwerten plus Roh-Integerfeldern an und entferne temporäre Float-Normalisierungen.
      - Dateipfad(e): src/data/api.ts
      - Betroffene Funktion(en)/Abschnitt(e): Interfaces `AccountSummary`, `PortfolioSummary`, `DashboardDataResponse`, `PortfolioPositionsResponse`, `SecuritySnapshotResponse`, `SecurityHistoryPoint`; Helper `deriveEntryId`; Websocket-Wrapper `fetchDashboardDataWS`, `fetchAccountsWS`, `fetchPortfoliosWS`, `fetchPortfolioPositionsWS`, `fetchSecuritySnapshotWS`, `fetchSecurityHistoryWS`
      - Ziel/Ergebnis der Änderung: Typdefinitionen spiegeln formattierte Dezimalfelder (`*_display`, `*_formatted`) und zugehörige `*_raw` Integer wider; Fetcher reichen Werte unverändert an das UI weiter
   b) [ ] Aktualisiere `src/tabs/types.ts`, sodass alle Payload-Interfaces und Type-Guards die formatierten Dezimalwerte sowie `*_raw`-Integerfelder erwarten.
      - Dateipfad(e): src/tabs/types.ts
      - Betroffene Funktion(en)/Abschnitt(e): `AverageCostPayload`, `PerformanceMetricsPayload`, `HoldingsAggregationPayload`, `PortfolioPosition`, `SecuritySnapshotLike`, Guards `isAverageCostPayload`, `isRecord`, `isNumber`, `isNullableNumber`
      - Ziel/Ergebnis der Änderung: Frontend-Typen deklarieren klar getrennte Anzeige- und Rohwerte und verhindern Float-Konvertierungen in Type-Guards
   c) [ ] Reduziere `src/utils/currency.ts` auf Format-/Fallback-Helfer, die formattierte Dezimalstrings oder bereits gerundete Zahlen unverändert übernehmen.
      - Dateipfad(e): src/utils/currency.ts
      - Betroffene Funktion(en)/Abschnitt(e): `toFiniteCurrency`, `roundCurrency`, `normalizeCurrencyValue`, `normalizePercentValue`
      - Ziel/Ergebnis der Änderung: Hilfsfunktionen verlassen sich auf Backend-Rundung, akzeptieren nur optionale Fallbacks und entfernen Skalierungs-/Parsing-Logik
   d) [ ] Passe `src/utils/performance.ts` an, damit Performance-Payload-Normalisierung neue formatierte Felder und Integer-Backups respektiert.
      - Dateipfad(e): src/utils/performance.ts
      - Betroffene Funktion(en)/Abschnitt(e): `normalizePerformancePayload`, `normalizeDayChangePayload`, interne Parser
      - Ziel/Ergebnis der Änderung: Performance-Helfer übernehmen vorformatierte Zahlen direkt und nutzen `*_raw`-Werte nur als Fallback
   e) [ ] Überarbeite `src/data/updateConfigsWS.ts`, damit Live-Update-Handler ohne lokale Skalierung auskommen und neue Anzeige-/Rohwerte korrekt zwischenspeichern.
      - Dateipfad(e): src/data/updateConfigsWS.ts
      - Betroffene Funktion(en)/Abschnitt(e): `sanitizePosition`, `sanitizePositions`, `handleAccountUpdate`, `handlePortfolioUpdate`, Tabellenrenderer `renderPositionsTable`
      - Ziel/Ergebnis der Änderung: Pending-Caches und DOM-Patcher konsumieren formattierte Dezimalfelder direkt und halten Roh-Integerwerte lediglich für Sortierung bereit
   f) [ ] Aktualisiere `src/tabs/overview.ts`, sodass Render- und Normalisierungslogik ausschließlich mit gelieferten Anzeigeformaten arbeitet und nur für Sortierung auf `*_raw` zurückgreift.
      - Dateipfad(e): src/tabs/overview.ts
      - Betroffene Funktion(en)/Abschnitt(e): `PortfolioPositionLike`, `sanitizePosition`, `buildPurchasePriceDisplay`, `renderPortfolioPositions`, `renderDashboard`
      - Ziel/Ergebnis der Änderung: Übersichtstab zeigt vom Backend formatierte Beträge/Bestände ohne eigene Rundung und nutzt Integer-Beifelder für Berechnungen
   g) [ ] Passe `src/tabs/security_detail.ts` an, damit Snapshot- und Historienaufbereitung die neuen formatierten Felder nutzen und 10^-8-Integer nur als Fallback behandeln.
      - Dateipfad(e): src/tabs/security_detail.ts
      - Betroffene Funktion(en)/Abschnitt(e): `SecuritySnapshotDetail`, `extractAverageCostPayload`, `extractAggregationPayload`, `normaliseHistorySeries`, `renderSecurityDetail`
      - Ziel/Ergebnis der Änderung: Sicherheitsdetail nutzt Backend-Dezimalwerte für Anzeige, entfernt Divisionen durch `1e8` und bewahrt Rohdaten für Diagramme
   h) [ ] Überarbeite `src/content/elements.ts`, um Formatierungshelfer (`formatValue`, `formatNumber`, `formatGain`, `formatGainPct`) auf vorgerundete Werte auszurichten und optionale Rohwerte für Sortierung zu berücksichtigen.
      - Dateipfad(e): src/content/elements.ts
      - Betroffene Funktion(en)/Abschnitt(e): `formatValue`, `formatNumber`, `formatGain`, `formatGainPct`, `sortTableRows`
      - Ziel/Ergebnis der Änderung: Tabellen-Renderer verlassen sich auf Backend-Formatierung, nutzen Roh-Integerfelder nur zur numerischen Sortierung und entfernen Legacy-Parsing
   i) [ ] Aktualisiere `src/content/charting.ts`, damit Linienchart-Helfer neue Historienfelder (`close_formatted`, `close_raw`) akzeptieren und ohne lokales Skalieren auskommen.
      - Dateipfad(e): src/content/charting.ts
      - Betroffene Funktion(en)/Abschnitt(e): `LineChartOptions`, `LineChartAccessor`, Parser `toNumber`, `normaliseHistorySeries`, Tooltip-Formatter
      - Ziel/Ergebnis der Änderung: Charts setzen formattierte Dezimalwerte direkt für Achsen/Beschriftungen ein und greifen nur bei Bedarf auf Roh-Integerwerte zurück

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
