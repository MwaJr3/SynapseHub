import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const base = process.env.SMOKE_URL || 'http://127.0.0.1:5173';
let libraryPath = process.env.LD_LIBRARY_PATH ?? '';
// The npm-distributed Linux Chromium includes NSS libraries; unpack them when the
// sandbox has no system browser dependencies. Nothing is downloaded at test time.
if (process.platform === 'linux' && !process.env.SMOKE_CHROMIUM_PATH) {
  const require = createRequire(import.meta.url);
  const pkg = path.resolve(
    path.dirname(require.resolve('@sparticuz/chromium')),
    '../..',
  );
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'synapse-browser-'));
  const tarball = path.join(folder, 'libraries.tar');
  await fs.writeFile(
    tarball,
    brotliDecompressSync(
      await fs.readFile(path.join(pkg, 'bin/al2023.tar.br')),
    ),
  );
  execFileSync('tar', ['-xf', tarball, '-C', folder]);
  libraryPath = `${path.join(folder, 'lib')}:${libraryPath}`;
}
const browser = await playwright.launch({
  executablePath:
    process.env.SMOKE_CHROMIUM_PATH || (await chromium.executablePath()),
  args: chromium.args.filter(
    (arg) =>
      !['--disable-web-security', '--allow-running-insecure-content'].includes(
        arg,
      ),
  ),
  env: { ...process.env, LD_LIBRARY_PATH: libraryPath },
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1360, height: 960 },
  });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/synapsehub`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Quick capture/ }).click();
  await page.getByLabel('Type', { exact: true }).selectOption('source');
  await page
    .getByLabel('Title', { exact: true })
    .fill('Browser research excerpt');
  await page
    .getByLabel('Source excerpt (paste original text)')
    .fill('Voltage is measured in volts.');
  await page.getByRole('button', { name: 'Save source', exact: true }).click();
  await page
    .getByRole('button', { name: /Browser research excerpt source/ })
    .click();
  await page
    .getByRole('button', { name: 'Create linked task', exact: true })
    .click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('Verify voltage measurement');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Complete Verify voltage measurement' })
    .check();
  await page.reload();
  await page.waitForLoadState('networkidle');
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Complete Verify voltage measurement' })
      .isChecked(),
    true,
  );
  // Real SDK sign-in against an intercepted auth transport, never a real account.
  const userId = '11111111-1111-4111-8111-111111111111';
  const payload = {
    sub: userId,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test-signature`;
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'browser@example.org',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      json: {
        access_token: jwt,
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: payload.exp,
        user,
      },
    }),
  );
  await page.route('**/auth/v1/user', (route) => route.fulfill({ json: user }));
  const empty = { version: 1, revision: 0, items: [], relations: [] };
  let cloudRequests = 0;
  await page.route('**/api/workspace', async (route) => {
    cloudRequests++;
    if (route.request().method() === 'PUT')
      return route.fulfill({
        status: 409,
        json: { detail: 'Cloud workspace changed.' },
      });
    return route.fulfill({ json: { revision: 3, workspace: empty } });
  });
  await page.getByLabel('Email', { exact: true }).fill('browser@example.org');
  await page
    .getByLabel('Password', { exact: true })
    .fill('not-a-real-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('button', { name: 'Check cloud version', exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Complete Verify voltage measurement' })
      .count(),
    0,
    'Guest data must not enter the account automatically',
  );
  await page
    .getByRole('button', { name: 'Check cloud version', exact: true })
    .click();
  await page
    .getByText('Cloud revision 3. 0 items. Review before pushing or pulling.')
    .waitFor();
  page.on('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Push local copy', exact: true })
    .click();
  await page.getByText('Cloud workspace changed.', { exact: true }).waitFor();
  assert.equal(cloudRequests, 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForLoadState('networkidle');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    'Mobile viewport must not overflow',
  );
  await fs.mkdir('../../.cache', { recursive: true });
  await page.screenshot({
    path: '../../.cache/synapsehub-mobile-smoke.png',
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: guest source→task persistence; SDK sign-in (mock auth); account isolation; cloud conflict; 390px layout; no page errors.',
  );
} finally {
  await browser.close();
}
