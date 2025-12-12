
import { type Page, expect, test } from '@playwright/test';

const panelPath = '/ppreader';

async function ensureSignedIn(page: Page): Promise<void> {
    const HA_USERNAME = process.env.PP_READER_HA_USERNAME ?? 'dev';
    const HA_PASSWORD = process.env.PP_READER_HA_PASSWORD ?? 'dev';
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

test('Verify Analyze Tab UI Refactor', async ({ page }) => {
    test.setTimeout(60000);
    const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
    await page.goto(`${panelPath}?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`);
    await ensureSignedIn(page);

    // Navigate to Analyse tab
    await page.locator('#nav-right').click();

    // Check for Range Card
    const rangeCard = page.locator('#analyse-range-card');
    await expect(rangeCard).toBeVisible();

    // Check for new Metrics Grid
    const metricsGrid = rangeCard.locator('.analyse-metrics-grid');
    await expect(metricsGrid).toBeVisible();

    // Check for sections
    const sections = metricsGrid.locator('.metrics-section');
    await expect(sections).toHaveCount(3); // Expecting 3 sections

    // Check for headers
    await expect(sections.first().locator('h3')).toContainText('Vermögensentwicklung');

    // Check for rows
    const rows = metricsGrid.locator('.metric-row');
    await expect(rows).not.toHaveCount(0);

    // Ensure Performance Card is GONE
    const perfCard = page.locator('#analyse-performance-card');
    await expect(perfCard).not.toBeVisible();

    console.log('UI Refactor Verified: Grid present, Performance card removed.');
});
