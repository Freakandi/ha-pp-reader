1. Backend: Roh-Transaktionsdaten normalisieren
   a) [x] Hilfsfunktion `_normalize_transaction_amounts` ergänzen
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Abschnitte: neuer Helper unterhalb `PURCHASE_TYPES` / `SALE_TYPES`
      - Ziel: Zerlegt eine `Transaction` in reale Stückzahl (`shares / 1e8`), Bruttobetrag (`amount / 100`), Gebühren (`transaction_units.type = 2`), Steuern (`transaction_units.type = 1`) und berechnet `net_trade_account = gross - fees - taxes`.
   b) [x] Verarbeitung der `transaction_units` erweitern
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Funktion: `_resolve_native_amount`
      - Ziel: Neben `fx_amount` auch den Rohbetrag (`amount / 100`) für `type = 0` zurückgeben, um Sicherheitswährungsbeträge verfügbar zu machen.
   c) [x] FX-Fallback für Transaktionen ohne `transaction_units`
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Funktion: `_determine_exchange_rate`
      - Ziel: Ergänzt Rückgabe des verwendeten FX-Kurses, damit `net_trade_account / fx_rate` als Ersatz für fehlende `fx_amount` genutzt werden kann.

2. Backend: Sicherheitswährungs-Kaufsummen berechnen
   a) [x] Kaufmetriken um Sicherheitswährungsfelder erweitern
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Dataklasse: `PurchaseComputation`
      - Ziel: Zusätzliche Attribute `security_currency_total`, `account_currency_total`, `avg_price_security`, `avg_price_account` vorhalten.
   b) [x] FIFO-Berechnung aktualisieren
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Funktion: `db_calculate_sec_purchase_value`
      - Ziel: Nutzt `_normalize_transaction_amounts` und `transaction_units`, akkumuliert Sicherheits- und Kontowährungssummen je Los und berechnet durchschnittliche Kaufpreise pro Aktie in beiden Währungen.
   c) [x] Resilienz-Logging bei fehlender FX-Information
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Funktion: `db_calculate_sec_purchase_value`
      - Ziel: Loggt warnend, wenn weder `type = 0` noch ein FX-Kurs verfügbar ist, und markiert die Position für manuelle Prüfung.

3. Backend: Persistierte Portfolio-Daten anreichern
   a) [ ] `portfolio_securities`-Upsert erweitern
      - Datei: `custom_components/pp_reader/prices/price_service.py`
      - Funktion: `_refresh_portfolio_securities`
      - Ziel: Schreibt neue Werte (`security_currency_total`, `account_currency_total`, `avg_price_security`, `avg_price_account`) in zusätzliche Spalten des Upserts.
   b) [ ] Datenzugriffsschicht aktualisieren
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Funktionen: `get_portfolio_positions`, `get_security_snapshot`
      - Ziel: Liefert Sicherheitswährungs-Kaufsummen und Durchschnittspreise samt Kontowährungsreferenz in den Rückgabe-JSONs.
   c) [ ] WebSocket-Payload ergänzen
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Funktionen: `_normalize_security_snapshot`, `_normalize_portfolio_positions`
      - Ziel: Serialisiert neue Felder (`purchase_total_security`, `purchase_total_account`, `avg_price_security`, `avg_price_account`).
   d) [ ] Event-Push angleichen
      - Datei: `custom_components/pp_reader/data/event_push.py`
      - Funktion: `_build_security_payload`
      - Ziel: Stellt sicher, dass Push-Events die erweiterten Kaufdaten enthalten.

4. Backend: Datenmodell & Migration
   a) [ ] Datenbankschema für neue Spalten anpassen
      - Datei: `custom_components/pp_reader/data/db_schema.py`
      - Abschnitt: Definition `portfolio_securities`
      - Ziel: Spalten für Sicherheitswährungssumme und Durchschnittspreise ergänzen, inklusive Default-Werte.
   b) [ ] Datensynchronisation erweitern
      - Datei: `custom_components/pp_reader/data/sync_from_pclient.py`
      - Funktionen: `_rebuild_transaction_units`, `_load_all_transactions`
      - Ziel: Stellt sicher, dass neue `transaction_units`-Informationen (inkl. Steuern) geladen werden und dass der Refresh nach Schemaänderung funktioniert.
   c) [ ] Migration bestehender Daten durchführen
      - Datei: `custom_components/pp_reader/data/db_schema.py`
      - Abschnitt: Migrationslogik
      - Ziel: Bestehende `portfolio_securities`-Einträge initial mit 0 bzw. `NULL` für die neuen Spalten befüllen.

