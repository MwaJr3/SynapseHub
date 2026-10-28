#!/usr/bin/env node
/**
 * Regenerate `projects.json` from the tree.
 *
 * The registry is committed because tests and tooling read it, but it is *derived*:
 * paths, ports, package names and Python packages are read from disk, never typed by
 * hand. After moving or renaming a project, run `npm run registry` and review the diff.
 *
 * Ownership, the display name and the record of what used to be deployed are the only
 * facts that cannot be read from disk. They live in `REGISTRY_META` below — the single
 * place to edit when a project changes hands.
 *
 * Usage: node scripts/build-registry.mjs [--check]
 *   --check  exit 1 if the committed file is stale (used by the test suite)
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(REPO, 'projects.json');

/** Directories under apps/ and projects/ that are not projects, with the reason. */
const EXCLUDED = [
  {
    path: 'projects/cbu-assignments/tests',
    reason: 'shared test suite for the coursework assignments',
  },
  { path: 'projects/mysul/Cpp Projects', reason: 'scratch folder: no README, no tests, no build' },
  {
    path: 'projects/mysul/WebstormProjects',
    reason: 'scratch folder: no README, no tests, no build',
  },
];

/** Root-level products that are projects but sit outside apps/ and projects/. */
const ROOT_PRODUCTS = ['company-platform', 'workniche', 'vocal-separator'];

/** Child folders of a grouping folder that are not projects themselves. */
const NOT_A_PROJECT = new Set([
  'tests',
  'docs',
  'deployment',
  'scripts',
  'backend',
  'frontend',
  'node_modules',
  '.venv',
]);

/**
 * Hand-kept facts. `owner` is the company the product belongs to; `pausedDeployment`
 * records what used to be hosted — deployment config was removed on 2026-10-28 and
 * nothing deploys today, so this is history, not configuration.
 */
const REGISTRY_META = {
  'apps/phishlens-cli': { variantOf: 'phishlens' },
  'apps/netscope-cli': { variantOf: 'netscope' },
  'apps/incidentflow-cli': { variantOf: 'incidentflow' },
  'apps/threatintel-desk-cli': { variantOf: 'threatintel-desk' },
  'projects/phishlens': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-phishlens-api' },
  },
  'projects/netscope': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-netscope-api' },
  },
  'projects/incidentflow': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-incidentflow-api' },
  },
  'projects/threatintel-desk': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-threatintel-api' },
  },
  'projects/hashsight': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-hashsight-api' },
  },
  'projects/assetwatch': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-assetwatch-api' },
  },
  'projects/securecode-workbench': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-securecode-workbench-api' },
  },
  'projects/cyberaware-lab': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-cyberaware-lab-api' },
  },
  'projects/mysul/mwangala-portfolio': {
    pausedDeployment: { target: 'vercel-site', project: 'mwangala-portfolio' },
  },
};

/** Products of the two companies, by directory. Anything absent has no owner. */
const OWNER = {
  velaqori: [
    'chessscope',
    'circuitlab-calc',
    'dependsecure',
    'fileguard',
    'incidentflow-cli',
    'netscope-cli',
    'phishlens-cli',
    'sentinelcore',
    'sentinellog',
    'threatintel-desk-cli',
    'assetwatch',
    'hashsight',
    'incidentflow',
    'netscope',
    'phishlens',
    'securecode-workbench',
    'threatintel-desk',
  ],
  tamuzi: [
    'campusflow',
    'classconnect',
    'eduaccess',
    'learnbridge',
    'learnpulse',
    'openlearn-commons',
    'pathwise',
    'reachlearn',
    'teachcraft',
    'tutorspring',
    'cyberaware-lab',
    'transcriptwise',
  ],
};

