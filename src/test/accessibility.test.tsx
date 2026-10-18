import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { challengeManifest } from '@/data/challengeManifest';

/**
 * Structural accessibility checks.
 *
 * These are automated complements to manual review, not a substitute for it:
 * they catch the mechanical mistakes (missing accessible names, heading order,
 * dangling ARIA references, placeholder links) that are cheap to verify and
 * easy to reintroduce.
 */

const routes: Array<[string, string]> = [
  ['/', 'home'],
  ['/about', 'about'],
  ['/projects', 'project library'],
  ['/apps', 'interactive apps library'],
  ['/apps/poll-creator-app', 'poll creator prototype'],
  ['/apps/body-mass-index-calculator', 'BMI calculator prototype'],
  ['/apps/tic-tac-toe-game', 'tic tac toe prototype'],
  ['/apps/memory-game', 'memory game prototype'],
  ['/apps/dictionary-web-app', 'dictionary prototype'],
  ['/apps/kanban-task-management-web-app', 'kanban prototype'],
  ['/apps/audiophile-ecommerce-website', 'store prototype'],
  ['/apps/art-gallery-website', 'gallery prototype'],
  ['/skills', 'skills'],
  ['/journey', 'journey'],
  ['/contact', 'contact'],
  ['/unknown-route', '404'],
  ...challengeManifest.map(
    (project) =>
      [`/projects/${project.slug}`, `${project.title} case study`] as [
        string,
        string,
      ],
  ),
];

function headingLevels(root: HTMLElement): number[] {
  return Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
    (heading) => Number(heading.tagName.slice(1)),
  );
}

function hasAccessibleName(element: Element): boolean {
  const text = element.textContent?.trim() ?? '';
  if (text.length > 0) return true;
  if (element.getAttribute('aria-label')?.trim()) return true;
  if (element.getAttribute('title')?.trim()) return true;
  return Array.from(element.querySelectorAll('img')).some((img) =>
    Boolean(img.getAttribute('alt')?.trim()),
  );
}

async function renderRoute(path: string): Promise<HTMLElement> {
  const { container } = renderWithProviders(<App />, path);
  // Routes are lazy-loaded, so wait for the page's own h1 before inspecting.
  await screen.findByRole('heading', { level: 1 });
  return container;
}

describe.each(routes)('accessibility structure: %s (%s)', (path) => {
  it('has exactly one top-level heading and no skipped levels', async () => {
    const container = await renderRoute(path);

    const headings = Array.from(
      container.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    );
    expect(headings.filter((heading) => heading.tagName === 'H1')).toHaveLength(
      1,
    );

    let previous = 1;
    for (const level of headingLevels(container)) {
      expect(
        level,
        `heading level ${level} follows level ${previous}`,
      ).toBeLessThanOrEqual(previous + 1);
      previous = level;
    }
  });

  it('gives every link and button an accessible name', async () => {
    const container = await renderRoute(path);

    for (const element of container.querySelectorAll('a, button')) {
      expect(
        hasAccessibleName(element),
        `${element.tagName} "${element.outerHTML.slice(0, 90)}"`,
      ).toBe(true);
    }
  });

  it('contains no placeholder or empty destinations', async () => {
    const container = await renderRoute(path);

    for (const link of Array.from(container.querySelectorAll('a'))) {
      const href = link.getAttribute('href');
      expect(href, `link "${link.textContent?.trim()}"`).toBeTruthy();
      expect(href).not.toBe('#');
      expect(href?.startsWith('javascript:')).toBe(false);
      expect(href === '' || href === undefined).toBe(false);
    }
  });

  it('resolves every ARIA id reference', async () => {
    const container = await renderRoute(path);

    for (const attribute of [
      'aria-controls',
      'aria-labelledby',
      'aria-describedby',
    ]) {
      for (const element of Array.from(
        container.querySelectorAll(`[${attribute}]`),
      )) {
        const ids = (element.getAttribute(attribute) ?? '')
          .split(/\s+/)
          .filter(Boolean);
        for (const id of ids) {
          expect(
            container.querySelector(`#${CSS.escape(id)}`),
            `${attribute}="${id}"`,
          ).not.toBeNull();
        }
      }
    }
  });

  it('labels every image and marks decorative graphics as presentational', async () => {
    const container = await renderRoute(path);

    for (const image of Array.from(container.querySelectorAll('img'))) {
      expect(
        image.hasAttribute('alt'),
        image.getAttribute('src') ?? 'img',
      ).toBe(true);
    }

    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      const hidden =
        svg.getAttribute('aria-hidden') === 'true' ||
        svg.getAttribute('role') === 'presentation';
      const labelled = Boolean(
        svg.getAttribute('aria-label') ?? svg.querySelector('title'),
      );
      expect(hidden || labelled, svg.outerHTML.slice(0, 80)).toBe(true);
    }
  });
});
