# Security Detail Tab Implementation Checklist

1. Backend: Security snapshot data endpoint
   a) [x] Implement `get_security_snapshot(db_path: Path, security_uuid: str)` to aggregate holdings, preserve native-currency quotes, and normalize EUR values
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt/Funktion: Neuer Helper unterhalb bestehender snapshot/portfolio Utilities
      - Ziel: Liefert `{name, currency_code, total_holdings, last_price_native, last_price_eur, market_value_eur}` aus `portfolio_securities` + `securities` inkl. FX-Konvertierung
   b) [x] Reuse vorhandene FX/Nominal-Konvertierung aus Portfolio-Logik für `get_security_snapshot`
      - Datei: `custom_components/pp_reader/logic/portfolio.py`
      - Abschnitt/Funktion: Bestehende EUR-Normalisierungsfunktionen referenzieren/auslagern
      - Ziel: Sicherstellen, dass Snapshot-Werte mit Portfolio-Bewertungen identisch berechnet werden
   c) [x] Ergänze Tests für `get_security_snapshot` mit gemischten Währungsportfolios
      - Datei: `tests/test_db_access.py`
      - Abschnitt/Funktion: Neuer Testfall `test_get_security_snapshot_multicurrency`
      - Ziel: Validiert Aggregation, FX-Konvertierung und Fehlerpfad für unbekannte UUIDs

2. Backend: WebSocket API erweitern
   a) [x] Registriere neuen Handler `ws_get_security_snapshot`
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt/Funktion: Neuer `@websocket_api.websocket_command` für Typ `pp_reader/get_security_snapshot`
      - Ziel: Validiert Payload, ruft `get_security_snapshot` via Executor und sendet Snapshot-Resultat
   b) [x] Entferne Feature-Flag-Gating für `pp_reader/get_security_history`
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt/Funktion: Handler `ws_get_security_history`
      - Ziel: Historien-Endpunkt ist standardmäßig aktiv und liefert Fehler nur bei fehlenden Daten
   c) [x] Passe Feature-Flag-Defaults an, so dass `pp_reader_history` nicht mehr existiert
      - Dateien: `custom_components/pp_reader/__init__.py`, `custom_components/pp_reader/feature_flags.py`
      - Abschnitt/Funktion: Feature-Flag-Initialisierung und Defaults
      - Ziel: Entfernt Flag-Definition und Initialisierung; History gilt als Kernfunktion
   d) [ ] Bereinige Doku- und Beispielreferenzen auf `pp_reader_history`
      - Dateien: `ARCHITECTURE.md`, `README-dev.md`
      - Abschnitt/Funktion: Feature-Flag-Beschreibungen, Tabellen
      - Ziel: Dokumentation aktualisieren, dass History dauerhaft aktiv ist
   e) [ ] Ergänze WebSocket-Tests für Snapshot-Endpoint und History ohne Flag
      - Dateien: `tests/test_ws_security_history.py`, `tests/test_ws_portfolios_live.py` (falls Interaktion)
      - Abschnitt/Funktion: Neue Tests für Erfolgs- und Fehlerpfade (`test_ws_security_snapshot_success`, `test_ws_security_snapshot_missing`)
      - Ziel: Sicherstellen, dass Snapshot-Handler und History-Handler ohne Flag funktionieren

3. Frontend: API-Schicht aktualisieren
   a) [ ] Ergänze `fetchSecuritySnapshotWS` und `fetchSecurityHistoryWS`
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js`
      - Abschnitt/Funktion: WebSocket-Hilfsfunktionen
      - Ziel: Liefert Promise-basierte Wrapper für neue/aktualisierte Backend-Kommandos
   b) [ ] Entferne Feature-Flag-Abfragen für History-Fetches
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/api.js`
      - Abschnitt/Funktion: Bestehende History-Helper
      - Ziel: History-Aufrufe erfolgen ohne Flag-Prüfung, Fehler werden clientseitig abgefangen

