import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  ALL_ROUTES,
  INTERACTIVE_ROUTES,
  PORTFOLIO_URL,
} from './fixtures/routes';

/**
 * Runtime accessibility in a real browser. The jsdom axe suite
 * (`src/test/axe-a11y.test.tsx`) must disable layout-dependent rules; here the
 * full WCAG 2.x A/AA + 2.2 AA + best-practice rule set runs against rendered
 * Chromium, including color-contrast, target-size and scrollable-region-focusable.
 */
function axe(page: import('@playwright/test').Page): Promise<{
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];
}> {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'])
    .analyze()
    .then((results) => ({ violations: results.violations }));
}

function describeViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  // Keep the message compact: full violation objects overflow CI annotations
  // and truncate the nodes we actually need to read.
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 8)
        .map((node) => {
          const ratio = node.any
            .map((check) => check.data)
            .filter(
              (data): data is Record<string, unknown> =>
                Boolean(data) &&
                typeof data === 'object' &&
                'contrastRatio' in data,
            )
            .map((d) => `${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1`)
            .join(', ');
          return `${node.target.join(' ')}${ratio ? ` [${ratio}]` : ''}`;
        })
        .join(' | ');
      return `${violation.id} (${violation.nodes.length} nodes): ${nodes}`;
    })
    .join('\n');
}

test.describe('full-rule axe audits across every route', () => {
  for (const route of ALL_ROUTES) {
    test(`axe with layout rules enabled: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.locator('h1').first().waitFor();
      // Give lazy/dynamic content a tick without requiring a fully idle network.
      await page.waitForLoadState('networkidle').catch(() => undefined);

      const { violations } = await axe(page);

      expect(violations, describeViolations(violations)).toEqual([]);
    });
  }
});

test.describe('keyboard access', () => {
  for (const route of INTERACTIVE_ROUTES) {
    test(`Tab traversal never traps focus on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.locator('h1').first().waitFor();

      // Only walk the page's own focusables — never tab past the document into
      // browser chrome, which would make reverse-direction results meaningless.
      const focusableCount = await page.evaluate(() => {
        const selector =
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll(selector)).filter(
          (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none'
            );
          },
        ).length;
      });
      const steps = Math.min(Math.max(focusableCount, 1), 25);

      // Identity must distinguish same-tag siblings (a row of anchors/buttons
      // or bare inputs): the focusable index makes every stop unique even when
      // id/name/aria-label/class are all absent.
      const identity = () =>
        page.evaluate(() => {
          const selector =
            'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusables = Array.from(
            document.querySelectorAll(selector),
          );
          const element = document.activeElement;
          if (!element || element === document.body) return 'body';
          const index = focusables.indexOf(element);
          const className =
            typeof element.className === 'string'
              ? element.className.split(' ').slice(0, 2).join('.')
              : '';
          const labelText =
            element instanceof HTMLInputElement && element.labels?.length
              ? element.labels[0]?.textContent?.trim().slice(0, 30)
              : '';
          return [
            `[${index}]`,
            element.tagName.toLowerCase(),
            element.id && `#${element.id}`,
            element.getAttribute('name') &&
              `[name=${element.getAttribute('name')}]`,
            element.getAttribute('aria-label') &&
              `[aria=${element.getAttribute('aria-label')}]`,
            className && `.${className}`,
            labelText,
            (element.textContent ?? '').trim().slice(0, 30),
          ]
            .filter(Boolean)
            .join(':');
        });

      await page.keyboard.press('Tab');
      const stops: string[] = [];
      for (let i = 0; i < steps; i += 1) {
        stops.push(await identity());
        await page.keyboard.press('Tab');
      }

      const focusableStops = stops.filter((stop) => stop !== 'body');
      expect(
        new Set(focusableStops).size,
        `only ${new Set(focusableStops).size} distinct stops: ${focusableStops.join(' -> ')}`,
      ).toBeGreaterThanOrEqual(8);
      for (let i = 2; i < focusableStops.length; i += 1) {
        const trapped =
          focusableStops[i] === focusableStops[i - 1] &&
          focusableStops[i - 1] === focusableStops[i - 2];
        expect(trapped, `focus stuck on ${focusableStops[i]}`).toBe(false);
      }

      // Reverse direction must move focus as well, not pin it. We are still
      // inside the document because steps never exceeded the focusable count.
      const reverse: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Shift+Tab');
        reverse.push(await identity());
      }
      expect(
        new Set(reverse).size,
        `reverse traversal stuck: ${reverse.join(' -> ')}`,
      ).toBeGreaterThan(1);
    });
  }
});

test('prefers-reduced-motion collapses every transition and animation', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${PORTFOLIO_URL}/`);
  await page.locator('h1').first().waitFor();

  const offenders = await page.evaluate(() => {
    const rows: string[] = [];
    document.querySelectorAll('*').forEach((element) => {
      const style = getComputedStyle(element);
      const transition = Number.parseFloat(style.transitionDuration) || 0;
      const animation = Number.parseFloat(style.animationDuration) || 0;
      if (transition > 0.01 || animation > 0.01) {
        rows.push(
          `${element.tagName.toLowerCase()} ${element.className.toString().slice(0, 60)}`,
        );
      }
    });
    return rows;
  });

  expect(offenders).toEqual([]);
  await context.close();
});

test.describe('hit-box geometry', () => {
  for (const route of INTERACTIVE_ROUTES) {
    test(`visible controls meet the 24px WCAG 2.2 minimum on ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.locator('h1').first().waitFor();

      const undersized = await page.evaluate(() => {
        const isVisible = (element: Element): boolean => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        };
        return Array.from(
          document.querySelectorAll(
            'button, a[href], input, select, textarea, [role="button"]',
          ),
        )
          .filter(isVisible)
          // sr-only controls (skip links, visually-hidden file inputs) are
          // 1px at rest by design and reachable through their visible alternatives.
          .filter((element) => !element.classList.contains('sr-only'))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              descriptor: `${element.tagName.toLowerCase()} ${(
                element.getAttribute('aria-label') ??
                element.textContent ??
                ''
              )
                .trim()
                .slice(0, 40)}`,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
          .filter((box) => box.width < 24 || box.height < 24);
      });

      expect(
        undersized,
        undersized
          .map((box) => `${box.descriptor} = ${box.width}x${box.height}`)
          .join('\n'),
      ).toEqual([]);
    });
  }
});
