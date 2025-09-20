# Next Goals: Market Data Integration (Yahoo Finance via yahooquery)

## 1. Ziel
Integration von aktuellen Kursen in `pp_reader` ausschließlich über das Python-Paket `yahooquery` (Batch-fähig). Ehemalige Quellen (Alpha Vantage, Stooq) werden vollständig entfernt. Aktuelle Kurse werden nur als letzter Preis (`last_price`) in der bestehenden `securities` Tabelle gespeichert (inkl. `last_price_source`, `last_price_fetched_at`). Eine Portfolio-Neuberechnung (partielle Revaluation) wird nur ausgelöst, wenn sich mindestens ein Preis geändert hat. Es werden keinerlei historischen Zeitreihen ergänzt – Historie bleibt ausschließlich aus der Portfolio Performance (PP) Datei.

## 2. High-Level Meilensteine
1. Provider-Abstraktion (offen für spätere Erweiterungen; initial nur YahooQuery).
2. Implementierung `YahooQueryProvider` (Batch Quotes).
3. Schema-Erweiterung: `last_price_source`, `last_price_fetched_at` (falls nicht vorhanden).
4. Automatische Symbol-Erkennung aus DB.
5. Preis-Update Orchestrator (Intervall-Task, Lock, Watchdog).
6. Change Detection & differenzielle DB Updates.
7. Revaluation Helper (partiell) + Events nur bei Änderungen.
8. Optionen: Intervall + Debug-Flag.
9. Logging & Fehlerzähler / Drift-Warnungen.
10. Tests (Provider, Orchestrator, Migration, Change Detection, Fehlerpfade).
11. Dokumentation & Übersetzungen, Version-Bump, Changelog.

## 3. Provider Abstraktion
Datei: `custom_components/pp_reader/prices/provider_base.py`
```python
from dataclasses import dataclass
from typing import Protocol, Dict, List

@dataclass
class Quote:
    symbol: str
    price: float | None
    previous_close: float | None
    currency: str | None
    volume: int | None
    market_cap: int | None
    high_52w: float | None
    low_52w: float | None
    dividend_yield: float | None
    ts: float
    source: str  # 'yahoo'

class PriceProvider(Protocol):
    async def fetch(self, symbols: List[str]) -> Dict[str, Quote]:
        ...
```
Regeln:
- Nur Quotes mit `price > 0` werden akzeptiert.
- Fehlende Felder → `None`.
- Keine Exceptions pro Symbol (Symbol wird ausgelassen).
- Zusätzliche Felder (volume, market_cap, 52W, dividend_yield, previous_close) werden NICHT persistiert (nur runtime).

## 4. YahooQuery Provider
Datei: `custom_components/pp_reader/prices/yahooquery_provider.py`
- Abhängigkeit: `yahooquery==2.3.7` (nur in `manifest.json`).
- Verwendung: `Ticker(symbols, asynchronous=False)` → `.quotes` Dict.
- Feld-Mapping:
  - `regularMarketPrice` → `price`
  - `regularMarketPreviousClose` → `previous_close`
  - `regularMarketVolume` → `volume`
  - `fiftyTwoWeekHigh` / `fiftyTwoWeekLow`
  - `trailingAnnualDividendYield` → `dividend_yield`
  - `marketCap`
  - `currency`
- Blocking-Aufruf → Ausführung via Executor.
- Konstante `CHUNK_SIZE = 50`.
- Timeout pro Batch: 10s (Überwachung durch Orchestrator; Fehler → kompletter Chunk verworfen, andere weiter).
- `regularMarketPrice` fehlt oder ≤ 0 → Quote verworfen (DEBUG Log bei aktivem Debug).
- Keine interne Cache-Schicht.
- Batches strikt sequentiell.

## 5. Schema Erweiterung
Falls fehlend (Migration best-effort, Fehler ignorieren wenn Spalten existieren):
```sql
ALTER TABLE securities ADD COLUMN last_price_source TEXT;
ALTER TABLE securities ADD COLUMN last_price_fetched_at TEXT;
```
- `last_price` Spalte existiert bereits (Integer, Skalierung 1e8 – Bestätigung vorausgesetzt).
- `last_price_source='yahoo'` bei Updates.
- `last_price_fetched_at`: UTC ISO8601 ohne Millisekunden `YYYY-MM-DDTHH:MM:SSZ`.
- `last_price_date` (aus PP Datei) unverändert.
- Keine Indizes für neue Spalten.
- Aufnahme in `ALL_SCHEMAS` sicherstellen.

