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

5. b) [x] Unit-Tests für Aggregations-Helfer ergänzen
       - Dateien: `tests/test_aggregations.py` (neu)
       - Ziel: Mehrere Szenarien mit gemischten Eingabewerten (positive/negative Bestände, fehlende Durchschnittspreise, Strings) abdecken und sicherstellen, dass `compute_holdings_aggregation` dieselben Summen wie die aktuelle `get_security_snapshot`-Logik liefert.
       - Validierung: Tests laufen grün und schlagen fehl, wenn ein Feld (`total_holdings`, `purchase_total_security`, `avg_price_security`, ...) nicht korrekt berechnet wird.

5. c) [x] `get_security_snapshot` auf Aggregations-Helfer umstellen
       - Dateien: `custom_components/pp_reader/data/db_access.py`
       - Ziel: Die lokale Summenschleife in `get_security_snapshot` durch `compute_holdings_aggregation` ersetzen. Die Funktion liest alle benötigten Werte aus dem Aggregationsobjekt (inkl. `total_holdings`, `purchase_value_eur`, `purchase_total_security`, `purchase_total_account`, Durchschnittspreise) und entfernt die nun redundanten lokalen Akkumulatoren (`total_holdings`, `security_currency_total_sum`, `account_currency_total_sum`, `security_weighted_sum`, `account_weighted_sum`).
       - Validierung: Rückgabestruktur bleibt unverändert; `tests/test_db_access.py::test_get_security_snapshot_*` bestehen ohne Anpassung der Sollwerte.

5. d) [x] Snapshot-Tests auf Aggregationsrückgabe einschränken
       - Dateien: `tests/test_db_access.py`
       - Ziel: Zusätzliche Assertions einziehen, die nach der Umstellung sicherstellen, dass `get_security_snapshot` keine Summenschleifen mehr enthält (z. B. indirekt über `HoldingsAggregation`-Felder) und identische numerische Ergebnisse für Multi-Depot-Szenarien liefert.
       - Validierung: Tests schlagen fehl, falls `compute_holdings_aggregation` nicht verwendet wird oder Werte abweichen.

5. e) [x] Positionsabfrage `get_portfolio_positions` aggregationsfähig machen
       - Dateien: `custom_components/pp_reader/data/db_access.py`
       - Ziel: Pro `security_uuid` den Aggregations-Helfer aufrufen, das Ergebnis als neues Feld `aggregation` (mit identischem Schema wie `HoldingsAggregation`) an den Positions-Dict anhängen und bestehende Rundungszweige für `purchase_total_security`, `purchase_total_account`, `avg_price_security`, `avg_price_account` entfernen.
       - Validierung: Rückgabe jeder Positionsliste enthält das zusätzliche Feld, und bestehende Tests (`tests/test_db_access.py::test_get_portfolio_positions_basic`) prüfen das Aggregationsobjekt.

5. f) [x] Positions-Tests an Aggregationsobjekt anpassen
       - Dateien: `tests/test_db_access.py`
       - Ziel: Bestehende Portfolio-Positions-Tests erweitern, um `aggregation`-Felder (`total_holdings`, `purchase_total_security`, `purchase_total_account`, Durchschnittspreise) gegen erwartete Werte zu verifizieren und sicherzustellen, dass keine lokalen Summierungen mehr benötigt werden.
       - Validierung: Tests schlagen fehl, wenn ein Feld fehlt oder noch aus individueller Rundungslogik stammt.

5. g) [x] WebSocket-Serializer auf Aggregationswerte umstellen
       - Dateien: `custom_components/pp_reader/data/websocket.py`
       - Ziel: `_normalize_portfolio_positions` liest das neue `aggregation`-Objekt je Position und übernimmt daraus `purchase_total_security`, `purchase_total_account`, `avg_price_security`, `avg_price_account` ohne zusätzliche `round(...)`-Aufrufe. Gleichzeitig entfallen lokale `round(_coerce_float(...))`-Konstrukte für diese Felder.
       - Validierung: `tests/test_ws_portfolio_positions.py` (oder ergänzte Regression) bestätigt, dass WebSocket-Payloads die Aggregationswerte 1:1 spiegeln.

