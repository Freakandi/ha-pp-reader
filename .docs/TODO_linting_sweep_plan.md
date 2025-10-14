# TODO – Linting Sweep

Legende: [ ] offen | [x] erledigt (Status wird im Verlauf gepflegt)

## 0. Vorbereitung & Baseline

0. a) [x] Umgebung vorbereiten
       - `./scripts/setup_container` (falls noch nicht geschehen) und `pip install -r requirements-dev.txt`
       - `npm install`
       - Ziel: Sicherstellen, dass alle Lint-Kommandos lauffähig sind.

0. b) [ ] Python-Lint-Baseline erfassen
       - Kommando: `./scripts/lint`
       - Artefakt: Sammeln aller offenen `ruff`-Fehlermeldungen (gern als Markdown-Tabelle).
       - Ziel: Ausgangslage dokumentiert; automatische Fixes angewandt.

0. c) [ ] Frontend-Lint-Baseline erfassen
       - Kommandos: `npm run lint:ts`, `npm run typecheck`
       - Artefakt: Übersicht der offenen ESLint-/TS-Fehler (inkl. Dateipfade & Regel-IDs).
       - Ziel: Ausgangslage dokumentiert.

## 1. Python Backend (`custom_components/pp_reader/`)

1. a) [ ] Utilities & Shared Modules
       - Scope: `custom_components/pp_reader/util/`, `helpers.py`, `const.py`
       - Ziel: `ruff check custom_components/pp_reader/util custom_components/pp_reader/helpers.py custom_components/pp_reader/const.py` fehlerfrei.

1. b) [ ] Datenzugriff & Events
       - Scope: `custom_components/pp_reader/data/`
       - Ziel: Keine `ruff`-Fehler mehr in diesem Paket; besondere Aufmerksamkeit für `F`-, `E`- und `W`-Klassen.

1. c) [ ] Logik & Preise
       - Scope: `custom_components/pp_reader/logic/`, `custom_components/pp_reader/prices/`
       - Ziel: `ruff`-Konformität sicherstellen, inkl. Tests der Normalisierungshelfer.

1. d) [ ] Integrationseinbindung & Flow
       - Scope: `custom_components/pp_reader/__init__.py`, `coordinator.py`, `config_flow.py`, `manifest_validator.py`
       - Ziel: `ruff` meldet keine Fehler; Imports und Logger folgen Konventionen.

1. e) [ ] Weitere Backend-Module
       - Scope: Alle verbleibenden Python-Dateien unter `custom_components/pp_reader/` (z. B. `services.py`, `models.py`)
       - Ziel: `ruff check custom_components/pp_reader` ohne Befund.

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
