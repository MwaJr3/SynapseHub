/**
 * The catalogue page publishes the builds that are not hosted.
 *
 * Two things must hold, and neither is enforced by the page itself:
 *
 * 1. The generated list is a faithful projection of `projects.json` — every entry
 *    is a real directory that the registry marks `deployment: "catalogue"`, and no
 *    entry claims to be live.
 * 2. Nothing on the page promises a demo. These builds have no browser front end,
 *    so a "visit" link would be a dead end; the page may only offer the path.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import entries from '@/content/catalogue.generated.json';

interface Entry {
  slug: string;
  name: string;
  path: string;
  companySlug: string | null;
  summary: string | null;
  tags: string[];
  interfaces: string[];
}

const catalogue = entries as Entry[];
const REPO = join(process.cwd(), '..');

describe('the published catalogue', () => {
  it('is the exact set the registry marks as catalogue-only', () => {
    const registry = JSON.parse(readFileSync(join(REPO, 'projects.json'), 'utf8')) as {
      projects: { path: string; deployment: string }[];
    };
    const expected = registry.projects
      .filter((project) => project.deployment === 'catalogue')
      .map((project) => project.path)
      .sort();
    expect(catalogue.map((entry) => entry.path).sort()).toEqual(expected);
  });

  it('has a unique slug and a real directory for every entry', () => {
    const slugs = catalogue.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of catalogue) {
      expect(existsSync(join(REPO, entry.path)), `${entry.slug} has no directory`).toBe(true);
    }
  });

  it('describes every entry in words, never with a placeholder', () => {
    for (const entry of catalogue) {
      const text = entry.summary;
      expect(text, `${entry.slug} has no description`).toBeTruthy();
      expect((text ?? '').length).toBeGreaterThan(20);
      // A description that says "TODO" or "N/A" is worse than none: it ships.
      expect(text).not.toMatch(/TODO|N\/A|lorem ipsum/i);
    }
  });

  it('claims no live demo and no deployment for any entry', () => {
    const raw = readFileSync(
      join(process.cwd(), 'src/content/catalogue.generated.json'),
      'utf8',
    );
    expect(raw).not.toMatch(/https?:\/\//);
    expect(raw).not.toMatch(/liveDemoUrl|deployed: true|"status": "live"/);
  });

  it('lists the company-owned builds under their company', () => {
    for (const entry of catalogue) {
      if (entry.companySlug === null) continue;
      expect(['velaqori-systems', 'tamuzi-learning']).toContain(entry.companySlug);
    }
  });
});
