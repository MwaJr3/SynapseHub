import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { VOCAL_URL } from './fixtures/routes';

/**
 * Visual-regression baselines for the vocal-separator standalone app.
 *
 * These screenshots are the gating prerequisite for normalising its 75
 * deferred TOKEN-SPACING-01 findings: any spacing-token change must leave the
 * rendered shell pixel-stable (within a small antialiasing tolerance). The
 * suite runs without the Python backend, exercising the unauthenticated shell
 * — its health fetch fails silently and the view is otherwise static, so the
 * baselines are deterministic.
 *
 * KNOWN STALE BASELINE (documented exception, PR #153, 2026-11-25): the
 * `vocal-shell-mobile` baseline predates the offline-notice commits
 * (`b73e61b9`, `2df6e3b`) that mounted OfflineBanner/RequestStatus into this
 * app. CI reports expected 390×2779 vs received 390×2805 — the added notice
 * strip — with the desktop baseline and the other 32 tests passing, so this
 * is a stale fixture, not a test defect or a product regression. Regenerate
 * with the workflow's own mechanism: Actions → Playwright browser suite →
 * Run workflow → `update_snapshots` (commits the fresh baselines back to the
 * branch), or `npm run e2e:update` where Playwright's chromium can be
 * downloaded. The API dispatch from an automation account needs
 * `actions: write` and currently returns 403.
 */
test.describe('vocal separator visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(VOCAL_URL);
    // The brand header renders immediately; wait for it plus one frame so
    // web fonts and layout settle before capturing.
    await page.locator('body').waitFor();
    await page.waitForTimeout(400);
  });

  test('unauthenticated shell at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page).toHaveScreenshot('vocal-shell-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('unauthenticated shell at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveScreenshot('vocal-shell-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('shell passes the full axe rule set without a backend', async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'])
      .analyze();

    expect(
      results.violations,
      results.violations
        .map(
          (violation) =>
            `${violation.id}: ${violation.nodes
              .slice(0, 5)
              .map((node) => node.target.join(' '))
              .join('; ')}`,
        )
        .join('\n'),
    ).toEqual([]);
  });
});
