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

5. a) [ ] Gemeinsamen Aggregations-Helper für Wertpapierbestände extrahieren
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/aggregations.py` (neu)
       - Ziel: Die Summen- und Gewichtungslogik innerhalb `get_security_snapshot` sowie der Positionsabfrage über `portfolio_securities` zu einer wiederverwendbaren Funktion bündeln. Der Helper soll `total_holdings`, `purchase_value_eur`, `purchase_total_security`, `purchase_total_account`, `positive_holdings` und die gewichteten Durchschnittsanteile normalisiert zurückgeben, sodass beide Aufrufer keine eigenen For-Schleifen und Rundungszweige mehr besitzen.
       - Validierung: `get_security_snapshot` und `get_portfolio_positions` importieren den Helper und enthalten keine manuell gepflegten Summierungsblöcke mehr; bestehende Tests in `tests/test_db_access.py` (z. B. `test_get_security_snapshot_multicurrency`, `test_get_security_snapshot_zero_holdings_preserves_purchase_sum`) werden angepasst, um den neuen Rückgabewert des Helpers abzudecken.

5. b) [ ] Aggregationskontext über WebSocket & Events ausliefern
       - Dateien: `custom_components/pp_reader/data/db_access.py`, `custom_components/pp_reader/data/websocket.py`, `custom_components/pp_reader/data/event_push.py`
       - Ziel: Der Aggregations-Helper liefert neben den einzelnen Positionen ein strukturiertes Aggregationsobjekt pro `security_uuid`, das `get_portfolio_positions` serialisiert (z. B. als `aggregations` oder `summary`). `_normalize_portfolio_positions` und `_normalize_position_entry` lesen diese vorbereiteten Zahlen und entfernen ihre eigenen `round(...)`- und Summierungsabschnitte für `purchase_total_security`/`purchase_total_account`. Damit stehen konsistente `total_holdings`, `purchase_value_eur`, `market_value_eur` und verwandte Kennzahlen sowohl für On-Demand-WebSocket-Aufrufe als auch Event-Pushes bereit; verwaiste Utility-Zweige entfallen.
       - Validierung: WebSocket `pp_reader/get_portfolio_positions` (Tests: `tests/test_ws_portfolio_positions.py`) und Event-Kompaktierung (`tests/test_sync_from_pclient.py::test_compact_event_data_trims_portfolio_positions`) decken das Aggregationsobjekt ab und bestätigen, dass redundante Rundungen entfallen sind.

5. c) [ ] Dashboard & Cache auf Backend-Aggregationen umstellen
       - Dateien: `src/data/api.ts`, `src/data/updateConfigsWS.ts`, `src/tabs/overview.ts`, `src/tabs/security_detail.ts`, `src/tabs/types.ts`
       - Ziel: Die im WebSocket gelieferten Aggregationsdaten werden im `PortfolioPositionsCache` gespeichert, wodurch Funktionen wie `getSecuritySnapshotFromCache`, `collectSecurityPositions`, `roundHoldings` und die daraus abgeleiteten Summen-/Durchschnittsberechnungen entfallen. Detail-Tab und Snapshot-Metriken lesen `total_holdings`, `purchase_total_security`, `purchase_total_account` und `purchase_value_eur` direkt aus dem Aggregationsblock und entfernen lokale Reskalierung (`HOLDINGS_PRECISION`) sowie Fallback-Berechnungen, die nach der Backend-Umstellung nicht mehr benötigt werden.
       - Validierung: Jest-Regressionen (`src/tabs/__tests__/security_detail.metrics.test.ts`, `tests/frontend/test_portfolio_update_gain_abs.py`) decken die neue Datenquelle ab und bestätigen, dass keine Client-seitigen Re-Summierungen mehr erfolgen.
