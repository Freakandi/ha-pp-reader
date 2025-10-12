1. Backend: Kontostands-Konvertierungen auf Currency-Utilities umstellen
   a) [x] Ersetze die manuelle Division durch `cent_to_eur` und `round_currency`, behalte Validierung bei.\
      - Dateipfad(e): `custom_components/pp_reader/logic/accounting.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `calculate_account_balance`\
      - Ziel/Ergebnis: Alle Konto-Salden nutzen zentrale Währungshelper, keine direkten `/ 100` mehr.
   b) [x] Konvertiere Rohsalden und EUR-Werte im Sync-Layer mit `cent_to_eur`/`round_currency`, entferne `round(...)`.\
      - Dateipfad(e): `custom_components/pp_reader/data/sync_from_pclient.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_emit_accounts_update`\
      - Ziel/Ergebnis: Einheitliche Rundung für `orig_balance`/`balance`, FX-Fehlerszenarien bleiben erhalten.
   c) [x] Aktualisiere Backend-Tests auf die Utility-Konvertierung (neue Erwartungswerte, Helper-Mocks).\
      - Dateipfad(e): `tests/test_sync_from_pclient.py`, `tests/test_ws_accounts_fx.py`, `tests/test_db_access.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Assertions zu Kontosalden und FX-Fallbacks\
      - Ziel/Ergebnis: Tests spiegeln die geänderte Rundung/Skalierung wider.
   d) [x] Passe Kontosalden-Fixtures für Frontend-Snapshots an die Utility-Ausgabe an.\
      - Dateipfad(e): `tests/frontend/portfolio_update_gain_abs.mjs`, `tests/frontend/test_portfolio_update_gain_abs.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete `orig_balance`/`balance` Werte\
      - Ziel/Ergebnis: Dashboard-Tests nutzen identische Zahlen wie der neue Backend-Serializer.

2. Backend: Transaktionsbeträge durch Currency-Utilities normalisieren
   a) [x] Route alle Betragsspalten in `_normalize_transaction_amounts` über `cent_to_eur`/`round_currency`.\
      - Dateipfad(e): `custom_components/pp_reader/logic/securities.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_transaction_amounts`\
      - Ziel/Ergebnis: Keine manuellen Cent→EUR-Rechnungen mehr innerhalb der Normalisierung.
   b) [x] Ersetze Eigenberechnungen in `_resolve_native_amount` durch die zentralen Helper.\
      - Dateipfad(e): `custom_components/pp_reader/logic/securities.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_resolve_native_amount`\
      - Ziel/Ergebnis: Native Legs (Brutto, Gebühren, Steuern) laufen durch Utility-Funktionen.
   c) [x] Entferne obsoletes Konvertierungs-Handling in den Securities-Helfern nachdem alle Aufrufer migriert sind.\
      - Dateipfad(e): `custom_components/pp_reader/logic/securities.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Hilfszweige für manuelle Skalierung\
      - Ziel/Ergebnis: Codepfad nutzt ausschließlich geteilte Utilities.
   d) [x] Aktualisiere Testfälle und Fixtures für Wertpapier-Transaktionen auf die neue Rundung.\
      - Dateipfad(e): `tests/test_logic_securities.py`, `tests/test_logic_securities_native_avg.py`, `tests/test_sync_from_pclient.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Konvertierungsergebnisse\
      - Ziel/Ergebnis: Tests bestätigen, dass die Helper in allen Fällen greifen.

3. Backend: Portfolio-Koordinator von `_normalize_amount` entkoppeln
   a) [x] Ersetze alle Aufrufe von `_normalize_amount` durch `cent_to_eur`/`round_currency`.\
      - Dateipfad(e): `custom_components/pp_reader/data/coordinator.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_amount` Aufrufer innerhalb `PortfolioCoordinator`\
      - Ziel/Ergebnis: Koordinator verlässt sich vollständig auf die Currency-Utilities.
   b) [x] Entferne die Funktion `_normalize_amount` und bereinige Importe.\
      - Dateipfad(e): `custom_components/pp_reader/data/coordinator.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Funktionsdefinition `_normalize_amount`\
      - Ziel/Ergebnis: Redundanter Code entfällt nach der Migration.
   c) [x] Passe Koordinator-bezogene Tests auf das Entfernen der Helper-Funktion an.\
      - Dateipfad(e): `tests/test_ws_portfolio_positions.py`, `tests/test_ws_portfolios_live.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Assertions zu Koordinator-Ausgaben\
      - Ziel/Ergebnis: Tests validieren weiterhin korrekt skalierte Werte.

4. Backend: Websocket-Rundung auf `round_currency` umstellen
   a) [x] Tausche alle direkten `round(...)` Aufrufe im Positionsserializer gegen `round_currency`.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_positions`, zugehörige Serializer\
      - Ziel/Ergebnis: Einheitliche Währungsrundung über alle Payloads.
   b) [x] Aktualisiere Berechnungen für Holdings- und Wertfelder, sodass keine redundanten `round`-Ketten verbleiben.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Berechnung von `purchase_value`, `gain_abs`, `gain_pct`, `current_value`\
      - Ziel/Ergebnis: Alle Werte nutzen `round_currency` bzw. Utility-Rückgaben.
   c) [x] Passe Tests auf die neue Rundungsstrategie an.\
      - Dateipfad(e): `tests/test_ws_portfolio_positions.py`, `tests/test_ws_portfolios_live.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Kauf-/Performancewerte\
      - Ziel/Ergebnis: Tests referenzieren `round_currency` Ergebnisse statt `round`.

5. Backend: `_normalize_currency_amount` durch Utility-Aufrufe ersetzen
   a) [ ] Ersetze den Funktionsinhalt von `_normalize_currency_amount` durch direkte Aufrufe der Currency-Utilities.\
      - Dateipfad(e): `custom_components/pp_reader/data/event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_currency_amount`\
      - Ziel/Ergebnis: Helfer dient nur noch als dünne Fassade zu `cent_to_eur`/`round_currency`.
   b) [ ] Migriere alle Aufrufer auf direkte Utility-Nutzung und lösche `_normalize_currency_amount`.\
      - Dateipfad(e): `custom_components/pp_reader/data/event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Aufrufer in den Event-Push-Helfern\
      - Ziel/Ergebnis: Redundante Wrapper entfallen vollständig.
   c) [ ] Aktualisiere Event-Push-Tests für die neue Utility-Verwendung.\
      - Dateipfad(e): `tests/test_event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Betragsfelder\
      - Ziel/Ergebnis: Tests spiegeln die Utility-basierte Rundung.

6. Backend: `_normalize_position_entry` auf Aggregations-/Performance-Helfer umbauen
   a) [x] Verwende `compute_holdings_aggregation`, `select_average_cost` und `select_performance_metrics` statt Eigenberechnungen.\
      - Dateipfad(e): `custom_components/pp_reader/data/event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_position_entry`\
      - Ziel/Ergebnis: Event-Payloads nutzen zentral erzeugte Aggregationsobjekte.
   b) [x] Entferne Duplikatberechnungen (Summen, Durchschnittspreise, Performance) nach der Migration.\
      - Dateipfad(e): `custom_components/pp_reader/data/event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Manuelle Aggregations-/Performance-Logik\
      - Ziel/Ergebnis: Kein paralleler Rechenpfad mehr neben den Shared-Helpern.
   c) [x] Aktualisiere Tests und Fixtures, damit sie die strukturierten Aggregations- und Performanceblöcke erwarten.\
      - Dateipfad(e): `tests/test_event_push.py`, `tests/panel_event_payload.yaml`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Event-Payloads\
      - Ziel/Ergebnis: Tests prüfen auf die neuen Datenstrukturen.