## 6. Symbol Autodiscovery
SQL Query:
```
SELECT uuid, ticker_symbol FROM securities
WHERE retired=0
  AND ticker_symbol IS NOT NULL
  AND ticker_symbol != ''
```
- Case-Preservation.
- Deduplikation in stabiler Reihenfolge.
- Mapping: `symbol -> [uuids...]` (Mehrfachzuordnung erlaubt; alle werden aktualisiert).
- Leere Liste: Einmal INFO pro Laufzeit (bis Reload/Neustart), danach nur DEBUG.
- Symbol-Normalisierung: unverändert (keine Uppercase-Erzwingung).

## 7. Orchestrator / Preis-Service
Datei: `custom_components/pp_reader/prices/price_service.py`
Ablauf pro Zyklus:
1. Overlap Handling: Prüfen via gemeinsames `asyncio.Lock` (`hass.data[DOMAIN][entry_id]['price_lock']`). Läuft noch ein Zyklus → neuer Zyklus wird übersprungen (DEBUG Log, `skipped_running=True` in Metadaten).
2. Symbole laden (Autodiscovery).
3. Chunking (Größe 50) sequentiell.
4. Provider-Fetch pro Chunk (mit Timeout, Try/Except).
5. Sammeln akzeptierter Quotes.
6. Change Detection (Skalierung 1e8, Python Bankers Rounding).
7. DB Updates nur für geänderte Securities (alle UUIDs eines Symbols).
8. Partielle Revaluation für betroffene Portfolios.
9. Event Push (nur wenn Änderungen > 0).
10. Metadaten-Logging.
11. Watchdog: Zyklusdauer > 25s → WARN (keine Unterbrechung).

Metadaten-Struktur (pro Zyklus):
```
{
  "symbols_total": N,
  "batches": B,
  "quotes_returned": R,
  "changed": C,
  "errors": E,
  "duration_ms": D,
  "skipped_running": bool
}
```
Scheduling:
- Sofortiger Initiallauf nach erfolgreichem `async_setup_entry`.
- Wiederkehrendes Intervall laut Option (Default 900s).
- Intervalländerung: Task Cancel + Neuplanung + INFO Log (alt→neu).
- Overlap: kein Nachholen verpasster Läufe.

Handles / State in `hass.data[DOMAIN][entry_id]`:
- `price_task_cancel`
- `price_lock`
- `price_error_counter` (int, In-Memory)
- `price_currency_drift_logged` (Set[str])
- (implizit) Konfigurationswerte.

Unload:
- Task canceln.
- Alle Handles & Caches entfernen.
- Reload startet neuen Initiallauf.

## 8. Change Detection & DB Update
Schritte:
1. Alte Preise pro UUID laden (frische DB Verbindung pro Zyklus).
2. Quotes filtern (`price > 0`).
3. Skalierung: `scaled = int(round(price * 1e8))` (Bankers).
4. Vergleich strikt auf Integer-Ebene.
5. Jede Preisänderung → alle zugehörigen UUIDs des Symbols in Update-Liste.
6. SQL (pro UUID):
```
UPDATE securities
SET last_price=?, last_price_source='yahoo', last_price_fetched_at=?
WHERE uuid=?
```
7. Transaktion nur über geänderte Einträge.
8. `last_price_fetched_at` via `datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'`.
9. Keine Preis-Updates mit None / 0.
10. Total-Fehlschlag (0 Quotes) zählt als Fehler.

## 9. Currency Drift
- Vergleich gegen persistierte Währungs-Spalte der Security (bestehende Feldbezeichnung, z.B. `currency_code` – wird nicht geändert).
- Weicht neue Quote-Currency von persistierter ab → einmalige WARN pro Symbol (Cache `price_currency_drift_logged`).
- Fehlende Currency (None) akzeptiert → keine Drift-Prüfung.

## 10. Revaluation
Datei: `custom_components/pp_reader/prices/revaluation.py`
Funktion:
```python
async def revalue_after_price_updates(hass, conn, updated_security_uuids) -> dict[str, Any]:
    """
    Rückgabeformat:
    {
      "portfolio_values": <data> | None,
      "portfolio_positions": <data> | None
    }
    """
```
Eigenschaften:
- Nur betroffene Portfolios (Teil-Revaluation).
- Positionsdaten (nur für betroffene Portfolios).
- `portfolio_values` liefert aktualisierte Aggregationen (value, purchase_sum, count etc. – konsistent mit bestehender Event-Nutzlast).
- Berechnung identisch zur existierenden Logik (Wiederverwendung bestehender Aggregationsfunktionen; keine Divergenz).
- Kein eigener Event-Push innerhalb dieser Funktion (Rückgabe an Orchestrator).
- Reihenfolge Event-Push: zuerst ein `portfolio_values` Event (wenn nicht None), danach je Portfolio ein `portfolio_positions` Event (falls nötig).