5. h) [x] Event-Payload-Normalisierung bereinigen
       - Dateien: `custom_components/pp_reader/data/event_push.py`
       - Ziel: `_normalize_position_entry` übernimmt Aggregationsbeträge aus `item["aggregation"]`, entfernt die Fallback-Aufrufe von `_normalize_currency_amount` für Kauf- und Durchschnittswerte und streicht dadurch ungenutzte Normalisierungszweige.
       - Validierung: `tests/test_sync_from_pclient.py::test_compact_event_data_trims_portfolio_positions` (ggf. erweitert) prüft, dass Event-Payloads weiterhin alle benötigten Felder enthalten, jedoch ohne doppelte Rundungen.

5. i) [x] API- und Typdefinitionen erweitern
       - Dateien: `src/data/api.ts`, `src/tabs/types.ts`
       - Ziel: `PortfolioPosition` (und abgeleitete Event-/Cache-Typen) um ein optionales Feld `aggregation` erweitern, das die vom Backend gelieferten Werte (`total_holdings`, `purchase_total_security`, `purchase_total_account`, `average_purchase_price_native`, `avg_price_security`, `avg_price_account`) typisiert.
       - Validierung: TypeScript-Build (`npm run typecheck`) schlägt fehl, wenn das Aggregationsobjekt nicht berücksichtigt wird.

5. j) [x] WebSocket-Update-Cache auf Aggregationsfelder umstellen
       - Dateien: `src/data/updateConfigsWS.ts`
       - Ziel: `PortfolioPositionsCache` speichert pro Position das `aggregation`-Objekt. Funktionen wie `applyPortfolioPositionsToDom` und `renderPositionsTableInline` entfernen eigene Summierungen, nutzen die vorbereiteten Beträge und räumen Hilfsfunktionen wie `roundCurrency`-Fallbacks für Kauf-/Bestandswerte aus.
       - Validierung: Frontend-Tests (z. B. `tests/frontend/test_portfolio_update_gain_abs.py`) bestätigen, dass Live-Updates weiterhin korrekte Werte anzeigen, obwohl lokale Aggregationen entfallen.

5. k) [x] Dashboard-Tabs auf Backend-Aggregationen umstellen
       - Dateien: `src/tabs/overview.ts`, `src/tabs/security_detail.ts`
       - Ziel: `getSecuritySnapshotFromCache`, `collectSecurityPositions`, `roundHoldings` sowie die daraus resultierenden Summenberechnungen werden entfernt. Beide Tabs lesen `total_holdings`, `purchase_total_security`, `purchase_total_account`, `purchase_value_eur` und Durchschnittswerte direkt aus dem `aggregation`-Feld. Snapshot-Berechnung nutzt zusätzlich die bereits gelieferten Tagesdeltas aus Schritt 4.
       - Validierung: Jest-Regressionen (`src/tabs/__tests__/security_detail.metrics.test.ts`, `src/tabs/__tests__/overview.render.test.ts`) prüfen, dass keine clientseitigen Summierungen mehr stattfinden und die angezeigten Zahlen unverändert bleiben.

## 6. Average Cost Selection

6. a) [x] Average-Cost-Auswahlhelper definieren
       - Dateien: `custom_components/pp_reader/data/aggregations.py`
       - Ziel: Ergänzung eines `AverageCostSelection`-Dataclasses inkl. Funktion `select_average_cost(aggregation, *, holdings=None, purchase_value_eur=None, security_currency_total=None, account_currency_total=None)`, die die bestehende `HoldingsAggregation`-Ausgabe nutzt, um konsistent gerundete Durchschnittspreise für Native-, Wertpapier- und Konto-Währung sowie den EUR-Kaufpreis abzuleiten. Fallback-Reihenfolge: explizite Aggregationswerte → Division aus Totals/positiven Beständen → EUR-Betrag auf Gesamtbestände. Das Objekt liefert zusätzlich Metadaten (`source`, `coverage_ratio` o. ä.) zur Nachvollziehbarkeit.
       - Validierung: Ruff-konforme Implementierung mit Docstring; MyPy/pyright-kompatible Typannotationen.