7. Backend: `_coerce_float`-Helper durch Utility-Rückgaben ersetzen
   a) [x] Entferne alle Verwendungen von `_coerce_float`/`_coerce_optional_float` zugunsten der Currency-Utilities oder präziser Typprüfungen.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Serializer für Snapshot- und Positionsdaten\
      - Ziel/Ergebnis: Doppelter Konvertierungscode entfällt.
   b) [x] Lösche die beiden Helper-Funktionen und bereinige Importe.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Funktionsdefinitionen `_coerce_float`, `_coerce_optional_float`\
      - Ziel/Ergebnis: Codebasis enthält nur noch zentrale Helfer.
   c) [x] Passe Websocket-Testfälle auf das neue Normalisierungsverhalten an.\
      - Dateipfad(e): `tests/test_ws_portfolio_positions.py`, `tests/test_ws_security_history.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Feldausprägungen\
      - Ziel/Ergebnis: Tests bestätigen unveränderte Payload-Struktur trotz Helper-Entfernung.

8. Backend: `_normalize_portfolio_positions` auf Backend-Strukturen beschränken
   a) [ ] Leite Aggregations-, Average-Cost- und Performance-Blöcke unverändert durch und entferne lokale Rekonstruktionen.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: Serializer gibt direkt die vom Backend gelieferten Strukturen weiter.
   b) [ ] Entferne lokale Summen-/Durchschnittsberechnungen (insb. für Kaufwerte, Gewinne).\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Manuelle Aggregationslogik\
      - Ziel/Ergebnis: Keine doppelte Implementierung der Aggregationslogik.
   c) [ ] Aktualisiere Websocket-Payload-Tests auf die durchgereichten Strukturen.\
      - Dateipfad(e): `tests/test_ws_portfolio_positions.py`, `tests/test_ws_portfolios_live.py`, `tests/test_ws_security_history.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Positions- und Snapshot-Payloads\
      - Ziel/Ergebnis: Tests validieren, dass die strukturierten Blöcke vorhanden sind.

