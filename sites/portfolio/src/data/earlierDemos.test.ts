/**
 * The seven archived demos used to live in a separate static site
 * (`mwangala/` in the MySul repository). That site was merged into this one on 2026-10-28:
 * the case studies were already here, and the working demos now sit in
 * `public/demos/<slug>/` and are linked from the earlier-work page.
 *
 * This test is the thing that keeps the merge honest — a demo that is listed but
 * missing, or a directory that is shipped but never linked, fails here rather
 * than showing a 404 to whoever clicks it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { earlierProjects } from '@/data/earlierWork';

const DEMOS = join(process.cwd(), 'public', 'demos');
const slugs = earlierProjects.map((project) => project.slug);

describe('the archived demos merged in from the standalone site', () => {
  it('ships one demo per archived case study', () => {
    expect(slugs).toHaveLength(7);
    const missing = slugs.filter((slug) => !existsSync(join(DEMOS, slug, 'index.html')));
    expect(missing).toEqual([]);
  });

  it('ships no demo that no case study links to', () => {
    const shipped = readdirSync(DEMOS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(shipped.sort()).toEqual([...slugs].sort());
  });

  it('keeps every demo self-contained: shared stylesheet, own back link', () => {
    for (const slug of slugs) {
      const html = readFileSync(join(DEMOS, slug, 'index.html'), 'utf8');
      // The demos were written for a site two levels up; the paths were rewritten
      // for this location. A stale ../../ path would load nothing and say so quietly.
      expect(html, `${slug} is missing the shared stylesheet`).toContain('href="../app-shared.css"');
      expect(html, `${slug} still points at the retired site root`).not.toContain('../../css/');
      expect(html).toContain('href="../../earlier-work"');
      // Nothing here may call a third-party origin; these are offline demos.
      expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
  });
});