6. b) [x] Unit-Tests für Average-Cost-Auswahl ergänzen
       - Dateien: `tests/test_aggregations.py`
       - Ziel: Szenarien mit vollständigen Aggregationswerten, partiellen Kaufpreisfeldern (z. B. fehlender `avg_price_security`) und reinem EUR-Kaufwert abdecken. Sicherstellen, dass `select_average_cost` die erwartete Fallback-Reihenfolge einhält und Quellenkennungen korrekt setzt.
       - Validierung: Tests schlagen fehl, wenn einer der Rückgabewerte (`security`, `account`, `native`, `eur`, `source`) nicht den spezifizierten Regeln folgt.

6. c) [x] Backend-Payloads um Average-Cost-Kontext erweitern
       - Dateien: `custom_components/pp_reader/data/db_access.py`
       - Ziel: `get_portfolio_positions` und `get_security_snapshot` rufen `select_average_cost` auf, hängen das Ergebnis als neues Feld `average_cost` an und setzen die bestehenden Felder (`average_purchase_price_native`, `avg_price_security`, `avg_price_account`, `purchase_value_eur`, `purchase_total_security`, `purchase_total_account`) ausschließlich über das Selektionsobjekt. Redundante direkte Zuweisungen aus `HoldingsAggregation` entfallen.
       - Validierung: Rückgabestrukturen behalten dieselben Keys; neue `average_cost`-Struktur enthält alle Auswahlwerte und Metadaten. Regressionstests für DB-Zugriffe passen die Sollwerte entsprechend an.

6. d) [x] WebSocket-Serializer auf Average-Cost-Kontext umstellen
       - Dateien: `custom_components/pp_reader/data/websocket.py`
       - Ziel: `_normalize_portfolio_positions` und `_serialise_security_snapshot` übernehmen das neue `average_cost`-Objekt (inkl. Metadaten) unverändert in die Payloads und entfernen die derzeitigen Fallback-Berechnungen (`_from_aggregation`, lokale `round(...)`-Aufrufe für Kaufpreise).
       - Validierung: `tests/test_ws_portfolio_positions.py` und `tests/test_ws_security_history.py` prüfen, dass keine lokalen Divisionen mehr stattfinden und alle Durchschnittswerte aus `average_cost` stammen.

6. e) [x] Event-Push-Normalisierung vereinheitlichen
       - Dateien: `custom_components/pp_reader/data/event_push.py`
       - Ziel: `_normalize_position_entry` liest Average-Cost-Daten ausschließlich aus `item["average_cost"]` bzw. den bereits durch `select_average_cost` gesetzten Feldern und entfernt verbleibende Fallbacks auf `_normalize_currency_amount` oder manuelle `round_price`-Aufrufe für Durchschnittspreise.
       - Validierung: `tests/test_sync_from_pclient.py` deckt ab, dass Event-Payloads unverändert bleiben und keine Legacy-Berechnungen aktiv sind.

6. f) [x] Backend-Regressionstests für Average-Cost-Kontext erweitern
       - Dateien: `tests/test_db_access.py`, `tests/test_ws_portfolio_positions.py`, `tests/test_ws_security_history.py`
       - Ziel: Neue Assertions für `average_cost` (Feldstruktur, Werte, Quellen-Metadaten) ergänzen und bestätigen, dass die bestehenden Felder (`average_purchase_price_native`, `avg_price_security`, …) mit dem Selektionsobjekt übereinstimmen. Sicherstellen, dass fehlende Aggregationsdaten die Fallback-Reihenfolge triggern.
       - Validierung: Tests schlagen fehl, wenn `average_cost` fehlt oder Werte nicht synchron sind.

