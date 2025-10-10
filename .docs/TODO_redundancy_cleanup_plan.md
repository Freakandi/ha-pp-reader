# TODO – Currency Conversion & Rounding Cleanup

Legende: [ ] offen | [x] erledigt (Status wird im Verlauf gepflegt)

## 1. Backend: Gemeinsame Currency-Utilities

1. a) [x] Zentrale Helper für Cent- und Preis-Normalisierung anlegen
       - Datei: `custom_components/pp_reader/util/currency.py` (neu)
       - Ziel: Funktionen für `cent_to_eur`, optionale Rückgaben (`None` bei fehlenden Werten), konsistente Rundung (2 bzw. 4 Nachkommastellen) sowie `normalize_raw_price` und `normalize_price_to_eur_sync` aus `logic/portfolio` zusammenführen.
       - Abnahmekriterien: Bestehende Aufrufer (`logic/portfolio`, `data/db_access`, `prices/price_service`) können ohne Verhaltensänderung umgestellt werden; Modul stellt keine Home-Assistant-Abhängigkeiten voraus.

1. b) [x] `logic/portfolio.py` auf neue Helper umstellen
       - Datei: `custom_components/pp_reader/logic/portfolio.py`
       - Ziel: Lokale Implementationen von `normalize_price` und `normalize_price_to_eur_sync` entfernen, stattdessen die neuen Utility-Funktionen nutzen; Rundung der Portfolio- und Kaufsummen ausschließlich über Helper durchführen.
       - Validierung: Funktionen `calculate_portfolio_value` und `calculate_purchase_sum` liefern weiterhin identische Werte für das WebSocket-Command `pp_reader/get_portfolio_summary` sowie abhängige Sensoren.

1. c) [x] Datenbank-Zugriffe auf Helper umstellen
       - Datei: `custom_components/pp_reader/data/db_access.py`
       - Ziel: In `get_portfolio_positions`, `_normalize_portfolio_row`, `fetch_live_portfolios` und `get_security_snapshot` die Cent→EUR- und FX-Umrechnungen über den neuen Helper ausführen; eingebettete Funktionen wie `_cent_to_eur` entfernen.
       - Validierung: WebSocket `pp_reader/get_portfolio_positions`, `pp_reader/get_security_snapshot` sowie Cache-Lesewege in `prices/price_service` geben unveränderte Werte (inkl. Rundungen) zurück.

1. d) [x] Event-Push Normalisierung vereinheitlichen
       - Datei: `custom_components/pp_reader/data/event_push.py`
       - Ziel: Runden und Cent→EUR-Konvertierungen in `_normalize_portfolio_value_entry` und `_normalize_position_entry` über den Utility-Helper abwickeln; redundante `_float`/`_optional_price`-Logik aufräumen.
       - Validierung: Events `portfolio_values` und `portfolio_positions` behalten identische Payload-Struktur und Beträge; JSON-Größenbeschränkung weiterhin eingehalten.

1. e) [x] WebSocket Account-Payloads auf Helper migrieren
       - Datei: `custom_components/pp_reader/data/websocket.py`
       - Ziel: Umwandlungen wie `account.balance / 100.0` sowie EUR-Rundungen mit dem Helper abdecken; FX-Fallback bleibt bestehen, jedoch ohne doppelte Rundungslogik.
       - Validierung: Antwort von `pp_reader/get_accounts` weist unveränderte Felder `orig_balance` und `balance` auf (inkl. `fx_unavailable`-Flag).

1. f) [x] Preis-Service Revaluation auf Helper stützen
       - Datei: `custom_components/pp_reader/prices/price_service.py`
       - Ziel: Beim Wiederverwenden persistierter Kaufwerte (`existing_entry.get("purchase_value")`) den Helper nutzen und Duplikat-Divisionen entfernen.
       - Validierung: Nach einem Preis-Update erzeugte Event-Payloads enthalten dieselben EUR-Werte wie vor der Umstellung.

## 2. Frontend: Rundungs- und Anzeige-Helfer bündeln

2. a) [x] Gemeinsamen Currency-Helper für das Dashboard anlegen
       - Datei: `src/utils/currency.ts` (neu)
       - Ziel: Funktionen `roundCurrency`, `toFiniteCurrency` o. Ä. definieren, die bisher in `src/tabs/overview.ts` und `src/tabs/security_detail.ts` dupliziert sind; unit-testbare reine Funktionen bereitstellen.
       - Validierung: Neue Helper besitzen Jest-Tests oder werden über bestehende Tests abgedeckt; keine Abhängigkeit zu DOM-APIs.

