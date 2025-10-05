1. Backend: Snapshot enrichment for purchase and close data
   a) [x] Extend `get_security_snapshot` to join purchase aggregates and last close values
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt: Funktion `get_security_snapshot`
      - Ziel: Liefert zusätzliche Felder `purchase_value_eur`, `average_purchase_price_native`, `last_close_native` (inkl. EUR-Konvertierung bei Bedarf)
   b) [x] Implementiere Hilfsabfrage für vorherigen Schlusskurs
      - Datei: `custom_components/pp_reader/data/db_access.py`
      - Abschnitt: Neuer Helper z.B. `fetch_previous_close`
      - Ziel: Liefert den letzten Schlusskurs (`last_close_native`) für die Berechnung der Tagesänderung
   c) [x] Ergänze Snapshot-Serialisierung um neue Felder
      - Datei: `custom_components/pp_reader/data/websocket.py`
      - Abschnitt: Handler `ws_get_security_snapshot`
      - Ziel: Stellt sicher, dass die erweiterten Snapshot-Daten im WebSocket-Payload erscheinen
   d) [x] Schreibe/aktualisiere Tests für Snapshot-Edge-Cases
      - Datei: `tests/custom_components/pp_reader/data/test_db_access.py`
      - Abschnitt: Neue/erweiterte Tests für `get_security_snapshot`
      - Ziel: Prüft Null-Bestände, fehlende Käufe und fehlenden Schlusskurs

2. Frontend: Typ- und Snapshot-Verarbeitung erweitern
   a) [x] Ergänze Snapshot-Typdefinitionen um neue Felder
      - Datei: `src/tabs/types.ts`
      - Abschnitt: Typen `SecuritySnapshotLike`, verwandte Interfaces
      - Ziel: Typisierte Felder für Kaufwerte, Durchschnittskurs und Schlusskurs bereitstellen
   b) [ ] Cache erweiterten Snapshot und berechne statische Metriken
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: `renderSecurityDetail` bzw. neue Helper (z.B. `ensureSnapshotMetrics`)
      - Ziel: Tages- und Gesamtänderungen (EUR/%), Durchschnittskurs und Währungswerte einmalig aus Snapshot ableiten
   c) [ ] Lagere Berechnung in pure Helper-Funktionen aus
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: Neue Helper-Funktionen für EUR-/Prozentberechnungen
      - Ziel: Wiederverwendbare Berechnungsschritte mit Guarding gegen Null-Bestände

3. Frontend: Range-Handling und Header-Rendering anpassen
   a) [ ] Range-Selector um Option `ALL` erweitern
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: Konstante `AVAILABLE_HISTORY_RANGES`, Funktion `resolveRangeOptions`, Button-Rendering
      - Ziel: Ermöglicht volle Historie ohne `start_date`-Filter
   b) [ ] Sicherstellen, dass Headerwerte range-unabhängig bleiben
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: `updateInfoBarContent` und State-Management
      - Ziel: Info-Bar reagiert auf Range; Header nutzt statische Snapshot-Metriken
   c) [ ] Header-Metadatenlayout auf neue Struktur umstellen
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: Funktion `buildHeaderMeta`
      - Ziel: Zeigt Letzten Preis, Tagesänderung, Gesamtänderung, Bestand, Marktwert mit passenden Styles

4. Frontend: Chart-Baseline hinzufügen
   a) [ ] `renderLineChart` um `baseline`-Option erweitern
      - Datei: `src/content/charting.ts`
      - Abschnitt: Funktionen `renderLineChart`, `updateLineChart`
      - Ziel: Zeichnet horizontale Linie auf Durchschnittskursniveau und entfernt sie bei fehlenden Daten
   b) [ ] Chart-Aufruf im Security-Detail mit Baseline versorgen
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: Chart-Initialisierung und -Update
      - Ziel: Übermittelt berechnete Durchschnittskurslinie an Chart-Funktionen

5. Styling: Header- und Baseline-Darstellung anpassen
   a) [ ] Grid-Layout und Typografie des Header-Cards aktualisieren
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`
      - Abschnitt: Selektoren für Security-Header-Karten
      - Ziel: Gruppenlayout, Responsive-Anpassungen und Gain-Farben implementieren
   b) [ ] Styling für Chart-Baseline ergänzen
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/css/cards.css`
      - Abschnitt: Neuer Selektor für Baseline/Dash-Linie (ggf. globaler Chart-Abschnitt)
      - Ziel: Dezente Darstellung der Durchschnittskurs-Linie sicherstellen

6. Dokumentation & Kommunikation
   a) [ ] Konzeptdokument mit Umsetzungshinweisen aktualisieren
      - Datei: `.docs/security_detail_header_refresh.md`
      - Abschnitt: Ergänzung "Implementation" bzw. Hinweis auf Fertigstellung
      - Ziel: Status und Learnings dokumentieren
   b) [ ] Changelog-Eintrag zur UI-Anpassung hinzufügen
      - Datei: `CHANGELOG.md`
      - Abschnitt: Neuer Eintrag unter "Unreleased"
      - Ziel: Benutzer über erweiterten Header, ALL-Range und Baseline informieren

7. Tests & Validierung
   a) [ ] Frontend-Build/Linting ausführen
      - Befehl: `npm run lint`
      - Ziel: Statische Prüfung der TypeScript-/CSS-Anpassungen
   b) [ ] Python-Test-Suite laufen lassen
      - Befehl: `pytest`
      - Ziel: Sicherstellen, dass Backend-Änderungen korrekt funktionieren
   c) [ ] Manuelle Validierung der Oberfläche
      - Schritte: Start `./scripts/develop`, Security-Detail öffnen, Range-Wechsel testen, Baseline-Sichtbarkeit prüfen
      - Ziel: UI-Verhalten und Datenkonsistenz bestätigen

8. Optional: Performance-Optimierungen
   a) [ ] Optionale Cache-Schicht für ALL-Historie evaluieren
      - Datei: `src/tabs/security_detail.ts`
      - Abschnitt: Historien-Fetch/State-Management
      - Ziel: Wiederholte Vollabfragen reduzieren, falls nötig