6. g) [x] Frontend-Typen & API auf Average-Cost-Kontext anheben
       - Dateien: `src/data/api.ts`, `src/tabs/types.ts`, `src/types/global.d.ts`
       - Ziel: Einführung eines gemeinsamen Interfaces (z. B. `AverageCostPayload`), Ergänzung der API-/Dashboard-Typen um `average_cost` sowie Dokumentation der neuen Metadaten. Bestehende Felder bleiben erhalten, werden aber als Derivate des neuen Objekts markiert.
       - Validierung: `npx tsc --noEmit` schlägt fehl, falls Komponenten den neuen Typ nicht berücksichtigen.

6. h) [x] Websocket-Update-Handler vereinfachen
       - Dateien: `src/data/updateConfigsWS.ts`
       - Ziel: `deriveAggregation` und `normalizePosition` nutzen den Backend-`average_cost`-Kontext anstelle der manuellen Rekonstruktion. Entfernen der Hilfsfunktionen `coerceNumber`, `toNullableNumber` (sofern nur noch für Kaufpreiszwecke genutzt) sowie der Divisionen zur Durchschnittsberechnung.
       - Validierung: DOM-Aktualisierungen behalten identische Werte; Jest-/Playwright-Regressionen für Live-Updates werden bei Abweichungen rot.

6. i) [x] Overview-Tab auf Average-Cost-Kontext umstellen
       - Dateien: `src/tabs/overview.ts`
       - Ziel: `buildPurchasePriceDisplay` verwendet `position.average_cost` (oder das Aggregationsfeld) zur Wahl des Primär-/Sekundärpreises und entfernt lokale Helper wie `computeAveragePrice`. Markup- und Sortierlogik bleiben unverändert, beziehen ihre Werte jedoch aus der neuen Struktur.
       - Validierung: `src/tabs/__tests__/overview.render.test.ts` deckt die Anzeige ab und schlägt fehl, falls lokale Berechnungen verbleiben.

6. j) [x] Security-Detail-Tab harmonisieren
       - Dateien: `src/tabs/security_detail.ts`
       - Ziel: Snapshot-Metriken und Cache-Fallbacks greifen auf `average_cost` bzw. die durch Backend bereitgestellten Durchschnittswerte zu, sodass Hilfsfunktionen wie `computeAveragePurchaseFromTotal` und `computeAveragePurchaseEur` entfallen. FX-Tooltips werden anhand der Metadaten aktualisiert.
       - Validierung: Jest-Tests in `src/tabs/__tests__/security_detail.metrics.test.ts` prüfen, dass keine lokalen Durchschnittsberechnungen übrig bleiben und Tooltips weiterhin korrekt sind.

6. k) [x] Frontend-Regressionssuite aktualisieren
       - Dateien: `src/tabs/__tests__/overview.render.test.ts`, `src/tabs/__tests__/security_detail.metrics.test.ts`, ggf. weitere Snapshot-Tests
       - Ziel: Testdatensätze um `average_cost` ergänzen, Assertions auf die neuen Felder erweitern und sicherstellen, dass entfernte Helper nicht mehr importiert werden.
       - Validierung: Tests schlagen fehl, falls Komponenten weiterhin alte Helper referenzieren oder `average_cost` ignorieren.

## 7. Gain & Change Metrics

