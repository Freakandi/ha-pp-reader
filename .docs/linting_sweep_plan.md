# Linting Sweep Plan

## Zielsetzung
Das Repository soll sowohl für den Python- als auch den TypeScript-Teil vollständig lint-konform werden. Die vorhandenen Toolchains sind:

- `ruff` (inklusive `ruff format`) für sämtliche Python-Dateien unter `custom_components/`, `scripts/` und `tests/`
- `npm run lint:ts` (ESLint) für das Dashboard unter `src/`
- `npm run typecheck` (TypeScript Compiler) als ergänzende statische Prüfung für das Frontend

Diese Planung beschreibt, wie wir systematisch alle bestehenden Verstöße erfassen, priorisieren und in mehreren Iterationen beheben.

## Vorgehensmodell

1. **Baseline herstellen und dokumentieren**
   - Repositoriespezifische Tooling-Skripte verwenden (`./scripts/lint`, `npm run lint:ts`, `npm run typecheck`).
   - Für jede Ausführung relevante Fehlermeldungen mit Datum/Commit notieren, um Fortschritt sichtbar zu machen.
   - Auto-Fixes (z. B. `ruff format`, `ruff check --fix`, ESLint `--fix`) vor manueller Arbeit anwenden, um triviale Verstöße früh auszuräumen.

2. **Priorisierung nach Schwere und Korrelation**
   - Kritische Fehlerklassen zuerst: `ruff`-Präfixe `F` (Runtime-Fehler), `E`/`W` (PEP8/Warnings), sowie TypeScript Fehler (TSxxx) und ESLint `error`-Schweregrad.
   - Danach Style- und Qualitätsregeln (`D`, `ANN`, `PERF`, …). Diese lassen sich gut paketweise pro Modulgruppe abarbeiten.

3. **Abarbeitung in Modulclustern**
   - Python: Gruppierung nach funktionalen Bereichen (`util`, `data`, `logic`, `prices`, `api`, `tests`). Das hält Kontextwechsel minimal und verhindert, dass eine Datei mehrfach geöffnet werden muss.
   - TypeScript: Clustern nach Schichten (`src/utils`, `src/data`, `src/tabs`, `src/components`, Tests). Innerhalb eines Clusters lassen sich ähnliche Regelverletzungen häufig in einem Schwung korrigieren.

4. **Dokumentation & Tracking**
   - Jede Task im ToDo-File erhält einen klaren Scope (Dateimenge + erwartete Fehlertypen) sowie Akzeptanzkriterien (alle lint-Kommandos laufen für den Scope fehlerfrei).
   - Nach Abschluss eines Tasks werden Ergebnisse im Commit- oder PR-Text referenziert und der Tracker mit `[x]` aktualisiert.
   - Bei größeren Restschulden (z. B. Regel muss konfigurationsseitig unterdrückt oder angepasst werden) wird eine neue Teilaufgabe mit Beschreibung angelegt.

5. **Regression absichern**
   - Abschluss der Sweep erst, wenn alle globalen Kommandos ohne Fehler laufen.
   - Danach in CI/Pre-Commit integrieren (falls noch nicht geschehen) und regelmäßige Läufe im Entwicklungsworkflow verankern.

## Artefakt-Nutzung

- **Tracker**: `.docs/TODO_linting_sweep_plan.md` listet alle Aufgaben in der Reihenfolge der Bearbeitung (Vorbereitung → Python-Backend → Tests → Frontend → Restarbeiten).
- **Prompt**: Der Standard-Prompt `.docs/prompts/prompt_processChecklist.md` verweist auf diesen Plan und sorgt dafür, dass jeweils genau eine Aufgabe pro Session umgesetzt wird.
- **Notizen**: Während der Sweep können zusätzliche Befunde (z. B. Regeln, die konfiguriert werden müssen) direkt im Plan-Dokument als Ergänzung aufgenommen werden.