2. b) [x] Tabs auf gemeinsamen Helper umstellen
       - Dateien: `src/tabs/overview.ts`, `src/tabs/security_detail.ts`
       - Ziel: Lokale `roundCurrency`-Implementierungen entfernen, stattdessen Helper importieren; sicherstellen, dass Aggregationen wie `gain_abs_eur`, `purchase_value_eur`, `market_value_eur` weiterhin identisch gerundet werden.
       - Validierung: Bestehende Tests (`security_detail.metrics.test.ts`, `overview.render.test.ts`) laufen unverändert grün und prüfen weiterhin die gerenderten Werte.

2. c) [x] Websocket-DOM-Patcher auf numerischen Helper ausrichten
       - Datei: `src/data/updateConfigsWS.ts`
       - Ziel: Numerische Rundungsschritte (z. B. Math.round(val * 100) / 100) auf den neuen Helper umstellen, ohne die locale-basierte String-Formatierung zu verändern.
       - Validierung: Live-Updates der Portfolio-Tabelle zeigen weiterhin korrekt formatierte Werte; bestehende `console`-Warnungen/Debug-Ausgaben bleiben unverändert.

## 3. Aufräumen & Regressionen vermeiden

3. a) [x] Entfernte Helper sicher löschen
       - Dateien: `custom_components/pp_reader/logic/portfolio.py`, `custom_components/pp_reader/data/db_access.py`, `src/tabs/overview.ts`, `src/tabs/security_detail.ts`
       - Ziel: Nach der Migration keine ungenutzten Funktionen (`normalize_price`, `_cent_to_eur`, doppelte `roundCurrency`) mehr im Code lassen; Static-Analyser meldet keine toten Helfer.
       - Validierung: `ruff` und TypeScript-Linter erkennen keine unbenutzten Symbole, und alle referenzierten Konvertierungen zeigen auf die neuen Utility-Module.

3. b) [x] Regressionstests für Currency-Flüsse ergänzen
       - Tests: `tests/test_websocket_positions.py` (oder neues Testmodul), Frontend-Snapshots sofern erforderlich
       - Ziel: Abdeckung der Helper-Pfade mit realen Beispielwerten (Cent→EUR, FX-Konversion) sicherstellen, um spätere Refactors abzusichern.
       - Validierung: Neue oder angepasste Tests schlagen fehl, falls Rundung oder FX-Normalisierung von den festgelegten Regeln abweicht.

## 4. Native Price Scaling

4. a) [x] Historische Close-Preise über gemeinsamen Helper normalisieren
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/util/currency.py`
       - Ziel: `iter_security_close_prices` und `ws_get_security_history` nutzen `normalize_raw_price` (inkl. `PRICE_SCALE`), um native Close-Werte einmalig auf Float (4 Nachkommastellen) zu skalieren; Rohwerte werden optional unter `close_raw` weitergegeben, sodass Frontend und Tests ohne doppelte Division auskommen.
       - Validierung: WebSocket `pp_reader/get_security_history` liefert normalisierte Close-Werte; `tests/test_ws_security_history.py` prüft sowohl Roh- als auch Normalisierungsfelder.

4. b) [x] Tagesdeltas im Security-Snapshot backend-seitig berechnen
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/websocket.py`
       - Ziel: `get_security_snapshot` ermittelt auf Basis der normalisierten Preise die Felder `day_price_change_native`, `day_price_change_eur` und `day_change_pct` und `_serialise_security_snapshot` reicht sie unverändert durch; dadurch entfallen Frontend-Berechnungen auf `last_price_native`/`last_close_native`.
       - Validierung: WebSocket `pp_reader/get_security_snapshot` enthält die neuen Tagesdeltas; Regressionstests in `tests/test_db_access.py` und `tests/test_ws_security_history.py` decken die berechneten Werte ab.

