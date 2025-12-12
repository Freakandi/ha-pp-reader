
import { type Page, expect, test } from '@playwright/test';

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

test('Date Picker Switch Back to Range', async ({ page }) => {
    test.setTimeout(60000);
    console.log('Navigating to panel...');
    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);

    // Navigate to Analyse tab
    await page.locator('#nav-right').click();

    const rangeRadio = page.locator('input[name="analyse-range-mode"][value="range"]');
    const dateRadio = page.locator('input[name="analyse-range-mode"][value="date"]');

    // Ensure we are in Range mode initially
    await expect(rangeRadio).toBeChecked();

    // Force clear the range inputs to simulate "empty" state or invalid state
    await page.locator('#analyse-date-start').fill('');
    await page.locator('#analyse-date-end').fill('');

    console.log('Switching to Single Day Mode...');
    await dateRadio.click({ force: true });
    await expect(dateRadio).toBeChecked();

    // Wait a bit for UI to settle
    await page.waitForTimeout(1000);

    console.log('Switching back to Range Mode...');
    await rangeRadio.click({ force: true });

    // Assertion: Range mode should be checked AND Range inputs should be visible
    await expect(rangeRadio).toBeChecked({ timeout: 5000 });
    await expect(page.locator('.analyse-range-fields')).toBeVisible();
    await expect(page.locator('.analyse-single-field')).not.toBeVisible();
    console.log('Successfully switched back to Range Mode with empty inputs');
});
