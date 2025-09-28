# Konzept: Umstellung auf ausschließlich DB-basierte Berechnungen (Frontend ohne Override-Cache)

Ziel: Entfernen der client-seitigen Portfolio-Wert Overrides (`__ppReaderPortfolioValueOverrides`) und Sicherstellung, dass jede Dashboard-Initialisierung (WS Fetch) bereits die aktuellsten, durch Live-Preis Updates beeinflussten Depot- und Positionswerte liefert. Einzige verbleibende rein client-seitig berechnete Größe: `total_wealth` (Summation Accounts + Portfolios im Header).

---

## 1. Aktueller Zustand (Ist)
- Live-Preis Service (Datei: [custom_components/pp_reader/prices/price_service.py](custom_components/pp_reader/prices/price_service.py)) aktualisiert nur `securities.last_price`, `last_price_source`, `last_price_fetched_at`.
- Partielle Revaluation ([custom_components/pp_reader/prices/revaluation.py](custom_components/pp_reader/prices/revaluation.py)) berechnet Portfolio-Aggregate in-memory und pusht Events (`portfolio_values`, dann einzelne `portfolio_positions`).
- Diese Events patchen nur DOM via Handler in [custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js](custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js).
- Beim vollständigen Neu-Render des Overview Tabs (z.B. Dashboard-Neuladung) werden Basisdaten über WebSocket Commands geladen:
  - `pp_reader/get_accounts` → liefert Account-Liste.
  - `pp_reader/get_portfolio_data` → liefert Depotdaten (aktuell sehr wahrscheinlich aus `coordinator.data` oder indirekter Snapshot-Quelle).
- Da der Coordinator seine Daten nur bei Datei-Änderung aktualisiert, nicht aber bei Preis-Events, fallen die beim Re-Render neu geholten Werte hinter die aktuellen Live-Events zurück.
- Workaround: Frontend Override-Cache (`window.__ppReaderPortfolioValueOverrides`) in [custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js](custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js) + Setzen in `handlePortfolioUpdate` in [updateConfigsWS.js](custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js).

Problem: State-Inkohärenz nach Reload oder Tab-Wechsel ohne vorheriges Event.

---

## 2. Zielzustand
- Jeder WebSocket Abruf (`get_portfolio_data`, `get_dashboard_data`) berechnet stets frische Portfolio-Aggregate und Positionsdaten direkt aus der SQLite DB unter Nutzung der aktuell persistierten `securities.last_price`.
- Keine client-seitigen Wert-Overrides mehr erforderlich.
- Events (Preisänderungen) bleiben bestehen (optimale UX: flüssige Inkremental-Updates); sie dienen nur noch zur Live-Aktualisierung ohne Neuberechnung auf Client-Seite.
- Konsistente Werte zwischen:
  - Initial-Load (WS Fetch)
  - Nach Preis-Event gepatchtem DOM
  - Manuellem Reload
- Keine Mutation bestehender Event-Payload-Formate, keine Änderung der Struktur von `coordinator.data` (Sensorschutz).

---

## 3. Datenfluss Neu
1. Preiszyklus aktualisiert Securities (`last_price` ...).
2. Revaluation berechnet Aggregationen (unverändert) für Events (push).
3. Bei WebSocket Aufruf (Initialrender):
   - Accounts: direkt aus DB (bestehende Logik beibehalten).
   - Portfolios:
     - Für jede Portfolio-UUID:
       - `calculate_portfolio_value` (liefert (value, count))
       - `calculate_purchase_sum`
     - Ergebnisse zusammenführen → identische Struktur wie bisher.
4. Positionsdetails werden weiterhin lazy geladen: Das bedeutet, dass Positionsdaten erst bei Bedarf (z.B. beim Aufklappen eines Depots im Frontend) per WebSocket (`pp_reader/get_portfolio_positions`) abgerufen werden. Dies minimiert die Initial-Payload und sorgt für schnelle Erst-Render-Zeiten. Ein Eager-Loading aller Positionen im Initial-Fetch wird bewusst nicht umgesetzt, da dies die Latenz und die Datenmenge unnötig erhöhen würde.
5. Frontend: Entfernen der Override-Anwendung + Setzen.

---

## 4. Betroffene Module / Funktionen

### Server-seitig

