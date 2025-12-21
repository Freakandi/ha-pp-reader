# Agent Handbook: Portfolio Performance Reader

This is the primary source of truth for AI agents working in this repository. It defines the environment, workflows, and strict verification protocols required for success.

## 1. Environment & Context
*   **System**: Linux.
*   **Project**: Home Assistant Integration (Python) + React Dashboard (TypeScript/Vite).
*   **Critical Constraint**: **NO GUI**. You cannot launch a visible browser. All UI interaction must be headless/programmatic via the `browser_subagent`.
*   **Data Authority**: `config/pp_reader_data/S-Depot.db` is the **only** authoritative database. Do not use temporary databases or stubs.

### Directory Structure
*   `custom_components/pp_reader/`: Python backend source.
*   `src/`: TypeScript frontend source.
*   `tests/`: Tests (mixed Python and TypeScript).
    *   `tests/ui/`: Playwright specs.
    *   `tests/ui/agent_scratchpad/`: **Your workspace** for probing UI behavior.

## 2. Tooling & Setup

### Python (Backend)
Work inside the pre-configured virtual environment `.venv`.
*   **Activate**: `source .venv/bin/activate`.
*   **Lint & Format**: `./scripts/lint` (Runs Ruff format + check --fix). **Run this before every commit.**
*   **Test**: `pytest` (Fast, isolated).
    *   `pytest --cov=custom_components/pp_reader` for coverage.
    *   `script.hassfest` for integration validity.
*   **Start Home Assistant**:
    ```bash
    source .venv/bin/activate && nohup hass --config ~/coding/repos/ha-pp-reader/config --debug > /tmp/ha_pp_reader_hass.log 2>&1 &
    ```

### Node.js (Frontend)
*   **Install**: `npm install`.
*   **Lint**: `npm run lint:ts`.
*   **Typecheck**: `npm run typecheck`.
*   **Build**: `npm run build` (Updates assets in `custom_components/...`).
    *   **Rule**: Always run `npm run build` before submitting changes affecting the UI.
*   **Start Frontend (Vite)**:
    ```bash
    npm run dev -- --host 127.0.0.1 --port 5173
    ```

## 3. Workflow: "Probe, Don't Guess"
In a headless environment, you cannot "look" at the screen to verify changes. You must write code to verify code.

### UI Verification Strategy
**Do not** rely on `verify-ui` (screenshots) alone. Screenshots are brittle and hard to interpret programmatically.
**Do** use **Ephemeral Test Probes**:

1.  **Create a Probe**: Write a temporary Playwright test in `tests/ui/agent_scratchpad/<feature_name>.spec.ts`.
2.  **Assert Logic**: Use `expect(...)` to verify DOM states (e.g., "Sort order changed", "Value updated").
3.  **Run**: `npm run test:ui -- tests/ui/agent_scratchpad/<feature_name>.spec.ts`.
4.  **Decide**:
    *   *Pass/Fail*: Use the result to confirm your fix.
    *   *Bug*: If the probe reveals a bug, **promote** it to a permanent test in `tests/ui/`.
    *   *Cleanup*: Delete the probe file when done.

**Probe Template**:
```typescript
import { test, expect } from '@playwright/test';

const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

test('PROBE: <Description>', async ({ page }) => {
  await page.goto(panelPath, { waitUntil: 'networkidle' });
  // ... interaction ...
  // expect(locator).toHaveText('...');
});
```

## 4. Work Rules
1.  **Always Lint**: Broken formatting breaks CI. Run `./scripts/lint` religiously for Python, and `npm run lint:ts`/`typecheck` for TS.
2.  **English Only**: Output (plans, artifacts, comments) must be in English.
3.  **Completion Gate**: You are **PROHIBITED** from calling `notify_user` to finish a task until you have marked the corresponding item as completed `[x]` in the original source TODO file.
4.  **Process Management**: Whenever you start HA or Vite instances during a session, you **MUST** terminate those processes before finalizing your response.
    *   Check processes: `pgrep -fl hass`, `pgrep -fl vite`
5.  **Docs**: Keep `README.md` and `README-dev.md` updated if you change behavior.