const DISPLAY_NAME = {
  'apps/incidentflow-cli': 'IncidentFlow (CLI)',
  'apps/netscope-cli': 'NetScope (CLI)',
  'apps/phishlens-cli': 'PhishLens (CLI)',
  'apps/threatintel-desk-cli': 'ThreatIntel Desk (CLI)',
  'projects/mysul/mwangala-portfolio': 'Mwangala',
  'projects/mysul/mwangala': 'MWANGALA',
};

const BLOCKS = {
  catalogue: [5173, 5299],
  companies: [5300, 5399],
  sites: [5400, 5499],
  products: [5500, 5599],
};

const isProject = (dir) =>
  ['frontend', 'backend', 'package.json', 'pyproject.toml'].some((name) =>
    existsSync(join(REPO, dir, name)),
  );

/** Every project directory, in a stable order. */
function walk() {
  const found = [...ROOT_PRODUCTS];
  for (const base of ['apps', 'projects']) {
    const root = join(REPO, base);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).sort()) {
      const relative = `${base}/${name}`;
      if (!statSync(join(REPO, relative)).isDirectory()) continue;
      if (name === 'node_modules') continue;
      if (base === 'apps' || isProject(relative)) {
        found.push(relative);
        continue;
      }
      for (const child of readdirSync(join(REPO, relative)).sort()) {
        const nested = `${relative}/${child}`;
        // `.github`, `.vscode`: repository furniture, never a project.
        if (child.startsWith('.')) continue;
        if (NOT_A_PROJECT.has(child)) continue;
        if (!statSync(join(REPO, nested)).isDirectory()) continue;
        found.push(nested);
      }
    }
  }
  return found;
}

const readJson = (path) => JSON.parse(readFileSync(join(REPO, path), 'utf8'));

