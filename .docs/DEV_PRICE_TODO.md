# Live-Preis Integration (YahooQuery) – Umsetzungs-Checkliste

Legende: ☐ offen | ⟳ in Arbeit | ☑ fertig | ⚠ prüfen

## 1. Schema / Migration
- [x] (DB) Spalten hinzufügen falls fehlend: securities.last_price_source, securities.last_price_fetched_at
  - Datei ändern: [custom_components/pp_reader/data/db_schema.py](custom_components/pp_reader/data/db_schema.py) (DDL aufnehmen in ALL_SCHEMAS)
  - Datei prüfen/ergänzen: [custom_components/pp_reader/data/db_init.py](custom_components/pp_reader/data/db_init.py) (nichts brechen)
- [x] (Migration Fallback) Try/Except ALTER bei Laufzeit falls Spalten fehlen (optional – falls nicht über Schema-Neuaufbau abgedeckt)

## 2. Provider Abstraktion
- [x] Neu: `custom_components/pp_reader/prices/provider_base.py`
  - Klasse: Quote (Dataclass)
  - Protocol: PriceProvider.fetch(symbols) -> dict[symbol, Quote]

## 3. YahooQuery Provider
- [x] Neu: `custom_components/pp_reader/prices/yahooquery_provider.py`
  - CHUNK_SIZE=50
  - Mapping Felder (regularMarketPrice → price, usw.)
  - Filter: price > 0
  - Executor-Wrapper (blocking lib)
  - Fehlerbehandlung (Chunk komplett verwerfen)

## 4. Symbol-Autodiscovery
- [x] SQL Query implementieren (SELECT uuid, ticker_symbol FROM securities WHERE retired=0 ...)
- [x] Deduplikation + Mapping symbol→[uuids]
- [x] Einmaliges INFO bei leerer Liste je Laufzeit (State-Flag in hass.data)

## 5. Orchestrator / Preis-Service
- [x] Neu: `custom_components/pp_reader/prices/price_service.py`
  - State: `price_lock`, `price_task_cancel`, `price_error_counter`, `price_currency_drift_logged`
  - Ablauf-Zyklus 1–11 (siehe nextGoals)
  - Timeout pro Batch (`asyncio.wait_for`)
  - Watchdog >25s WARN (gesamter Zyklus inkl. Revaluation)
  - Metadaten-Objekt Log (INFO) mit Keys: `symbols_total`, `batches`, `quotes_returned`, `changed`, `errors`, `duration_ms`, `skipped_running`
  - ☑ Fehlerzähler Reset nach erstem erfolgreichen Zyklus (wenn ≥1 Quote verarbeitet)

## 6. Change Detection & DB Update
- [x] Laden alter `last_price` Werte
- [x] Skalierung `int(round(price * 1e8))`
- [x] Nur geänderte UUIDs updaten (Transaktion)
- [x] Timestamp Format UTC ohne ms: `YYYY-MM-DDTHH:MM:SSZ`
- [x] Fehlerfall (0 Quotes) → Fehlerzähler++
- [x] `last_price_source='yahoo'` beim Update setzen
- [x] Preise `None` oder `<=0` NICHT updaten (skip)

## 7. Currency Drift
- [x] Vergleich Quote.currency vs persistierte `currency_code`
- [x] Pro Symbol nur einmal WARN
- [x] Fehlende Currency (`None`) → keine Drift-Prüfung (skip)

## 8. Revaluation (partiell)
- [x] Neu: `custom_components/pp_reader/prices/revaluation.py`
  - Funktion: revalue_after_price_updates(hass, conn, updated_security_uuids)
  - Ermittelt betroffene Portfolios (JOIN / UNION)
  - Re-Use vorhandener Aggregationen (value, count, purchase_sum)
  - Rückgabeformat:
    {
      "portfolio_values": { uuid: { name,value,count,purchase_sum }, ... } | None,
      "portfolio_positions": None (TODO)
    }
- [ ] Positionsdaten (pro betroffenem Portfolio) ergänzen

## 9. Event-Push
- [x] Integration-Glue im Orchestrator:
  - Nur bei `changed_count > 0`
  - Reihenfolge: zuerst `portfolio_values`, danach je Portfolio `portfolio_positions`
  - Reuse `_push_update` + `fetch_positions_for_portfolios`
  - 2‑Dezimal Rundung identisch zum File-Sync Pfad

## 10. OptionsFlow & Konfiguration
- [x] Erweiterung: [custom_components/pp_reader/config_flow.py](custom_components/pp_reader/config_flow.py)
  - Felder:
    - [x] price_update_interval_seconds (int ≥300, default 900)
    - [x] enable_price_debug (bool)
- [x] Anwendung der Optionen beim Reload
- [x] Debug setzt Logger-Level namespace custom_components.pp_reader.prices.*

