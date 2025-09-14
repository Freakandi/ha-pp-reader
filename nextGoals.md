# Next Goals: Market Data Integration (Yahoo Finance via yahooquery)

## 1. Ziel
Einbindung von aktuellen Kursen in `pp_reader` ausschließlich über das Python-Paket `yahooquery` (Batch‑fähig).
Alpha Vantage und Stooq werden NICHT mehr verwendet (vollständig entfernt).
Aktualisierte Kurse werden in der bestehenden `securities` Tabelle als letzter Preis gespeichert (inkl. Quelle + Fetch-Timestamp) und lösen nur dann eine Portfolio‑Neuberechnung aus, wenn sich mindestens ein Preis geändert hat.
Keine Erzeugung / Ergänzung historischer Kursreihen – Historie bleibt ausschließlich aus der Portfolio Performance Datei.

## 2. High-Level Meilensteine
1. Provider Abstraktion (beibehalten für spätere Erweiterungen; aktuell nur YahooQuery).
2. Implementierung `YahooQueryProvider` (Batch Quotes).
3. Schema-Erweiterung (falls noch nicht vorhanden): `last_price_source`, `last_price_fetched_at`.
4. Symbol-Autodiscovery aus DB (`securities`, nicht retired, Symbol vorhanden).
5. Preis-Update Task (Intervall, async orchestration + executor offload).
6. Change Detection & differenzielle DB Updates.
7. Revaluation Helper extrahieren + Events nur bei Änderungen.
8. Konfigurationsoptionen: Intervall, Debug-Flag.
9. Logging & Fehlerpfade (Rate/Block Handling).
10. Tests (Provider, Orchestrator, Schema-Migration, Change Detection).
11. Doku & Übersetzungen, Version Bump.

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
- Nur Quotes mit `price > 0`.
- Fehlende Felder → None.
- Keine Exceptions pro Symbol, stattdessen Symbol auslassen.

## 4. YahooQuery Provider
Datei: `prices/yahooquery_provider.py`
- Paket: `yahooquery` (in `manifest.json` requirements, z.B. `yahooquery==2.3.7`).
- Batch: `Ticker(symbols, asynchronous=False)` → `quotes` Dict.
- Feld-Mapping:
  - `regularMarketPrice` → price
  - `regularMarketPreviousClose` → previous_close
  - `regularMarketVolume` → volume
  - `fiftyTwoWeekHigh` / `fiftyTwoWeekLow`
  - `trailingAnnualDividendYield`
  - `marketCap`
  - `currency`
- Execution im Executor (blocking).
- CHUNK_SIZE fest 50 (Konstante).
- Fehler pro Chunk → übersprungen, andere weiter.

## 5. Orchestrator (Preis-Service)
Datei: `prices/price_service.py`
Ablauf pro Zyklus:
1. Läuft noch ein vorheriger Zyklus? → Überspringen (DEBUG Log) – kein Queueing.
2. Symbole laden.
3. Chunk-Iteration (sequentiell).
4. Quotes sammeln.
5. Change Detection (Skalierung 1e8, Python standard rounding).
6. DB Updates nur für geänderte.
7. Revaluation (partiell) + Events nur wenn Änderungen.
8. Metadaten-Logging.
9. Gesamt-Watchdog: Falls ein Zyklus > 25s dauert → WARN (nächster Zyklus normal weiter).

