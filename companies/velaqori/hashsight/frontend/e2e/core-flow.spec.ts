import { test, expect } from '@playwright/test';

/**
 * E2E core flow + documentation screenshots.
 * Run via ../../scripts/run-e2e.sh hashsight (starts backend + frontend first).
 * Screenshots land in docs/screenshots/hashsight/ at the repository root.
 */
const SHOTS = `${process.env.SCREENSHOT_DIR || '../../docs/screenshots/hashsight'}`;

test('account, primary workflow, screenshots', async ({ page }) => {
  const email = `e2e-hashsight@training.example`;
  const password = 'demo-password-123';

  await page.goto('/login');
  await page.screenshot({ path: `${SHOTS}/01-login.png`, fullPage: true });

  await page.getByRole('button', { name: /register/i }).click();
  await page.getByPlaceholder('email').fill(email);
  await page.getByPlaceholder(/password/).fill(password);
  await page.getByRole('button', { name: /register/i }).last().click();
  await expect(page).toHaveURL(/\/$|/);
  await page.screenshot({ path: `${SHOTS}/02-dashboard.png`, fullPage: true });
});