| Änderung | Datei | Aktion |
|----------|-------|--------|
| Neue On-Demand Aggregationsroutine (Helper) | [custom_components/pp_reader/data/db_access.py](custom_components/pp_reader/data/db_access.py) (oder neue Datei `live_aggregation.py` unter `logic/`) | Funktion `fetch_live_portfolios(db_path) -> list[dict]` |
| Anpassung WebSocket Handler `ws_get_portfolio_data` | [custom_components/pp_reader/data/websocket.py](custom_components/pp_reader/data/websocket.py) | Statt Coordinator-Snapshot: Aufruf `fetch_live_portfolios` |
| Anpassung `ws_get_dashboard_data` | (selbe Datei) | Portfolio-Part durch `fetch_live_portfolios` ersetzen |
| (Optional) Mikro-Caching (≤5s) zur Entlastung | gleiche Datei oder Helper | Nur wenn Messung Engpass zeigt (v1: weglassen) |
| Keine Änderung an `_push_update` Eventmechanismus | [custom_components/pp_reader/data/sync_from_pclient.py](custom_components/pp_reader/data/sync_from_pclient.py) und [custom_components/pp_reader/prices/price_service.py](custom_components/pp_reader/prices/price_service.py) | Beibehalten |
| Dokumentations-Update | [ARCHITECTURE.md](ARCHITECTURE.md) & Neues Dokument (dieses) | Datenfluss-Korrektur (Initial Fetch = Live Berechnung) |

Verwendete bestehende Aggregationsfunktionen:
- [`logic.portfolio.calculate_portfolio_value`](custom_components/pp_reader/logic/portfolio.py)
- [`logic.portfolio.calculate_purchase_sum`](custom_components/pp_reader/logic/portfolio.py)

(Links symbolisch – Datei im Workspace vorhanden; Nutzung konsistent mit aktueller Revaluation in [prices/revaluation.py](custom_components/pp_reader/prices/revaluation.py)).

### Frontend-seitig

| Änderung | Datei | Aktion |
|----------|-------|--------|
| Entfernen Merge der Overrides vor Tabellenaufbau | [js/tabs/overview.js](custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js) | Entfernen Block "Client-seitige Overrides anwenden" |
| Entfernen Schreiben in Override-Cache | [js/data/updateConfigsWS.js](custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js) | Entfernen `window.__ppReaderPortfolioValueOverrides.set(...)` |
| Entfernen Clear-Calls beim FullSync / last_file_update | gleiches File | `_clearPortfolioOverrides` Aufrufe entfernen |
| Entfernen globale Map Definition | `overview.js` & `updateConfigsWS.js` | Map + Hilfsfunktionen löschen |
| Beibehalten: DOM Patch Logik der Event Handler | unverändert | Nur keine Cache-Interaktion mehr |
| Total-Wealth: unverändert lokal im Render berechnen | [overview.js](custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js) | nutzt nun bereits DB-konsistente Werte |

---

## 5. Nicht zu ändernde Aspekte (Explizit ausgeschlossene Änderungen)
- Keine Änderung der Event-Typen oder Reihenfolge.
- Kein Hinzufügen neuer persistenter Spalten.
- Keine Mutation von `coordinator.data` Keys / Shapes.
- Kein Entfernen der existierenden Preis-Revaluation / Event-Push Logik.
- Keine Änderung an Sensor-Implementierungen (`sensors/*.py`).
- Kein Rewrite der Sortier-/Patch-Utilities.
- Kein Wechsel zu serverseitiger Caching-Schicht vor Implementierung / Messung.

---

## 6. Schrittweise Umsetzung

### Phase 1: Backend Vorbereitung
1. Implementiere `fetch_live_portfolios(db_path)`:
   - Öffnet Readonly Connection.
   - Lädt alle aktiven Portfolios (`SELECT uuid, name FROM portfolios WHERE retired=0 ORDER BY name`).
   - Für jede UUID:
     - `value, count = await calculate_portfolio_value(uuid, now, db_path)`
     - `purchase_sum = await calculate_purchase_sum(uuid, db_path)`
   - Rückgabe Liste: `{ uuid, name, current_value=value, purchase_sum, position_count=count }`.
2. Anpassung `ws_get_portfolio_data`:
   - Ersetzt bisherigen Zugriff durch obige Funktion.
3. Anpassung `ws_get_dashboard_data`:
   - Accounts unverändert, Portfolios via neue Funktion.
4. Tests (manuell): Preisänderung → Reload Panel → Werte aktuell.

### Phase 2: Frontend Bereinigung
1. Entfernen Override-Merge in `renderDashboard`.
2. Entfernen Cache Schreibungen & Clear-Aufrufe.
3. Entfernen globaler Cache-Objekte.
4. Sicherstellen: `handlePortfolioUpdate` funktioniert weiterhin identisch (nur DOM Patch).
5. Smoke Test:
   - Initial Load vs. direkt danach Preis-Event → konsistent.
   - Reload → identisch zu zuletzt gepatchtem Zustand.

