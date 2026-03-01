---
description: Verify UI state by creating and running a temporary Playwright test to capture screenshots without using a GUI browser.
---
This workflow allows agents to "see" the UI in a headless environment (like the Raspberry Pi) where standard browser tools fail. It automates creating a test, running it to capture a screenshot, and cleaning up.

1. **Create the Test Script**
   Create a file named `tests/ui/temp_verify_ui.spec.ts` with the following template. Replace `/* CUSTOM STEPS */` with the specific navigation or interactions requested by the user.

   ```typescript
   import { test } from '@playwright/test';

   const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
   const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

   test('verification screenshot', async ({ page }) => {
     // 1. Navigate to dashboard (handles auth if needed)
     await page.goto(panelPath, { waitUntil: 'networkidle' });
     if (page.url().includes('auth')) {
        await page.fill('input[name="username"]', 'dev');
        await page.fill('input[name="password"]', 'dev');
        await page.keyboard.press('Enter');
        await page.waitForURL(/\/ppreader/, { timeout: 30000 });
     }
     await page.waitForSelector('pp-reader-panel', { timeout: 30000 });

     // 2. Custom Steps (Injected by Agent)
     /* CUSTOM STEPS HERE (e.g. click buttons, expand rows) */

     // Example: Expand first portfolio
     // await page.locator('tr.portfolio-row').first().click();

     // 3. Capture Screenshot
     // Ensure path is unique if running multiple times
     await page.screenshot({ path: 'tests/ui/playwright/verification_snapshot.png', fullPage: true });
   });
   ```

2. **Execute the Test**
   Run the specific test file using the project's Playwright runner.

   // turbo
   `npm run test:ui -- tests/ui/temp_verify_ui.spec.ts --project=Chromium`

   *Note: If the command fails, check the error logs for selector timeouts or connection refusals.*

3. **Verify Output**
   Check that the screenshot was created.

   // turbo
   `ls -l tests/ui/playwright/verification_snapshot.png`

4. **Cleanup**
   Remove the temporary test file to leave the repository clean.

   // turbo
   `rm tests/ui/temp_verify_ui.spec.ts`

5. **Visual Confirmation**
   After the script passes, you **MUST** use the `browser_subagent` to open the page and visually confirm the state matches your expectations.
   - Use `open_browser_url` to go to the page.
   - Use `capture_screenshot` or `get_dom_state` to verify.
   - **Do not skip this step.** Automation proves *logic*, this proves *rendering*.
