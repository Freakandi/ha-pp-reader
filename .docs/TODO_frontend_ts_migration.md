1. Toolchain bootstrap
   a) [x] Extend Node dependencies and scripts for TypeScript workflow
      - Datei: `package.json`
      - Abschnitt: `dependencies`, `devDependencies`, `scripts`
      - Ziel: Füge TypeScript, Vite/Rollup, ESLint (TS Plugin) hinzu und richte `npm run build`, `npm run dev`, `npm run typecheck`, `npm run lint:ts` ein.
   b) [x] Sperre Node-Version und Projekt-Metadaten für den neuen Build
      - Datei: `package.json`
      - Abschnitt: `engines`, Projektbeschreibung
      - Ziel: Stelle sicher, dass die erforderliche Node-Version und Hinweise zur TypeScript-Buildpipeline dokumentiert sind.
   c) [x] Lege TypeScript-Konfiguration an
      - Datei: `tsconfig.json` (neu)
      - Abschnitt: Compileroptionen
      - Ziel: Aktiviere Strict-Modus, ESM-Ausgabe, Source-Maps und passende Pfade für bundlergesteuerte Ausgabe.
   d) [x] Richte Vite/Rollup Konfiguration ein
      - Datei: `vite.config.mjs` (neu)
      - Abschnitt: Exportierte Config
      - Ziel: Definiere Entry `src/dashboard.ts`, Ausgabepfad `custom_components/pp_reader/www/pp_reader_dashboard/js/`, Cache-Busting Hash und Source-Map-Generierung.
   e) [x] Ergänze ESLint-Konfiguration für TypeScript
      - Datei: `.eslintrc.cjs` (neu oder aktualisiert)
      - Abschnitt: Parser, Plugins, Overrides für TypeScript
      - Ziel: Linting-Regeln für das neue TypeScript-Quellverzeichnis bereitstellen.

2. TypeScript-Quellstruktur anlegen
   a) [x] Erstelle `src/` Verzeichnis spiegelnd zum bisherigen `js/`
      - Datei: `src/` (neu, Struktur nach `custom_components/pp_reader/www/pp_reader_dashboard/js/`)
      - Abschnitt: Alle Module (`dashboard`, `data`, `interaction`, `content` etc.)
      - Ziel: Kopiere bestehende Logik unverändert als `.ts` Dateien, um später schrittweise zu typisieren.
   b) [x] Richte TypeScript-Einstiegspunkte ein
      - Dateien: `src/dashboard.ts`, `src/panel.ts` (neu)
      - Abschnitt: Exporte & Initialisierung
      - Ziel: Spiegele Verhalten von `dashboard.js` und `panel.js`, sodass Bundler einen konsistenten Einstieg hat.
   c) [x] Ergänze Re-Exports für bestehende Tabs und Utilities
      - Dateien: `src/dashboard/index.ts`, `src/dashboard/tabs/*.ts`, `src/data/*.ts`
      - Abschnitt: Modul-Exporte
      - Ziel: Bewahre bestehende öffentliche APIs, damit importierende Module unverändert funktionieren.

3. Typisierungsgrundlagen schaffen
   a) [ ] Definiere Home Assistant spezifische Typ-Deklarationen
      - Datei: `src/types/home-assistant.d.ts` (neu)
      - Abschnitt: Schnittstellen für `hass`, Panels, WebSocket-Strukturen
      - Ziel: Statische Typen für häufig genutzte Objekte bereitstellen und unbekannte Felder über optionale Properties erlauben.
   b) [ ] Ergänze globale Fenstererweiterungen
      - Datei: `src/types/global.d.ts` (neu)
      - Abschnitt: `declare global { interface Window { ... } }`
      - Ziel: Formalisiere bisherige `window.__ppReader...` Zugriffe für TypeScript-Striktheit.
   c) [ ] Generiere Deklarationsdateien beim Build
      - Datei: `tsconfig.json`
      - Abschnitt: `declaration`, `emitDeclarationOnly` (für separates Kommando)
      - Ziel: Stelle `.d.ts` Artefakte für Editor-Unterstützung bereit.

