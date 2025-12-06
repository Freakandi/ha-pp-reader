import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const HA_USERNAME = process.env.PP_READER_HA_USERNAME ?? 'dev';
const HA_PASSWORD = process.env.PP_READER_HA_PASSWORD ?? 'dev';
const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

async function ensureSignedIn(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  const authForm = page.locator('ha-auth-form').first();
  if (!(await authForm.count())) {
    console.info('[pp_reader][ui-test] no HA login form detected, url=', page.url());
    return;
  }
  const loginInputs = authForm.getByRole('textbox');
  const inputCount = await loginInputs.count();
  if (inputCount < 2) {
    console.warn('[pp_reader][ui-test] login textboxes unavailable, count=', inputCount);
    return;
  }
  console.info('[pp_reader][ui-test] filling HA login form at', page.url());

  await loginInputs.nth(0).fill(HA_USERNAME);
  await loginInputs.nth(1).fill(HA_PASSWORD);

  const loginButton = page.getByRole('button', { name: /log in|anmelden/i });
  if (await loginButton.count()) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {}),
      loginButton.first().click(),
    ]);
  } else {
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(500);
}

async function openDashboardPanel(page: Page): Promise<void> {
  await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
  await ensureSignedIn(page);
  if (!page.url().includes('/ppreader')) {
    await page.goto(panelPath, { waitUntil: 'networkidle' });
  }
}

test.describe('Portfolio Performance Reader dashboard', () => {
  test('renders the dashboard shell with the Vite dev server assets', async ({ page }) => {
    await openDashboardPanel(page);
    await page.waitForURL(/\/ppreader/i, { timeout: 60_000 });

    // The dashboard header renders as an H1 inside the pp-reader-panel shadow DOM.
    await expect(
      page.getByRole('heading', { name: 'Portfolio Dashboard', exact: true }),
    ).toBeVisible({ timeout: 60_000 });

    // Basic smoke check to ensure the dashboard root custom element attached.
    const hasDashboardRoot = await page
      .locator('pp-reader-panel')
      .evaluateAll((elements) => elements.length > 0)
      .catch(() => false);
    expect(hasDashboardRoot).toBeTruthy();
  });
});
