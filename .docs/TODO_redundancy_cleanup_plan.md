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