9. Frontend: `deriveAggregation` Fallback entfernen
   a) [ ] Entferne alle Fallback-Rechnungen in `deriveAggregation` und vertraue ausschließlich auf `position.aggregation`.\
      - Dateipfad(e): `src/data/updateConfigsWS.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `deriveAggregation`\
      - Ziel/Ergebnis: Keine lokalen Kaufwert-/Holdings-Neuberechnungen mehr.
   b) [ ] Aktualisiere Frontend-Tests und Fixtures auf Aggregationsdaten aus dem Backend.\
      - Dateipfad(e): `tests/frontend/test_dashboard_smoke.py`, `tests/frontend/dashboard_smoke.mjs`, `src/tabs/__tests__/overview.render.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Aggregationsfelder\
      - Ziel/Ergebnis: Tests verwenden die durchgeleiteten Strukturen.

10. Frontend: `normalizeAverageCost` aus Websocket-Cache vereinfachen
   a) [ ] Nutze das `AverageCostPayload` direkt und entferne Ableitungen aus Legacy-Feldern.\
      - Dateipfad(e): `src/data/updateConfigsWS.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `normalizeAverageCost`\
      - Ziel/Ergebnis: Average-Cost-Berechnung erfolgt ausschließlich basierend auf `position.average_cost`.
   b) [ ] Bereinige Tests, die auf rekonstruierte Average-Cost-Werte prüfen.\
      - Dateipfad(e): `tests/frontend/test_dashboard_smoke.py`, `src/tabs/__tests__/overview.render.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Average-Cost-Werte\
      - Ziel/Ergebnis: Tests erwarten direkte Backend-Werte.

11. Frontend: `normalizePosition` auf Strukturvalidierung reduzieren
   a) [ ] Lasse `normalizePosition` nur noch Formvalidierung durchführen und entferne Aggregations-/Performance-Rekombinationen.\
      - Dateipfad(e): `src/data/updateConfigsWS.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `normalizePosition`\
      - Ziel/Ergebnis: Funktion führt keine inhaltliche Neuberechnung mehr aus.
   b) [ ] Aktualisiere Websocket-Cache-Tests auf das reduzierte Normalisierungsverhalten.\
      - Dateipfad(e): `tests/frontend/test_dashboard_smoke.py`, `tests/frontend/portfolio_update_gain_abs.mjs`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Positionsobjekte\
      - Ziel/Ergebnis: Tests prüfen nur noch Struktur und nicht berechnete Werte.

12. Frontend: Übersichtstab nutzt neue Average-Cost-Struktur
   a) [ ] Greife in `resolveAverageCost` ausschließlich auf `record.average_cost` und `aggregation` zu.\
      - Dateipfad(e): `src/tabs/overview.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `resolveAverageCost`\
      - Ziel/Ergebnis: Keine Rückgriffe auf `avg_price_*` oder Legacy-Durchschnittswerte mehr.
   b) [ ] Entferne Fallback-Berechnungen für Kaufwerte und halte nur Validierungen/Reformatierungen vor.\
      - Dateipfad(e): `src/tabs/overview.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Hilfsfunktionen zur Durchschnittsableitung\
      - Ziel/Ergebnis: Übersicht listet exakt die Backend-Werte.
   c) [ ] Passe Komponententests auf die neue Datenquelle an.\
      - Dateipfad(e): `src/tabs/__tests__/overview.render.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete gerenderte Average-Cost-Anzeigen\
      - Ziel/Ergebnis: Tests referenzieren `average_cost` aus dem Payload.

