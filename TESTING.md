# TESTING.md – Test & Quality Guide for `pp_reader`

> Ziel: Einheitliche, reproduzierbare Ausführung aller Qualitätssicherungs- und Testschritte (lokal & CI) für Contributor des Home Assistant Custom Components **pp_reader**.

---

## 1. Zweck & Übersicht

Dieses Repository enthält derzeit:
- Automatisierte Python Tests (Pytest) unter `tests/` (Schwerpunkt: Preis-Orchestrator & Logging / Fehlerszenarien).
- Linting & Formatting via Ruff (`scripts/lint`, `ruff.toml`).
- Home Assistant Laufzeit-/Integrations-nahe Tests (nutzen echte HA-Klassen wie `ConfigEntry`, `HomeAssistant` – erkennbar an `MockConfigEntry`, `hass` Fixture-Parametern z.B. in `tests/prices/test_zero_quotes_warn.py:53`).
- Keine separate Unterscheidung zwischen „Unit“ und „Integration“ in der Ordnerstruktur – Tests in `tests/prices/` mischen beides (In‑Memory DB + HA Core Objekte).
- Keine definierten E2E-/Frontend-/Cypress Tests (Frontend nur implizit durch Event-Sequenzen indirekt validiert).
- (Noch) Kein Typ-Checking (keine `mypy.ini`, kein `pyproject.toml`, kein `mypy` Dependency).
- (Noch) Kein Coverage-Setup in Config – Coverage kann on‑demand via Pytest ausgeführt werden.
- Kein tox / keine pre-commit Hooks; keine Makefile Targets.
- CI Workflows liegen unter `.github/workflows/` (nicht im Auszug konkretisiert).

Empfohlene Qualitäts-Pipeline vor jedem PR:
1. Lint & Format
2. (Optional) Schnelle Teilmenge Tests (alle – aktuell keine Markierung für „slow“ nötig)
3. Vollständige Tests mit Coverage
4. (Optional) Hassfest (lokal prüfen)
5. Manuelle Smoke: Start von Home Assistant (Panel lädt, keine Exceptions)

---

## 2. Voraussetzungen & Setup

Alle Tests (pytest) müssen in einer virtuellen Python-Umgebung durchgeführt werden, in der HomeAssistant installiert ist (wird als Teil von reuirements.txt installiert).

| Komponente | Quelle | Hinweis |
|------------|--------|---------|
| Python Version | `scripts/setup_container` (Zeile 11–16: `pyenv install -s 3.13.3`) | Zielversion 3.13.3 |
| Dependencies (Runtime) | `requirements.txt` | Enthält Runtime + Lint (`ruff`) |
| Home Assistant Integration Domain | `custom_components/pp_reader/manifest.json` (`"domain": "pp_reader"`) | Domain-Konstante |
| Linter | `ruff.toml` + `scripts/lint` | Einheitlich für Format + Lint |

Zusätzliche Dev-Tools (Pytest, Coverage, HA Pytest Plugin) werden über `requirements-dev.txt` gepflegt; ein `pyproject.toml` ist weiterhin nicht vorhanden.

### 2.1 Virtuelle Umgebung (Unix)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Dev-Extras
pip install -r requirements-dev.txt
```

### 2.2 Virtuelle Umgebung (Windows PowerShell)

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```

### 2.3 Devcontainer / Container

- Devcontainer bereit (siehe `.devcontainer.json`, nicht im Auszug; Aktivierung via VS Code).
- Setup-Skript: `./scripts/setup_container` (installiert Paketabhängigkeiten & erstellt venv).
- `postCreateCommand` installiert Runtime (`requirements.txt`) und Dev-Dependencies (`requirements-dev.txt`).
- Start HA Instanz: `./scripts/develop` oder `./scripts/codex_develop`.

### 2.4 Überprüfung der Home Assistant-Laufzeit

- Nach der Installation (`./scripts/setup_container` **oder** `pip install -r requirements.txt`) einmal `source .venv/bin/activate` ausführen.
- Kontrolliere die importierbare Version: `python -c "import homeassistant.const as c; print(c.__version__)"`.
- Erwartete Ausgabe: `2025.2.4` (wie in `requirements.txt` fixiert). Weicht die Version ab oder tritt ein `ModuleNotFoundError` auf, ist das Dependency-Setup unvollständig.

### 2.5 Optional: Poetry

