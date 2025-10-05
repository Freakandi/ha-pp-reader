# Promptvorlage: ToDo-Checkliste aus security_detail_header_refresh.md ableiten

**Ziel:**
Erzeuge eine detaillierte, umsetzungsfertige ToDo-Liste für die Umsetzung/Implementierung der nächsten Entwicklungsziele, basierend auf den Festlegungen in [.docs/security_detail_header_refresh.md](.docs/security_detail_header_refresh.md).

**Vorgehen:**
1. Scanne das gesamte Dokument [.docs/security_detail_header_refresh.md](.docs/security_detail_header_refresh.md) und extrahiere alle expliziten und impliziten Anpassungspunkte (Backend, Frontend, Doku).
2. Zerlege jeden Anpassungspunkt in einen klaren, atomaren ToDo-Item (eine Änderung pro Punkt).
3. Formuliere jeden Punkt so, dass er ohne weitere Rückfragen direkt umgesetzt werden kann (inkl. Dateipfad, Funktion/Abschnitt, Ziel der Änderung).
4. Markiere optionale oder nachgelagerte Optimierungen explizit als solche.
5. Die Checkliste muss alle notwendigen Code-, Test- und Doku-Änderungen enthalten, um das Zielkonzept vollständig und konsistent umzusetzen.
6. Die Checkliste soll als neue TODO_security_detail_header_refresh.md im Ordner .docs abgelegt werden.

**Format:**
- Nummerierte Hauptpunkte (1., 2., …)
- Unterpunkte für Teilschritte (a), b), …)
- Für jeden Punkt:
  - [ ] Kurzbeschreibung der Änderung
  - Dateipfad(e)
  - Betroffene Funktion(en)/Abschnitt(e)
  - Ziel/Ergebnis der Änderung

**Beispiel:**

1. Backend: On-Demand Aggregation implementieren
   a) [ ] Neue Funktion `fetch_live_portfolios` anlegen
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Ziel: Aggregiert aktuelle Portfolio-Werte aus DB (mit `securities.last_price`)
   b) [ ] WebSocket-Handler `ws_get_portfolio_data` anpassen
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Ziel: Liefert Portfolio-Daten via `fetch_live_portfolios` statt Coordinator-Snapshot
   c) [ ] WebSocket-Handler `ws_get_dashboard_data` anpassen
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Ziel: Liefert Portfolio-Daten via `fetch_live_portfolios`

2. Frontend: Override-Cache entfernen
   a) [ ] Entferne Anwendung des Override-Caches beim Rendern
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
      - Ziel: Keine Anwendung von `__ppReaderPortfolioValueOverrides` mehr
   b) [ ] Entferne Setzen und Löschen des Override-Caches
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js`
      - Ziel: Kein Schreiben/Löschen von `__ppReaderPortfolioValueOverrides` mehr

3. Frontend: Positionsdetails lazy belassen
   a) [ ] Sicherstellen, dass Positionsdaten weiterhin nur bei Expand geladen werden
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/tabs/overview.js`
      - Ziel: Keine Änderung am Lazy-Load-Verhalten

4. Doku & Changelog
   a) [ ] Abschnitt "Berechnungsmodell" in `ARCHITECTURE.md` ergänzen
      - Datei: `ARCHITECTURE.md`
      - Ziel: Datenfluss (On-Demand Aggregation, kein Override-Cache) dokumentieren
   b) [ ] Changelog-Eintrag für die Änderung ergänzen
      - Datei: `CHANGELOG.md`
      - Ziel: Migration auf DB-basierte Aggregation, Entfall Override-Cache

5. Tests & Validierung
   a) [ ] Manuelle Tests: Preisänderung → Reload Panel → Werte aktuell
      - Ziel: Validierung der neuen Datenkonsistenz
   b) [ ] Sicherstellen, dass keine Referenzen auf `__ppReaderPortfolioValueOverrides` mehr existieren
      - Ziel: Vollständige Entfernung des Override-Caches
**Ende des Beispiels**

**Hinweis:**
Optionale Optimierungen (z.B. Micro-Caching für Positionsabrufe) als "Optional" kennzeichnen und ans Ende der Liste setzen.
