import { defineConfig, devices } from '@playwright/test'
const python =
  process.env.TW_PYTHON ||
  (process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python')
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    actionTimeout: 15000,
    baseURL: 'http://127.0.0.1:5311',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    {
      command: `"${python}" ../scripts/run_e2e_backend.py`,
      url: 'http://127.0.0.1:8001/api/v1/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev -- --port 5311',
      url: 'http://127.0.0.1:5311',
      reuseExistingServer: false,
      timeout: 60000,
      env: { VITE_API_TARGET: 'http://127.0.0.1:8001' },
    },
  ],
})
