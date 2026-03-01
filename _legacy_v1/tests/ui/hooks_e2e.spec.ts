import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';

const HA_USERNAME = process.env.PP_READER_HA_USERNAME ?? 'dev';
const HA_PASSWORD = process.env.PP_READER_HA_PASSWORD ?? 'dev';
const devServerUrl = process.env.PP_READER_VITE_URL ?? 'http://127.0.0.1:5173';
const panelPath = `/ppreader?pp_reader_dev_server=${encodeURIComponent(devServerUrl)}`;

// Helper to ensure login
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
      page.waitForLoadState('networkidle').catch(() => { }),
      loginButton.first().click(),
    ]);
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(500);
}

test.describe('Analyse Tab - Data Hooks E2E', () => {
  // 1. Seed known values before running tests
  test.beforeAll(() => {
    console.log('Seeding known values into DB...');
    const scriptPath = 'scripts/testing/seed_e2e_values.py';
    try {
      execSync(`python3 ${scriptPath} --days 30`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to seed values:', error);
      throw error;
    }
  });

  test('Displays correct total wealth from seeded data', async ({ page }) => {
    // Enable console logging from browser
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
      else console.log('BROWSER LOG:', msg.text());
    });
    page.on('pageerror', err => { console.log('BROWSER UNCAUGHT ERROR:', err); });
    // Log network errors only
    page.on('requestfailed', req => { console.error('NETWORK FAIL:', req.url(), req.failure()?.errorText); });

    // Intercept panel.js to ensure we test the latest on-disk version AND disable dev server lookup
    await page.route('**/panel.js*', async route => {
      const original = fs.readFileSync('custom_components/pp_reader/www/pp_reader_dashboard/panel.js', 'utf8');
      // Disable dev server lookup to avoid connecting to localhost:5173
      const modified = original.replace('const devServerUrl = resolveDevServerUrl();', 'const devServerUrl = null; // resolveDevServerUrl();');
      await route.fulfill({
        body: modified,
        contentType: 'application/javascript'
      });
    });
    // Intercept dashboard module shim
    await page.route('**/dashboard.module.js*', async route => {
      console.log('Intercepted dashboard.module.js request');
      await route.fulfill({ path: 'custom_components/pp_reader/www/pp_reader_dashboard/js/dashboard.module.js' });
    });
    // Intercept hashed bundle (optional, verifying path)
    await page.route('**/dashboard.*.js', async route => {
      const url = route.request().url();
      // Extract filename from URL
      const filename = url.split('/').pop();
      if (filename) {
        const localPath = `custom_components/pp_reader/www/pp_reader_dashboard/js/${filename}`;
        // Check if exists? Route fulfill will 404 if not found?
        // Helper logic: try fulfill, if fails fallback to continue?
        // Simplest: just map to local path
        console.log(`Intercepted bundle request: ${filename} -> ${localPath}`);
        await route.fulfill({ path: localPath });
      } else {
        await route.continue();
      }
    });

    // 2. Open Panel
    await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    await ensureSignedIn(page);

    // Ensure we are on the panel
    if (!page.url().includes('/ppreader')) {
      await page.goto(panelPath, { waitUntil: 'domcontentloaded' });
    }



    // Helper to dump DOM structure including Shadow Roots
    const dumpStructure = async () => {
      return await page.evaluate(() => {
        function dumpNode(node: Node, depth: number): string {
          let output = "  ".repeat(depth);
          if (node instanceof Element) {
            output += node.tagName.toLowerCase();
            if (node.id) output += "#" + node.id;
            if (node.className && typeof node.className === 'string') {
              output += "." + node.className.split(/\s+/).join(".");
            } else if (node.classList.length > 0) {
              output += "." + Array.from(node.classList).join(".");
            }
          } else {
            return ""; // Skip text nodes for brevity
          }

          let children = "";
          if (node instanceof Element && node.shadowRoot) {
            output += " (SHADOW-ROOT)";
            Array.from(node.shadowRoot.children).forEach(child => {
              const childDump = dumpNode(child, depth + 1);
              if (childDump) children += "\n" + childDump;
            });

            // Also dump light children (slotted content)
            if (node.children.length > 0) {
              children += "\n" + "  ".repeat(depth) + "  (LIGHT-CHILDREN)";
              Array.from(node.children).forEach(child => {
                const childDump = dumpNode(child, depth + 2);
                if (childDump) children += "\n" + childDump;
              });
            }
          } else if (node instanceof Element) {
            Array.from(node.children).forEach(child => {
              const childDump = dumpNode(child, depth + 1);
              if (childDump) children += "\n" + childDump;
            });
          }
          return output + children;
        }
        return dumpNode(document.body, 0);
      });
    };

    // Wait for the panel generic container
    await expect(page.locator('pp-reader-dashboard')).toBeVisible({ timeout: 15000 }).catch(async () => {
      console.log('pp-reader-dashboard not visible. Trying to navigate via sidebar...');

      // Look for text "Portfolio Dashboard"
      const link = page.getByRole('link', { name: 'Portfolio Dashboard' }).first();
      if (await link.isVisible()) {
        await link.click();
        await expect(page.locator('pp-reader-dashboard')).toBeVisible({ timeout: 10000 });
      } else {
        // Dump full content if failed
        console.log('Sidebar link not found either. Dumping FULL DOM STRUCTURE...');
        console.log(await dumpStructure());
        throw new Error('pp-reader-dashboard not visible and cannot navigate via sidebar');
      }
    });

    // Check for error card
    const errorCard = page.locator('div.card h2:has-text("Fehler")');
    if (await errorCard.isVisible()) {
      const errorText = await page.locator('div.card pre').textContent();
      console.error('Render Error detected:', errorText);
      throw new Error(`Dashboard render error: ${errorText ?? 'Unknown error'}`);
    }

    // Dump dashboard inner HTML for debugging
    const dashboardHtml = await page.locator('pp-reader-dashboard').innerHTML();
    console.log('DASHBOARD HTML:', dashboardHtml);

    // 3. Navigate to Analyse tab
    const navRight = page.locator('#nav-right');
    await expect(navRight).toBeVisible({ timeout: 10000 });

    await navRight.click();

    // 4. Wait for the chart/data to load
    const rangeCard = page.locator('#analyse-range-card');
    await expect(rangeCard).toBeVisible({ timeout: 15000 });

    // 5. Verify Total Wealth
    // The seed script generates 30 days of data.
    // Base = 10000. Increment = 100.
    // Day 30 Total = 10000 + (30 * 100) = 13000.
    // NOTE: The script loop goes from 0 to 30 inclusive (so 31 days).
    // range: 0..30.
    // Wealth on day 30: 10000 + 3000 = 13000.

    // We expect "13.000,00 €" (German locale formatting usually used in HA or by the app)
    // The app likely uses the browser locale or a fixed one.
    // Let's check for "13.000" or simple "13000" regex.

    // We look for the "Total Wealth" KPI card or header.
    // Based on typical UI, there is a large number for current wealth.
    // Need a selector. `id="kpi-total-wealth"`?
    // Let's try locating by text if ID is unknown, or look for a big number.

    // Better: let's dump the text content of the KPIs to debug if fails.
    // But we should try to find the "Gesamtvermögen" or similar label.

    // Assuming there is a KPI card with "Total Value" or "Aktueller Wert".
    // In German: "Gesamtvermögen" or "Aktueller Wert".

    // Let's try a loose text match for 13.000
    // "13.000,00 €" or similar.

    // We expect "13.000,00 €"
    // Use aria-label for more robust navigation if needed, but here we focus on wealth

    // Debug: Log the actual content of the wealth element
    const wealthText = page.locator('#analyse-total-wealth');
    await expect(wealthText).toBeVisible();

    await expect(wealthText).toContainText(/13\.000/);

    // Check coverage badges are "Volle Abdeckung" (Full Coverage)
    // Since we seeded perfect data (ratio 1.0)
    const coverageEl = page.locator('#analyse-coverage');
    await expect(coverageEl).toContainText('Volle Abdeckung');

    // Also verify "Delta" if possible.
    // Total Change = End - Start? Or End - Previous?
    // If "Max" range is selected (default might be 1M).
    // 1M gain = 30 * 100 = 3000.
    // "3.000,00 €"

    // Ensuring the correct range is selected is tricky without explicit ID.
    // But if we seeded 30 days and default is 1M (30 days), it should match.

  });
});