13. Frontend: Sicherheitsdetail-Tab auf strukturierte Daten umstellen
   a) [ ] Entferne Legacy-Fallbacks in `normalizeAverageCost` und nutze Snapshot-`average_cost` direkt.\
      - Dateipfad(e): `src/tabs/security_detail.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `normalizeAverageCost`\
      - Ziel/Ergebnis: Snapshot-Normalisierung spiegelt Backend-Struktur wider.
   b) [ ] Ersetze `resolveAveragePurchaseBaseline` durch Verwendung der Backend-Performance-/Average-Cost-Metriken.\
      - Dateipfad(e): `src/tabs/security_detail.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): `resolveAveragePurchaseBaseline`\
      - Ziel/Ergebnis: Chart-Baselines nutzen die gelieferten Metriken ohne Neuaufbau.
   c) [ ] Aktualisiere Security-Detail-Tests und Storybook-/Snapshot-Fixtures.\
      - Dateipfad(e): `src/tabs/__tests__/security_detail.metrics.test.ts`, `tests/frontend/dashboard_smoke.mjs`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Snapshot-Metriken\
      - Ziel/Ergebnis: Tests erwarten ausschließlich strukturierte Payloads.

14. Frontend: Durchschnittswerte im Overview-Tab beim Rendern anwenden
   a) [ ] Nutze `average_cost` direkt in `resolveAverageCost`-Verwendungen (z. B. Tabellenformatierung).\
      - Dateipfad(e): `src/tabs/overview.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Renderfunktionen für Durchschnittswerte\
      - Ziel/Ergebnis: UI zeigt unverändert Backend-Werte an.
   b) [ ] Entferne redundante Formatierungshelfer, die spezifisch für Legacyfelder geschrieben wurden.\
      - Dateipfad(e): `src/tabs/overview.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Hilfsfunktionen für `avg_price_*`\
      - Ziel/Ergebnis: Übersichtscode ist aufgeräumt und legt Fokus auf strukturierte Daten.

15. Backend/Frontend: `average_purchase_price_native` Feld entfernen
   a) [ ] Entferne das Feld aus Websocket- und Snapshot-Serialisern nach Migration aller Frontend-Verbraucher.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/data/event_push.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Payload-Zusammenstellung für Portfolio-/Snapshot-Daten\
      - Ziel/Ergebnis: Feld wird nicht länger ausgeliefert.
   b) [ ] Passe Datenmodelle und UI-Nutzung auf `average_cost.native` an.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/types.ts`, `src/data/updateConfigsWS.ts`, `src/tabs/overview.ts`, `src/tabs/security_detail.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Interface-Definitionen, Renderer\
      - Ziel/Ergebnis: UI greift auf die strukturierte Average-Cost-Struktur zurück.
   c) [ ] Aktualisiere Tests/Fixtures, die das Feld referenzieren.\
      - Dateipfad(e): `tests/test_ws_portfolio_positions.py`, `tests/test_ws_security_history.py`, `tests/frontend/*`, `src/tabs/__tests__/*`\
      - Betroffene Funktion(en)/Abschnitt(e): Assertions/Fixture-Daten\
      - Ziel/Ergebnis: Keine Referenzen auf das entfernte Feld bleiben bestehen.

16. Backend/Frontend: `avg_price_security` Feld abbauen
   a) [ ] Entferne das Feld aus Backend-Serialisern und Aggregations-Rückgaben.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/data/aggregations.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Payload-Building, Aggregationsdatensätze\
      - Ziel/Ergebnis: Feld entfällt nach Migration.
   b) [ ] Aktualisiere Frontend-Interfaces und Renderer auf `average_cost.security`.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/types.ts`, `src/tabs/overview.ts`, `src/tabs/security_detail.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Typdefinitionen, Formatierungen\
      - Ziel/Ergebnis: UI nutzt nur noch `average_cost.security`.
   c) [ ] Bereinige Tests/Fixtures.\
      - Dateipfad(e): `tests/test_aggregations.py`, `tests/test_ws_portfolio_positions.py`, `tests/frontend/*`\
      - Betroffene Funktion(en)/Abschnitt(e): Erwartete Durchschnittspreise\
      - Ziel/Ergebnis: Keine Legacy-Feldprüfungen verbleiben.

