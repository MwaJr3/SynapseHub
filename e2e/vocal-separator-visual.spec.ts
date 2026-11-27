import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { VOCAL_URL } from './fixtures/routes';

/**
 * Visual-regression baselines for the vocal-separator standalone app.
 *
 * These screenshots cover the unauthenticated shell, including the offline
 * and request-status notices. The E2E workflow regenerates baselines when the
 * snapshot directory has no PNG fixtures; normal runs compare the rendered
 * shell against the checked-in desktop and mobile images with a strict
 * pixel-difference tolerance.
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
