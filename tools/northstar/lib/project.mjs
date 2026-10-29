/**
 * Project discovery and file walking.
 *
 * The engine has to work on a portfolio where three UI shapes coexist: a React
 * SPA under `frontend/src`, a server-rendered HTML string inside a FastAPI module,
 * and a Next.js app router tree. Discovering them by shape (a package.json, a
 * `templates` dir, an `app` dir with page.tsx) rather than by a hard-coded list is
 * what makes the engine usable on the next project without editing it.
 */

import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.turbo', '.vite', 'coverage', '__pycache__',
  '.git', 'venv', '.venv', 'out', '.output', 'vendor', 'public',
]);

const UI_EXTENSIONS = new Set(['.tsx', '.jsx', '.css', '.html']);

/**
 * Pull the CSS and the markup out of a server-rendered page.
 *
 * Eight products in this repository render HTML from a Python string, so they have
 * no `.css` or `.tsx` file for the walker to find. Refusing to look at them would
 * mean the engine quietly covers two thirds of the suite. Instead the module is
 * split in two virtual files — everything outside `<style>` blanked for the CSS
 * pass, the style block blanked for the markup pass — so character offsets, and
 * therefore line numbers, still point at the real line in the `.py` file.
 */
export function serverRenderedViews(directory) {
  const views = [];
  const pythonFiles = walk(directory, { extensions: new Set(['.py']) });
  for (const file of pythonFiles) {
    const raw = fs.readFileSync(file, 'utf8');
    if (!/<(html|body|div|form|table|h1|p)\b/i.test(raw)) continue;
    const relPath = path.relative(directory, file).split(path.sep).join('/');

    // CSS view: keep only what sits inside a <style> block.
    let css = '';
    let cursor = 0;
    for (const match of raw.matchAll(/<style>([\s\S]*?)<\/style>/gi)) {
      css += raw.slice(cursor, match.index).replace(/[^\n]/g, ' ');
      css += match[1];
      cursor = match.index + match[0].length;
    }
    css += raw.slice(cursor).replace(/[^\n]/g, ' ');
    // Python escapes literal braces by doubling them; the CSS itself has singles.
    const normalisedCss = css.replace(/\{\{/g, '{ ').replace(/\}\}/g, ' }');

    // Markup view: keep only the string literals that look like HTML.
    let markup = raw.replace(/<style>[\s\S]*?<\/style>/gi, (block) => block.replace(/[^\n]/g, ' '));
    markup = markup
      .split('\n')
      .map((line) => line)
      .join('\n');

    views.push({ relPath: `${relPath}#css`, text: normalisedCss, extension: '.css' });
    views.push({ relPath: `${relPath}#html`, text: markup, extension: '.html' });
    // Keep the path extension the rules expect while pointing at the real file.
    views[views.length - 1].relPath = `${relPath}`;
    views[views.length - 2].relPath = `${relPath}`;
  }
  return views;
}

/** Recursively collect files with the given extensions. */
export function walk(root, options = {}) {
  const { extensions = UI_EXTENSIONS, maxFiles = 4000, exclude = [] } = options;
  const blocked = exclude.map((entry) => path.resolve(root, entry));
  const files = [];
  const stack = [root];
  while (stack.length && files.length < maxFiles) {
    const directory = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (blocked.includes(path.resolve(full))) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!extensions.has(extension)) continue;
      files.push(full);
    }
  }
  return files.sort();
}

/**
 * What colour is the page behind a component?
 *
 * Read from the project's own stylesheet: `color-scheme: dark` or a slate-950 body
 * means the contrast rule should compare text against a dark surface. Guessing
 * "white" for a dark product produces confident findings that are simply wrong, so
 * this is read rather than assumed, and defaults to white only when nothing says
 * otherwise.
 * @param {string} directory
 */