17. Backend/Frontend: `avg_price_account` Feld entfernen
   a) [ ] Entferne das Feld aus Aggregations-/Serializer-Payloads.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/data/aggregations.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Serialisierung für Portfolio/Snapshot\
      - Ziel/Ergebnis: Feld entfällt vollständig.
   b) [ ] Stelle UI auf `average_cost.account` um.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/types.ts`, `src/tabs/overview.ts`, `src/tabs/security_detail.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Interfacetypen, Renderer\
      - Ziel/Ergebnis: UI referenziert das strukturierte Feld.
   c) [ ] Aktualisiere Tests/Fixtures mit neuen Assertions.\
      - Dateipfad(e): `tests/test_aggregations.py`, `tests/frontend/*`, `src/tabs/__tests__/*`\
      - Betroffene Funktion(en)/Abschnitt(e): Durchschnittspreis-Assertions\
      - Ziel/Ergebnis: Testdaten enthalten keine Legacy-Felder mehr.

18. Backend/Frontend: Flaches `gain_abs` Feld entfernen
   a) [ ] Stoppe das Setzen von `gain_abs` im Positionsserializer, nutze nur `performance.gain_abs`.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: Performancewerte werden ausschließlich über den strukturierten Block geliefert.
   b) [ ] Aktualisiere Frontend und Tests auf die verschachtelte Quelle.\
      - Dateipfad(e): `src/data/api.ts`, `src/data/updateConfigsWS.ts`, `tests/frontend/portfolio_update_gain_abs.mjs`, `tests/frontend/test_portfolio_update_gain_abs.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Position-Normalisierung, Assertions\
      - Ziel/Ergebnis: UI/Test greifen auf `position.performance.gain_abs` zu.

19. Backend/Frontend: Flaches `gain_pct` Feld entfernen
   a) [ ] Entferne `gain_pct` aus Backend-Payloads.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: Prozentwerte kommen nur noch aus `performance.gain_pct`.
   b) [ ] Aktualisiere Frontend-Anzeigen und Tests.\
      - Dateipfad(e): `src/data/api.ts`, `src/data/updateConfigsWS.ts`, `src/tabs/overview.ts`, `tests/frontend/*`\
      - Betroffene Funktion(en)/Abschnitt(e): Prozentanzeige, Erwartungswerte\
      - Ziel/Ergebnis: UI/Test nutzen den verschachtelten Wert.

20. Backend/Frontend: `day_price_change_native` Feld entfernen
   a) [ ] Entferne das Feld aus Snapshot-/Positionsserialisern.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_serialise_security_snapshot`, `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: Day-Change native kommt nur aus `performance.day_change.price_change_native`.
   b) [ ] Passe UI und Tests auf das verschachtelte Feld an.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/security_detail.ts`, `tests/frontend/dashboard_smoke.mjs`, `src/tabs/__tests__/security_detail.metrics.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Day-Change Darstellung\
      - Ziel/Ergebnis: UI/Test erwarten nur noch `performance.day_change`.

21. Backend/Frontend: `day_price_change_eur` Feld entfernen
   a) [ ] Entferne das Feld aus Snapshot-/Positions-Payloads.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_serialise_security_snapshot`, `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: EUR-Preisänderung steckt nur im verschachtelten Performance-Block.
   b) [ ] Aktualisiere UI/Tests auf die verschachtelte Struktur.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/security_detail.ts`, `tests/frontend/dashboard_smoke.mjs`, `src/tabs/__tests__/security_detail.metrics.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Anzeige/Assertions für Tagesänderung\
      - Ziel/Ergebnis: UI/Test greifen auf `performance.day_change.price_change_eur` zu.

22. Backend/Frontend: `day_change_pct` Feld entfernen
   a) [ ] Entferne das Feld aus Snapshot-/Positions-Serialisern.\
      - Dateipfad(e): `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): `_serialise_security_snapshot`, `_normalize_portfolio_positions`\
      - Ziel/Ergebnis: Prozentuale Tagesänderung nur noch im Performance-Block.
   b) [ ] Aktualisiere UI und Tests auf `performance.day_change.change_pct`.\
      - Dateipfad(e): `src/data/api.ts`, `src/tabs/security_detail.ts`, `tests/frontend/dashboard_smoke.mjs`, `src/tabs/__tests__/security_detail.metrics.test.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Day-Change Prozentanzeige\
      - Ziel/Ergebnis: UI/Test nutzen das verschachtelte Feld.

23. Typdefinitionen und Validierungen an neue Strukturen anpassen
   a) [ ] Aktualisiere Payload-Typen (`AverageCostPayload`, `PerformanceMetricsPayload`, Aggregationsstrukturen) auf den neuen Minimalumfang.\
      - Dateipfad(e): `src/tabs/types.ts`, `src/data/api.ts`, `src/data/updateConfigsWS.ts`\
      - Betroffene Funktion(en)/Abschnitt(e): Typdefinitionen, Type Guards\
      - Ziel/Ergebnis: TypeScript spiegelt die bereinigten Payloads exakt wider.
   b) [ ] Passe Validatoren/Normalisierer im Backend an (z. B. `validator.validate_account_balance`).\
      - Dateipfad(e): `custom_components/pp_reader/logic/accounting.py`, `custom_components/pp_reader/util/currency.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Validierungslogik für Rundung/Konvertierung\
      - Ziel/Ergebnis: Validatoren erwarten neue Felder und liefern passende Fehlermeldungen.

24. Dokumentation & Release-Notizen aktualisieren
   a) [ ] Beschreibe die entfernten Legacy-Felder und neuen Strukturen im Nutzer- und Entwickler-README.\
      - Dateipfad(e): `README.md`, `README-dev.md`, `ARCHITECTURE.md`\
      - Betroffene Funktion(en)/Abschnitt(e): Abschnitte zu Payloads/Aggregationen\
      - Ziel/Ergebnis: Dokumentation erklärt den neuen Datenfluss.
   b) [ ] Ergänze die Änderungen im Changelog (Breaking Changes, Migration).\
      - Dateipfad(e): `CHANGELOG.md`\
      - Betroffene Funktion(en)/Abschnitt(e): Anstehender Release-Eintrag\
      - Ziel/Ergebnis: Anwender werden auf die Feldentfernung vorbereitet.

25. Tests, Linting und Builds sicherstellen
   a) [ ] Führe das Python-Linting über `./scripts/lint` aus und behebe Verstöße.\
      - Dateipfad(e): n/a (Kommandozeile)\
      - Betroffene Funktion(en)/Abschnitt(e): gesamter Python-Code\
      - Ziel/Ergebnis: Stil- und Qualitätsvorgaben eingehalten.
   b) [ ] Starte die Python-Test-Suite inklusive Coverage für die migrierten Bereiche.\
      - Dateipfad(e): `tests/`\
      - Betroffene Funktion(en)/Abschnitt(e): `pytest --cov=custom_components/pp_reader --cov-report=term-missing`\
      - Ziel/Ergebnis: Regressionen werden ausgeschlossen.
   c) [ ] Lasse TypeScript-Linting und Type-Checks laufen (`npm run lint:ts`, `npm run typecheck`).\
      - Dateipfad(e): `src/`\
      - Betroffene Funktion(en)/Abschnitt(e): TS-Quellen und Tests\
      - Ziel/Ergebnis: Frontend bleibt typ- und lint-fehlerfrei.
   d) [ ] Baue die Dashboard-Bundles nach Abschluss der TS-Anpassungen.\
      - Dateipfad(e): `custom_components/pp_reader/www/pp_reader_dashboard/dashboard.module.js` (generiert)\
      - Betroffene Funktion(en)/Abschnitt(e): `npm run build`, `scripts/update_dashboard_module.mjs`\
      - Ziel/Ergebnis: Ausgelieferte Assets enthalten die bereinigte UI.

Optional
   a) [ ] Optional: Ergänze End-to-End-Tests, die Backend- und Frontend-Payloads gemeinsam prüfen.\
      - Dateipfad(e): `tests/`, `tests/frontend/`\
      - Betroffene Funktion(en)/Abschnitt(e): Neue kombinierte Testfälle\
      - Ziel/Ergebnis: Zusätzliche Sicherheit gegen Drift zwischen Backend und Dashboard.
   b) [ ] Optional: Füge Monitoring/Logging hinzu, das auf fehlende `average_cost`/`performance` Blöcke hinweist.\
      - Dateipfad(e): `custom_components/pp_reader/data/event_push.py`, `custom_components/pp_reader/data/websocket.py`\
      - Betroffene Funktion(en)/Abschnitt(e): Debug-/Warnmeldungen bei unvollständigen Payloads\
      - Ziel/Ergebnis: Frühe Erkennung von Dateninkonsistenzen nach der Migration.
