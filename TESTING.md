# TESTING.md – Test & Quality Guide for `pp_reader`

> Goal: Consistent, reproducible execution of all quality assurance and test steps (local & CI) for contributors to the Home Assistant Custom Component **pp_reader**.

---

## 1. Purpose & Overview

This repository currently contains:
- Automated Python tests (Pytest) under `tests/` (Focus: Price orchestrator & logging / error scenarios).
- Linting & formatting via Ruff (`scripts/lint`, `ruff.toml`).
- Home Assistant runtime/integration tests (using real HA classes like `ConfigEntry`, `HomeAssistant` – identifiable by `MockConfigEntry`, `hass` fixture parameters, e.g., in `tests/prices/test_zero_quotes_warn.py:53`).
- No separate distinction between "Unit" and "Integration" in the folder structure – tests in `tests/prices/` mix both (In-Memory DB + HA Core objects).
- No defined E2E/Frontend/Cypress tests (Frontend only implicitly validated via event sequences).
- (Not yet) Type checking (no `mypy.ini`, no `pyproject.toml`, no `mypy` dependency).
- (Not yet) Coverage setup in Config – Coverage can be run on-demand via Pytest.
- No tox / no pre-commit hooks; no Makefile targets.
- CI workflows are located under `.github/workflows/`.

Recommended quality pipeline before every PR:
1. Lint & Format
2. (Optional) Fast subset of tests (all – currently no "slow" marker needed)
3. Full tests with coverage
4. (Optional) Hassfest (check locally)
5. Manual Smoke: Start Home Assistant (Panel loads, no exceptions)

---

## 2. Prerequisites & Setup

All tests (pytest) must be run in a virtual Python environment where Home Assistant is installed (installed as part of `requirements.txt`).

| Component | Source | Note |
|-----------|--------|------|
| Python Version | `scripts/setup_container` (Lines 11–16: `pyenv install -s 3.13.3`) | Target version 3.13.3 |
| Dependencies (Runtime) | `requirements.txt` | Contains Runtime + Lint (`ruff`) |
| Home Assistant Integration Domain | `custom_components/pp_reader/manifest.json` (`"domain": "pp_reader"`) | Domain constant |
| Linter | `ruff.toml` + `scripts/lint` | Uniform for Format + Lint |

Additional Dev Tools (Pytest, Coverage, HA Pytest Plugin) are managed via `requirements-dev.txt`; `pyproject.toml` is still not present.

### 2.1 Virtual Environment (Unix)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Dev Extras
pip install -r requirements-dev.txt
```

### 2.2 Virtual Environment (Windows PowerShell)

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```

### 2.3 Devcontainer / Container

- Devcontainer ready (see `.devcontainer.json`; activation via VS Code).
- Setup script: `./scripts/setup_container` (installs package dependencies & creates venv).
- `postCreateCommand` installs runtime (`requirements.txt`) and dev dependencies (`requirements-dev.txt`).
- Start HA Instance: `./scripts/develop` or `./scripts/codex_develop`.

### 2.4 Verifying the Home Assistant Runtime

- After installation (`./scripts/setup_container` **or** `pip install -r requirements.txt`), execute `source .venv/bin/activate` once.
- Check the importable version: `python -c "import homeassistant.const as c; print(c.__version__)"`.
- Expected output: `2025.2.4` (as pinned in `requirements.txt`). If the version differs or a `ModuleNotFoundError` occurs, the dependency setup is incomplete.

### 2.5 Optional: Poetry

Not used (no `pyproject.toml` / `poetry.lock`). Poetry usage is currently not planned.

---

## 3. Quickstart (Once & Repeat)

```bash
# 1. Environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 2. Lint + Format (Auto-Fix)
./scripts/lint

# 3. Tests (without coverage)
pytest -q

# 4. Tests with Coverage
pytest --cov=custom_components/pp_reader --cov-report=term-missing --cov-report=html

# 5. Open HTML Coverage Report (Unix)
$BROWSER htmlcov/index.html  # or: xdg-open htmlcov/index.html

# 6. (Optional) Hassfest Check
python -m script.hassfest
```

Windows Browser call optionally:
```powershell
Start-Process .\htmlcov\index.html
```

---

## 4. Pytest Usage in Detail

### 4.1 Structure

- All tests for price logic under `tests/prices/`.
- Examples:
  - `tests/prices/test_price_service.py:0` (Price orchestrator End-to-End scenarios)
  - `tests/prices/test_zero_quotes_warn.py:0` (Warn log deduplication)
  - `tests/prices/test_debug_scope.py:0` (Logger scope option)

