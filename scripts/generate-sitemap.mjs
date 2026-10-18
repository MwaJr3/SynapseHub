#!/usr/bin/env node
/** Generate the SPA sitemap from the centralized 60-record challenge manifest. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const origin = (process.env.VITE_SITE_URL || process.env.SITE_URL || '').replace(/\/+$/, '');
const manifestPath = resolve(here, '../src/data/challengeManifest.ts');
const source = readFileSync(manifestPath, 'utf8');
const projectSlugs = [...source.matchAll(/^\s+\['([^']+)',\s*'[^']+',\s*'[^']+',\s*'https:\/\//gm)].map((match) => match[1]);

if (projectSlugs.length !== 60 || new Set(projectSlugs).size !== 60) {
  console.error(`[sitemap] Expected 60 unique project slugs in challengeManifest.ts; found ${projectSlugs.length}.`);
  process.exit(1);
}
if (!origin) {
  console.warn('[sitemap] Skipped: set VITE_SITE_URL (or SITE_URL) to the production origin before generating a sitemap.');
  process.exit(0);
}
try {
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') throw new Error('The site URL must use HTTPS.');
} catch (error) {
  console.error(`[sitemap] Invalid VITE_SITE_URL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const paths = ['/', '/about', '/projects', '/skills', '/journey', '/contact', ...projectSlugs.map((slug) => `/projects/${slug}`)];
const body = paths.map((path) => `  <url>\n    <loc>${new URL(path, `${origin}/`).toString()}</loc>\n  </url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(resolve(here, '../public/sitemap.xml'), sitemap, 'utf8');
console.log(`[sitemap] Wrote ${paths.length} URLs (60 project case studies) for ${origin}`);
