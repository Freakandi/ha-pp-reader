
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const HA_USERNAME = process.env.PP_READER_HA_USERNAME ?? 'dev';
const HA_PASSWORD = process.env.PP_READER_HA_PASSWORD ?? 'dev';
const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

async function ensureSignedIn(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    const authForm = page.locator('ha-auth-form').first();
    if (await authForm.count()) {
        const loginInputs = authForm.getByRole('textbox');
        if ((await loginInputs.count()) >= 2) {
            await loginInputs.nth(0).fill(HA_USERNAME);
            await loginInputs.nth(1).fill(HA_PASSWORD);
            const loginButton = page.getByRole('button', { name: /log in|anmelden/i });
            await loginButton.first().click();
            await page.waitForLoadState('networkidle');
        }
    }
}

test('Probe Date Picker Functionality', async ({ page }) => {
    console.log('Navigating to panel...');
    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);

    // Navigate to Analyze tab
    await page.locator('#nav-right').click();
    await expect(page.locator('#analyse-range-card')).toBeVisible();

    // 1. Check Initial State
    const startInput = page.locator('#analyse-date-start');
    const endInput = page.locator('#analyse-date-end');
    const applyButton = page.locator('#analyse-range-apply');

    const initialStart = await startInput.inputValue();
    const initialEnd = await endInput.inputValue();
    console.log(`Initial Dates: ${initialStart} - ${initialEnd}`);

    // 2. Change Start Date
    const newStart = '2025-01-01';
    console.log(`Setting start date to ${newStart}`);
    await startInput.fill(newStart);
    // Trigger change event if fill doesn't (Playwright fill usually does, but sometimes needs explicit blur or dispatch)
    await startInput.dispatchEvent('change');

    // Verify it sticks immediately in input
    const currentStart = await startInput.inputValue();
    expect(currentStart).toBe(newStart);

    // 3. Click Apply (or wait for debounce?)
    // Code says: input change triggers debounceLoad, Apply button also triggers load.
    // Let's click Apply to be sure.
    await applyButton.click();

    // 4. Verify Selection Label Updated?
    // renderTotals calculates label from selection.
    await expect(page.locator('#analyse-selection-label')).toContainText(newStart);

    // 5. Check URL or persistent state if applicable (not testing persistence yet, just interactions)

    // 6. Test Single Day Mode
    console.log('Switching to Single Day Mode');
    await page.locator('input[name="analyse-range-mode"][value="date"]').check();
    await expect(page.locator('.analyse-single-field')).toBeVisible();
    await expect(page.locator('.analyse-range-fields')).not.toBeVisible();

    const singleInput = page.locator('#analyse-date-single');
    await singleInput.fill('2025-11-20');
    await singleInput.dispatchEvent('change');
    await applyButton.click();

    await expect(page.locator('#analyse-selection-label')).toContainText('2025-11-20');
});