4. Frontend: Dashboard-Tab-Verwaltung refaktorieren
   a) [ ] Ersetze statisches `tabs`-Array durch Registry mit dynamischen Detail-Tabs
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
      - Abschnitt/Funktion: Tab-Initialisierung und Navigation
      - Ziel: Ermöglicht Hinzufügen/Entfernen von Security-Detail-Tabs und entfernt Test-Tab
   b) [ ] Implementiere `openSecurityDetail(securityUuid)` und `closeSecurityDetail(securityUuid)`
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
      - Abschnitt/Funktion: Neue Controller-Funktionen
      - Ziel: Initialisiert Tab-Eintrag, wechselt Navigation und räumt bei Schließen auf
   c) [ ] Synchronisiere Navigationspfeile und Swipe-Gesten mit dynamischen Tabs
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
      - Abschnitt/Funktion: Navigation/Carousel-Handling
      - Ziel: Konsistente UX zwischen Overview- und Detail-Tabs
   d) [ ] Optional: Begrenze gleichzeitige Detail-Tabs auf einen Eintrag pro Security UUID
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
      - Abschnitt/Funktion: Tab-Registry-Verwaltung
      - Ziel: Verhindert Tab-Flut bei wiederholtem Öffnen derselben Security

5. Frontend: Overview-Interaktionen erweitern
   a) [ ] Delegiere Klicks auf `.positions-container tr[data-security]`
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
      - Abschnitt/Funktion: Event-Listener nach Lazy-Load
      - Ziel: Öffnet Security-Detail-Tab und ignoriert Klicks auf Expand/Collapse-Buttons
   b) [ ] Stelle sicher, dass `portfolioPositionsCache` Security-Daten bereitstellt
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
      - Abschnitt/Funktion: Cache-Verwaltung
      - Ziel: Übergibt Snapshot-Daten oder löst Fallback-Fetch über Dashboard-Controller aus

6. Frontend: Security-Detail-Renderer implementieren
   a) [ ] Lege neue Datei `security_detail.js` mit `renderSecurityDetail` & `registerSecurityDetailTab` an
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Neuer Renderer und Tab-Registrierung
      - Ziel: Baut Header, lädt Daten, verbindet mit Navigation
   b) [ ] Render Header-Karten (Name, Currency, Holdings, Last Price in Originalwährung, Market Value in EUR) mit vorhandenen Formattern
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Header-Rendering
      - Ziel: Konsistentes Kartenlayout zur Overview und zeigt Währungsinformationen korrekt an
   c) [ ] Baue Infoleiste oberhalb des Charts, die Gesamtgewinn/-verlust für Zeitraum und letzten Tag in EUR anzeigt
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Rendering & Datenaggregation für Infoleiste
      - Ziel: Verbindet Kursbewegungen in Originalwährung mit Portfolioauswirkung in EUR
   d) [ ] Implementiere Range-Buttons (1M, 6M, 1Y default, 5Y)
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: State-Management für Range-Auswahl
      - Ziel: Löst History-Fetch aus, markiert aktive Range und cached Antworten pro Range
   e) [ ] Baue Fehler- und Empty-State-Anzeige bei fehlender History
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Fehlerbehandlung
      - Ziel: Zeigt freundliche Nachricht statt Chart bei fehlenden Daten
   f) [ ] Invaldiere Range-Caches bei Live-Updates des aktiven `security_uuid`
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Subscription auf Push-Events
      - Ziel: Sicherstellt aktuelle Chartdaten nach Preis-Updates
   g) [ ] Räum Listener beim Schließen des Tabs auf
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Cleanup/Destroy-Routine
      - Ziel: Verhindert Speicherlecks bei Tab-Wechsel

7. Frontend: Chart-Helfer bereitstellen
   a) [ ] Erstelle `charting.js` mit Lightweight-SVG-Line-Chart und Tooltip
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/content/charting.js`
      - Abschnitt/Funktion: Neue Utility-Funktionen (`renderLineChart`, `updateLineChart`)
      - Ziel: Visualisiert Kursverlauf ohne externe Dependencies
   b) [ ] Ergänze Styles für Chart-Container, Buttons, Tooltip
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`
      - Abschnitt/Funktion: Neuer Style-Block für Security-Detail-Karten
      - Ziel: Konsistentes Erscheinungsbild mit bestehendem Dashboard-Styling