7. a) [x] Performance-Metrics-Helper definieren
       - Datei: `custom_components/pp_reader/data/performance.py` (neu)
       - Ziel: Dataclasses `PerformanceMetrics` (für `gain_abs`, `gain_pct`, `total_change_eur`, `total_change_pct`) und `DayChangeMetrics` (für `day_price_change_native`, `day_price_change_eur`, `day_change_pct`) samt Funktion `select_performance_metrics(...)` bereitstellen, die zentrale Eingaben (`current_value`, `purchase_value`, `holdings`, `last_price_native`, `last_close_native`, `fx_rate`) akzeptiert, ruff-konform rundet (`round_currency`, `round_price`) und Herkunfts-Metadaten (`source`, `coverage_ratio`) mitliefert.
       - Validierung: Helper deckt fehlende Werte (`None`), Null-Käufe und fehlende FX-Kurse ab, ohne Home-Assistant-Abhängigkeiten; Modul besitzt Docstring.

7. b) [x] Unit-Tests für Performance-Helper ergänzen
       - Datei: `tests/test_performance.py` (neu)
       - Ziel: Fälle mit vollständigen Daten, reinem EUR-Fallback, fehlenden Holdings sowie FX-basierten Tagesdeltas abdecken; sicherstellen, dass `select_performance_metrics` und `DayChangeMetrics`-Ableitung identische Ergebnisse zu den bisherigen Einzelberechnungen in `db_access`, `event_push` und `websocket` liefern.
       - Validierung: Tests schlagen fehl, wenn Rundung, Quellen-Metadaten oder Fallback-Reihenfolge von den Erwartungen abweichen.

7. c) [x] Portfolio-Aggregationen auf Performance-Helper umstellen
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/aggregations.py`
       - Ziel: `get_portfolio_positions`, `_normalize_portfolio_row` und `fetch_live_portfolios` nutzen den neuen Helper zur Ableitung von `gain_abs`/`gain_pct` sowie (neu) `performance`-Payloads; vorhandene Inline-Berechnungen und lokale `_round_percentage`-Hilfen entfallen. `HoldingsAggregation` stellt benötigte Inputs (Totals, Holdings) für den Helper bereit.
       - Validierung: Rückgaben behalten bestehende Felder, enthalten zusätzlich ein strukturiertes `performance`-Objekt und liefern identische Werte in `tests/test_db_access.py` & `tests/test_sync_from_pclient.py`.

7. d) [x] Security-Snapshot-Tagesdeltas zentralisieren
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/websocket.py`
       - Ziel: `get_security_snapshot` delegiert die Berechnung von `day_price_change_native`, `day_price_change_eur`, `day_change_pct`, `total_change_eur` und `total_change_pct` an den Performance-Helper, speichert die Ergebnisse unter `performance` und entfernt lokale `computeDelta`/`_round_percentage`-Logik. `_serialise_security_snapshot` übernimmt das Objekt unverändert.
       - Validierung: `tests/test_ws_security_history.py` und Snapshot-Tests prüfen, dass Backend- und WebSocket-Payloads dieselben Werte liefern und keine zusätzlichen Fallbacks mehr besitzen.

7. e) [x] Event- und Revaluation-Pfade auf Helper ausrichten
       - Dateien: `custom_components/pp_reader/data/event_push.py`, `custom_components/pp_reader/data/coordinator.py`, `custom_components/pp_reader/prices/price_service.py`
       - Ziel: `_normalize_portfolio_value_entry`, `_normalize_position_entry`, `_portfolio_contract_entry` sowie `_build_portfolio_values_payload` beziehen `gain_abs`/`gain_pct` ausschließlich aus dem Performance-Helper; dadurch entfallen doppelte Divisionen und Rundungen. Event-Payloads tragen optional das neue `performance`-Objekt mit.
       - Validierung: Event- und Sensor-Tests (`tests/test_sync_from_pclient.py`, `tests/test_ws_portfolio_positions.py`) bestätigen unveränderte Payloads und dokumentieren das neue Objekt.

