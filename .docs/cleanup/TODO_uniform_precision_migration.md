1. [ ] Phase 0 – Preparation
   a) [x] Ergänze in `.docs/uniform_precision_migration.md` eine Tabelle, die jede monetäre/quantitative Spalte aus `custom_components/pp_reader/data/db_schema.py` mit aktuellem SQLite-Typ, Skalierungsfaktor und Zielpräzision (10^-8 INTEGER) abbildet.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_schema.py“)
      - Betroffene Funktion(en)/Abschnitt(e): Tabellen `accounts`, `transactions`, `transaction_units`, `portfolio_securities`, `securities`, `historical_prices`, `plans`, `exchange_rates`, `fx_rates` innerhalb des Schemas
      - Ziel/Ergebnis der Änderung: Vollständige Dokumentation aller schema-seitig persistierten Beträge/Kurse als Grundlage für spätere Migrationen
   b) [x] Ergänze `.docs/uniform_precision_migration.md` um einen Audit-Abschnitt zu `custom_components/pp_reader/data/db_init.py`, der jede dort per `ALTER TABLE` nachgezogene numerische Spalte mit aktuellem Typ und angestrebter 10^-8-Integer-Konvertierung erfasst.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_init.py“)
      - Betroffene Funktion(en)/Abschnitt(e): `_ensure_runtime_price_columns`; `_ensure_portfolio_securities_native_column`; `_ensure_portfolio_purchase_extensions`
      - Ziel/Ergebnis der Änderung: Sicherstellung, dass auch Laufzeit-Migrationen im Präzisionsmapping berücksichtigt werden
   c) [x] Dokumentiere in `.docs/uniform_precision_migration.md`, welche Felder in `custom_components/pp_reader/data/db_access.py` aktuell Floats erwarten oder liefern und wie sie auf skalierte Integerwerte abgebildet werden sollen.
      - Dateipfad(e): .docs/uniform_precision_migration.md (Abschnitt „Phase 0 Audit – db_access.py“)
      - Betroffene Funktion(en)/Abschnitt(e): Dataclasses `PortfolioSecurity`, `Transaction`, `Portfolio`, `Account`; Helper `_resolve_average_cost_totals`
      - Ziel/Ergebnis der Änderung: Klarer Umsetzungsplan für die Umstellung der Datenzugriffsschicht auf skalierte Ganzzahlen
   d) [x] Implementiere `to_scaled_int` und `from_scaled_int` mit Decimal-ROUND_HALF_EVEN in neuem Hilfsmodul.
      - Dateipfad(e): custom_components/pp_reader/util/scaling.py
      - Betroffene Funktion(en)/Abschnitt(e): Modulinitialisierung; Funktionen `to_scaled_int`, `from_scaled_int`
      - Ziel/Ergebnis der Änderung: Zentrale Konvertierungshelfer zur Wiederverwendung in Schema-, Import- und Berechnungslogik
   e) [x] Füge dedizierte Unit-Tests für die Skalierungshelfer hinzu, die typische und grenznahe Rundungsszenarien abdecken.
      - Dateipfad(e): tests/test_scaling.py
      - Betroffene Funktion(en)/Abschnitt(e): Testfälle `test_to_scaled_int_*`, `test_from_scaled_int_*`
      - Ziel/Ergebnis der Änderung: Abgesicherte Rundungssemantik für alle nachfolgenden Migrationsphasen