8. State- und Cache-Management
   a) [ ] Cache History-Daten pro Range und Security im Frontend
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/security_detail.js`
      - Abschnitt/Funktion: Lokaler State/Cache
      - Ziel: Verhindert redundante WebSocket-Aufrufe bei Range-Wechseln
   b) [ ] Optional: Persistiere letzte aktive Range pro Security während Session
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
      - Abschnitt/Funktion: Tab-State-Verwaltung
      - Ziel: UX-Verbesserung bei erneutem Öffnen derselben Security

9. Dokumentation & Änderungsnachverfolgung
   a) [ ] Ergänze README-dev.md um Navigationsfluss und neue Backend-APIs
      - Datei: `README-dev.md`
      - Abschnitt/Funktion: Dashboard-/WebSocket-Beschreibung
      - Ziel: Entwicklerdoku deckt Security-Detail-Tab vollständig ab
   b) [ ] Ergänze CHANGELOG.md mit Eintrag zum Security-Detail-Tab
      - Datei: `CHANGELOG.md`
      - Abschnitt/Funktion: Aktueller Unreleased-Block
      - Ziel: Sichtbarkeit der neuen Funktion im Release-Prozess
   c) [ ] Dokumentiere manuelle Testfälle in `.docs` (z.B. `manual_test_security_detail.md`)
      - Datei: `.docs/manual_test_security_detail.md` (neu)
      - Abschnitt/Funktion: Testfallbeschreibung
      - Ziel: Liste von Validierungsschritten (Tab öffnen, Range wechseln, fehlende Daten)

10. Tests & Validierung
    a) [ ] Aktualisiere `tests/test_ws_security_history.py` für Range-Varianten (1M, 6M, 1Y, 5Y)
       - Datei: `tests/test_ws_security_history.py`
       - Abschnitt/Funktion: Bestehende Testklasse erweitern
       - Ziel: Sicherstellen, dass Backend Start/Ende korrekt berechnet und Antworten cached
    b) [ ] Ergänze Frontend-Test (falls Harness vorhanden) oder dokumentiere manuelle Swipe/Pfeil-Prüfung
       - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/__tests__/dashboard.test.js` (falls vorhanden) oder `.docs/manual_test_security_detail.md`
       - Abschnitt/Funktion: Navigationstestfälle
       - Ziel: Verifiziert Navigation zwischen Overview- und Detail-Tabs
    c) [ ] Führe vollständige Pytest-Suite aus
       - Kommando: `pytest`
       - Ziel: Regressionen vermeiden
    d) [ ] Optional: Starte `./scripts/lint` für konsistente Formatierung
       - Kommando: `./scripts/lint`
       - Ziel: Lint-Compliance sicherstellen

11. Nacharbeiten & Aufräumen
    a) [ ] Entferne Verweise auf das frühere Test-Tab in Code und Assets
       - Dateien: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`, zugehörige Templates/Strings
       - Abschnitt/Funktion: Tab-Registrierung und Übersetzungen
       - Ziel: Kein Legacy-Test-Tab mehr sichtbar
    b) [ ] Bereinige ungenutzte Imports nach Refactoring
       - Dateien: Alle betroffenen JS/Python-Dateien
       - Abschnitt/Funktion: Kopfbereiche der Dateien
       - Ziel: Sauberer Build ohne Lint-Warnungen

12. Optionale Optimierungen
    a) [ ] Optional: Implementiere Throttling für Chart-Tooltip-Mousemove-Ereignisse
       - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/content/charting.js`
       - Abschnitt/Funktion: Event-Handler
       - Ziel: Performance bei großen Datensätzen verbessern
    b) [ ] Optional: Lazy-Load von `charting.js`, wenn erster Detail-Tab geöffnet wird
       - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.js`
       - Abschnitt/Funktion: Module-Ladepfad
       - Ziel: Initiale Dashboard-Ladezeit gering halten
