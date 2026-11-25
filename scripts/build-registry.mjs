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
import { validateRegistry } from './registry-schema.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(REPO, 'projects.json');

/** Directories inside a scanned root that are not projects, each with the reason. */
const EXCLUDED = [
  {
    path: 'coursework/cbu-assignments/tests',
    reason: 'shared test suite for the coursework assignments',
  },
  { path: 'sites/archive/Cpp Projects', reason: 'scratch folder: no README, no tests, no build' },
  {
    path: 'sites/archive/WebstormProjects',
    reason: 'scratch folder: no README, no tests, no build',
  },
];

/**
 * Root-level products: standalone builds that are not filed under a company.
 * They keep their own deployment story and are not part of the companies split.
 */
const ROOT_PRODUCTS = ['company-platform', 'workniche', 'vocal-separator'];

/**
 * The two companies, and the roots each one's products are filed under. Ownership
 * is read from the path — `companies/tamuzi/tessera` is Tamuzi's because of where
 * it is — so no list can disagree with the tree.
 */
const COMPANIES = ['velaqori', 'tamuzi'];

/** Properties that are not company products. */
const SITES_ROOT = 'sites/portfolio';
const COURSEWORK_ROOT = 'coursework/cbu-assignments';

/**
 * The catalogue builds: company work that has a `portfolio.json` card rather than a
 * case study on the company site. Kept as an explicit list because it is a fact
 * about how the work is *presented*, which no directory on disk records.
 */
/**
 * Tessera is deliberately absent: it is a full-stack product with its own
 * deployment, and the owner's instruction is that it stays out of the published
 * catalogue until it is fully built. It is filed under Tamuzi because that is who
 * publishes it, but its `kind` is `project`.
 */
const CATALOGUE_BUILDS = new Set([
  'authgate', 'budgetbook', 'creadesk', 'datadesk', 'docsage', 'fileseal',
  'flashkit', 'frontpage', 'gradeflow', 'guessmaster', 'headercheck', 'hostwatch',
  'loginsense', 'notekit', 'passforge', 'passmeter', 'prepwise', 'quizarena',
  'quizbox', 'secops-dash', 'secretscan', 'secweblab', 'shelfwise', 'shopdeck',
  'simforge', 'skycast', 'stockmate', 'taskdeck', 'tidyfiles',
  'unicore', 'urlshield', 'wattwise', 'webwatch',
  // The four CLI builds of products that also ship a web application. The CLI is
  // the catalogue entry; the deployed product is not.
  'incidentflow-cli', 'netscope-cli', 'phishlens-cli', 'threatintel-desk-cli',
]);

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
 * Products whose entry cannot be discovered from this tree: source lives in
 * another repository (`external`) or the original here was retired (`archived`).
 * Hand-kept like REGISTRY_META, because no directory records these facts.
 * Each entry must satisfy scripts/registry-schema.mjs — the generator refuses
 * to write a registry that fails it.
 *
 * A project mid-migration (`extracting`) is NOT declared here: its directory
 * still exists, so the tree discovers it, and REGISTRY_META below adds the
 * target repository and `source: 'extracting'` until the move completes — at
 * which point the directory disappears and the entry moves into this list.
 */
const DECLARED_PRODUCTS = [];

/**
 * Hand-kept facts. `owner` is the company the product belongs to; `pausedDeployment`
 * records what used to be hosted — deployment config was removed on 2026-10-28 and
 * nothing deploys today, so this is history, not configuration.
 *
 * `source`, `repository` and `defaultBranch` are the extraction-state overrides
 * for entries the tree discovers — used while `source: 'extracting'`.
 */
const REGISTRY_META = {
  'companies/velaqori/phishlens-cli': { variantOf: 'phishlens' },
  'companies/velaqori/netscope-cli': { variantOf: 'netscope' },
  'companies/velaqori/incidentflow-cli': { variantOf: 'incidentflow' },
  'companies/velaqori/threatintel-desk-cli': { variantOf: 'threatintel-desk' },
  'companies/velaqori/phishlens': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-phishlens-api' },
  },
  'companies/velaqori/netscope': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-netscope-api' },
  },
  'companies/velaqori/incidentflow': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-incidentflow-api' },
  },
  'companies/velaqori/threatintel-desk': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-threatintel-api' },
  },
  'companies/velaqori/hashsight': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-hashsight-api' },
  },
  'companies/velaqori/assetwatch': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-assetwatch-api' },
  },
  'companies/velaqori/securecode-workbench': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-securecode-workbench-api' },
  },
  'companies/tamuzi/cyberaware-lab': {
    pausedDeployment: { target: 'vercel-api', project: 'synapsehub-cyberaware-lab-api' },
  },
  'sites/portfolio': {
    pausedDeployment: { target: 'vercel-site', project: 'mwangala-portfolio' },
  },
};

/**
 * Deployments the owner asked for while everything else stays paused (2026-10-29,
 * docs/deployment/README.md). Each one is live configuration, not history.
 */
const DEPLOYS = {
  'company-platform': [{ target: 'vercel-site', project: 'company-platform', rootDirectory: 'company-platform' }],
};

const DISPLAY_NAME = {
  'companies/velaqori/incidentflow-cli': 'IncidentFlow (CLI)',
  'companies/velaqori/netscope-cli': 'NetScope (CLI)',
  'companies/velaqori/phishlens-cli': 'PhishLens (CLI)',
  'companies/velaqori/threatintel-desk-cli': 'ThreatIntel Desk (CLI)',
  'sites/portfolio': 'Mwangala',
};

/**
 * Port blocks, allocated once. `catalogue` is retired: nothing is filed there any
 * more, and a retired block is kept in the list so an old number is never reused.
 */