2. [ ] Phase 1 – Schema Definition Update
   a) [x] Ersetze in `custom_components/pp_reader/data/db_schema.py` alle REAL-/FLOAT-Felder der Finanztabellen durch INTEGER-Spalten mit 10^-8-Skalierung und passe abhängige Ausdrücke an.
      - Dateipfad(e): custom_components/pp_reader/data/db_schema.py
      - Betroffene Funktion(en)/Abschnitt(e): `PORTFOLIO_SECURITIES_SCHEMA` (Felder `current_holdings`, `avg_price_native`, `security_currency_total`, `account_currency_total`, `avg_price_security`, `avg_price_account`, `current_value`, generierte Spalte `avg_price`); `TRANSACTION_SCHEMA` (`transaction_units.fx_rate_to_base`); `PLAN_SCHEMA` (`amount`, `fees`, `taxes`); `EXCHANGE_SCHEMA` (`exchange_rates.rate`); `FX_SCHEMA` (`fx_rates.rate`)
      - Ziel/Ergebnis der Änderung: Alle neu erzeugten Tabellen speichern Preise, Werte, Anteile und FX-Raten ausschließlich als 10^-8-ganzzahlige Werte
   b) [x] Aktualisiere die Laufzeit-Migrationshelfer in `custom_components/pp_reader/data/db_init.py`, damit neu erzeugte oder nachgezogene Spalten die INTEGER-Skalierung erhalten und bestehende REAL-Defaults entfernt werden. *(Legacy note: the runtime helpers were later deleted once canonical schema bootstrap became mandatory.)*
      - Dateipfad(e): custom_components/pp_reader/data/db_init.py
      - Betroffene Funktion(en)/Abschnitt(e): `_ensure_portfolio_securities_native_column`, `_ensure_portfolio_purchase_extensions`, `_backfill_portfolio_purchase_extension_defaults`, `initialize_database_schema`
      - Ziel/Ergebnis der Änderung: Schema-Initialisierung und Best-effort-Migration erzeugen integer-skalierte Spalten ohne Float-Rückstände
   c) [x] Passe die Schema-Prüfungen in `tests/test_migration.py` an, sodass sie die neuen INTEGER-Typen und Spalteninhalte validieren. *(Obsolete – the legacy migration test suite has been removed together with the runtime helpers.)*
      - Dateipfad(e): tests/test_migration.py (entfernt)
      - Betroffene Funktion(en)/Abschnitt(e): `_get_columns`; Tests `test_fresh_schema_contains_price_columns`, `test_legacy_schema_migrated`
      - Ziel/Ergebnis der Änderung: Tests schlagen an, sobald Schema-Definitionen von der integer-skalierten Vorgabe abweichen
   d) [x] Überarbeite die Inline-Schema-Fixtures in `tests/test_price_service.py`, damit sie die INTEGER-Skalierung für Portfolio- und Transaktionstabellen widerspiegeln.
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
   a) [ ] Passe `tests/test_db_access.py` an, sodass alle Fixtures und Erwartungen skalierte 10^-8-Integer speichern und per `from_scaled_int` konvertieren.
      - Dateipfad(e): tests/test_db_access.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_get_portfolio_securities_exposes_native_average`, `test_get_portfolio_positions_populates_aggregation_fields`, `test_get_security_snapshot_*`
      - Ziel/Ergebnis der Änderung: Datenzugriffs-Regressionstests schlagen an, sobald skalierte Ganzzahlen oder Rundungskontrakte verletzt werden
   b) [ ] Harmonisiere `tests/test_aggregations.py` mit den Skalierungshelfern und erwarte Integer-Inputs in allen Aggregationsfällen.
      - Dateipfad(e): tests/test_aggregations.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_compute_holdings_aggregation_*`, `test_select_average_cost_*`
      - Ziel/Ergebnis der Änderung: Aggregations-Tests sichern die Integer-Berechnungen und ROUND_HALF_EVEN-Ausgabe ab
   c) [ ] Aktualisiere `tests/test_performance.py`, damit Performance-Metriken auf skalierte Integer/Decimal-Zwischenwerte geprüft werden.
      - Dateipfad(e): tests/test_performance.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_select_performance_metrics_*`
      - Ziel/Ergebnis der Änderung: Performance-Regressionstests decken Rundungsfehler bei Kennzahlen sofort auf
   d) [ ] Überarbeite `tests/test_fetch_live_portfolios.py` auf integerbasierte Summen und formattierte Dezimalausgaben der Koordinator-Daten.
      - Dateipfad(e): tests/test_fetch_live_portfolios.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_fetch_live_portfolios_basic`
      - Ziel/Ergebnis der Änderung: Live-Portfolio-Aggregationstests reflektieren integerbasierte Eingaben und API-konforme Ausgaben
   e) [ ] Passe `tests/test_coordinator_contract.py` an, damit `_portfolio_contract_entry` die neuen Decimal-Felder und Rohwerte validiert.
      - Dateipfad(e): tests/test_coordinator_contract.py
      - Betroffene Funktion(en)/Abschnitt(e): `_build_entry`, `test_portfolio_contract_entry_*`
      - Ziel/Ergebnis der Änderung: Vertragstests stellen sicher, dass Koordinator-Payloads formatierte Dezimalwerte aus skalierten Integers erzeugen
   f) [ ] Aktualisiere `tests/test_revaluation_live_aggregation.py`, damit Revaluation-Payloads skalierten Integerinput und formatierte Ausgabe kombinieren.
      - Dateipfad(e): tests/test_revaluation_live_aggregation.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_revaluation_uses_live_portfolio_values`
      - Ziel/Ergebnis der Änderung: Revaluationspfad-Tests garantieren Präzision während Live-Updates
   g) [ ] Modernisiere `tests/test_logic_securities.py` auf Integer-Fixwerte und prüfe Decimal-Konvertierungen in allen Bewertungsfällen.
      - Dateipfad(e): tests/test_logic_securities.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_db_calculate_*`, `test_normalize_transaction_amounts`
      - Ziel/Ergebnis der Änderung: Logiktests verhindern Rückfall auf Float-Arithmetik in Sicherheitsberechnungen
   h) [ ] Übertrage `tests/test_logic_securities_native_avg.py` auf skalierte Integer und Decimal-Ausgaben für native Durchschnittskäufe.
      - Dateipfad(e): tests/test_logic_securities_native_avg.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_db_calculate_native_avg_price_*`
      - Ziel/Ergebnis der Änderung: Native-Durchschnittstests bewahren Integerpräzision bei unterschiedlichen Währungen
   i) [ ] Ergänze `tests/test_sync_from_pclient.py` um skalierte Importpfade und ROUND_HALF_EVEN-Assertionen je Konvertierung.
      - Dateipfad(e): tests/test_sync_from_pclient.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_sync_from_pclient_*`, `_assert_written_positions`
      - Ziel/Ergebnis der Änderung: Importtests decken fehlerhafte Skalierung oder Rundung sofort auf
   j) [ ] Justiere `tests/test_price_service.py`, sodass Preisaktualisierungen skaliert gespeicherte Werte und formatierte Payloads erwarten.
      - Dateipfad(e): tests/test_price_service.py
      - Betroffene Funktion(en)/Abschnitt(e): `_setup_price_rows`, `test_refresh_impacted_portfolio_securities_uses_currency_helpers`
      - Ziel/Ergebnis der Änderung: Preisservice-Tests prüfen Integerpersistenz und korrekte Dezimalausgabe nach Updates
   k) [x] Passe `tests/test_price_persistence_fields.py` auf 10^-8-Skalenwerte und neue Pflichtspaltenprüfungen an. *(Legacy Persistenz-Test entfernt.)*
      - Dateipfad(e): tests/test_price_persistence_fields.py (entfernt)
      - Betroffene Funktion(en)/Abschnitt(e): `test_only_allowed_price_columns_persisted`
      - Ziel/Ergebnis der Änderung: Persistenztests garantieren, dass nur erlaubte Integer-Spalten geschrieben werden
   l) [x] Synchronisiere `tests/test_migration.py` mit den aktualisierten Schema-Definitionen und prüfe Integer-Datentypen je Migration. *(Legacy Migrationstest entfernt.)*
      - Dateipfad(e): tests/test_migration.py (entfernt)
      - Betroffene Funktion(en)/Abschnitt(e): `test_migrate_schema_*`
      - Ziel/Ergebnis der Änderung: Migrationstests verifizieren die vollständige Integerumstellung über alle Schema-Versionen
   m) [ ] Aktualisiere `tests/test_ws_portfolio_positions.py`, damit Websocket-Payloads formatierte Dezimalwerte und Roh-Integer-Felder korrekt spiegeln.
      - Dateipfad(e): tests/test_ws_portfolio_positions.py
      - Betroffene Funktion(en)/Abschnitt(e): `populated_db`-Fixture, `test_ws_get_portfolio_positions_normalises_currency`, `test_normalize_portfolio_positions_uses_average_cost_payload`
      - Ziel/Ergebnis der Änderung: Websocket-Positions-Tests validieren Integer-Einlagerung und formattierte Ausgabe parallel
   n) [ ] Überarbeite `tests/test_ws_portfolios_live.py` auf integerbasierte Aggregationen und dezimalformatierte Antworten.
      - Dateipfad(e): tests/test_ws_portfolios_live.py
      - Betroffene Funktion(en)/Abschnitt(e): `initialized_db`, `test_ws_get_portfolio_data_returns_live_values`
      - Ziel/Ergebnis der Änderung: Live-Websocket-Tests sichern integerbasierte Summen und Präsentationswerte ab
   o) [ ] Passe `tests/test_ws_security_history.py` an, sodass Historien- und Snapshot-Payloads skalierte Preis- und Mengenwerte korrekt konvertieren.
      - Dateipfad(e): tests/test_ws_security_history.py
      - Betroffene Funktion(en)/Abschnitt(e): `_run_ws_get_security_history`, `_run_ws_get_security_snapshot`, `test_ws_get_security_history_returns_filtered_prices`, `test_ws_get_security_history_ignores_unknown_feature_flags`, `test_ws_get_security_history_supports_predefined_ranges`, `test_ws_get_security_snapshot_success`, `test_ws_get_security_snapshot_missing_security`
      - Ziel/Ergebnis der Änderung: Sicherheits-Historientests prüfen Integer-Speicher und Formatierung der Ausgaben
   p) [ ] Aktualisiere `tests/test_ws_accounts_fx.py` auf skalierte Kontosalden und explizite Decimal-/Stringausgaben im FX-Handler.
      - Dateipfad(e): tests/test_ws_accounts_fx.py
      - Betroffene Funktion(en)/Abschnitt(e): `_make_account`, `test_collect_active_fx_currencies_filters_invalid_entries`, `test_ws_get_accounts_requests_fx_with_utc_timezone`
      - Ziel/Ergebnis der Änderung: Account-/FX-Websocket-Tests verifizieren Integer-Salden und korrekte Anzeigeformate
   q) [ ] Justiere `tests/test_ws_last_file_update.py`, damit Zeitstempeltests die neuen Payload-Felder aus integerbasierten Quellen widerspiegeln.
      - Dateipfad(e): tests/test_ws_last_file_update.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_ws_last_file_update_formats_timestamp`, `test_ws_last_file_update_uses_single_entry_default`, `test_ws_last_file_update_requires_entry_for_multiple_entries`
      - Ziel/Ergebnis der Änderung: Last-Update-Websocket-Tests bleiben stabil nach Präzisionsmigration
   r) [ ] Aktualisiere `tests/test_event_push.py` auf integerbasierte Backend-Payloads und formattierte Performancewerte.
      - Dateipfad(e): tests/test_event_push.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_compact_portfolio_values_forwards_canonical_payload`, `test_compact_portfolio_positions_sequence`
      - Ziel/Ergebnis der Änderung: Event-Bus-Tests überwachen korrekte Konvertierungen zwischen Integer-Rohdaten und Dezimal-Ausgaben
   s) [ ] Überarbeite `tests/panel_event_payload.yaml`, sodass Beispielpayloads skalierte Integers und neue Dezimalfelder widerspiegeln.
      - Dateipfad(e): tests/panel_event_payload.yaml
      - Betroffene Funktion(en)/Abschnitt(e): Portfolio-/Positions-Beispiele
      - Ziel/Ergebnis der Änderung: Manuelle QA-Vorlagen zeigen den erwarteten Payload-Contract nach Migration
   t) [ ] Aktualisiere `tests/frontend/test_dashboard_smoke.py`, damit Dashboard-Smoke-Tests die formattierten Dezimalfelder konsumieren.
      - Dateipfad(e): tests/frontend/test_dashboard_smoke.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_dashboard_bundle_smoke`
      - Ziel/Ergebnis der Änderung: Frontend-Smoke-Test validiert neue Anzeigeformate ohne zusätzliche Konvertierungen
   u) [ ] Passe `tests/frontend/dashboard_smoke.mjs` an, sodass die Testdaten integerbasierte Inputs und gerenderte Dezimalwerte abbilden.
      - Dateipfad(e): tests/frontend/dashboard_smoke.mjs
      - Betroffene Funktion(en)/Abschnitt(e): Portfolio-/Positions-Datensamples
      - Ziel/Ergebnis der Änderung: Node-Smoke-Skript reproduziert das neue Payload-Layout deterministisch
   v) [ ] Aktualisiere `tests/frontend/test_portfolio_update_gain_abs.py` auf die skalierten Payloads und formatierten Gains.
      - Dateipfad(e): tests/frontend/test_portfolio_update_gain_abs.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_portfolio_update_gain_abs_handles_zero_purchase`
      - Ziel/Ergebnis der Änderung: Frontend-Regressions-Test prüft Gain-Berechnungen anhand der neuen Dezimalwerte
   w) [ ] Passe `tests/frontend/portfolio_update_gain_abs.mjs` an, damit die Fixtures skalierten Integerinput und formattierte Ausgabe enthalten.
      - Dateipfad(e): tests/frontend/portfolio_update_gain_abs.mjs
      - Betroffene Funktion(en)/Abschnitt(e): Mock-Payload-Erstellung
      - Ziel/Ergebnis der Änderung: Frontend-Test-Fixture deckt Integerpräzision und Anzeigeformat konsistent ab

