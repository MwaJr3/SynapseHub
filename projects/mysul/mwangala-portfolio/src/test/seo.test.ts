import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allRoutes } from '@/config/routes';
import { projects } from '@/data/projects';
import { site } from '@/config/site';

/**
 * SEO artefacts are generated from the real route table by
 * `scripts/generate-seo.mjs`. These tests assert the committed files still
 * match the app, so a new project page cannot ship without appearing in the
 * sitemap (and an excluded project cannot linger in it).
 */
const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
const robots = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf8');

const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
  match[1].replace(/^https?:\/\/[^/]+/, ''),
);

describe('sitemap.xml', () => {
  it('lists every route the app serves, exactly once', () => {
    // Public shape: company site at `/`, portfolio under `/portfolio`.
    const expected = [
      '/',
      ...allRoutes().map((route) => (route.path === '/' ? '/portfolio' : `/portfolio${route.path}`)),
    ];
    expect([...sitemapPaths].sort()).toEqual([...expected].sort());
    expect(new Set(sitemapPaths).size).toBe(sitemapPaths.length);
  });

  it('includes all nine case-study routes', () => {
    for (const project of projects) {
      expect(sitemapPaths, `${project.slug} case study missing from the sitemap`).toContain(
        `/portfolio/projects/${project.slug}`,
      );
    }
  });

  it('never advertises an excluded project', () => {
    for (const slug of ['sentinellog', 'fileguard', 'dependsecure', 'campusflow', 'circuitlab-calc', 'chessscope', 'sentinelcore']) {
      expect(sitemap).not.toContain(slug);
    }
  });

  it('is valid, well-formed XML with a namespace', () => {
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap.trimEnd().endsWith('</urlset>')).toBe(true);
    // Every entry carries a changefreq and a priority.
    expect((sitemap.match(/<changefreq>/g) ?? []).length).toBe(sitemapPaths.length);
    expect((sitemap.match(/<priority>/g) ?? []).length).toBe(sitemapPaths.length);
  });

  it('only uses absolute URLs when a real domain is configured', () => {
    const absolute = sitemapPaths.filter((path) => path.startsWith('http'));
    if (site.url) {
      expect(absolute.length).toBe(sitemapPaths.length);
    } else {
      // No invented domain: relative paths plus an explanatory comment.
      expect(absolute).toEqual([]);
      expect(sitemap).toMatch(/VITE_SITE_URL was not set/);
    }
  });
});

describe('robots.txt', () => {
  it('allows crawling and only declares a sitemap for a configured domain', () => {
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    if (site.url) {
      expect(robots).toContain(`Sitemap: ${site.url}/sitemap.xml`);
    } else {
      expect(robots).not.toMatch(/^[^#\n]*Sitemap:/m);
      expect(robots).toMatch(/set VITE_SITE_URL/);
    }
  });
});