## 11. Setup / Unload Integration
- [ ] In [custom_components/pp_reader/__init__.py](custom_components/pp_reader/__init__.py):
  - [x] Initialer Start: create task (Initiallauf sofort)
  - [x] Speicherung cancel-callback
  - [x] Unload: Task cancel + Cleanup price_* Keys
  - [x] Reload: neuer Initiallauf
- [x] manifest.json Abhängigkeit ergänzen: yahooquery==2.3.7
  - Datei: [custom_components/pp_reader/manifest.json](custom_components/pp_reader/manifest.json)
  - Version bump minor

## 12. Logging
- [x] Logger Namespace anlegen: `custom_components.pp_reader.prices.*`
- [x] INFO Zykluszeile (siehe definierte Keys)
- [x] WARN Bedingungen (Chunk, Watchdog, Drift, wiederholte Fehler, Zero-Quotes)
- [x] WARN bei Gesamt-0-Quotes (dedupliziert, max 1× / 30min)
- [x] ERROR Importfehler `yahooquery` → Feature deaktivieren
- [x] DEBUG (Batch Start/Ende, Accept/Drop Symbol, Skip Overlap)
- [x] Fehlerzähler Reset Log bei Rückkehr zu Erfolg
- [ ] Keine Drift-WARN wenn Currency fehlt

## 13. Internationalisierung
- [ ] translations/de.json & en.json neue Keys:
  - config.price_update_interval_seconds
  - config.enable_price_debug
  - help.auto_symbols
  - log.prices_cycle
  - warn.no_quotes_received
  - warn.batch_failed
  - warn.currency_drift
  - warn.repeated_batch_failures

## 14. Tests
- [ ] `tests/prices/test_yahooquery_provider.py`
- [ ] `tests/prices/test_price_service.py`
- [ ] Normaler Batch
- [ ] Null-/0-Preis Filter
- [ ] Fehlendes Symbol
- [ ] Chunk Fehler → andere verarbeitet
- [ ] Wiederholte Fehler → WARN ab 3
- [ ] Keine Änderungen → keine Events
- [ ] Änderungen → selektive Updates + Events
- [ ] Currency Drift Warn nur einmal
- [ ] Migration vorhanden / neu
- [ ] Skip bei laufendem Zyklus
- [ ] Leere Symbol-Liste (INFO nur erster Lauf)
- [ ] Total-Fehlschlag zählt als Fehler
- [ ] WARN bei 0 Gesamtquotes + Fehlerzähler++
- [ ] Fehlerzähler Reset nach Erfolg
- [ ] Keine Drift-WARN bei fehlender Currency
- [ ] Metadata Log vollständige Keys vorhanden
- [ ] Keine Events wenn wirklich keine Preisänderung
- [ ] Watchdog greift bei künstlicher Verzögerung >25s
- [ ] Reload startet Initiallauf erneut (Preis-Service)

## 15. Dokumentation / Changelog
- [ ] README Abschnitt “Live Kurse (YahooQuery)”
- [ ] CHANGELOG.md (Neuer Eintrag: Added live price fetch via yahooquery)
- [ ] Hinweis: nur letzter Preis, keine Historie, Intervall Empfehlung >=15min

## 16. Aufräumen / Altcode
- [ ] Entfernen Alt-Provider (AlphaVantage/Stooq) falls noch vorhanden
- [ ] Entfernen unbenutzter Eventtypen / Rotation-Logik (falls Legacy)
- [ ] Sicherstellen: Keine Persistenz nicht vorgesehener Quote-Felder

## 17. QA / Manuelle Checks
- [ ] HA Neustart ohne Internet → Importfehler (`yahooquery`) → einmal ERROR, Feature aus
- [ ] Intervalländerung während Lauf → alter Task cancel + neuer Task geplant
- [ ] Reload Config Entry → Initiallauf + erwartete Logs
- [ ] Performance: Zyklus (inkl. Revaluation) <25s bei Test-N Symbolen
- [ ] Zero-Quotes Szenario erzeugt deduplizierte WARN
- [ ] Drift-WARN erscheint nicht erneut nach erstem Symbol
- [ ] Reset Fehlerzähler sichtbar nach erfolgreichem Zyklus
- [ ] Debug-Option begrenzt Logs auf Preis-Namespace
- [ ] Keine Persistenz zusätzlicher Quote-Felder (nur last_price/source/fetched_at)

---

Meta Tracking (optional Tabelle):

| Bereich | Item | Status | Notizen |
|--------|------|--------|---------|
| Schema | Spalten added | ☐ |  |
| Provider | yahooquery_provider | ☐ |  |
| Orchestrator | price_service | ☐ |  |
| ... | ... | ... | ... |