const BLOCKS = {
  catalogue: [5173, 5299],
  companies: [5300, 5399],
  sites: [5400, 5499],
  products: [5500, 5599],
  coursework: [5600, 5699],
};

/**
 * Every project directory, in a stable order.
 *
 * Three roots are walked: the two company folders (one level of company, one level
 * of product), `sites/portfolio`, and the coursework folder. Root-level products
 * are named because they sit outside all three.
 */
function walk() {
  const found = [...ROOT_PRODUCTS];

  for (const company of COMPANIES) {
    const root = join(REPO, 'companies', company);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).sort()) {
      if (name.startsWith('.') || NOT_A_PROJECT.has(name)) continue;
      const relative = `companies/${company}/${name}`;
      if (statSync(join(REPO, relative)).isDirectory()) found.push(relative);
    }
  }

  found.push(SITES_ROOT);

  const coursework = join(REPO, COURSEWORK_ROOT);
  if (existsSync(coursework)) {
    for (const name of readdirSync(coursework).sort()) {
      // `.github`, `.vscode`: repository furniture, never a project.
      if (name.startsWith('.') || NOT_A_PROJECT.has(name)) continue;
      const relative = `${COURSEWORK_ROOT}/${name}`;
      if (statSync(join(REPO, relative)).isDirectory()) found.push(relative);
    }
  }

  const excluded = new Set(EXCLUDED.map((entry) => entry.path));
  return found.filter((path) => !excluded.has(path));
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
 * `none` is for things that are not deliverable at all — scratch folders, anything
 * with no detectable surface. They are recorded so the registry still accounts for
 * every directory, not so they can be deployed.
 */
function deploymentFor(path, surfaces) {
  const hasFrontend = surfaces.includes('react') || surfaces.includes('nextjs');
  const hasBackend = surfaces.includes('fastapi') || surfaces.includes('python');
  if (path.startsWith('companies/')) {
    return hasFrontend && hasBackend ? 'separate' : 'catalogue';
  }
  // TenantCore lives inside the coursework folder but is a real full-stack app,
  // so the surface decides, not the folder it sits in.
  return hasFrontend || hasBackend ? 'separate' : 'none';
}

function blockFor(path) {
  if (path === SITES_ROOT) return 'sites';
  if (path.startsWith('coursework/')) return 'coursework';
  if (ROOT_PRODUCTS.includes(path)) return 'products';
  return 'companies';
}

function kindFor(path) {
  if (ROOT_PRODUCTS.includes(path)) return 'product';
  if (path.startsWith('coursework/')) return 'coursework';
  if (path.startsWith('companies/') && CATALOGUE_BUILDS.has(path.split('/').pop())) {
    return 'catalogue';
  }
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

/**
 * The company that publishes this directory, read from its path.
 *
 * `companies/tamuzi/tessera` is Tamuzi's because of where it is filed. Keeping
 * ownership in the tree means a `git mv` changes the owner, and no list can drift
 * out of step with the folders.
 */
function ownerFor(path) {
  const parts = path.split('/');
  if (parts[0] !== 'companies') return null;
  return COMPANIES.includes(parts[1]) ? parts[1] : null;
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
        source: 'local',
        owner: ownerFor(path),
        kind,
        block: blockFor(path),
        interface: surfaces,
        deployment: deploymentFor(path, surfaces),
        deploys: DEPLOYS[path] ?? [],
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
      if (meta.source) entry.source = meta.source;
      if (meta.repository) {
        entry.repository = meta.repository;
        entry.defaultBranch = meta.defaultBranch;
      }
      return entry;
    })
    .concat(DECLARED_PRODUCTS)
    .sort((a, b) => (a.path ?? a.slug).localeCompare(b.path ?? b.slug));

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
        'Only the projects listed in `deploys` are deployed (company-platform, on the owner\'s request, 2026-10-29); hosting configuration for everything else was removed on 2026-10-28. pausedDeployment records what used to be live, for the redeployment; it is not configuration.',
      generatedBy: 'node scripts/build-registry.mjs — edit REGISTRY_META there, not this file.',
      source:
        "Where a project's code lives: `local` (this repository — the default), `external` (its own repository: no path, requires repository + defaultBranch), `extracting` (migration underway: local path plus the target repository), `archived` (the original here was retired). Path-less entries are first-class: same slug, block and uniqueness rules, validated by scripts/registry-schema.mjs. External products are declared in DECLARED_PRODUCTS there, not discovered from the tree.",
      challenges:
        'The 60 interactive prototypes live in challenges/, a self-contained collection with its own package boundary and one @challenges alias. Not a deployable project: it is content the portfolio site renders. Prepared for extraction to its own branch (docs/branch-splits.md).',
    },
    projects,
  };
}

const doc = build();

// Schema first: a registry that violates the entry rules is never written and
// never passes --check, whatever its bytes look like.
const problems = validateRegistry(doc, BLOCKS, (path) => existsSync(join(REPO, path)));
if (problems.length > 0) {
  console.error('projects.json would be invalid:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const serialised = `${JSON.stringify(doc, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(REGISTRY) ? readFileSync(REGISTRY, 'utf8') : '';
  if (current !== serialised) {
    console.error('projects.json is stale — run: npm run registry');
    process.exit(1);
  }
  console.log('projects.json is up to date');
} else {
  writeFileSync(REGISTRY, serialised);
  const count = (key) => doc.projects.filter((p) => p[key] !== undefined).length;
  const housed = doc.projects.filter((p) => (p.source ?? 'local') !== 'local').length;
  console.log(
    `${doc.projects.length} projects · ${count('devPort')} with a dev port · ` +
      `${count('package')} with an npm package · ${count('pausedDeployment')} paused deployments · ` +
      `${housed} outside this repository`,
  );
}