## 11. Events
Nur bei mindestens einer Preisänderung:
- `portfolio_values` (Aggregiert für alle betroffenen Portfolios – wenn mehrere, eine Payload die der bestehenden Struktur entspricht).
- `portfolio_positions` (ein Event pro betroffenem Portfolio).
Keine Events bei 0 Änderungen oder wenn Zyklus übersprungen wurde. Keine neuen Event-Typen. Frontend Patch-Logik bleibt unverändert.

## 12. Konfiguration / Options Flow
Optionen:
- `price_update_interval_seconds` (Default: 900, Minimum: 300 – Werte <300 werden abgelehnt).
- `enable_price_debug` (bool).
Effekte:
- Intervalländerung → Neuplanung + INFO Log.
- Debug-Flag setzt Logger Namespace `custom_components.pp_reader.prices` (inkl. Submodule) auf DEBUG.
- Entfernte oder ungültige Option → Fallback auf Default.
- OptionsFlow wird ergänzt (falls noch nicht vorhanden).

## 13. Logging
Levels & Muster:
- INFO pro Zyklus:
  `prices_cycle symbols=<N> batches=<B> returned=<R> changed=<C> errors=<E> duration=<ms>`
- DEBUG bei Debug-Flag:
  - Batch Start/Ende
  - Symbol akzeptiert / verworfen
  - Skip wegen laufendem Zyklus
- WARN:
  - Chunk-Fehler
  - Migration Problem
  - Leere Gesamtquote (max 1× / 30min)
  - Currency Drift (einmal pro Symbol)
  - Wiederholte Batch-Fehler (≥3 in Folge)
  - Zyklusdauer > 25s
- ERROR:
  - Unerwartete Ausnahme (Zyklus läuft weiter)
  - Importfehler `yahooquery` (Feature deaktiviert)

Fehlerzähler:
- In-Memory (`price_error_counter`).
- Erhöht bei Chunk-Fehlern oder Total-Fehlschlag (0 Quotes).
- Reset bei erstem erfolgreichen Folgezyklus mit ≥1 Quote.
- Keine Persistenz.

## 14. Fehler- & Ausfallszenarien
- Einzel-Chunk Fehler → andere Chunks laufen weiter.
- Alle Chunks fehlschlagen oder liefern 0 Quotes → WARN (dedupliziert) + Fehlerzähler + kein Abbruch zukünftiger Zyklen.
- Wiederholte Fehler (≥3) → WARN pro Zyklus bis Erfolg.
- Importfehler yahooquery → Funktionalität deaktiviert (einmal ERROR).
- Kein Retries innerhalb eines Zyklus (Simplicity, Intervall ausreichend).

## 15. Debug Scope
Debug-Flag wirkt ausschließlich auf Logger Namespace:
`custom_components.pp_reader.prices.*` (Provider + Orchestrator + Revaluation).
Keine globale Logger-Änderung.

## 16. Tests
Struktur:
- `tests/prices/test_yahooquery_provider.py`
- `tests/prices/test_price_service.py`
Abdeckung:
- Normaler Batch.
- Null-/0-Preis Filter.
- Fehlendes Symbol.
- Chunk Fehler → andere verarbeitet.
- Wiederholte Fehler → WARN ab 3.
- Keine Änderungen → keine Events.
- Änderungen → selektive Updates + Events.
- Currency Drift Warn nur einmal.
- Migration vorhanden / neu.
- Skip wenn Zyklus läuft.
- Leere Symbol-Liste (INFO nur erster Lauf).
- Total-Fehlschlag zählt als Fehler.
Mocking:
- Monkeypatch `yahooquery.Ticker` (Fake `.quotes`).
DB:
- Temporäre Kopie (Datei) statt `:memory:` (Migrationstest).
Integrationstest:
- End-to-End: Preise ändern → Events → Werte aktualisiert.
Richtlinie:
- Tests unter `tests/prices/` (Pfad fest).

## 17. Internationalisierung
Neue Keys (en, de):
- `config.price_update_interval_seconds`
- `config.enable_price_debug`
- `help.auto_symbols`
- `log.prices_cycle`
- `warn.no_quotes_received`
- `warn.batch_failed`
- `warn.currency_drift`
- `warn.repeated_batch_failures`

Übersetzungen sofort ergänzen.

## 18. Dokumentation
README Abschnitt “Live Kurse (YahooQuery)”:
- Intervall-Empfehlung (≥15 Minuten).
- Feldübersicht & mögliche None-Werte.
- Keine Intraday-Garantie, keine Historie.
- Debug-Option & Logging-Verhalten.
- Grenzen (Rate Limits, Upstream Änderungen).
- Kein Persistieren zusätzlicher Felder (nur letzter Preis).