### 4.2 Markers

Currently used marker:
- `@pytest.mark.asyncio` (e.g. `tests/prices/test_zero_quotes_warn.py:53`, `tests/prices/test_debug_scope.py:35`)
  Purpose: Execution of async tests without own event loop boilerplate.

No own `pytest.ini` → no predefined addopts.

### 4.3 Selective Run

Only "normal" (synchronous) tests (practically not needed – almost all are async):

```bash
pytest -k "not asyncio"
```

Only a specific test:

```bash
pytest tests/prices/test_price_service.py::test_metadata_log -vv
```

### 4.4 Logging & Debug

Recommended for interval/warning analyses:
```bash
pytest -vv -o log_cli=true --log-cli-level=INFO
```

For detailed debug logs (Price namespace):
```bash
pytest -vv -o log_cli=true --log-cli-level=DEBUG -k "debug_scope"
```

### 4.5 Missing / Optional Fixtures

- `hass` parameter in async tests uses `pytest-homeassistant-custom-component` (provided via `requirements-dev.txt`). If fixture is missing →
  ```bash
  pip install -r requirements-dev.txt
  ```

(Source note: Parameter `hass` in `tests/prices/test_zero_quotes_warn.py:53`)

### 4.6 Frontend Regression Tests & jsdom Background

#### What is jsdom?

`jsdom` is a standard-compliant simulation of browser DOM APIs implemented in Node.js. The library provides core web platform interfaces (e.g., `window`, `document`, event dispatching, DOMParser) as pure JavaScript objects, allowing scripts that typically run in the browser to be executed in a server-side or test environment. Since `jsdom` does not contain a rendering engine (like Chromium or WebKit), the focus remains on DOM and JavaScript behavior; layout, graphics, or media are not emulated. In Home Assistant production, `jsdom` is **not** required – the user's real browser provides the full DOM environment. Accordingly, including `jsdom` only impacts local dev/test dependencies and not the bundled frontend delivered to Home Assistant.

#### Usage in Repository

We use `jsdom` as a lightweight DOM environment to test the logic of portfolio frontend bundles in isolation. Specifically, the script `tests/frontend/portfolio_update_gain_abs.mjs` reconstructs the lifecycle of websocket updates: It loads the compiled dashboard modules, injects a `window`/`document` environment from `jsdom`, and then simulates incoming portfolio messages. This simulation allows edge cases like "Buy costs = 0" to be executed reliably without starting a real browser or Home Assistant frontend. The associated Pytest wrapper `tests/frontend/test_portfolio_update_gain_abs.py` calls the Node script and verifies that gain values remain unchanged. This keeps the test purely local, fast, and CI-capable, while the production frontend continues to run unchanged in real browsers.

---

## 5. Home Assistant Specific Tests

Elements:
- `MockConfigEntry` from `tests.common` (see import in `tests/prices/test_zero_quotes_warn.py:23`).
- Usage of real integration entry points:
  - `async_setup_entry` (`custom_components/pp_reader/__init__.py:0ff`)
  - Options (`enable_price_debug`, `price_update_interval_seconds`) – tested in `tests/prices/test_debug_scope.py:35`.

Startup sequence in tests:
1. Initialize DB schema (`initialize_database_schema`) – e.g. `tests/prices/test_debug_scope.py:20`.
2. Write dummy portfolio file.
3. `MockConfigEntry.add_to_hass(hass)`.
4. `await hass.config_entries.async_setup(entry.entry_id)`.

Events / Logging Assertions check sequences (e.g. order `portfolio_values` before `portfolio_positions` in `tests/prices/test_price_service.py:490`).

---

## 6. Scripts (`scripts/`)