Nicht verwendet (kein `pyproject.toml` / `poetry.lock`). Poetry-Nutzung derzeit nicht vorgesehen.

---

## 3. Schnellstart (Once & Repeat)

```bash
# 1. Umgebung
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 2. Lint + Format (Auto-Fix)
./scripts/lint

# 3. Tests (ohne Coverage)
pytest -q

# 4. Tests mit Coverage
pytest --cov=custom_components/pp_reader --cov-report=term-missing --cov-report=html

# 5. HTML Coverage Report öffnen (Unix)
$BROWSER htmlcov/index.html  # oder: xdg-open htmlcov/index.html

# 6. (Optional) Hassfest Check
python -m script.hassfest
```

Windows Browser-Aufruf ggf.:
```powershell
Start-Process .\htmlcov\index.html
```

---

## 4. Pytest Nutzung im Detail

### 4.1 Struktur

- Alle Tests zur Preislogik unter `tests/prices/`.
- Beispiele:
  - `tests/prices/test_price_service.py:0` (Preis-Orchestrator End-to-End Szenarien)
  - `tests/prices/test_zero_quotes_warn.py:0` (Warn-Log Deduplikation)
  - `tests/prices/test_debug_scope.py:0` (Logger-Scope Option)
  - `tests/prices/test_price_persistence_fields.py:0` (Persistenz erlaubter Spalten)

### 4.2 Marker

Aktuell genutzter Marker:
- `@pytest.mark.asyncio` (z.B. `tests/prices/test_zero_quotes_warn.py:53`, `tests/prices/test_debug_scope.py:35`)
  Zweck: Ausführung von async Tests ohne eigenen Event Loop Boilerplate.

Kein eigener `pytest.ini` → keine vordefinierten addopts.

### 4.3 Selektiver Lauf

Nur „normale“ (synchrone) Tests (praktisch nicht nötig – fast alle sind async):

```bash
pytest -k "not asyncio"
```

Nur ein spezifischer Test:

```bash
pytest tests/prices/test_price_service.py::test_metadata_log -vv
```

### 4.4 Logging & Debug

Empfohlen bei Intervall-/Warn-Analysen:
```bash
pytest -vv -o log_cli=true --log-cli-level=INFO
```

Für detaillierte Debug Logs (Preis-Namespace):
```bash
pytest -vv -o log_cli=true --log-cli-level=DEBUG -k "debug_scope"
```

### 4.5 Fehlende / Optionale Fixtures

- `hass` Parameter in async Tests nutzt `pytest-homeassistant-custom-component` (bereitgestellt über `requirements-dev.txt`). Falls Fixture fehlt →
  ```bash
  pip install -r requirements-dev.txt
  ```

(Quellhinweis: Parameter `hass` in `tests/prices/test_zero_quotes_warn.py:53`)

### 4.6 Frontend-Regressionstests & jsdom-Hintergrund

#### Was ist jsdom?

`jsdom` ist eine in Node.js implementierte, standardkonforme Simulation der Browser-DOM-APIs. Die Bibliothek stellt zentrale Webplattform-Schnittstellen (z. B. `window`, `document`, Event-Dispatching, DOMParser) als reine JavaScript-Objekte bereit, sodass Skripte, die üblicherweise im Browser laufen, in einer serverseitigen oder Test-Umgebung ausgeführt werden können. Da `jsdom` keine Rendering-Engine (wie Chromium oder WebKit) enthält, bleibt der Fokus auf DOM- und JavaScript-Verhalten; Layout, Grafik oder Medien werden nicht emuliert. Im Produktivbetrieb von Home Assistant wird `jsdom` **nicht** benötigt – der reale Browser des Nutzers stellt die vollständige DOM-Umgebung bereit. Entsprechend hat die Aufnahme von `jsdom` ausschließlich Auswirkungen auf die lokalen Dev-/Test-Dependencies und nicht auf das gebündelte Frontend, das an Home Assistant ausgeliefert wird.

#### Einsatzzweck im Repository