## Empfehlung zur Zusammenarbeit mit dem Agenten

1. Zu Beginn jeder Session `TODO_linting_sweep_plan.md` prüfen und die höchste offene Aufgabe wählen.
2. Während der Bearbeitung Fehlermeldungen sammeln (Screenshot, Terminal-Log) und als Referenz für Folgeaufgaben hinterlegen.
3. Nach erfolgreichem Lint-Lauf für den Scope Tests anstoßen, wenn Codeverhalten beeinflusst wurde.
4. Regelmäßige Zwischenstände committen, um größere Refactorings aufzuteilen und den Fortschritt sichtbar zu halten.

Mit dieser Struktur behalten wir sowohl den Überblick über die Breite des Codebases als auch über die unterschiedlichen Linting-Regelwerke.

### ESLint/TypeScript-Baseline (Task 0.c, 2025-10-14)

`npm run lint:ts` erfasst derzeit 289 Fehler im Frontend (`src/`). Die Regelverteilung wird klar von `@typescript-eslint/no-unnecessary-condition` angeführt (159 Meldungen), gefolgt von `@typescript-eslint/restrict-template-expressions` (28), `@typescript-eslint/no-unsafe-member-access` (19), `@typescript-eslint/no-unsafe-call` (15), `@typescript-eslint/no-unnecessary-type-assertion` (10) und `@typescript-eslint/no-unnecessary-type-conversion` (10). Weitere relevante Cluster betreffen unsichere Zuweisungen/Rückgaben (`no-unsafe-assignment`, `no-unsafe-return`) sowie fehlertolerante Zeichenkettenkonvertierungen (`no-base-to-string`).

Die größten Hotspots konzentrieren sich auf `src/tabs/overview.ts` (50 Meldungen), `src/content/charting.ts` (48), `src/tabs/security_detail.ts` (47), `src/dashboard.ts` (36) und `src/data/updateConfigsWS.ts` (30). Weitere auffällige Dateien sind die Interaktionsebene `src/interaction/tab_control.ts` (20) und die Performance-Test-Suite unter `src/utils/__tests__/performance.test.ts` (15). Diese Brennpunkte definieren die Reihenfolge für die nächsten Frontend-Aufgaben.

`npm run typecheck` läuft weiterhin ohne Beanstandung durch, sodass sich die anstehenden Arbeiten auf die ESLint-Verstöße konzentrieren können.

### Ruff-Baseline Refresh (Task 0.b, 2025-10-14)

`./scripts/lint` wurde erneut ausgeführt. Dabei entfernte `ruff format` sieben triviale Verstöße automatisch; 1 705 Findings blieben offen und bilden die aktuelle Ausgangsbasis. `ruff check --statistics` lieferte folgendes Ranking der häufigsten Regeln:

| Rule | Count | Beschreibung |
| --- | ---: | --- |
| S101 | 682 | Verwendung von `assert` in produktivem Code/Test |
| ANN001 | 274 | Fehlende Typannotationen für Funktionsargumente |
| ARG001 | 106 | Ungenutzte Funktionsargumente |
| PLR2004 | 96 | Magische Vergleichswerte |
| ANN202 | 83 | Fehlende Rückgabetypen in privaten Funktionen |
| E501 | 80 | Zeilen länger als 88 Zeichen |
| ANN201 | 52 | Fehlende Rückgabetypen in öffentlichen Funktionen |
| SLF001 | 30 | Direkter Zugriff auf private Attribute |
| ARG005 | 28 | Ungenutzte Lambda-Argumente |
| ANN002 | 26 | Fehlende Typannotationen für Funktionsrückgabewerte |

Die verbleibenden Regeln liegen jeweils im einstelligen Bereich. Die größten Problemcluster befinden sich weiterhin in den Testmodulen (`tests/test_price_service.py`, `tests/test_db_access.py`, `tests/test_ws_security_history.py`).