7. [ ] Phase 6 – Documentation & Release Notes
   a) [ ] Überarbeite `ARCHITECTURE.md`, um den 10^-8-Integervertrag, die Skalierungshelfer und Migrationsschritte zu dokumentieren.
      - Dateipfad(e): ARCHITECTURE.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitte „Data ingestion & persistence“, „Price service“, „Foreign exchange helper“, „WebSocket API & frontend“, „Domain model snapshot“
      - Ziel/Ergebnis der Änderung: Architekturleitfaden beschreibt präzise Speichereinheiten, Rundungspfad und benötigte Migrationen
   b) [ ] Aktualisiere `README.md`, damit Anwender über die 10^-8-Skalierung, benötigte Datenreimporte und Umgang mit bestehenden Daten informiert werden.
      - Dateipfad(e): README.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitte „Overview“, „Usage“, „Troubleshooting“
      - Ziel/Ergebnis der Änderung: Nutzer-Dokumentation weist auf neue Präzisionslogik sowie erforderliche Neuimporte hin
   c) [ ] Ergänze `README-dev.md` um Hinweise zur Integer-Skalierung, Helper-Nutzung und Testanpassungen.
      - Dateipfad(e): README-dev.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitte „Backend development notes“, „Testing & QA“, „Release workflow“
      - Ziel/Ergebnis der Änderung: Beitragende kennen den Skalierungsvertrag und wissen, welche Tests/Migrationen bei Änderungen anzupassen sind
   d) [ ] Ergänze `.docs/uniform_precision_migration.md` um Phase-6-Anweisungen zur Dokumentationsaktualisierung und Release-Kommunikation.
      - Dateipfad(e): .docs/uniform_precision_migration.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „Phase 6 – Documentation & Release Notes“, Abschluss-Checkliste
      - Ziel/Ergebnis der Änderung: Migrationsleitfaden listet alle Dokumentations- und Kommunikationsschritte explizit auf
   e) [ ] Überarbeite `.docs/native_price/fix_native_purchase.md`, damit die Beispiele und Umsetzungsschritte skalierte Integerwerte sowie `to_scaled_int`/`from_scaled_int` widerspiegeln.
      - Dateipfad(e): .docs/native_price/fix_native_purchase.md
      - Betroffene Funktion(en)/Abschnitt(e): Tabellen „transactions“, „transaction_units“, Abschnitt „Plan to display correct FX purchase prices per share“
      - Ziel/Ergebnis der Änderung: Referenzbeispiele zeigen neue Speicherung/Umrechnung ohne handschriftliche Division durch 1e8
   f) [ ] Aktualisiere `.docs/native_price/native_avg_purchase_price.md`, um Zielzustand und Datenfluss auf 10^-8-Integer und zentrale Skalierungshelfer auszurichten.
      - Dateipfad(e): .docs/native_price/native_avg_purchase_price.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitte „Current State“, „Target State“, „Proposed Data Flow / Architecture“, „Incremental Implementation“
      - Ziel/Ergebnis der Änderung: Konzeptpapier verlangt Integerpersistenz und verweist auf Skalierungshelfer statt Float-Teilungen
   g) [ ] Passe `.docs/native_price/TODO_fix_native_purchase.md` an, sodass Aufgaben die neuen Skalierungshelfer und Integerwerte verwenden.
      - Dateipfad(e): .docs/native_price/TODO_fix_native_purchase.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „Aufgabenstellung“, Schrittlisten mit 1e8-Teilungen
      - Ziel/Ergebnis der Änderung: TODO beschreibt Umsetzungsschritte mit zentralem Skalierungsmodul statt manuellem Float-Handling
   h) [ ] Passe `.docs/native_price/TODO_native_avg_purchase_price.md` auf den Integervertrag und die Nutzung der Skalierungshelfer an.
      - Dateipfad(e): .docs/native_price/TODO_native_avg_purchase_price.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „Ziel“, Maßnahmenliste für Schema/Logik/Frontend
      - Ziel/Ergebnis der Änderung: TODO ruft explizit zur Nutzung skalierten Persistenz/Helper auf
   i) [ ] Ergänze `CHANGELOG.md` um einen Eintrag, der die Präzisionsmigration, erforderliche Datenmigration und Auswirkungen auf Bestandsnutzer beschreibt.
      - Dateipfad(e): CHANGELOG.md
      - Betroffene Funktion(en)/Abschnitt(e): Nächster Release-Block bzw. „Unreleased“-Abschnitt
      - Ziel/Ergebnis der Änderung: Release Notes kommunizieren Neuimporte, Schemaänderungen und Helper-Nutzung
   j) [ ] Lege `.docs/release_notes_uniform_precision.md` an oder erweitere bestehende Release-Hinweise, um Schritt-für-Schritt-Anweisungen zur Datenregeneration bereitzustellen.
      - Dateipfad(e): .docs/release_notes_uniform_precision.md
      - Betroffene Funktion(en)/Abschnitt(e): Gesamtdokument (Neu)
      - Ziel/Ergebnis der Änderung: Ergänzende Release-Notizen führen Nutzer durch Backup, Neuimport und Validierung nach der Migration