Interne Metadaten:
```python
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

## 6. Symbol Autodiscovery
SQL:
`SELECT uuid, ticker_symbol FROM securities WHERE retired=0 AND ticker_symbol IS NOT NULL AND ticker_symbol != ''`
- Case-Preservation.
- Deduplikation, stabile Reihenfolge.
- Mapping `symbol -> [uuids...]` (Mehrfachzuordnung).
- Leere Ergebnisliste: einmal INFO beim ersten Lauf, später nur DEBUG.

## 7. Konfiguration / Options Flow
Optionen:
- `price_update_interval_seconds` (Default 900, Minimum 300 – Eingaben <300 werden abgewiesen).
- `enable_price_debug` (bool).
Intervalländerung: Task neu planen + INFO Log alt→neu.
Debug: logger Namespace `custom_components.pp_reader.prices` (inkl. Provider) auf DEBUG setzen.

## 8. Schema Erweiterung
Falls fehlend:
```sql
ALTER TABLE securities ADD COLUMN last_price_source TEXT;
ALTER TABLE securities ADD COLUMN last_price_fetched_at TEXT;
```
- Ergänzung in `db_schema.py` + `ALL_SCHEMAS`.
- Best-effort Migration (Fehler ignorieren falls bereits vorhanden).
- `last_price_fetched_at` Format: UTC ISO8601 ohne Millisekunden: `YYYY-MM-DDTHH:MM:SSZ`.
- `last_price_date` unverändert (PP-Datei-Historie).

## 9. Change Detection & DB Update
Ablauf:
1. Alte Preise (uuid → int) laden (pro Zyklus frische DB-Connection).
2. Quote filtern (`price > 0`).
3. Skaliert: `scaled = int(round(price * 1e8))` (Bankers Rounding).
4. Unterschied? → Update-Liste (alle UUIDs für Symbol).
5. Transaktion nur geänderte:
```
UPDATE securities
SET last_price=?, last_price_source='yahoo', last_price_fetched_at=?
WHERE uuid=?
```
6. Currency Drift: Wenn currency wechselt → einmalig WARN pro Symbol (Set).

## 10. Revaluation
Modul: `prices/revaluation.py`
Funktion: `revalue_after_price_updates(hass, conn, updated_security_uuids) -> dict[str, Any]`
- Liefert Datenstrukturen zurück (z.B. {"portfolio_values": ..., "portfolio_positions": ...}).
- Orchestrator entscheidet über `_push_update`.
- Partielle Revaluation: nur Portfolios mit geänderten securities.

## 11. Events
Nur bei Änderungen:
- `portfolio_values`
- `portfolio_positions` (nur betroffene Portfolios)
Keine Events bei 0 Änderungen.

## 12. Logging
INFO (pro Zyklus):
`prices_cycle symbols=<N> batches=<B> returned=<R> changed=<C> errors=<E> duration=<ms>`
DEBUG (bei Flag):
- Batch Start/Ende
- Symbol akzeptiert / verworfen
- Chunk Fehlerdetails
- Skip wegen laufendem Zyklus
WARN:
- Chunk-Fehler
- Migration Problem
- Leere Gesamtquote (max 1× / 30min)
- Currency Drift (einmal pro Symbol)
- Wiederholte Batch-Fehler (≥3 in Folge)
ERROR:
- Unerwartete Ausnahme (Zyklus läuft weiter)
- Importfehler yahooquery (Feature deaktiviert)

## 13. Fehler- & Ausfallszenarien
- Einzel-Chunk Fehler → weiter.
- Komplett leer trotz Symbolen → WARN (dedupliziert).
- Fehlerzähler (in-memory) + Reset nach erstem erfolgreichen Folgezyklus.
- Total-Fehlschlag (0 Quotes) zählt als 1 Fehler im gleichen Zähler.

## 14. Tests
Struktur:
- `tests/prices/test_yahooquery_provider.py`
- `tests/prices/test_price_service.py`
Abdeckung:
- Normaler Batch
- Null-/0-Preis Filter
- Fehlendes Symbol
- Chunk Fehler → andere verarbeitet
- Wiederholte Fehler → WARN ab 3
- Keine Änderungen → keine Events
- Änderungen → selektive Updates + Events
- Currency Drift Warn nur einmal
- Migration vorhanden / neu
- Skip wenn Zyklus noch läuft (simuliert)

Mock:
- Monkeypatch `yahooquery.Ticker` (Fake `.quotes`).

## 15. Internationalisierung
Neue Keys (en, de):
- `config.price_update_interval_seconds`
- `config.enable_price_debug`
- `help.auto_symbols`
- `log.prices_cycle`
- `warn.no_quotes_received`
- `warn.batch_failed`
- `warn.currency_drift`
- `warn.repeated_batch_failures`

## 16. Dokumentation
README Abschnitt “Live Kurse (YahooQuery)”:
- Intervall-Empfehlung (≥15 min)
- Feldübersicht & mögliche None-Werte
- Keine Intraday-Garantie / keine Historie
- Debug-Option
- Grenzen & mögliche Ausfälle (Upstream Änderungen)

## 17. Versionierung
- `manifest.json` Minor erhöhen (z.B. 0.x → 0.(x+1))
- Neues `CHANGELOG.md` (Keep a Changelog Stil)

## 18. Implementierungsreihenfolge
1. Schema Migration
2. Provider Base + Quote
3. YahooQuery Provider
4. Orchestrator + Chunking + Watchdog + Skip-Mechanik
5. Change Detection + DB Write
6. Revaluation Helper (Rückgabe-Daten)
7. Event-Anbindung
8. Options Flow / Intervall / Debug
9. Scheduling + Sofort-Initiallauf
10. Logging & Fehlerzähler / Drift-Cache
11. Tests
12. Doku + Übersetzungen
13. Version bump

## 19. Risiko-Minimierung
- Provider isoliert
- Batches sequentiell
- Fehler tolerant (partial success)
- Skip statt Queue bei Overlap
- Ereignis-Reduktion (nur Änderungen)

## 20. Datenvalidierung
- Preis > 0 zwingend
- Keine Überschreibung mit None/0
- Skalierung 1e8 (Bankers Rounding)
- Currency optional None
- Dividend Yield unverändert (keine Zusatz-Skalierung)
- 52W Werte unverändert übernommen

## 21. Offene Erweiterungen (Phase 2)
- Sensors / Attribute pro Symbol
- Force Refresh Service
- Persistente Invalid-Symbol Liste
- Eskalation bei dauerhafter Leer-Rückgabe
- Weitere Provider optional

## 22. Entfernte / Veraltete Punkte
- Alpha Vantage / Stooq Code & Logik
- Provider Auswahl / Rotation / Token Bucket
- Historische API-Anreicherungen

## 23. Implementierungsdetails (festgelegt)
1. Revaluation Helper: `prices/revaluation.py::revalue_after_price_updates()` (liefert Daten, pusht keine Events)
2. Gemeinsames `asyncio.Lock` unter `hass.data[DOMAIN][entry_id]['price_lock']`
3. Initiallauf: Sofortiger Fetch nach Setup
4. Leere Symbol-Liste: Einmal INFO, danach nur DEBUG
5. `last_price_date` unverändert
6. Keine Indexe für neue Spalten
7. Doppelte Symbole: Alle zugehörigen UUIDs updaten
8. Currency Drift: WARN einmal pro Symbol (Cache-Set)
9. CHUNK_SIZE = 50
10. Timeout pro Batch = 10s
11. `regularMarketPrice` fehlt/≤0 → Quote verwerfen
12. Kein Cache (Intervall ausreichend)
13. Änderungskriterium: strikter Integervergleich (skaliert)
14. Partielle Revaluation (nur betroffene Portfolios)
15. Positions-Events nur für betroffene Portfolios
16. Intervalländerung: INFO Log alt→neu
17. Mindestintervall Hard 300s
18. Debug-Flag: Nur Preis-Logger Namespace
19. Wiederholte Batch-Fehler: In-Memory Zähler, WARN ab 3
20. Leere Gesamtquote WARN max 1× / 30min
21. Einzel-Symbolfehler DEBUG
22. Tests unter `tests/prices/`
23. yahooquery Mock via Fake `Ticker`
24. Integrationstest mit temporärer DB-Kopie
25. Version bump Minor
26. Nur Manifest requirements
27. Neues `CHANGELOG.md`
28. Importfehler yahooquery → Feature deaktiviert (ERROR Log)
29. Force Refresh später (Phase 2)
30. Übersetzungen sofort ergänzen
31. Timestamp intern (kein UI)
32. Keine zusätzliche Event-Art
33. Orchestrator try/except → weiterlaufen
34. Symbol-Normalisierung: unverändert
35. Batches sequentiell
36. Chunk Fehler → weiter (partial success)
37. Fehler-Metriken nur In-Memory
38. Fehlende Currency akzeptieren
39. Dividend Yield unverändert
40. 52W Werte ungeprüft

## 24. Ergänzende Festlegungen (abschließende Klarstellungen)
1. Revaluation Rückgabeformat: `{"portfolio_values": <data>|None, "portfolio_positions": <data>|None}`
2. `last_price_fetched_at` Format: `YYYY-MM-DDTHH:MM:SSZ` (UTC, ohne ms)
3. Overlap Handling: Wenn laufend → neuer Zyklus überspringt, kein Nachholen
4. Task Handles in `hass.data[DOMAIN][entry_id]`:
   - `price_task_cancel`
   - `price_lock`
   - `price_error_counter`
   - `price_currency_drift_logged` (Set)
5. DB Connection: pro Zyklus neue Verbindung, am Ende schließen
6. Fehlerzähler Reset: bei erstem Erfolg (≥1 Quote) wird Zähler auf 0 gesetzt
7. Total-Fehlschlag (0 Quotes) → zählt als Fehler im gleichen Zähler
8. Rounding: Python Standard (Bankers) via `round(price * 1e8)`
9. Keine Intervallverlängerung trotz Fehler (nur Logging)
10. Currency Drift WARN Cache: Set pro Symbol für Laufzeit
11. Leere Symbol-Liste Info nur einmal bis Neustart / Reload
12. `previous_close` nur im Arbeitsspeicher (nicht persistiert)
13. Unload: Task canceln, Handles & Caches entfernen
14. Zyklus-Watchdog: WARN wenn Dauer > 25s, kein Abbruchlauf
15. Debug-Scope umfasst Orchestrator + Provider Module (`custom_components.pp_reader.prices.*`)

---

Bestätigte Kernentscheidungen:
- Nur Aktualisierung bei Preisänderung (DB + Events)
- Automatische Symbolerkennung
- Debug über Config Flag
- Keine historische Kursmanipulation
- Preis-Skalierung 1e8
- Vollständig spezifizierte Implementierungsdetails (Abschnitte 23 & 24)