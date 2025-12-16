---
trigger: always_on
---

## UI Verification & Workflow
### 1. Build & Process
- **Build First**: Always run `npm run build` before submitting changes affecting the UI logic or DOM.
- **Probe & Verify Visually**:
  - **Automated**: Write ephemeral Playwright probes using `expect(...)` for logic.
  - **Visual**: Use the `browser_subagent` to visually inspect the rendered page. **YOU** must evaluate the visuals directly.
  - **Access URL**: Reach the frontend via `http://192.168.5.108:8123/ppreader`, only possible when HA is running.
### 2. Headless Verification
- **Smoke Tests**: Run `/verify-ui` to check basic rendering and take a screenshot.
- **Complex Interactions**: Run `/verify-complex-interaction` to test sorting, filtering, and data loading.
### 3. Screenshots (Evidence)
- **Use Only For Reporting**: Capture screenshots using Playwright workflows to save to `artifacts/`.
- **Review**: Embed these in [walkthrough.md](cci:7://file:///home/andreas/.gemini/antigravity/brain/ca0f797a-b370-4a14-824b-afa5ab8f3a22/walkthrough.md:0:0-0:0) for user review, but do not use them as your primary debugging signal.
### 4. Standard Tests
- Run `npm run test:ui` for the full Playwright suite.
- Run `npm test` for fast Node-based logic tests.