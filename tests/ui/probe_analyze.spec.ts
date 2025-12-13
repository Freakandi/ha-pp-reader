
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

test('Probe Analyze Tab State', async ({ page }) => {
    console.log('Navigating to panel...');
    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);

    // Navigate to Analyze tab
    console.log('Clicking nav-right...');
    await page.locator('#nav-right').click();
    await expect(page.locator('#analyse-range-card')).toBeVisible();

    // Screenshot 1: Analyze Tab Initial State
    await page.screenshot({ path: 'artifacts/analyze_tab_initial.png', fullPage: true });

    // Inspect Scope Filters
    const scopeFiltersHtml = await page.locator('.analyse-scope-filters').innerHTML();
    console.log('Scope Filters HTML:', scopeFiltersHtml);

    const scopeLabels = await page.locator('.analyse-scope-filters label.scope-option span').allInnerTexts();
    console.log('Scope Labels Found:', scopeLabels.length);
    console.log('Scope Labels Sample:', scopeLabels.slice(0, 10));

    // Inspect Date Inputs
    const startDate = await page.locator('#analyse-date-start').inputValue();
    const endDate = await page.locator('#analyse-date-end').inputValue();
    console.log(`Date Inputs: Start=${startDate}, End=${endDate}`);

    // Assertions for "UUID issue"
    const potentialUuids = scopeLabels.filter(l => l.match(/^[0-9a-f]{8}-[0-9a-f]{4}/));
    console.log('Potential UUID Labels:', potentialUuids.length);

    if (potentialUuids.length > 0) {
        console.log('FAIL: Found UUIDs in scope list');
    } else {
        console.log('PASS: No UUIDs found in scope list');
    }

    expect(potentialUuids.length).toBe(0);

    // Verify deduplication
    // We expect a reasonable number of unique scopes (e.g. < 50), not hundreds
    console.log(`Total Scope Labels: ${String(scopeLabels.length)}`);
    expect(scopeLabels.length).toBeLessThan(50);
    expect(scopeLabels.length).toBeGreaterThan(0);

    // Verify Performance Calculation Section
    const metricsGrid = page.locator('.analyse-metrics-grid');
    await expect(metricsGrid).toBeVisible();
    await expect(metricsGrid).toContainText('Performance-Berechnung');

    const expectedLabels = [
        'Anfangswert',
        'Kurserfolge',
        'Dividenden',
        'Zinsen',
        'Gebühren',
        'Steuern',
        'Performanceneutrale Bew.',
        'Endwert'
    ];

    for (const label of expectedLabels) {
        await expect(metricsGrid).toContainText(label);
    }
    console.log('PASS: Performance Calculation labels verified');
});
