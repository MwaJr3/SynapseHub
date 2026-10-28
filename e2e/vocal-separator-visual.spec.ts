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