4. Build-Output an das bestehende Frontend anbinden
   a) [ ] Aktualisiere `dashboard.module.js` auf bundlergenerierten Specifier
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js`
      - Abschnitt: `export * from` Zeile
      - Ziel: Lass den Build-Prozess Hash/Version-Parameter automatisch setzen.
   b) [ ] Ergänze Post-Build-Skript zur Aktualisierung des Modul-Pfads
      - Datei: `scripts/update_dashboard_module.mjs` (neu) oder Bundler-Plugin
      - Abschnitt: Skript-Hauptfunktion
      - Ziel: Schreibt nach jedem Build den neuen Dateinamen/Hash in `dashboard.module.js`.
   c) [ ] Stelle sicher, dass `panel.js` weiterhin funktional bleibt
      - Datei: `custom_components/pp_reader/www/pp_reader_dashboard/panel.js`
      - Abschnitt: Importstatement & Initialisierung
      - Ziel: Prüfe und passe ggf. den Importpfad auf das bundlergenerierte Modul an, ohne öffentliches API zu ändern.
   d) [ ] Entferne obsolete JavaScript-Quellversionen nach erfolgreicher Migration
      - Dateien: `custom_components/pp_reader/www/pp_reader_dashboard/js/**/*.js` (Quellkopien)
      - Abschnitt: Nicht mehr verwendete Module
      - Ziel: Verlasse ausschließlich generierte Artefakte im `js/` Verzeichnis.

5. TypeScript-Refactor & Striktheitsverbesserungen
   a) [ ] Portiere WebSocket-API mit starken Typen
      - Datei: `src/data/api.ts`
      - Abschnitt: Anfrage-/Antwortfabriken
      - Ziel: Ersetze dynamische `any` Checks durch typed Interfaces für Nachrichten und `entry_id` Handling.
   b) [ ] Typisiere Update-Handler und DOM-Utilities
      - Datei: `src/data/updateConfigsWS.ts`, `src/content/elements.ts`
      - Abschnitt: Fenster-Caches, DOM-Manipulationen
      - Ziel: Nutze strukturierte Interfaces und vermeide untypisierte `window`-Zugriffe.
   c) [ ] Überführe Tab-Controller in typisierte Module
      - Dateien: `src/tabs/**/*.ts`
      - Abschnitt: Tab-Factories, Lifecycle-Funktionen
      - Ziel: Definiere klare Typsignaturen für Parameter (z.B. Portfolio-Daten, Event-Handler).
   d) [ ] Beseitige `any`/`unknown` in Kernmodulen mit sinnvollen Typ-Guards
      - Dateien: `src/dashboard/index.ts`, `src/dashboard.ts`
      - Abschnitt: State-Management, Event-Hooks
      - Ziel: Erreiche strikte Typprüfung ohne Laufzeitverhalten zu ändern.

6. Build- und Lint-Integration in Repository-Workflows
   a) [ ] Ergänze npm-Skripte in Dokumentation der Entwickler-Workflows
      - Datei: `README-dev.md`
      - Abschnitt: Setup/Development Steps
      - Ziel: Beschreibe Installation, `npm run dev`, `npm run build`, `npm run typecheck`, Lint-Befehle.
   b) [ ] Aktualisiere Projekt-Dokumentation zur TypeScript-Migration
      - Datei: `.docs/frontend_ts_migration.md`
      - Abschnitt: Abschließende Hinweise oder Status
      - Ziel: Dokumentiere Fortschritt, ggf. verweise auf neue TODO-Liste.
   c) [ ] Dokumentiere Source-Map Nutzung und Debugging-Hinweise
      - Datei: `README-dev.md`
      - Abschnitt: Debugging
      - Ziel: Erkläre, wie Entwickler Source-Maps im Browser verwenden.

7. CI- und Testabsicherung
   a) [ ] Ergänze CI-Workflow für Node-Build und Typprüfung
      - Datei: `.github/workflows/<name>.yml` (neu oder bestehend erweitern)
      - Abschnitt: Jobs für `npm ci`, `npm run build`, `npm run typecheck`, `npm run lint:ts`
      - Ziel: Sicherstellen, dass TypeScript-Pipeline auf CI ausgeführt wird.
   b) [ ] Implementiere Smoke-Tests für generiertes Dashboard
      - Datei: `tests/frontend/test_dashboard_smoke.py` (neu) oder `tests/frontend/test_dashboard.spec.ts`
      - Abschnitt: Testfälle für DOM-Output
      - Ziel: Verifiziere, dass gerenderte DOM-Strukturen und Events weiterhin wie erwartet funktionieren (z.B. mit jsdom oder Playwright).
   c) [ ] Ergänze Bundle-Integritätsprüfung
      - Datei: `tests/frontend/test_build_artifacts.py` (neu)
      - Abschnitt: Assertions zu existierenden Artefakten
      - Ziel: Testet, dass `dashboard.js` & Begleit-Chunks im `www` Verzeichnis vorhanden sind.

8. Validierung & Release-Vorbereitung
   a) [ ] Führe `npm run build` und `npm run typecheck` lokal aus
      - Ziel: Validierung, dass neue Toolchain fehlerfrei arbeitet und Artefakte erzeugt.
   b) [ ] Starte Home Assistant Dev-Server und prüfe Dashboard-Funktionalität
      - Datei/Tool: `./scripts/develop`
      - Ziel: Manuelle Regressionstests (Tabs, WebSocket-Updates, DOM-Interaktionen).
   c) [ ] Aktualisiere `CHANGELOG.md` mit TypeScript-Migrationshinweis
      - Datei: `CHANGELOG.md`
      - Abschnitt: Unreleased / aktuelles Release
      - Ziel: Dokumentiere Einführung der TypeScript-Buildkette und gleichbleibendes Verhalten.
   d) [ ] Ergänze Hinweise im `README.md` zu neuen Build-Schritten
      - Datei: `README.md`
      - Abschnitt: Installation/Entwicklung
      - Ziel: Endanwender und Entwickler über nötige Schritte informieren.

9. Optional: Nachgelagerte Optimierungen
   a) [ ] Evaluieren der Veröffentlichung lokaler Typdefinitionen
      - Datei: `package.json`, evtl. `types/`
      - Abschnitt: `types` Feld
      - Ziel: Optionales Bereitstellen der `.d.ts` Dateien für externe Nutzung.
   b) [ ] Mikro-Bundle-Analyse durchführen
      - Datei/Tool: Bundler-Report (z.B. `rollup-plugin-visualizer`)
      - Ziel: Optional Optimierungen für Bundle-Größe identifizieren.
   c) [ ] Einrichtung eines Watch-basierten Hot-Reload-Workflows in Home Assistant
      - Datei: `vite.config.mjs`, `package.json`
      - Ziel: Optional schnellere lokale Iteration durch Proxy/Reload.