| Script | Purpose | Call | Notes |
|--------|---------|------|-------|
| `scripts/setup_container` | Installs system packages, creates venv, installs requirements | `./scripts/setup_container` | Uses `python3 -m venv`; installs apt packages (ffmpeg etc.). |
| `scripts/environment_setup` | Alternative/similar setup procedure (System + pip) | `./scripts/environment_setup` | Executes `pip install --requirement requirements.txt`. |
| `scripts/develop` | Start Home Assistant (system Python) | `./scripts/develop` | Sets `PYTHONPATH` for `custom_components`. |
| `scripts/codex_develop` | Start HA via venv binary | `./scripts/codex_develop` | Uses `.venv/bin/hass`. |
| `scripts/lint` | Ruff Format + Lint Fix | `./scripts/lint` | Executes `ruff format .` then `ruff check . --fix` sequentially. |
| `scripts/enrichment_smoketest.py` | Parser → FX → Price History → Metrics → Normalization as End-to-End QA | `python -m scripts.enrichment_smoketest --portfolio config/pp_reader_data/S-Depot.portfolio` | Aborts as soon as no canonical snapshots exist: `pending`/`missing` → Exit Code 6, other errors → Exit Code 7. Uses exclusively Snapshot/Metric tables (ignores legacy diff sync). |
| `scripts/diagnostics_dump.py` | Shows content of canonical Snapshot & Metric tables (Comparison to Sensor/Websocket Payloads) | `python -m scripts.diagnostics_dump --db-path config/pp_reader_data/pp_reader.db --limit 5` | Outputs JSON with table counts + payload previews (`snapshot_at`, UUIDs, values). Ideal for QA/Support to verify HA delivers the same data as SQLite. |

All have `#!/usr/bin/env bash` shebang → Unix Shell. On Windows, Git Bash / WSL is recommended.

No scripts directly trigger Pytest – Tests are executed manually.

---

## 7. Linting, Format & (Non-existent) Type Checking

### 7.1 Ruff

Configuration: `ruff.toml` (in root – content not in excerpt, but script points to it).
Standard commands:
```bash
# Check (diagnosis only)
ruff check .

# Fix + Format (equivalent to script)
ruff format .
ruff check . --fix
```

Windows:
```powershell
ruff format .
ruff check . --fix
```

### 7.2 Type Checking

Not configured. Recommendation (optional):
```bash
pip install mypy
mypy custom_components/pp_reader
```

Clearly document Pull Requests if mypy is to be formally introduced (separate PR).

### 7.3 Other Tools

No Black / Flake8 / isort in repo (Ruff replaces Format & Lint).

---

## 8. Hassfest & HA Meta Checks

Hassfest (Manifest, Services, Translations validation):
```bash
python -m script.hassfest
```

Typical errors:
- Missing version in manifest
- Unused / missing translation keys
- Invalid services (e.g. not registered)

Current potential inconsistency (Source: `ARCHITECTURE.md:468`): Service `trigger_backup_debug` documented in `translations/*`, but service registration not verifiable → Hassfest may warn.

---

## 9. Coverage

Recommended execution:
```bash
pytest --cov=custom_components/pp_reader --cov-report=term-missing --cov-report=html --cov-report=xml
```

Artifacts:
- HTML: `htmlcov/index.html`
- XML: `coverage.xml` (for CI parsing)
- Terminal: Missing lines

Open (Unix):
```bash
$BROWSER htmlcov/index.html
```

---

## 10. Sub-Suites & Performance

Currently no "slow" or "e2e" markers → entire suite typically runs fast (In-Memory operations + SQLite file in tmp paths).

Fast Pre-Commit Sequence:
```bash
./scripts/lint
pytest -q
```

Full Suite (with Coverage & Verbose):
```bash
./scripts/lint
pytest -vv --cov=custom_components/pp_reader --cov-report=term-missing
```

Selective execution of frequent adjustment tests (Price Orchestrator):
```bash
pytest tests/prices/test_price_service.py::test_normal_batch -vv
```

---

## 11. CI Workflow (GitHub Actions)