Wir nutzen `jsdom` als leichtgewichtige DOM-Umgebung, um die Logik der Portfolio-Frontend-Bundles isoliert testen zu können. Konkret rekonstruiert das Skript `tests/frontend/portfolio_update_gain_abs.mjs` den Lebenszyklus der Websocket-Aktualisierungen: Es lädt die kompilierten Dashboard-Module, injiziert eine `window`/`document`-Umgebung aus `jsdom` und simuliert anschließend eingehende Portfolio-Nachrichten. Diese Simulation erlaubt es, Edge-Cases wie „Kaufkosten = 0“ reproduzierbar auszuführen, ohne einen echten Browser oder Home-Assistant-Frontend zu starten. Die zugehörige Pytest-Hülle `tests/frontend/test_portfolio_update_gain_abs.py` ruft das Node-Skript auf und verifiziert, dass die Gain-Werte unverändert bleiben. Damit bleibt der Test rein lokal, schnell und CI-fähig, während das produktive Frontend weiterhin unverändert in realen Browsern läuft.

---

## 5. Home Assistant spezifische Tests

Elemente:
- `MockConfigEntry` aus `tests.common` (siehe Import in `tests/prices/test_zero_quotes_warn.py:23`).
- Nutzung echter Integrations-Einstiegspunkte:
  - `async_setup_entry` (`custom_components/pp_reader/__init__.py:0ff`)
  - Optionen (`enable_price_debug`, `price_update_interval_seconds`) – getestet in `tests/prices/test_debug_scope.py:35`.

Startsequenz in Tests:
1. DB Schema initialisieren (`initialize_database_schema`) – z.B. `tests/prices/test_debug_scope.py:20`.
2. Dummy Portfolio-Datei schreiben.
3. `MockConfigEntry.add_to_hass(hass)`.
4. `await hass.config_entries.async_setup(entry.entry_id)`.

Events / Logging Assertions prüfen Sequenzen (z.B. Reihenfolge `portfolio_values` vor `portfolio_positions` in `tests/prices/test_price_service.py:490`).

---

## 6. Skripte (`scripts/`)

| Skript | Zweck | Aufruf | Hinweise |
|--------|-------|--------|----------|
| `scripts/setup_container` | Installiert Systempakete, erstellt venv, installiert requirements | `./scripts/setup_container` | Nutzt `python3 -m venv`; installiert apt Pakete (ffmpeg etc.). |
| `scripts/environment_setup` | Alternative/ähnliche Setup-Prozedur (System + pip) | `./scripts/environment_setup` | Führt `pip install --requirement requirements.txt` aus. |
| `scripts/develop` | Start Home Assistant (system Python) | `./scripts/develop` | Setzt `PYTHONPATH` für `custom_components`. |
| `scripts/codex_develop` | Start HA über venv Binary | `./scripts/codex_develop` | Nutzt `.venv/bin/hass`. |
| `scripts/lint` | Ruff Format + Lint Fix | `./scripts/lint` | Führt nacheinander `ruff format .` und `ruff check . --fix` aus. |

Alle haben `#!/usr/bin/env bash` Shebang → Unix Shell. Unter Windows via Git Bash / WSL empfohlen.

Keine Skripte triggern direkt Pytest – Tests werden manuell ausgeführt.

---

## 7. Linting, Format & (Nicht vorhandenes) Typprüfen

### 7.1 Ruff

Konfiguration: `ruff.toml` (im Root – Inhalt nicht im Auszug, aber Skript verweist darauf).
Standardbefehle:
```bash
# Check (nur Diagnose)
ruff check .

# Fix + Format (äquivalent zu Skript)
ruff format .
ruff check . --fix
```

Windows:
```powershell
ruff format .
ruff check . --fix
```

### 7.2 Typprüfung

Nicht konfiguriert. Empfehlung (optional):
```bash
pip install mypy
mypy custom_components/pp_reader
```

Dokumentiere Pull Requests klar, wenn mypy formal eingeführt werden soll (separate PR).

### 7.3 Weitere Tools

Kein Black / Flake8 / isort im Repo (Ruff ersetzt Format & Lint).

---

## 8. Hassfest & HA Meta Checks

Hassfest (Manifest, Services, Translations Validierung):
```bash
python -m script.hassfest
```

Typische Fehler:
- Fehlende Versionsangabe im Manifest
- Ungenutzte / fehlende Translation Keys
- Ungültige Services (z.B. nicht registriert)

Aktuelle potentielle Inkonsistenz (Quelle: `ARCHITECTURE.md:468`): Service `trigger_backup_debug` in `translations/*` dokumentiert, aber Service-Registrierung nicht nachweisbar → Hassfest kann warnen.

---

## 9. Coverage