8. [ ] Phase 7 – Rollout & Neuinitialisierung
   a) [ ] Entferne in `custom_components/pp_reader/data/db_init.py` alle Laufzeit-Migrationen und ergänze eine Guard, die REAL-Spalten oder fehlende 10^-8-Integer erkennt und eine `UniformPrecisionRebuildRequired`-Exception auslöst.
      - Dateipfad(e): custom_components/pp_reader/data/db_init.py
      - Betroffene Funktion(en)/Abschnitt(e): `_ensure_runtime_price_columns`, `_ensure_portfolio_securities_native_column`, `_ensure_portfolio_purchase_extensions`, `_backfill_portfolio_purchase_extension_defaults`, `initialize_database_schema`
      - Ziel/Ergebnis der Änderung: Setup bricht deterministisch ab, sobald eine Alt-Datenbank erkannt wird, und fordert zur Neuinitialisierung auf
   b) [ ] Ergänze `custom_components/pp_reader/__init__.py` um Fehlerbehandlung für `UniformPrecisionRebuildRequired`, die eine persistente Benachrichtigung erzeugt und `ConfigEntryNotReady` mit einem Hinweis zum Neuaufbau auslöst.
      - Dateipfad(e): custom_components/pp_reader/__init__.py
      - Betroffene Funktion(en)/Abschnitt(e): `async_setup_entry`
      - Ziel/Ergebnis der Änderung: Anwender erhalten einen klaren Hinweis, dass alte Datenbanken gelöscht und via `.portfolio` neu eingelesen werden müssen
   c) [ ] Ergänze `tests/test_migration.py` um Assertions für die neue Guard-Exception, sodass Alt-Schema-Datenbanken den Neuaufbau erzwingen.
      - Dateipfad(e): tests/test_migration.py
      - Betroffene Funktion(en)/Abschnitt(e): `test_legacy_schema_migrated`, Hilfsfunktionen zur Schema-Initialisierung
      - Ziel/Ergebnis der Änderung: Tests verhindern, dass veraltete REAL-Spalten stillschweigend migriert werden
   d) [ ] Aktualisiere `.docs/uniform_precision_migration.md`, um Phase 7 explizit auf die verpflichtende Neuinitialisierung ohne Migrationstool auszurichten.
      - Dateipfad(e): .docs/uniform_precision_migration.md
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitt „Phase 7“/Rollout (Planungs- und Ablaufbeschreibung)
      - Ziel/Ergebnis der Änderung: Migrationsleitfaden verlangt das Löschen alter Datenbanken und erneutes `.portfolio`-Parsing
   e) [ ] Ergänze `.docs/release_notes_uniform_precision.md` um Schritt-für-Schritt-Hinweise zum Löschen der alten DB und erneuten Import über bestehende Sync-Funktionen.
      - Dateipfad(e): .docs/release_notes_uniform_precision.md
      - Betroffene Funktion(en)/Abschnitt(e): Gesamtdokument bzw. Abschnitt „Upgrade Steps“
      - Ziel/Ergebnis der Änderung: Release Notes führen Nutzer durch den vollständigen Neuaufbau statt eine Migrationstoolkette anzubieten

9. Optional
   a) [ ] Optional: Offer temporary duplicate API fields exposing raw integers for third-party automations during transition.
      - Dateipfad(e): custom_components/pp_reader/api/rest.py; custom_components/pp_reader/api/websocket.py
      - Betroffene Funktion(en)/Abschnitt(e): Serializer-Ausgabeoptionen
      - Ziel/Ergebnis der Änderung: Sanfter Übergang für externe Integrationen ohne sofortige Anpassungspflicht
   b) [ ] Optional: Provide SQL helper snippets in documentation for analysts to interpret scaled integer columns.
      - Dateipfad(e): .docs/uniform_precision_migration.md; README-dev.md
      - Betroffene Funktion(en)/Abschnitt(e): Troubleshooting-/FAQ-Bereiche
      - Ziel/Ergebnis der Änderung: Vereinfachte manuelle Analysen trotz Ganzzahlspeicherung