4. c) [x] Dashboard auf native Float-Werte und Backend-Deltas umstellen
       - Dateien: `src/data/api.ts`, `src/tabs/types.ts`, `src/tabs/security_detail.ts`, `src/utils/currency.ts`, Tests unter `src/tabs/__tests__/`
       - Ziel: Das Dashboard verarbeitet die bereits normalisierten History-Werte und Snapshot-Deltas, entfernt die lokale `PRICE_SCALE`-Konstante sowie Hilfsfunktionen wie `normaliseHistorySeries`-Division und `computeDelta`; Rundungen erfolgen weiterhin über die gemeinsamen Currency-Utilities.
       - Validierung: Jest-Tests (`security_detail.metrics.test.ts`, `overview.render.test.ts`) spiegeln die neuen Felder wider und die UI zeigt unveränderte numerische Werte.

## 5. Holdings & Aggregations

5. a) [x] Aggregations-Hilfsmodul für Wertpapierbestände anlegen
       - Dateien: `custom_components/pp_reader/data/aggregations.py` (neu)
       - Ziel: Eine Funktion `compute_holdings_aggregation(rows)` implementieren, die Sequenzen aus `portfolio_securities`-Zeilen entgegennimmt und zentral `total_holdings`, `positive_holdings`, `purchase_value_cents`, `security_currency_total`, `account_currency_total` sowie die gewichteten Durchschnittswerte für `avg_price_native`, `avg_price_security` und `avg_price_account` ermittelt. Rückgabe als klar typisiertes Objekt (z. B. `HoldingsAggregation` dataclass) mit bereits gerundeten Float-Werten (Bestände 6 Nachkommastellen, Beträge via `round_currency`/`round_price`).
       - Validierung: Modul enthält Docstring und ruff-konforme Implementierung ohne Home-Assistant-Abhängigkeiten.

5. b) [ ] Unit-Tests für Aggregations-Helfer ergänzen
       - Dateien: `tests/test_aggregations.py` (neu)
       - Ziel: Mehrere Szenarien mit gemischten Eingabewerten (positive/negative Bestände, fehlende Durchschnittspreise, Strings) abdecken und sicherstellen, dass `compute_holdings_aggregation` dieselben Summen wie die aktuelle `get_security_snapshot`-Logik liefert.
       - Validierung: Tests laufen grün und schlagen fehl, wenn ein Feld (`total_holdings`, `purchase_total_security`, `avg_price_security`, ...) nicht korrekt berechnet wird.

5. c) [ ] `get_security_snapshot` auf Aggregations-Helfer umstellen
       - Dateien: `custom_components/pp_reader/data/db_access.py`
       - Ziel: Die lokale Summenschleife in `get_security_snapshot` durch `compute_holdings_aggregation` ersetzen. Die Funktion liest alle benötigten Werte aus dem Aggregationsobjekt (inkl. `total_holdings`, `purchase_value_eur`, `purchase_total_security`, `purchase_total_account`, Durchschnittspreise) und entfernt die nun redundanten lokalen Akkumulatoren (`total_holdings`, `security_currency_total_sum`, `account_currency_total_sum`, `security_weighted_sum`, `account_weighted_sum`).
       - Validierung: Rückgabestruktur bleibt unverändert; `tests/test_db_access.py::test_get_security_snapshot_*` bestehen ohne Anpassung der Sollwerte.

5. d) [ ] Snapshot-Tests auf Aggregationsrückgabe einschränken
       - Dateien: `tests/test_db_access.py`
       - Ziel: Zusätzliche Assertions einziehen, die nach der Umstellung sicherstellen, dass `get_security_snapshot` keine Summenschleifen mehr enthält (z. B. indirekt über `HoldingsAggregation`-Felder) und identische numerische Ergebnisse für Multi-Depot-Szenarien liefert.
       - Validierung: Tests schlagen fehl, falls `compute_holdings_aggregation` nicht verwendet wird oder Werte abweichen.

5. e) [ ] Positionsabfrage `get_portfolio_positions` aggregationsfähig machen
       - Dateien: `custom_components/pp_reader/data/db_access.py`
       - Ziel: Pro `security_uuid` den Aggregations-Helfer aufrufen, das Ergebnis als neues Feld `aggregation` (mit identischem Schema wie `HoldingsAggregation`) an den Positions-Dict anhängen und bestehende Rundungszweige für `purchase_total_security`, `purchase_total_account`, `avg_price_security`, `avg_price_account` entfernen.
       - Validierung: Rückgabe jeder Positionsliste enthält das zusätzliche Feld, und bestehende Tests (`tests/test_db_access.py::test_get_portfolio_positions_basic`) prüfen das Aggregationsobjekt.

