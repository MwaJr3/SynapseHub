import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', timeout:60000, fullyParallel:false, workers:1,
  use:{ baseURL:'http://127.0.0.1:3010', headless:true, launchOptions:{ executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, args:process.env.PLAYWRIGHT_EXECUTABLE_PATH ? ['--no-sandbox','--disable-dev-shm-usage','--no-zygote'] : [] } },
  webServer:{ command:'PGLITE_PATH=.data/e2e-postgres DEMO_MODE=true npm run dev -- --port 3010', url:'http://127.0.0.1:3010', reuseExistingServer:!process.env.CI, timeout:120000 },
});
