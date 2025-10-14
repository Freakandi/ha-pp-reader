# TODO – Linting Sweep

Legende: [ ] offen | [x] erledigt (Status wird im Verlauf gepflegt)

## 0. Vorbereitung & Baseline

0. a) [x] Umgebung vorbereiten
       - `./scripts/setup_container` (falls noch nicht geschehen) und `pip install -r requirements-dev.txt`
       - `npm install`
       - Ziel: Sicherstellen, dass alle Lint-Kommandos lauffähig sind.

0. b) [x] Python-Lint-Baseline erfassen
       - Kommando: `./scripts/lint` (2025-02-15 – 1 705 Findings verbleiben, 7 Auto-Fixes)
       - Artefakt: Aktuelle Regelverteilung in `.docs/linting_sweep_plan.md` ergänzt.
       - Ziel: Ausgangslage dokumentiert; automatische Fixes angewandt.

0. c) [x] Frontend-Lint-Baseline erfassen
       - `npm run lint:ts` (2025-02-15 – 289 Fehler; dominant: `@typescript-eslint/no-unnecessary-condition` mit 159 Meldungen)
       - `npm run typecheck` (läuft fehlerfrei durch)
       - Hotspots: `src/tabs/overview.ts` (50), `src/content/charting.ts` (48), `src/tabs/security_detail.ts` (47), `src/dashboard.ts` (36), `src/data/updateConfigsWS.ts` (30)

## 1. Python Backend (`custom_components/pp_reader/`)

1. a) [x] Utilities & Shared Modules
       - Scope: `custom_components/pp_reader/util/`, `helpers.py`, `const.py`
       - Ziel: `ruff check custom_components/pp_reader/util custom_components/pp_reader/helpers.py custom_components/pp_reader/const.py` fehlerfrei.

1. b) [x] Datenzugriff & Events
       - Scope: `custom_components/pp_reader/data/`
       - Ziel: Keine `ruff`-Fehler mehr in diesem Paket; besondere Aufmerksamkeit für `F`-, `E`- und `W`-Klassen.

1. c) [x] Logik & Preise
       - Scope: `custom_components/pp_reader/logic/`, `custom_components/pp_reader/prices/`
       - Ziel: `ruff`-Konformität sicherstellen, inkl. Tests der Normalisierungshelfer.

1. d) [x] Integrationseinbindung & Flow
       - Scope: `custom_components/pp_reader/__init__.py`, `coordinator.py`, `config_flow.py`, `manifest_validator.py`
       - Ziel: `ruff` meldet keine Fehler; Imports und Logger folgen Konventionen.

1. e1) [x] Wechselkurs-Client & Währungstabellen
       - Scope: `custom_components/pp_reader/currencies/`
       - Ziel: `ruff check custom_components/pp_reader/currencies` ohne Befund; insbesondere verschachtelte `async with`-Blöcke in `fx.py` auflösen.

1. e2) [x] Feature-Flags
       - Scope: `custom_components/pp_reader/feature_flags.py`
       - Ziel: Typimporte in TYPE_CHECKING-Blöcke verschieben und verbleibende `ruff`-Warnungen beseitigen.

## 2. Python Tests & Scripts

2. a) [ ] Testsuite
       - Scope: `tests/`
       - Ziel: `ruff check tests` fehlerfrei; ggf. pytest-spezifische Regeln (`PT`, `PLR`) berücksichtigen.

2. b) [ ] Hilfsskripte
       - Scope: `scripts/`, Wurzel-Python-Dateien
       - Ziel: `ruff check scripts *.py` ohne Verstöße; Skriptdokumentation ergänzen falls nötig.

## 3. Frontend TypeScript (`src/`)

3. a) [ ] Utilities & Typdefinitionen
       - Scope: `src/utils/`, `src/types/`
       - Ziel: `npm run lint:ts -- src/utils src/types` sowie `npm run typecheck` ohne Fehler in diesen Verzeichnissen.

3. b) [ ] Datenebene & Interaktionen
       - Scope: `src/data/`, `src/interaction/`
       - Ziel: ESLint/TS-Fehler behoben; ggf. `async`-Versprechen sauber behandelt.

3. c) [ ] Panel-Einstiegspunkt
       - Scope: `src/panel.ts`
       - Ziel: Linting/Typecheck ohne Fehler; DOM-Zugriffe und Event-Handler streng typisieren.

3. d) [ ] Dashboard-Komponenten
       - Scope: `src/dashboard/`
       - Ziel: Modulweise ESLint-Compliance sicherstellen, insbesondere bei dynamischen Layout-Berechnungen.

3. e) [ ] Tab-Ansichten
       - Scope: `src/tabs/`
       - Ziel: Tabs strikt typisieren, Swipe-/Navigation-Logik lint-frei halten.
       - 3.e.i) [ ] `src/tabs/overview.ts`
       - 3.e.ii) [ ] `src/tabs/security_detail.ts`
       - 3.e.iii) [ ] `src/tabs/types.ts`
       - 3.e.iv) [ ] `src/tabs/__tests__/`

3. f) [ ] Inhalts-Renderer & Charting
       - Scope: `src/content/`
       - Ziel: Render-Helfer und Charting-Module lint- und typecheck-konform überführen.

3. g) [ ] Frontend-Tests
       - Scope: `src/**/__tests__` und `.test.ts`
       - Ziel: ESLint-Ausnahmen begründet oder entfernt, TypeScript-Fehler beseitigt.


## 4. Abschlussarbeiten

4. a) [ ] Globale Verifikation
       - Kommandos: `./scripts/lint`, `npm run lint:ts`, `npm run typecheck`
       - Ziel: Alle Lints laufen ohne Fehler; Ergebnisse im Abschluss-Commit dokumentiert.

4. b) [ ] Workflow verankern
       - Aufgabe: README/README-dev aktualisieren (falls nötig), um den verpflichtenden Lint-Workflow festzuhalten.
       - Ziel: Entwickler*innen wissen, welche Kommandos vor jedem PR laufen müssen.

4. c) [ ] Optional: CI/Pre-Commit anpassen
       - Aufgabe: Falls noch nicht vorhanden, Lint-Kommandos in CI oder `pre-commit` integrieren.
       - Ziel: Künftige Regressionen werden automatisch erkannt.