7. f) [x] Sensor- und Logikmodule bereinigen
       - Dateien: `custom_components/pp_reader/logic/portfolio.py`, `custom_components/pp_reader/sensors/gain_sensors.py`
       - Ziel: Sensorberechnungen für unrealized gains verwenden den Performance-Helper (z. B. `select_performance_metrics`), sodass die Funktionen `calculate_unrealized_gain(_pct)` entfallen oder zu dünnen Wrappern degradiert werden; doppelte Rundungen werden entfernt.
       - Validierung: Einheitstests der Sensoren (bestehend) schlagen fehl, falls Werte von bisherigen Ergebnissen abweichen.

7. g) [x] Backend-Regressionssuite erweitern
       - Dateien: `tests/test_db_access.py`, `tests/test_ws_portfolio_positions.py`, `tests/test_ws_security_history.py`, `tests/test_sync_from_pclient.py`
       - Ziel: Assertions auf das neue `performance`-Objekt (Felder, Quellenangaben, Synchronität mit Legacy-Spiegelwerten) ergänzen und bisherige Erwartungswerte für `gain_abs`/`gain_pct` gegen den Helper verifizieren.
       - Validierung: Tests schlagen fehl, wenn Backend oder WebSocket Payloads wieder lokale Fallbacks einführen oder Werte divergieren.

7. h) [ ] Frontend-Typen & API um Performance-Kontext erweitern
       - Dateien: `src/data/api.ts`, `src/data/updateConfigsWS.ts`, `src/tabs/types.ts`, `src/types/global.d.ts`
       - Ziel: Neues Interface `PerformanceMetricsPayload` (inkl. optionalem `dayChange`-Block) definieren, API-/WS-Verträge um `performance` erweitern und Legacy-Felder (`gain_abs`, `gain_pct`, `day_price_change_*`) als Derivate kennzeichnen.
       - Validierung: `npx tsc --noEmit` schlägt fehl, wenn Komponenten das Objekt nicht berücksichtigen.

7. i) [ ] Frontend-State und DOM-Updates harmonisieren
       - Dateien: `src/data/updateConfigsWS.ts`, `src/content/elements.ts`, `src/tabs/overview.ts`
       - Ziel: WebSocket-Caches, DOM-Patcher und Tabellenrenderer lesen `gain`-/`change`-Werte aus `performance`, entfernen lokale Rekonstruktion (`formatGain`, `formatGainPct`, `computeTableTotals`) und halten Dataset-Attribute (`data-gain-pct`, `data-gain-sign`) synchron.
       - Validierung: Live-Update-Regressionen (bestehend) zeigen unveränderte Werte; Linter meldet keine ungenutzten Helper.

7. j) [ ] Security-Detail-Tab auf Performance-Kontext umstellen
       - Dateien: `src/tabs/security_detail.ts`, `src/utils/currency.ts`
       - Ziel: Metrikberechnungen (`computeDelta`, `computePercentageChange`, `computeHoldingsAdjustedEurChange`) werden ersetzt, indem `normalizeSecurityMetrics` o. ä. aus dem neuen `performance`-Payload gespeist wird; überflüssige Helper und Summenberechnungen werden entfernt, ohne Fallback-Funktionen für fehlende Backend-Daten zu verlieren.
       - Validierung: Jest-Tests (`src/tabs/__tests__/security_detail.metrics.test.ts`) decken Backend- und Cache-Fallbacks ab und schlagen fehl, wenn lokale Rechenpfade übrig bleiben.

7. k) [ ] Frontend-Regressionssuite aktualisieren
       - Dateien: `src/tabs/__tests__/overview.render.test.ts`, `src/tabs/__tests__/security_detail.metrics.test.ts`, ggf. weitere Snapshot-Tests
       - Ziel: Testfixtures um `performance` erweitern, Assertions auf neue Felder (`totalChangeEur`, `dayChangePct`, `gain_pct`) ergänzen und sicherstellen, dass entfernte Helper nicht mehr importiert werden.
       - Validierung: Tests schlagen fehl, falls Komponenten weiterhin alte Helper referenzieren oder `performance` ignorieren.