5. f) [ ] Positions-Tests an Aggregationsobjekt anpassen
       - Dateien: `tests/test_db_access.py`
       - Ziel: Bestehende Portfolio-Positions-Tests erweitern, um `aggregation`-Felder (`total_holdings`, `purchase_total_security`, `purchase_total_account`, Durchschnittspreise) gegen erwartete Werte zu verifizieren und sicherzustellen, dass keine lokalen Summierungen mehr benötigt werden.
       - Validierung: Tests schlagen fehl, wenn ein Feld fehlt oder noch aus individueller Rundungslogik stammt.

5. g) [ ] WebSocket-Serializer auf Aggregationswerte umstellen
       - Dateien: `custom_components/pp_reader/data/websocket.py`
       - Ziel: `_normalize_portfolio_positions` liest das neue `aggregation`-Objekt je Position und übernimmt daraus `purchase_total_security`, `purchase_total_account`, `avg_price_security`, `avg_price_account` ohne zusätzliche `round(...)`-Aufrufe. Gleichzeitig entfallen lokale `round(_coerce_float(...))`-Konstrukte für diese Felder.
       - Validierung: `tests/test_ws_portfolio_positions.py` (oder ergänzte Regression) bestätigt, dass WebSocket-Payloads die Aggregationswerte 1:1 spiegeln.

5. h) [ ] Event-Payload-Normalisierung bereinigen
       - Dateien: `custom_components/pp_reader/data/event_push.py`
       - Ziel: `_normalize_position_entry` übernimmt Aggregationsbeträge aus `item["aggregation"]`, entfernt die Fallback-Aufrufe von `_normalize_currency_amount` für Kauf- und Durchschnittswerte und streicht dadurch ungenutzte Normalisierungszweige.
       - Validierung: `tests/test_sync_from_pclient.py::test_compact_event_data_trims_portfolio_positions` (ggf. erweitert) prüft, dass Event-Payloads weiterhin alle benötigten Felder enthalten, jedoch ohne doppelte Rundungen.

5. i) [ ] API- und Typdefinitionen erweitern
       - Dateien: `src/data/api.ts`, `src/tabs/types.ts`
       - Ziel: `PortfolioPosition` (und abgeleitete Event-/Cache-Typen) um ein optionales Feld `aggregation` erweitern, das die vom Backend gelieferten Werte (`total_holdings`, `purchase_total_security`, `purchase_total_account`, `average_purchase_price_native`, `avg_price_security`, `avg_price_account`) typisiert.
       - Validierung: TypeScript-Build (`npm run typecheck`) schlägt fehl, wenn das Aggregationsobjekt nicht berücksichtigt wird.

5. j) [ ] WebSocket-Update-Cache auf Aggregationsfelder umstellen
       - Dateien: `src/data/updateConfigsWS.ts`
       - Ziel: `PortfolioPositionsCache` speichert pro Position das `aggregation`-Objekt. Funktionen wie `applyPortfolioPositionsToDom` und `renderPositionsTableInline` entfernen eigene Summierungen, nutzen die vorbereiteten Beträge und räumen Hilfsfunktionen wie `roundCurrency`-Fallbacks für Kauf-/Bestandswerte aus.
       - Validierung: Frontend-Tests (z. B. `tests/frontend/test_portfolio_update_gain_abs.py`) bestätigen, dass Live-Updates weiterhin korrekte Werte anzeigen, obwohl lokale Aggregationen entfallen.

5. k) [ ] Dashboard-Tabs auf Backend-Aggregationen umstellen
       - Dateien: `src/tabs/overview.ts`, `src/tabs/security_detail.ts`
       - Ziel: `getSecuritySnapshotFromCache`, `collectSecurityPositions`, `roundHoldings` sowie die daraus resultierenden Summenberechnungen werden entfernt. Beide Tabs lesen `total_holdings`, `purchase_total_security`, `purchase_total_account`, `purchase_value_eur` und Durchschnittswerte direkt aus dem `aggregation`-Feld. Snapshot-Berechnung nutzt zusätzlich die bereits gelieferten Tagesdeltas aus Schritt 4.
       - Validierung: Jest-Regressionen (`src/tabs/__tests__/security_detail.metrics.test.ts`, `src/tabs/__tests__/overview.render.test.ts`) prüfen, dass keine clientseitigen Summierungen mehr stattfinden und die angezeigten Zahlen unverändert bleiben.