5. Frontend: API- und Typdefinitionen aktualisieren
   a) [ ] Websocket-Response-Typen erweitern
      - Datei: `src/data/api.ts`
      - Interface: `SecuritySnapshotResponse`, `PortfolioPosition`
      - Ziel: Neue Felder für Kaufwerte und Durchschnittspreise deklarieren.
   b) [ ] Panel-Typen synchronisieren
      - Datei: `src/tabs/types.ts`
      - Typen: `SecuritySnapshotDetail`, `PortfolioPosition`
      - Ziel: Stellt Frontend-Typen auf die erweiterten Backend-Felder ein.

6. Frontend: Darstellung der Kaufpreise anpassen
   a) [ ] Sicherheitsdetailansicht priorisiert Sicherheitswährung
      - Datei: `src/tabs/security_detail.ts`
      - Bereiche: `ensureSnapshotMetrics`, `renderOverviewCard`
      - Ziel: Nutzt `avg_price_security` als Hauptwert, zeigt Kontowährungsreferenz sekundär an.
   b) [ ] Depotübersicht um Sicherheitswährung erweitern
      - Datei: `src/tabs/overview.ts`
      - Abschnitt: Rendering der Positionsliste
      - Ziel: Zeigt Kaufpreis pro Aktie in Sicherheitswährung an und nutzt Kontowährung nur ergänzend.
   c) [ ] UI-Tests anpassen
      - Datei: `src/tabs/__tests__/security_detail.metrics.test.ts`
      - Ziel: Prüft neue Kennzahlen inklusive FX-Fallback.

7. Tests & Validierung
   a) [ ] Backend-Testfall für SSR Mining hinzufügen
      - Datei: `tests/test_logic_securities.py` (neu)
      - Ziel: Verifiziert 7,2489 CAD pro Aktie und korrekte EUR-Kaufsumme.
   b) [ ] Backend-Testfall für Harmonic Drive ergänzen
      - Datei: `tests/test_logic_securities.py`
      - Ziel: Prüft 2.488,00 JPY pro Aktie ohne FX-Row.
   c) [ ] Integrationstest für Websocket-Daten
      - Datei: `tests/test_ws_security_history.py`
      - Ziel: Erwartet neue Felder in Snapshot-Payloads.
   d) [ ] Frontend-Snaphot-/Unit-Tests aktualisieren
      - Dateien: `src/tabs/__tests__/security_detail.metrics.test.ts`, `src/tabs/__tests__/overview.render.test.ts`
      - Ziel: Spiegelt neue Formatierung der Kaufwerte wider.
   e) [ ] Manuelle Validierung dokumentieren
      - Datei: `.docs/TODO_fix_native_purchase.md` (nach Pflege entfernen)
      - Ziel: Liste manueller Tests (SSR Mining & Harmonic Drive anzeigen, Werte prüfen).

8. Dokumentation & Kommunikation
   a) [ ] Architektur-Abschnitt "Kaufpreisberechnung" aktualisieren
      - Datei: `ARCHITECTURE.md`
      - Ziel: Datenfluss (transaktionelle Normalisierung, Sicherheitswährung als Primäranzeige) beschreiben.
   b) [ ] Entwickler-Doku ergänzen
      - Datei: `README-dev.md`
      - Ziel: Hinweise zur neuen Datenbankmigration und Testdaten aufnehmen.
   c) [ ] Changelog-Eintrag verfassen
      - Datei: `CHANGELOG.md`
      - Ziel: "Native purchase price" Fix inklusive Breaking-Change-Hinweisen dokumentieren.

Optional
   a) [ ] Optionale Logging-Metrik für fehlende FX-Daten
      - Datei: `custom_components/pp_reader/logic/securities.py`
      - Ziel: Prometheus/Diagnostics-Hook vorbereiten, um manuelle Nacharbeiten zu erleichtern.
   b) [ ] Optionale UI-Tooltips mit FX-Details
      - Datei: `src/tabs/security_detail.ts`
      - Ziel: Zeigt verwendeten FX-Kurs inklusive Datum als Tooltip an.
