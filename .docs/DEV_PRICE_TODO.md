# Live-Preis Integration (YahooQuery) – Umsetzungs-Checkliste

Legende: ☐ offen | ⟳ in Arbeit | ☑ fertig | ⚠ prüfen

## 1. Schema / Migration
- [ ] (DB) Spalten hinzufügen falls fehlend: securities.last_price_source, securities.last_price_fetched_at
  - Datei ändern: [custom_components/pp_reader/data/db_schema.py](custom_components/pp_reader/data/db_schema.py) (DDL aufnehmen in ALL_SCHEMAS)
  - Datei prüfen/ergänzen: [custom_components/pp_reader/data/db_init.py](custom_components/pp_reader/data/db_init.py) (nichts brechen)
- [ ] (Migration Fallback) Try/Except ALTER bei Laufzeit falls Spalten fehlen (optional – falls nicht über Schema-Neuaufbau abgedeckt)

## 2. Provider Abstraktion
- [ ] Neu: `custom_components/pp_reader/prices/provider_base.py`
  - Klasse: Quote (Dataclass)
  - Protocol: PriceProvider.fetch(symbols) -> dict[symbol, Quote]

## 3. YahooQuery Provider
- [ ] Neu: `custom_components/pp_reader/prices/yahooquery_provider.py`
  - CHUNK_SIZE=50
  - Mapping Felder (regularMarketPrice → price, usw.)
  - Filter: price > 0
  - Executor-Wrapper (blocking lib)
  - Fehlerbehandlung (Chunk komplett verwerfen)

## 4. Symbol-Autodiscovery
- [ ] SQL Query implementieren (SELECT uuid, ticker_symbol FROM securities WHERE retired=0 ...)
- [ ] Deduplikation + Mapping symbol→[uuids]
- [ ] Einmaliges INFO bei leerer Liste je Laufzeit (State-Flag in hass.data)

## 5. Orchestrator / Preis-Service
- [ ] Neu: `custom_components/pp_reader/prices/price_service.py`
  - State: price_lock, price_task_cancel, price_error_counter, price_currency_drift_logged
  - Ablauf-Zyklus 1–11 (siehe nextGoals)
  - Timeout pro Batch (asyncio.wait_for)
  - Watchdog >25s WARN
  - Metadaten-Objekt Log (INFO)

## 6. Change Detection & DB Update
- [ ] Laden alter last_price Werte
- [ ] Skalierung int(round(price * 1e8))
- [ ] Nur geänderte UUIDs updaten (Transaktion)
- [ ] Timestamp Format UTC ohne ms: YYYY-MM-DDTHH:MM:SSZ
- [ ] Fehlerfall (0 Quotes) → Fehlerzähler++

## 7. Currency Drift
- [ ] Vergleich Quote.currency vs persistierte securities.currency_code
- [ ] Pro Symbol nur einmal WARN (Set-Cache)

## 8. Revaluation (partiell)
- [ ] Neu: `custom_components/pp_reader/prices/revaluation.py`
  - Funktion: revalue_after_price_updates(hass, conn, updated_security_uuids)
  - Ermittelt betroffene Portfolios (JOIN securities ↔ portfolio_securities/transactions)
  - Re-Use vorhandener Aggregationen:
    - Portfolio-Wert & Count: [custom_components/pp_reader/logic/portfolio.py](custom_components/pp_reader/logic/portfolio.py)
    - Purchase Sum: calculate_purchase_sum
  - Rückgabeformat:
    {
      "portfolio_values": { uuid: { name,value,count,purchase_sum }, ... } | None,
      "portfolio_positions": { uuid: [ {name,current_holdings,purchase_value,current_value,gain_abs,gain_pct}, ...], ... } | None
    }

## 9. Event-Push
- [ ] Integration-Glue im Orchestrator:
  - Wenn Änderungen >0:
    - Erst portfolio_values Event (bestehendes Format wie Coordinator)
    - Danach je Portfolio ein portfolio_positions Event
  - Handler existieren: [custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js](custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js)

## 10. OptionsFlow & Konfiguration
- [ ] Erweiterung: [custom_components/pp_reader/config_flow.py](custom_components/pp_reader/config_flow.py)
  - OptionsFlowHandler falls noch nicht vorhanden
  - Felder:
    - price_update_interval_seconds (int ≥300, default 900)
    - enable_price_debug (bool)
- [ ] Anwendung der Optionen beim Reload
- [ ] Debug setzt Logger-Level namespace custom_components.pp_reader.prices.*

## 11. Setup / Unload Integration
- [ ] In [custom_components/pp_reader/__init__.py](custom_components/pp_reader/__init__.py):
  - Initialer Start: create task (Initiallauf sofort)
  - Speicherung cancel-callback
  - Unload: Task cancel + Cleanup price_* Keys
  - Reload: neuer Initiallauf
- [ ] manifest.json Abhängigkeit ergänzen: yahooquery==2.3.7
  - Datei: [custom_components/pp_reader/manifest.json](custom_components/pp_reader/manifest.json)
  - Version bump minor

## 12. Logging
- [ ] Logger Namespace anlegen: custom_components.pp_reader.prices.*
- [ ] INFO Zykluszeile
- [ ] WARN Bedingungen (Chunk, Watchdog, Drift, wiederholte Fehler)
- [ ] DEBUG (Batch Start/Ende, Accept/Drop Symbol, Skip Overlap)

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
- [ ] tests/prices/test_yahooquery_provider.py
  - Normal Batch
  - Preis <=0 filter
  - Fehlendes Symbol
- [ ] tests/prices/test_price_service.py
  - Chunk Fehler isoliert
  - Wiederholte Fehler → WARN ab 3
  - Keine Änderungen → keine Events
  - Änderungen → selektive Updates + Events Reihenfolge
  - Currency Drift einmalig
  - Leere Symbol-Liste Logging Verhalten
  - Overlap Skip
  - Total-Fehlschlag zählt als Fehler
  - Migration: neue Spalten vorhanden
- [ ] E2E (Integrationstest) Preise ändern → Events → UI kompatibel
- [ ] Fixture: temporäre DB-Datei (Kopie) für Migration

## 15. Dokumentation / Changelog
- [ ] README Abschnitt “Live Kurse (YahooQuery)”
- [ ] CHANGELOG.md (Neuer Eintrag: Added live price fetch via yahooquery)
- [ ] Hinweis: nur letzter Preis, keine Historie, Intervall Empfehlung >=15min

## 16. Aufräumen / Altcode
- [ ] Entfernen Alt-Provider (AlphaVantage/Stooq) falls noch vorhanden
- [ ] Entfernen unbenutzter Eventtypen / Rotation-Logik (falls Legacy)
- [ ] Sicherstellen: Keine Persistenz nicht vorgesehener Quote-Felder

## 17. QA / Manuelle Checks
- [ ] HA Neustart ohne Internet: Provider Import Fehler → Feature deaktiviert (ERROR einmalig)
- [ ] Interval Change während Lauf → alter Task cancel + neuer Task geplant
- [ ] Reload Config Entry → Initiallauf (Erwartete Logs)
- [ ] Performance: Zyklus <25s bei ~N Symbolen (Testfall definieren)

---

Meta Tracking (optional Tabelle):

| Bereich | Item | Status | Notizen |
|--------|------|--------|---------|
| Schema | Spalten added | ☐ |  |
| Provider | yahooquery_provider | ☐ |  |
| Orchestrator | price_service | ☐ |  |
| ... | ... | ... | ... |
