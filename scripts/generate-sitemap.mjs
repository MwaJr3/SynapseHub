#!/usr/bin/env node
/**
 * Generates public/sitemap.xml.
 *
 * The sitemap is only written when a production origin is configured
 * (VITE_SITE_URL or SITE_URL), because a sitemap pointing at an unknown domain
 * would advertise URLs that do not resolve. Run it as part of a deploy step:
 *
 *   VITE_SITE_URL=https://example.org npm run sitemap
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const origin = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  ''
).replace(/\/+$/, '');

const projectSlugs = [
  'learnbridge',
  'classconnect',
  'tutorspring',
  'pathwise',
  'teachcraft',
  'openlearn-commons',
  'learnpulse',
  'reachlearn',
  'eduaccess',
];

const staticPaths = [
  '/',
  '/about',
  '/projects',
  '/skills',
  '/journey',
  '/approach',
  '/contact',
];
const paths = [
  ...staticPaths,
  ...projectSlugs.map((slug) => `/projects/${slug}`),
];

if (!origin) {
  console.warn(
    '[sitemap] Skipped: set VITE_SITE_URL (or SITE_URL) to the production origin before generating a sitemap.',
  );
  process.exit(0);
}

try {
  new URL(origin);
} catch {
  console.error(
    `[sitemap] "${origin}" is not a valid absolute URL. Nothing was written.`,
  );
  process.exit(1);
}

const body = paths
  .map(
    (path) =>
      `  <url>\n    <loc>${new URL(path, `${origin}/`).toString()}</loc>\n  </url>`,
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(resolve(here, '../public/sitemap.xml'), sitemap, 'utf8');
console.log(`[sitemap] Wrote ${paths.length} URLs for ${origin}`);