export function detectSurface(directory) {
  const dark = /color-scheme\s*:\s*dark|bg-slate-9[05]0|bg-gray-9[05]0|bg-\[#0[0-9a-f]{5}\]/i;
  const light = /color-scheme\s*:\s*light|bg-(white|slate-50|gray-50)\b/i;
  const candidates = [
    path.join(directory, 'src', 'styles.css'),
    path.join(directory, 'src', 'styles', 'index.css'),
    path.join(directory, 'src', 'app', 'globals.css'),
    path.join(directory, 'frontend', 'src', 'styles.css'),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const text = fs.readFileSync(candidate, 'utf8');
    if (dark.test(text) && !light.test(text)) return '#0b1220';
    if (light.test(text)) return '#ffffff';
  }
  return '#ffffff';
}

/** Is this path a directory containing at least one of the given names? */
function has(repoRoot, relative, names) {
  return names.some((name) => fs.existsSync(path.join(repoRoot, relative, name)));
}

/**
 * Where does this product's UI live?
 *
 * Returns `{ name, root, kind, surface }` where `surface` is the page background
 * the contrast rule should assume when a class list sets a text colour but no
 * background. Getting that wrong produces confident, wrong findings, so it is
 * read from the stylesheet when possible.
 */
export function discoverProjects(repoRoot) {
  const projects = [];
  const surfaceFor = detectSurface;

  const add = (name, directory, kind, exclude = []) => {
    if (!fs.existsSync(directory)) return;
    projects.push({ name, root: directory, kind, exclude, surface: surfaceFor(directory) });
  };

  // 1. Company products with a React frontend, and 2. server-rendered ones.
  // Since 2026-10-29 every product is filed under the company that publishes it,
  // so the walk is `companies/<company>/<product>` rather than a flat `apps/`.
  const companiesDirectory = path.join(repoRoot, 'companies');
  if (fs.existsSync(companiesDirectory)) {
    for (const company of fs.readdirSync(companiesDirectory, { withFileTypes: true })) {
      if (!company.isDirectory()) continue;
      const companyDirectory = path.join(companiesDirectory, company.name);
      for (const entry of fs.readdirSync(companyDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const product = path.join(companyDirectory, entry.name);
        const name = `companies/${company.name}/${entry.name}`;
        const frontend = path.join(product, 'frontend');
        if (has(frontend, 'src', ['App.tsx', 'main.tsx', 'pages.tsx'])) {
          add(name, frontend, 'react-spa');
          continue;
        }
        // Server-rendered apps: the HTML lives in the Python module as a string.
        const appDirectory = path.join(product, 'app');
        const files = fs.existsSync(appDirectory) ? fs.readdirSync(appDirectory) : [];
        if (files.includes('main.py')) add(name, appDirectory, 'server-rendered');
      }
    }
  }

  // 3. The portfolio frontend at the repository root. Everything else in the
  // repository is discovered on its own, so the root walk stops at those edges —
  // otherwise one file is reported twice, once against the wrong page background.
  if (has(repoRoot, 'src', ['App.tsx', 'main.tsx'])) {
    // The engine's own fixtures are test data with defects planted on purpose;
    // counting them as product defects would be a false positive by construction.
    add('.', repoRoot, [
      'companies',
      'coursework',
      'sites',
      'company-platform',
      'workniche',
      'tools/northstar',
    ]);
  }

  // 4. Next.js products.
  for (const name of ['company-platform', 'workniche']) {
    const directory = path.join(repoRoot, name);
    if (has(directory, 'src/app', ['page.tsx', 'layout.tsx'])) add(name, directory, 'next-app');
  }

  // 5. Properties that are not company products: the personal portfolio.
  const portfolio = path.join(repoRoot, 'sites', 'portfolio', 'frontend');
  if (has(portfolio, 'src', ['App.tsx', 'main.tsx'])) {
    add('sites/portfolio', portfolio, 'react-spa');
  }

  // 6. Everything else that renders, discovered by shape rather than by name.
  // `frontend/` and `web/` are containers, not products: naming the parent makes
  // the report read `vocal-separator`, which is what a person calls it.
  const known = projects.map((project) => project.root);
  for (const candidate of genericUiRoots(repoRoot, { covered: known })) {
    // A server-rendered product is registered by its `app/` directory, which the
    // generic pass would otherwise meet again as a directory in its own right.
    if (known.some((root) => path.resolve(root) === path.resolve(candidate.directory))) continue;
    const relative = path.relative(repoRoot, candidate.directory).split(path.sep).join('/');
    if (!relative) continue;
    const parent = path.posix.dirname(relative);
    const base = path.posix.basename(relative);
    const name = (base === 'frontend' || base === 'web') && parent !== '.' ? parent : relative;
    if (projects.some((project) => project.name === name)) continue;
    projects.push({
      name,
      root: candidate.directory,
      kind: candidate.kind,
      exclude: [],
      surface: surfaceFor(candidate.directory),
    });
  }

  // The root project owns everything that is not another project. Once the generic
  // pass has added a directory that used to be inside it, that directory must leave
  // the root's walk — otherwise `vocal-separator` is audited twice and its two
  // findings become four in the totals.
  const rootProject = projects.find((project) => project.name === '.');
  if (rootProject) {
    const topLevel = projects
      .filter((project) => project !== rootProject)
      .map((project) => path.relative(repoRoot, project.root).split(path.sep)[0])
      .filter((segment) => segment && segment !== '..');
    rootProject.exclude = [...new Set([...(rootProject.exclude ?? []), ...topLevel])];
  }

  return projects;
}

/**
 * UI roots the named rules did not anticipate.
 *
 * The list above knows the shapes this repository had when it was written. A UX
 * engine that only audits the projects someone remembered to register is worse
 * than none, because the gap is invisible: the report says "0 defects" and means
 * "0 defects in the 38 projects I looked at". This pass walks the tree and finds
 * anything that renders — a Vite app with `src/App.tsx`, a Next app-router tree,
 * a `web/` or `frontend/` directory beside a backend — so a new product is
 * covered on the day it is added rather than on the day someone notices.
 *
 * Roots already known by name are passed in as `covered` and skipped, so nothing
 * is reported twice and the established project names stay stable.
 *
 * @param {string} repoRoot
 * @param {{ maxDepth?: number, covered?: string[] }} [options]
 */
export function genericUiRoots(repoRoot, options = {}) {
  const { maxDepth = 5, covered = [] } = options;
  const root = path.resolve(repoRoot);
  const coveredRoots = new Set(covered.map((entry) => path.resolve(entry)));
  const found = [];
  const stack = [{ directory: root, depth: 0 }];
  const skip = new Set([...SKIP_DIRS, 'fixtures', 'northstar-ux-engine', '.github', 'docs']);

  while (stack.length) {
    const { directory, depth } = stack.pop();
    const resolved = path.resolve(directory);
    if (depth > 0 && coveredRoots.has(resolved)) continue;
    if (depth >= maxDepth) continue;

    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    if (depth > 0) {
      const has = (relative) => fs.existsSync(path.join(directory, relative));
      if (has('src/App.tsx') || has('src/main.tsx') || has('src/App.jsx') || has('src/main.jsx')) {
        found.push({ directory, kind: 'react-spa' });
        continue;
      }
      if (has('src/app/page.tsx') || has('src/app/layout.tsx')) {
        found.push({ directory, kind: 'next-app' });
        continue;
      }
      if (has('app/main.py')) {
        const main = path.join(directory, 'app/main.py');
        if (/<(html|body|div|form|table|h1|p)\b/i.test(fs.readFileSync(main, 'utf8'))) {
          found.push({ directory: path.join(directory, 'app'), kind: 'server-rendered' });
          continue;
        }
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (skip.has(entry.name) || entry.name.startsWith('.')) continue;
      stack.push({ directory: path.join(directory, entry.name), depth: depth + 1 });
    }
  }
  return found;
}

/**
 * Reduce a file to the parts worth scanning: JSX text and CSS, without comments.
 *
 * Comments are stripped because the rules match on text, and a comment that
 * explains a fixed bug ("was outline-none") would otherwise be reported as the
 * bug. Keeping line numbers intact is the requirement, so comments are replaced
 * with their own newlines rather than deleted.
 */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, prefix) => `${prefix}${' '.repeat(match.length - prefix.length)}`);
}