### Phase 3: Doku & Cleanup
1. Ergänzung Abschnitt "Berechnungsmodell" in [ARCHITECTURE.md](ARCHITECTURE.md).
2. CHANGELOG-Eintrag (Version bump): "Removed client-side portfolio override cache; WebSocket portfolio data now always reflects latest DB state (live prices)."

---

## 7. Performance & Risiken

| Risiko | Beschreibung | Mitigation |
|--------|--------------|------------|
| Mehrere parallele WS Calls | Gleichzeitige Re-Compute | Gering (Portfolios klein); optional später Semaphore |
| Langsame Aggregation bei vielen Portfolios | Sequenziell | Optional: `asyncio.gather` batched; erst nach Messung |
| Sensor-Divergenz | Sensoren nutzen Coordinator-Snapshot | Optional future: Hook Preis-Events → `coordinator.async_set_updated_data` (Out-of-Scope jetzt) |
| Race während Preis-Update | Lesen während Persist | SQLite liest konsistent (AUTOCOMMIT); ok |

---

## 8. Validierungskriterien (Definition of Done)
- Nach Live-Preis Update + Panel Reload stimmen alle Depotwerte ohne Event-Override mit letzter Event-Anzeige überein.
- Kein Vorkommen von `__ppReaderPortfolioValueOverrides` im Code.
- WebSocket Antworten enthalten aktualisierte Werte (Test: diff vorher/nach Preis).
- Total-Wealth im Header korrekt (Summe Accounts + neue Depotwerte).
- Events weiterhin funktional (Patch-Effekt sichtbar ohne Full Reload nötig).
- Keine Änderung an JSON Payload Strukturen gegenüber bestehendem Frontend Code.

---

## 9. Geplanter Minimal-Patch (Übersicht ohne Implementation)
Backend (Pseudocode):

```python
# db_access.py
async def fetch_live_portfolios(hass, db_path: Path) -> list[dict]:
    # executor-run blocking DB logic
    # for each portfolio -> calculate_portfolio_value + calculate_purchase_sum
    return [...]
```

```python
# websocket.py (ws_get_portfolio_data)
portfolios = await fetch_live_portfolios(hass, db_path)
connection.send_result(msg["id"], {"portfolios": portfolios})
```

Frontend (Entfernen):

- overview.js: Block
  ```js
  // NEU: Client-seitige Overrides (Live-Preis Events) anwenden
  ```
- updateConfigsWS.js: Stellen mit `window.__ppReaderPortfolioValueOverrides.set(...)`, `_clearPortfolioOverrides(...)`.

---

## 10. Festlegungen zu Aggregationslogik, Positionsdetails und Debug/Telemetry

### Aggregationslogik
- Die Funktion `calculate_portfolio_value` nutzt bereits die persistierten Felder `securities.last_price`, `last_price_source`, `last_price_fetched_at` und ist damit konsistent mit der bisherigen Revaluation-Logik. Es ist keine Anpassung an der Aggregationslogik erforderlich.

### Positionsdetails (Initial-Fetch)
- Positionsdetails werden weiterhin lazy geladen. Das bedeutet, dass Positionsdaten erst bei Bedarf (z.B. beim Aufklappen eines Depots im Frontend) per WebSocket (`pp_reader/get_portfolio_positions`) abgerufen werden. Dies minimiert die Initial-Payload und sorgt für schnelle Erst-Render-Zeiten. Ein Eager-Loading aller Positionen im Initial-Fetch wird bewusst nicht umgesetzt, da dies die Latenz und die Datenmenge unnötig erhöhen würde. Das Frontend-Verhalten (Expand → Fetch → DOM Patch via `handlePortfolioPositionsUpdate`) bleibt unverändert.

### Debug-/Telemetry-Flag
- Es wird KEIN dediziertes Debug-/Telemetry-Flag für die On-Demand Aggregation (`fetch_live_portfolios`) eingeführt. Logging oder Telemetrie für diese Funktion erfolgt ausschließlich bei konkretem Bedarf und kann später als einmaliges INFO/DEBUG Log nachgerüstet werden. Aktuell bleibt der Code schlank und ohne zusätzliche Logik für diese Zwecke.

---

## 11. Zusammenfassung der getroffenen Entscheidungen

- On-Demand Aggregation für Portfolio-Aggregate wird im WebSocket-Handler umgesetzt (statt Coordinator-Snapshot).
- Positionsdetails bleiben lazy geladen, kein Eager-Loading im Initial-Fetch.
- Kein Debug-/Telemetry-Flag für Aggregationsaufrufe.
- Alle bestehenden Contracts und Payload-Formate bleiben erhalten.
- Potenzielle spätere Optimierungen (z.B. Micro-Caching für Positionsabrufe) werden nur bei Bedarf und nach Messung umgesetzt.

---