## 19. Versionierung & Changelog
- Minor Version in `manifest.json` erhöhen (0.x → 0.(x+1)).
- Neues `CHANGELOG.md` nach „Keep a Changelog“ Format.
- Nur neue Abhängigkeit: `yahooquery==2.3.7`.

## 20. Implementierungsreihenfolge
1. Schema Migration.
2. Provider Base + `Quote`.
3. YahooQuery Provider.
4. Orchestrator (Lock, Scheduling, Watchdog).
5. Change Detection + DB Write.
6. Revaluation Helper + Rückgabeformat.
7. Event-Anbindung.
8. Options Flow / Intervall / Debug.
9. Scheduling + Initiallauf.
10. Logging & Fehlerzähler / Drift-Cache.
11. Tests.
12. Doku + Übersetzungen.
13. Version Bump + Changelog.

## 21. Risiko-Minimierung
- Provider isoliert.
- Sequentielle Batches.
- Partial Success tolerant.
- Skip statt Queue bei Overlap.
- Minimal persistierte Änderungen.
- Ereignis-Reduktion (nur bei Preisänderungen).

## 22. Datenvalidierung
- Preis > 0 zwingend (sonst verwerfen).
- Keine Überschreibung existierender Preise mit `None`/0.
- Skalierung 1e8 (Integer).
- Bankers Rounding via Python `round()`.
- Currency optional; fehlend akzeptiert.
- Dividend Yield unverändert (keine Skalierung).
- 52W Werte direkt übernommen (keine Validierung).
- Keine Nachverarbeitung von Volume/MarketCap.

## 23. Nicht Persistierte Felder
Folgende Quote-Felder bleiben ausschließlich in-memory:
- `previous_close`
- `currency` (nur für Drift-Prüfung)
- `volume`
- `market_cap`
- `high_52w`, `low_52w`
- `dividend_yield`
Persistiert werden nur: `last_price`, `last_price_source`, `last_price_fetched_at`.

## 24. Erweiterungen (Phase 2 – nicht jetzt)
- Sensors / Attribute pro Symbol.
- Force Refresh Service.
- Persistente Liste ungültiger Symbole.
- Eskalation bei dauerhafter Leer-Rückgabe.
- Zusätzliche Provider.

## 25. Entfernte / Veraltete Punkte
- Alpha Vantage / Stooq Code & Logik.
- Provider-Auswahl / Rotation / Token Bucket.
- Historische API-Anreicherungen.
- Zusatz-Eventtypen.

## 26. Laufzeit- und State-Details (Konsolidiert aus Implementierungsdetails & Klarstellungen)
- Lock: `price_lock` (asyncio.Lock).
- Fehlerzähler: `price_error_counter` (In-Memory, Reset bei Erfolg).
- Currency Drift Cache: `price_currency_drift_logged` (Set).
- Empty Symbols INFO nur einmal pro Laufzeit (Reset bei Reload).
- Rounding & Skalierung stabil (Bankers; deckungsgleich zu bisherigen Preisinterpretationen).
- Doppelte Symbole: Alle zugehörigen Securities werden aktualisiert (bewusste Entscheidung, akzeptierte Nebenwirkung).
- Timestamp Format strikt `YYYY-MM-DDTHH:MM:SSZ`.
- Revaluation liefert genau: `{"portfolio_values": ..., "portfolio_positions": ...}` (beides optional).
- Event-Reihenfolge: `portfolio_values` → einzelne `portfolio_positions`.
- Positions-Events nur betroffene Portfolios.
- Keine Intervallverlängerung bei Fehlern.
- Orchestrator fängt Ausnahmen breit ab (Zyklus läuft weiter).
- Keine zusätzlichen Indizes / Eventtypen.
- Importfehler yahooquery → Feature deaktiviert (kein Fallback).
- Keine Symbol-Normalisierung (Original-Eingabe).
- Watchdog bezieht sich auf gesamten Zyklus inkl. Revaluation.

## 27. Bestätigte Kernentscheidungen (Kurzfassung)
- Nur Aktualisierung & Events bei tatsächlicher Preisänderung.
- Symbol-Erkennung automatisch aus DB.
- Preis-Skalierung 1e8 mit Bankers Rounding.
- Keine Historien-Anreicherung.
- Provider erweiterbar, initial nur Yahoo.
- Debug steuerbar per Option, beschränkt auf Preis-Namespace.
- Partielle Revaluation & Events minimal.
- Fehlertolerant & stateful (In-Memory Caches).
- Keine Persistenz zusätzlicher Quote-Felder.

---
Dieses konsolidierte Dokument integriert alle zuvor separat aufgeführten Implementierungsdetails, abschließenden Klarstellungen und bestätigten Kernentscheidungen ohne Informationsverlust.