Empfohlene Ausführung:
```bash
pytest --cov=custom_components/pp_reader --cov-report=term-missing --cov-report=html --cov-report=xml
```

Artefakte:
- HTML: `htmlcov/index.html`
- XML: `coverage.xml` (für CI Parsing)
- Terminal: Fehlende Zeilen

Öffnen (Unix):
```bash
$BROWSER htmlcov/index.html
```

---

## 10. Teil-Suiten & Performance

Derzeit keine „slow“ oder „e2e“ Marker → gesamte Suite läuft typischerweise schnell (In-Memory Operationen + SQLite Datei in tmp Pfaden).

Schnelle Pre-Commit-Sequenz:
```bash
./scripts/lint
pytest -q
```

Vollsuite (mit Coverage & Verbose):
```bash
./scripts/lint
pytest -vv --cov=custom_components/pp_reader --cov-report=term-missing
```

Selektive Ausführung häufiger Anpassungstests (Preis-Orchestrator):
```bash
pytest tests/prices/test_price_service.py::test_normal_batch -vv
```

---

## 11. CI Ablauf (GitHub Actions)

Workflows liegen unter `.github/workflows/` (Inhalte nicht im Auszug → Details nicht verifiziert).
Typischer Reproduktionsschritt lokal (hypothetisch):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
./scripts/lint
pytest --cov=custom_components/pp_reader --cov-report=term-missing
python -m script.hassfest
```

Erweiterungsanker:
<!-- CI-SNIPPET-PLACEHOLDER -->

---

## 12. Testdaten & Fixtures

- Keine dedizierten `tests/fixtures/` Dateien im Auszug.
- Temporäre Portfoliodateien werden on-the-fly erstellt (z.B. `portfolio_file.write_text("DUMMY")` in `tests/prices/test_zero_quotes_warn.py:58`).
- Datenbank: Nutzung temporärer Pfade (`tmp_path / "debugscope.db"` in `tests/prices/test_debug_scope.py:16`).
- Keine sensiblen echten Finanzdaten enthalten – alle Werte synthetisch (IDs: generierte UUIDs in `test_price_persistence_fields.py:...`).

Konvention:
- `tmp_path` Pytest Fixture → pfadbasierte Isolation
- Dummy Inhalte minimal (`"DUMMY"`) – Parser-Pfade nicht getriggert (nur Setup-Flow).

---

## 13. Troubleshooting

| Problem | Ursache | Lösung |
|---------|---------|--------|
| `ModuleNotFoundError: pytest` | Dev-Dependencies nicht installiert | `pip install -r requirements-dev.txt` |
| `fixture 'hass' not found` | Fehlendes HA Pytest Plugin | `pip install -r requirements-dev.txt` |
| HA Start sehr langsam | Erste Initialisierung / Cache | Warten; Log-Level reduzieren |
| Windows Pfade Backslashes | Shell-Skripte bash-spezifisch | Git Bash / WSL verwenden |
| Coverage 0% | Tests importieren Modul nicht | Sicherstellen, dass `custom_components/pp_reader` importiert wird (Tests tun das bereits) |
| Fehlende Logger DEBUG-Ausgaben | Option nicht aktiv | Option `enable_price_debug=True` in Test / ConfigEntry setzen |
| Warn „Service registrierung fehlt“ | `trigger_backup_debug` mismatch | Service implementieren oder Translation-Key entfernen |

---

## 14. Neue Tests hinzufügen

Richtlinien:
- Ablage unter `tests/<thema>/test_<beschreibung>.py`
- Async Tests immer mit `@pytest.mark.asyncio`
- Temporäre Artefakte: `tmp_path` verwenden
- Keine Mutation bestehender Coordinator-Datenvertrags-Strukturen (siehe Architektur)
- Log Assertions: `caplog` nutzen (`caplog.set_level(logging.DEBUG)`)

Beispiel-Gerüst:
```python
import pytest
import logging

@pytest.mark.asyncio
async def test_beispiel(hass, tmp_path, caplog):
    caplog.set_level(logging.INFO)
    # Arrange
    # Act
    # Assert