/** The dev port this project's Vite config binds, if it has one. */
function devPort(dir) {
  for (const candidate of ['vite.config.ts', 'frontend/vite.config.ts', 'web/vite.config.ts']) {
    const path = join(REPO, dir, candidate);
    if (!existsSync(path)) continue;
    const match = /port:\s*(\d+)/.exec(readFileSync(path, 'utf8'));
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** The npm package name the project publishes, if any. */
function npmPackage(dir) {
  for (const candidate of ['package.json', 'frontend/package.json', 'web/package.json']) {
    if (!existsSync(join(REPO, dir, candidate))) continue;
    try {
      return readJson(`${dir}/${candidate}`).name;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * How this project is delivered. The owner's rule, 2026-10-28: a project with its
 * own working frontend and backend stays a separate deployment; a CLI-only build is
 * catalogued on the company site instead.
 *
 * `none` is for things that are not deliverable at all — coursework, scratch
 * folders, anything with no detectable surface. They are recorded so the registry
 * still accounts for every directory, not so they can be deployed.
 */
function deploymentFor(path, surfaces) {
  const hasFrontend = surfaces.includes('react') || surfaces.includes('nextjs');
  const hasBackend = surfaces.includes('fastapi') || surfaces.includes('python');
  if (path.startsWith('apps/')) {
    // Catalogue builds: standalone only when they are a real full-stack app,
    // otherwise a catalogue entry on the company site.
    return hasFrontend && hasBackend ? 'separate' : 'catalogue';
  }
  // TenantCore lives inside the coursework folder but is a real full-stack app,
  // so the surface decides, not the folder it sits in.
  return hasFrontend || hasBackend ? 'separate' : 'none';
}

function blockFor(path) {
  if (path.startsWith('apps/')) return 'catalogue';
  if (path === 'projects/mysul/mwangala-portfolio') return 'sites';
  if (ROOT_PRODUCTS.includes(path)) return 'products';
  return 'companies';
}

function kindFor(path) {
  if (path.startsWith('apps/')) return 'catalogue';
  if (ROOT_PRODUCTS.includes(path)) return 'product';
  if (path.startsWith('projects/cbu')) return 'coursework';
  return 'project';
}

function interfaceFor(dir) {
  const has = (...parts) => existsSync(join(REPO, dir, ...parts));
  const surfaces = [];
  if (has('next.config.mjs') || has('next.config.ts') || has('next.config.js')) surfaces.push('nextjs');
  // `web/` is the frontend for vocal-separator; the other two are the usual shapes.
  if (has('frontend') || has('web/vite.config.ts') || has('vite.config.ts')) surfaces.push('react');
  if (has('backend')) surfaces.push('fastapi');
  else if (has('app') && readdirSync(join(REPO, dir, 'app')).some((f) => f.endsWith('.py')))
    surfaces.push('python');
  if (has('pyproject.toml')) surfaces.push('cli');
  if (has('docker-compose.yml')) surfaces.push('docker');
  if (surfaces.length === 0) surfaces.push(has('index.html') ? 'static' : 'other');
  return surfaces;
}

function ownerFor(path) {
  const slug = path.split('/').pop();
  for (const [company, slugs] of Object.entries(OWNER)) if (slugs.includes(slug)) return company;
  return null;
}

function build() {
  const projects = walk()
    .map((path) => {
      const meta = REGISTRY_META[path] ?? {};
      const slug = path.split('/').pop();
      const kind = kindFor(path);
      const surfaces = interfaceFor(path);
      const entry = {
        slug,
        name: DISPLAY_NAME[path] ?? slug.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        path,
        owner: ownerFor(path),
        kind,
        block: blockFor(path),
        interface: surfaces,
        deployment: deploymentFor(path, surfaces),
        deploys: [],
      };
      const port = devPort(path);
      if (port !== undefined) entry.devPort = port;
      const pkg = npmPackage(path);
      if (pkg) entry.package = pkg;
      if (
        existsSync(join(REPO, path, 'app/__init__.py')) ||
        existsSync(join(REPO, path, 'backend/app'))
      )
        entry.pythonPackage = 'app';
      if (meta.pausedDeployment)
        entry.pausedDeployment = {
          ...meta.pausedDeployment,
          rootDirectory: meta.pausedDeployment.target === 'vercel-api' ? `${path}/backend` : path,
        };
      if (meta.variantOf) entry.variantOf = meta.variantOf;
      return entry;
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    schemaVersion: 1,
    blocks: BLOCKS,
    excluded: EXCLUDED.filter((entry) => existsSync(join(REPO, entry.path))),
    notes: {
      tessera:
        'Part of Tamuzi learning systems. Deliberately absent from the company catalogue until it is fully built and functional.',
      slugRule:
        "A slug names exactly one directory. A CLI catalogue build of a deployed product takes the '-cli' suffix and records 'variantOf'.",
      blocks:
        'A port is allocated once, by the block of its kind. Never reuse a number, even after a project is archived.',
      deployment:
        'Nothing deploys: hosting configuration was removed on 2026-10-28. pausedDeployment records what used to be live, for the redeployment; it is not configuration.',
      generatedBy: 'node scripts/build-registry.mjs — edit REGISTRY_META there, not this file.',
      challenges:
        'The 60 interactive prototypes live in challenges/, a self-contained collection with its own package boundary and one @challenges alias. Not a deployable project: it is content the portfolio site renders. Prepared for extraction to its own branch (docs/branch-splits.md).',
    },
    projects,
  };
}

const serialised = `${JSON.stringify(build(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(REGISTRY) ? readFileSync(REGISTRY, 'utf8') : '';
  if (current !== serialised) {
    console.error('projects.json is stale — run: npm run registry');
    process.exit(1);
  }
  console.log('projects.json is up to date');
} else {
  writeFileSync(REGISTRY, serialised);
  const doc = JSON.parse(serialised);
  const count = (key) => doc.projects.filter((p) => p[key] !== undefined).length;
  console.log(
    `${doc.projects.length} projects · ${count('devPort')} with a dev port · ` +
      `${count('package')} with an npm package · ${count('pausedDeployment')} paused deployments`,
  );
}
