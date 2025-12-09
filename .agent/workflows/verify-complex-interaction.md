---
description: Verify complex UI functionality (sorting, zooming, interactions) by creating ephemeral Playwright tests in the scratchpad.
---
This workflow is the preferred method for testing UI behavior in a headless environment. Instead of blind clicking, agents write precise probe scripts.

1. **Plan the Probe**
   Decide what specific functionality to test. Avoid "check everything". Focus on one interaction (e.g., "Sort by Value column").

2. **Create the Probe Script**
   Create a new file in `tests/ui/agent_scratchpad/<descriptive_name>.spec.ts`.

   **Template:**
   ```typescript
   import { test, expect } from '@playwright/test';

   const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
   const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

   test('PROBE: <One sentence description>', async ({ page }) => {
     // 1. Setup & Navigation
     await page.goto(panelPath, { waitUntil: 'networkidle' });
     /* Handle Auth if needed (copy from verify-ui.md) */

     // 2. Initial State Assertion
     // e.g. Capture the text of the first row
     // const firstRowBefore = await page.locator('...').first().innerText();

     // 3. Perform Interaction (The "User Action")
     // e.g. Click the sort header
     // await page.locator('th.sort-header').click();

     // 4. Verification (The "Test")
     // Assert the state changed as expected.
     // expect(after).not.toEqual(before);
   });
   ```

3. **Execute the Probe**
   Run the test. Use the console output as the primary source of truth.

   // turbo
   `npm run test:ui -- tests/ui/agent_scratchpad/<filename>.spec.ts --project=Chromium`

4. **Analyze & Act**
   - **Pass**: The feature works. Report success.
   - **Fail**: Read the error message. It explains exactly what happened (e.g., selector not found, assertion failed).
   - **Bug Found?**: If this confirms a bug, **move** this file to `tests/ui/` to make it a permanent regression test.
   - **One-off?**: If just a sanity check, delete the file or leave it in scratchpad for later reference.
