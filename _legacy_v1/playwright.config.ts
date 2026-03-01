import { defineConfig, devices } from '@playwright/test';

const haBaseUrl = process.env.PP_READER_HA_BASE_URL ?? 'http://127.0.0.1:8123';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'tmp/playwright-report', open: 'never' }], ['list']]
    : 'list',
  use: {
    baseURL: haBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'WebKit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  outputDir: 'tmp/playwright-results',
  workers: process.env.CI ? 3 : undefined,
});