```

Test für Preiswarnung referenzieren: `tests/prices/test_zero_quotes_warn.py:0` als Muster (deduplizierte WARN Logs).

---

## 15. Erweiterungsperspektiven

(Optional – zukünftige Qualität):
- Einführung `mypy` + `pyproject.toml` (strict optional).
- Tox-Environments für Matrix (py311/py313).
- Frontend Smoke Tests (Playwright) – Events & DOM Patch.
- Pre-commit Hooks (`ruff`, `pytest -k smoke`).

---

## 16. Cheatsheet & Matrizen

### 16.1 Cheatsheet

| Aktion | Befehl |
|--------|--------|
| Setup venv | `python3 -m venv .venv && source .venv/bin/activate` |
| Install Runtime + Dev | `pip install -r requirements.txt && pip install -r requirements-dev.txt` |
| Lint & Format | `./scripts/lint` |
| Nur Lint Check | `ruff check .` |
| Tests (schnell) | `pytest -q` |
| Tests (verbose) | `pytest -vv` |
| Einzelner Test | `pytest tests/prices/test_price_service.py::test_normal_batch -vv` |
| Coverage | `pytest --cov=custom_components/pp_reader --cov-report=term-missing` |
| Coverage HTML öffnen | `$BROWSER htmlcov/index.html` |
| Hassfest | `python -m script.hassfest` |
| HA lokal starten | `./scripts/develop` |


### 16.2 Test-Matrix

| Testart | Primärer Befehl | Marker / Filter | Zählt zu Coverage | Laufzeitindikator |
|---------|-----------------|-----------------|-------------------|-------------------|
| Lint / Format | `./scripts/lint` | – | Nein | Sehr schnell |
| „Unit“ / Mixed | `pytest -q` | – | Ja | Schnell |
| Async spezifisch | `pytest -k asyncio` | `asyncio` | Ja | Schnell |
| Preis-Orchestrator Fokus | `pytest tests/prices/test_price_service.py::test_normal_batch -vv` | – | Ja | Schnell |
| Logging/Debug Tests | `pytest -k debug_scope -vv -o log_cli=true --log-cli-level=DEBUG` | `debug_scope` substring | Ja | Schnell |
| Coverage Voll | `pytest --cov=custom_components/pp_reader --cov-report=term-missing` | – | Ja | Mittel |
| Hassfest | `python -m script.hassfest` | – | Nein | Schnell |
| Smoke HA Start | `./scripts/develop` | – | Nein | Langsam (Initial) |
| Optional Type Check (nicht etabliert) | `mypy custom_components/pp_reader` | – | Nein | N/A |
| Selektive Warn-Test | `pytest tests/prices/test_zero_quotes_warn.py::test_zero_quotes_warn_deduplicated -vv` | – | Ja | Schnell |

---

## Quellen-Hinweise (Auszüge)

| Sachverhalt | Quelle |
|-------------|--------|
| Python Version (3.13.3) | `scripts/setup_container:11-16` |
| Lint Skript Inhalt | `scripts/lint:1-9` |
| Nutzung `MockConfigEntry` | `tests/prices/test_zero_quotes_warn.py:22` |
| Async Marker Beispiel | `tests/prices/test_debug_scope.py:35` |
| Warn-Log Assertion Kontext | `tests/prices/test_zero_quotes_warn.py:53-70` |
| Event Reihenfolge Test | `tests/prices/test_price_service.py:490+` |
| Domain Manifest | `custom_components/pp_reader/manifest.json:1-20` |
| Option Debug Scope Test | `tests/prices/test_debug_scope.py:0-60` |
| Persistenz-Felder Test | `tests/prices/test_price_persistence_fields.py:0-40` |
| Architekturreferenz Service Inkonsistenz | `ARCHITECTURE.md:468` |

---

## Abdeckungs-Checkliste

| Kapitel | Erfüllt |
|---------|---------|
| 1 Zweck & Übersicht | ✅ |
| 2 Voraussetzungen & Setup | ✅ |
| 3 Schnellstart | ✅ |
| 4 Pytest Nutzung | ✅ |
| 5 Home Assistant Tests | ✅ |
| 6 Skripte | ✅ |
| 7 Lint/Format/Typ | ✅ |
| 8 Hassfest | ✅ |
| 9 Coverage | ✅ |
| 10 Teil-Suiten & Performance | ✅ |
| 11 CI Ablauf | ✅ (Platzhalter) |
| 12 Testdaten & Fixtures | ✅ |
| 13 Troubleshooting | ✅ |
| 14 Neue Tests | ✅ |
| 15 Erweiterungsperspektiven | ✅ |
| 16 Cheatsheet & Matrix | ✅ |

---

_Ende TESTING.md_
