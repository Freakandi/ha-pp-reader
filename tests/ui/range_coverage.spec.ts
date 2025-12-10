import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

const HA_USERNAME = process.env.PP_READER_HA_USERNAME ?? 'dev';
const HA_PASSWORD = process.env.PP_READER_HA_PASSWORD ?? 'dev';
const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

// Helper to ensure login (copied from smoke test pattern)
async function ensureSignedIn(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  const authForm = page.locator('ha-auth-form').first();
  if (!(await authForm.count())) {
    return;
  }
  const loginInputs = authForm.getByRole('textbox');
  if ((await loginInputs.count()) < 2) {
    return;
  }

  await loginInputs.nth(0).fill(HA_USERNAME);
  await loginInputs.nth(1).fill(HA_PASSWORD);

  const loginButton = page.getByRole('button', { name: /log in|anmelden/i });
  if (await loginButton.count()) {
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      loginButton.first().click(),
    ]);
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(500);
}

test.describe('Analyse Tab - Range Coverage', () => {
  // 1. Inject gaps before running tests
  test.beforeAll(() => {
    console.log('Injecting coverage gaps into DB...');
    // Use relative path from CWD (repo root)
    const scriptPath = 'scripts/testing/inject_coverage_gap.py';
    try {
      execSync(`python3 ${scriptPath}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to inject gaps:', error);
      throw error;
    }
  });

  test('Shows warning badges when selected range has missing coverage', async ({ page }) => {
    // 2. Open Panel
    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);
    if (!page.url().includes('/ppreader')) {
      await page.goto(panelPath, { waitUntil: 'networkidle' });
    }

    // 3. Wait for Analyse tab to be visible (it's the default or switching might be needed)
    // Assuming Analyse is one of the tabs. If tabs are used, we might need to click it.
    // Based on typical layout, if "Overview" is default, we need to switch.
    // Let's check if we need to click a tab named "Analyse" or similar.
    // However, looking at the code, `Analyse` seems to be a section or tab.
    // Let's assume for now we are on the dashboard and look for the range picker.
    // If multiple tabs exist, we'd need to select "Analyse" from a navigation menu.
    // A quick check of `analyse.ts` shows it renders `id="analyse-range-card"`.

    // Wait for the range card to appear
    // Navigate to Analyse tab (right arrow from Dashboard)
    const navRight = page.locator('#nav-right');
    await expect(navRight).toBeVisible();
    await navRight.click();

    // Wait for the range card to appear
    const rangeCard = page.locator('#analyse-range-card');
    await expect(rangeCard).toBeVisible({ timeout: 15000 });

    // 4. Select the range that includes the gaps
    // The script injects gaps 15 days ago for 5 days.
    // The default range is 30 days, which *should* cover it.
    // So simply verifying the default state might be enough if the gaps are within the last 30 days.

    // Let's verify if badges are present.
    const coverageEl = page.locator('#analyse-coverage');
    await expect(coverageEl).toBeVisible();

    // Check for "FX-Abdeckung" warning badge
    const fxBadge = coverageEl.locator('.meta-badge--warning[title*="Wechselkurse"]');
    await expect(fxBadge).toBeVisible();

    // Check for "Preisabdeckung" warning badge
    const priceBadge = coverageEl.locator('.meta-badge--warning[title*="Preisdaten"]');
    await expect(priceBadge).toBeVisible();

    // Optional: Switch to "One Day" mode and pick a date *without* gaps to verify badges disappear?
    // That would be a good robust check, but for now sticking to the positive "warning exists" case.
  });
});
