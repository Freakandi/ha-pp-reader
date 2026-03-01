
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

test('Probe Wealth Aggregation', async ({ page }) => {
    // Intercept the WebSocket response or just read the UI?
    // Reading UI is easier for "what the user sees".
    // But we want to know if the *data* is consistent.

    // Listen for WebSocket frames (Playwright doesn't easily inspect WS frames yet without CDP)
    // Alternatively, we can inspect the DOM if the data is rendered.

    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);
    await page.locator('#nav-right').click(); // Analyze tab

    // Wait for the wealth to be rendered
    const totalWealthEl = page.locator('#analyse-total-wealth');
    await expect(totalWealthEl).not.toHaveText('—');

    // Parse the total wealth from UI
    const totalText = await totalWealthEl.innerText();
    const totalValue = parseFloat(totalText.replace(/\./g, '').replace(',', '.').replace(' €', ''));
    console.log(`UI Total Wealth: ${String(totalValue)}`);

    // Now sum up the table rows?
    // Note: The UI separates "Konten" (Accounts) and "Depots" (Portfolios) into scopes,
    // but the tables rendered are "Vermögensverlauf" (Breakdown?) and "Liquidität".
    // Wait, the screenshot shows "Konten" and "Depots" sections in the scope selector,
    // but the *tables* are "Konten" (Positions?) and "Liquidität".
    // Let's look at the DOM structure for tables.

    // Table 1: "#analyse-range-card .account-table" ? No, `renderPerformance` renders tables?
    // Actually `analyse.ts` `renderPerformance` renders a table with class `performance-table`.
    // And `renderAnalyse` renders separate cards: "Vermögensverlauf", "Liquidität", "Fremdwährungen".

    // Let's try to sum up values from the "Performance" table if it exists?
    // Or just grab the "Summe" rows.

    // Wait for tables to render
    await page.waitForSelector('.footer-row', { timeout: 5000 }).catch(() => { console.log('Timeout waiting for footer-row'); });

    const html = await page.innerHTML('#analyse-range-card');
    console.log('Card HTML length:', html.length);
    console.log(html);

    // Listen to console for any "Received daily_wealth" logs if the frontend behaves nicely
    // Or just look at the dump.

    // Also check if performance card is visible
    const perfCard = page.locator('#analyse-performance-card');
    if (await perfCard.count() > 0) {
        console.log('Performance Card Content:', await perfCard.innerHTML());
    } else {
        console.log('Performance Card NOT FOUND');
    }

    const sumRows = page.locator('.footer-row'); // Try class selector less specific
    const sumCount = await sumRows.count();
    console.log(`Found ${String(sumCount)} footer rows (relaxed selector)`);

    for (let i = 0; i < sumCount; i++) {
        const row = sumRows.nth(i);
        const text = await row.innerText();
        console.log(`Footer ${String(i)}: ${text.replace(/\n/g, ' ')}`);

        const val = await row.getAttribute('data-current-value');
        if (val) console.log(`  data-current-value: ${val}`);
    }
});
