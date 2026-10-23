#!/usr/bin/env node
/**
 * Generates public/sitemap.xml and public/robots.txt from the real route table.
 *
 *   npm run sitemap         write both files
 *   npm run sitemap:check   regenerate in memory and fail if public/ is stale
 *
 * The route list is read from src/config/routes.ts and the project slugs from
 * src/data/projects/*.ts, so the sitemap can never drift from the app: adding a
 * project file changes the sitemap, and `sitemap:check` (run in CI) fails if the
 * committed files were not regenerated.
 *
 * If VITE_SITE_URL is set (in the environment or a .env file), absolute <loc>
 * values are emitted. Otherwise the sitemap keeps relative paths and says so in
 * a comment — it will not invent a domain.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const check = process.argv.includes('--check');

/* ------------------------------------------------------------------- config */

function readEnvFile() {
  const values = {};
  for (const name of ['.env', '.env.local', '.env.production']) {
    const file = resolve(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      values[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
  return values;
}

const envFile = readEnvFile();
const siteUrl = (process.env.VITE_SITE_URL ?? envFile.VITE_SITE_URL ?? '').replace(/\/+$/, '');

/* ------------------------------------------------------------- route source */

/** staticRoutes entries from src/config/routes.ts. */
function readStaticRoutes() {
  const source = readFileSync(resolve(root, 'src/config/routes.ts'), 'utf8');
  const block = /export const staticRoutes = \[([\s\S]*?)\n\]/.exec(source);
  if (!block) throw new Error('[seo] could not read staticRoutes from src/config/routes.ts');

  const routes = [];
  for (const line of block[1].split('\n')) {
    const entry = /\{\s*path:\s*'([^']+)',\s*priority:\s*'([^']+)',\s*changefreq:\s*'([^']+)'\s*\}/.exec(line);
    if (entry) routes.push({ path: entry[1], priority: entry[2], changefreq: entry[3] });
  }
  if (routes.length === 0) throw new Error('[seo] no static routes parsed');
  return routes;
}

/** Project slugs, in registry order (sorted by `order` in the app). */
function readProjectSlugs() {
  const dir = resolve(root, 'src/data/projects');
  const index = readFileSync(resolve(dir, 'index.ts'), 'utf8');

  const registryBlock = /const registry: Project\[\] = \[([\s\S]*?)\n\];/.exec(index);
  if (!registryBlock) throw new Error('[seo] could not read the project registry');
  const symbols = [...registryBlock[1].matchAll(/^\s*([A-Za-z0-9_]+),\s*$/gm)].map((m) => m[1]);
  if (symbols.length === 0) throw new Error('[seo] registry looks empty');

  // Map each registry symbol back to the file it is imported from.
  const importOf = new Map();
  for (const match of index.matchAll(/import \{ (\w+) \} from '\.\/(\w+)';/g)) {
    importOf.set(match[1], match[2]);
  }

  const found = [];
  for (const symbol of symbols) {
    const file = importOf.get(symbol);
    if (!file) throw new Error(`[seo] cannot resolve registry entry "${symbol}" to a file`);
    const source = readFileSync(resolve(dir, `${file}.ts`), 'utf8');
    const slug = /^\s*slug: '([^']+)',/m.exec(source);
    const order = /^\s*order: (\d+),/m.exec(source);
    if (!slug || !order) throw new Error(`[seo] ${file}.ts is missing slug/order`);
    found.push({ slug: slug[1], order: Number(order[1]) });
  }
  return found.sort((a, b) => a.order - b.order).map((entry) => entry.slug);
}

const staticRoutes = readStaticRoutes();
const slugs = readProjectSlugs();

const byPath = new Map(staticRoutes.map((route) => [route.path, route]));
const home = byPath.get('/');
const directory = byPath.get('/projects');
const rest = staticRoutes.filter((route) => route.path !== '/' && route.path !== '/projects');

const routes = [
  home,
  directory,
  ...slugs.map((slug) => ({ path: `/projects/${slug}`, priority: '0.8', changefreq: 'monthly' })),
  ...rest,
].filter(Boolean);

/* ------------------------------------------------------------------ output */

const loc = (path) => (siteUrl ? `${siteUrl}${path}` : path);

const header = siteUrl
  ? '<?xml version="1.0" encoding="UTF-8"?>\n'
  : `<?xml version="1.0" encoding="UTF-8"?>\n<!--
  VITE_SITE_URL was not set at generation time, so <loc> values are relative.
  Set it and re-run \`npm run sitemap\` before deploying to a real domain.
-->\n`;

const sitemap =
  header +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  routes
    .map(
      (route) =>
        `  <url>\n    <loc>${loc(route.path)}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`,
    )
    .join('\n') +
  '\n</urlset>\n';

const robots =
  [
    'User-agent: *',
    'Allow: /',
    '',
    siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '# Sitemap: set VITE_SITE_URL and re-run `npm run sitemap`',
    '',
  ].join('\n');

const outputs = [
  { file: 'public/sitemap.xml', content: sitemap },
  { file: 'public/robots.txt', content: robots },
];

if (check) {
  const stale = outputs.filter(({ file, content }) => {
    const path = resolve(root, file);
    return !existsSync(path) || readFileSync(path, 'utf8') !== content;
  });
  if (stale.length > 0) {
    console.error(
      `[seo] stale or missing: ${stale.map((entry) => entry.file).join(', ')}\n` +
        '      run `npm run sitemap` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`[seo] sitemap.xml and robots.txt are up to date (${routes.length} routes)`);
} else {
  for (const { file, content } of outputs) writeFileSync(resolve(root, file), content);
  console.log(
    `[seo] wrote public/sitemap.xml (${routes.length} routes) and public/robots.txt` +
      (siteUrl ? ` with base ${siteUrl}` : ' with relative paths (no VITE_SITE_URL configured)'),
  );
}
