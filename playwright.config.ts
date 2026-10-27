import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser quality gate. The vitest axe suite runs under jsdom, where
 * layout does not exist; this suite drives Chromium so colour contrast,
 * hit-box geometry, keyboard traps, reduced-motion handling and scrollable
 * regions are measured against a rendered DOM, and screenshot baselines guard
 * the visual changes behind the deferred TOKEN-SPACING-01 cleanup.
 *
 * Both preview servers are started automatically. Browsers are installed in CI
 * via `npx playwright install --with-deps chromium`; local runs need the same
 * command once after `npm ci`.
 */
const PORTFOLIO_URL = 'http://localhost:4173';
const VOCAL_URL = 'http://localhost:4174';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : 'list',
  use: {
    baseURL: PORTFOLIO_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run preview -- --port 4173',
      url: `${PORTFOLIO_URL}/`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview --prefix vocal-separator/web',
      url: `${VOCAL_URL}/`,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