Workflows are located under `.github/workflows/`.
Typical reproduction step local (hypothetical):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
./scripts/lint
pytest --cov=custom_components/pp_reader --cov-report=term-missing
python -m script.hassfest
```

Extension anchor:
<!-- CI-SNIPPET-PLACEHOLDER -->

---

## 12. Test Data & Fixtures

- No dedicated `tests/fixtures/` files in excerpt.
- Temporary portfolio files are created on-the-fly (e.g. `portfolio_file.write_text("DUMMY")` in `tests/prices/test_zero_quotes_warn.py:58`).
- Database: Usage of temporary paths (`tmp_path / "debugscope.db"` in `tests/prices/test_debug_scope.py:16`).
- No sensitive real financial data included – all values synthetic (IDs: generated UUIDs within Price Service tests).

Convention:
- `tmp_path` Pytest Fixture → path-based isolation
- Dummy content minimal (`"DUMMY"`) – parser paths not triggered (only Setup flow).

---

## 13. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `ModuleNotFoundError: pytest` | Dev dependencies not installed | `pip install -r requirements-dev.txt` |
| `fixture 'hass' not found` | Missing HA Pytest Plugin | `pip install -r requirements-dev.txt` |
| HA Start very slow | First initialization / Cache | Wait; reduce log level |
| Windows Paths Backslashes | Shell scripts bash-specific | Use Git Bash / WSL |
| Coverage 0% | Tests do not import module | Ensure `custom_components/pp_reader` is imported (tests already do this) |
| Missing Logger DEBUG output | Option not active | Set option `enable_price_debug=True` in Test / ConfigEntry |
| Warn "Service registration missing" | `trigger_backup_debug` mismatch | Implement service or remove translation key |

---

## 14. Adding New Tests

Guidelines:
- Place under `tests/<topic>/test_<description>.py`
- Async tests always with `@pytest.mark.asyncio`
- Temporary artifacts: Use `tmp_path`
- No mutation of existing coordinator data contract structures (see Architecture)
- Log Assertions: Use `caplog` (`caplog.set_level(logging.DEBUG)`)

Example Skeleton:
```python
import pytest
import logging

@pytest.mark.asyncio
async def test_example(hass, tmp_path, caplog):
    caplog.set_level(logging.INFO)
    # Arrange
    # Act
    # Assert
```

Reference test for price warning: `tests/prices/test_zero_quotes_warn.py:0` as pattern (deduplicated WARN logs).

---

## 15. Extension Perspectives

(Optional – future quality):
- Introduction of `mypy` + `pyproject.toml` (strict optional).
- Tox environments for matrix (py311/py313).
- Frontend Smoke Tests (Playwright) – Events & DOM Patch.
- Pre-commit Hooks (`ruff`, `pytest -k smoke`).

---

## 16. Cheatsheet & Matrices

### 16.1 Cheatsheet

| Action | Command |
|--------|---------|
| Setup venv | `python3 -m venv .venv && source .venv/bin/activate` |
| Install Runtime + Dev | `pip install -r requirements.txt && pip install -r requirements-dev.txt` |
| Lint & Format | `./scripts/lint` |
| Lint Check only | `ruff check .` |
| Tests (fast) | `pytest -q` |
| Tests (verbose) | `pytest -vv` |
| Single Test | `pytest tests/prices/test_price_service.py::test_normal_batch -vv` |
| Coverage | `pytest --cov=custom_components/pp_reader --cov-report=term-missing` |
| Open Coverage HTML | `$BROWSER htmlcov/index.html` |
| Hassfest | `python -m script.hassfest` |
| Start HA locally | `./scripts/develop` |


### 16.2 Test Matrix

| Test Type | Primary Command | Marker / Filter | Counts to Coverage | Runtime Indicator |
|-----------|-----------------|-----------------|--------------------|-------------------|
| Lint / Format | `./scripts/lint` | – | No | Very fast |
| "Unit" / Mixed | `pytest -q` | – | Yes | Fast |
| Async specific | `pytest -k asyncio` | `asyncio` | Yes | Fast |
| Price Orchestrator Focus | `pytest tests/prices/test_price_service.py::test_normal_batch -vv` | – | Yes | Fast |
| Logging/Debug Tests | `pytest -k debug_scope -vv -o log_cli=true --log-cli-level=DEBUG` | `debug_scope` substring | Yes | Fast |
| Full Coverage | `pytest --cov=custom_components/pp_reader --cov-report=term-missing` | – | Yes | Medium |
| Hassfest | `python -m script.hassfest` | – | No | Fast |
| Smoke HA Start | `./scripts/develop` | – | No | Slow (Initial) |
| Optional Type Check (not established) | `mypy custom_components/pp_reader` | – | No | N/A |
| Selective Warn Test | `pytest tests/prices/test_zero_quotes_warn.py::test_zero_quotes_warn_deduplicated -vv` | – | Yes | Fast |

---

## Source References (Excerpts)

| Fact | Source |
|-------------|--------|
| Python Version (3.13.3) | `scripts/setup_container:11-16` |
| Async Marker Beispiel | `tests/prices/test_debug_scope.py:35` |
| Warn-Log Assertion Kontext | `tests/prices/test_zero_quotes_warn.py:53-70` |
| Event Reihenfolge Test | `tests/prices/test_price_service.py:490+` |
| Domain Manifest | `custom_components/pp_reader/manifest.json:1-20` |
| Option Debug Scope Test | `tests/prices/test_debug_scope.py:0-60` |
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
