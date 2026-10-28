import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The registry guard.
 *
 * `projects.json` records every project once — its slug, path, port, npm package
 * name and deployment. This test is the thing that stops the repository drifting
 * back into the state documented in `docs/PROJECTS.md`: four apps on 5173, two
 * packages called `mwangala-portfolio`, four slugs naming both a CLI and a
 * deployed product.
 *
 * The checks are written as pure functions over an entry list so the failure
 * paths can be demonstrated on synthetic data (see the last describe block)
 * rather than only being asserted absent on the real registry.
 */

/**
 * Deployment is paused: hosting configuration was removed on 2026-10-28 and the
 * nine projects that used to be hosted record it as history instead. See
 * `docs/deployment/README.md`.
 */
interface PausedDeployment {
  target: 'vercel-api' | 'vercel-site';
  project: string;
  rootDirectory: string;
}

interface ProjectEntry {
  slug: string;
  name: string;
  path: string;
  owner: 'velaqori' | 'tamuzi' | null;
  kind: 'catalogue' | 'project' | 'product' | 'coursework';
  /**
   * The owner's delivery rule (2026-10-28): a project with its own working frontend
   * and backend stays a separate deployment; a CLI-only build is catalogued on the
   * company site instead; `none` is not deliverable at all.
   */
  deployment: 'separate' | 'catalogue' | 'none';
  /** Port block this project's port was allocated from — recorded, not inferred. */
  block: string;
  interface: string[];
  deploys: PausedDeployment[];
  pausedDeployment?: PausedDeployment;
  devPort?: number;
  package?: string;
  pythonPackage?: string;
  variantOf?: string;
}

interface ExcludedEntry {
  path: string;
  reason: string;
}

interface Registry {
  schemaVersion: number;
  blocks: Record<string, [number, number]>;
  excluded: ExcludedEntry[];
  notes: Record<string, string>;
  projects: ProjectEntry[];
}

const REPO = process.cwd();
const registryPath = join(REPO, 'projects.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function duplicateSlugs(entries: ProjectEntry[]): string[] {
  return duplicates(entries.map((entry) => entry.slug));
}

function duplicatePorts(entries: ProjectEntry[]): number[] {
  return duplicates(entries.filter((e) => e.devPort !== undefined).map((e) => String(e.devPort))).map(
    Number,
  );
}

function duplicatePackages(entries: ProjectEntry[]): string[] {
  return duplicates(
    entries.filter((e) => e.package !== undefined).map((e) => String(e.package)),
  );
}

/** Ports outside the block their kind was allocated, or outside every block. */
function misplacedPorts(
  entries: ProjectEntry[],
  blocks: Record<string, [number, number]>,
): string[] {
  const problems: string[] = [];
  for (const entry of entries) {
    if (entry.devPort === undefined) continue;
    const range = blocks[entry.block];
    if (!range) {
      problems.push(`${entry.slug}: no block defined for "${entry.block}"`);
      continue;
    }
    const [low, high] = range;
    if (entry.devPort < low || entry.devPort > high) {
      problems.push(`${entry.slug}: port ${entry.devPort} is outside ${entry.block} ${low}–${high}`);
    }
  }
  return problems;
}

describe('the registry itself', () => {
  it('is a non-empty list at the documented schema version', () => {
    expect(registry.schemaVersion).toBe(1);
    expect(registry.projects.length).toBeGreaterThan(50);
  });

  it('only names blocks that exist', () => {
    const used = new Set(registry.projects.map((entry) => entry.block));
    expect(used.size).toBeGreaterThan(1);
    for (const block of used) {
      expect(registry.blocks[block], `missing port block "${block}"`).toBeDefined();
    }
  });
});

describe('slugs, ports and package names are unique', () => {
  it('has no duplicate slug', () => {
    expect(duplicateSlugs(registry.projects)).toEqual([]);
  });

  it('has no duplicate dev port', () => {
    expect(duplicatePorts(registry.projects)).toEqual([]);
  });

  it('has no duplicate npm package name', () => {
    expect(duplicatePackages(registry.projects)).toEqual([]);
  });

  it('keeps every dev port inside the block allocated to its kind', () => {
    expect(misplacedPorts(registry.projects, registry.blocks)).toEqual([]);
  });
});

describe('the registry and the tree agree', () => {
  it('registers only paths that exist', () => {
    const missing = registry.projects
      .map((entry) => entry.path)
      .filter((path) => !existsSync(join(REPO, path)));
    expect(missing).toEqual([]);
  });

  it('excludes only paths that exist, each with a reason', () => {
    for (const entry of registry.excluded) {
      expect(existsSync(join(REPO, entry.path)), `excluded path gone: ${entry.path}`).toBe(true);
      expect(entry.reason.length, `no reason for ${entry.path}`).toBeGreaterThan(10);
    }
  });

  it('leaves no project directory unregistered', () => {
    const registered = new Set(registry.projects.map((entry) => entry.path));
    const excluded = new Set(registry.excluded.map((entry) => entry.path));
    const unregistered: string[] = [];

    const walk = (relative: string, depth: number): void => {
      for (const name of readdirSync(join(REPO, relative))) {
        const child = `${relative}/${name}`;
        if (!statSync(join(REPO, child)).isDirectory()) continue;
        if (registered.has(child) || excluded.has(child)) continue;
        // A registered project owns everything beneath it.
        if ([...registered].some((path) => path.startsWith(`${child}/`))) continue;
        // `projects/<area>/<project>` groups are containers, not projects.
        if (depth < 2 && readdirSync(join(REPO, child)).length > 0) {
          walk(child, depth + 1);
          continue;
        }
        unregistered.push(child);
      }
    };

    walk('apps', 1);
    walk('projects', 1);
    expect(unregistered).toEqual([]);
  });

  it('points every CLI variant at a registered product', () => {
    const bySlug = new Map(registry.projects.map((entry) => [entry.slug, entry]));
    const variants = registry.projects.filter((entry) => entry.variantOf !== undefined);
    expect(variants.length).toBeGreaterThan(0);
    for (const variant of variants) {
      const owner = bySlug.get(String(variant.variantOf));
      expect(owner, `${variant.slug} points at unknown slug ${variant.variantOf}`).toBeDefined();
      expect(variant.slug).toBe(`${variant.variantOf}-cli`);
      expect(variant.kind).toBe('catalogue');
      expect(owner?.kind).not.toBe('catalogue');
    }
  });

  it('deploys nothing, because deployment is paused', () => {
    const stillDeploying = registry.projects.filter((entry) => entry.deploys.length > 0);
    expect(stillDeploying.map((entry) => entry.path)).toEqual([]);
  });

  it('keeps the nine former deployments as history, with a root directory', () => {
    const paused = registry.projects.filter((entry) => entry.pausedDeployment !== undefined);
    expect(paused).toHaveLength(9);
    for (const entry of paused) {
      const record = entry.pausedDeployment;
      if (!record) throw new Error(`${entry.slug}: unreachable`);
      expect(record.project.length).toBeGreaterThan(3);
      // The recorded root directory must still be the one in the tree, or the note lies.
      expect(existsSync(join(REPO, record.rootDirectory))).toBe(true);
      expect(record.rootDirectory.startsWith(entry.path)).toBe(true);
    }
  });

  it('ships no hosting configuration anywhere', () => {
    // Nothing may re-add a deploy manifest while deployment is paused. A project that is
    // being redeployed moves its entry from pausedDeployment to deploys in the same
    // change, which is what keeps this test honest rather than merely strict.
    //
    // The manifests are searched for anywhere inside a project, not just at its root:
    // the ones that existed were at `<project>/backend/vercel.json`, and a root-only
    // check passed while a manifest was present.
    const MANIFESTS = new Set(['vercel.json', 'netlify.toml', 'wrangler.toml', 'now.json']);
    const found: string[] = [];

    const visit = (relative: string): void => {
      for (const name of readdirSync(join(REPO, relative))) {
        if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
        const child = `${relative}/${name}`;
        if (statSync(join(REPO, child)).isDirectory()) visit(child);
        else if (MANIFESTS.has(name)) found.push(child);
      }
    };

    for (const entry of registry.projects) visit(entry.path);
    if (existsSync(join(REPO, 'vercel.json'))) found.push('vercel.json');
    expect(found).toEqual([]);
  });});

describe('the delivery rule', () => {
  const hasFrontend = (entry: ProjectEntry) =>
    entry.interface.includes('react') || entry.interface.includes('nextjs');
  const hasBackend = (entry: ProjectEntry) =>
    entry.interface.includes('fastapi') || entry.interface.includes('python');

  it('keeps full-stack catalogue builds as their own deployment', () => {
    const fullStack = registry.projects.filter(
      (entry) => entry.path.startsWith('apps/') && hasFrontend(entry) && hasBackend(entry),
    );
    expect(fullStack.length).toBeGreaterThan(10);
    for (const entry of fullStack) {
      expect(entry.deployment, `${entry.slug} is full-stack`).toBe('separate');
    }
  });

  it('catalogues the catalogue builds that are not full-stack', () => {
    const cliOnly = registry.projects.filter(
      (entry) => entry.path.startsWith('apps/') && !(hasFrontend(entry) && hasBackend(entry)),
    );
    expect(cliOnly.length).toBeGreaterThan(20);
    for (const entry of cliOnly) {
      expect(entry.deployment, `${entry.slug} has no frontend`).toBe('catalogue');
    }
  });

  it('never marks a full-stack project as a catalogue entry', () => {
    const wrong = registry.projects
      .filter((entry) => entry.deployment === 'catalogue' && hasFrontend(entry) && hasBackend(entry))
      .map((entry) => entry.path);
    expect(wrong).toEqual([]);
  });

  it('reserves `none` for projects with nothing to deliver', () => {
    const undeliverable = registry.projects.filter((entry) => entry.deployment === 'none');
    expect(undeliverable.length).toBeGreaterThan(0);
    for (const entry of undeliverable) {
      expect(entry.interface, `${entry.slug} has a surface but is marked none`).toEqual(['other']);
    }
  });

  it('catalogues the whole CLI-only set on the company site', () => {
    // The catalogue entries are generated into the company platform from this
    // registry, so the two cannot disagree: same slugs, same count.
    const published = JSON.parse(
      readFileSync(join(REPO, 'company-platform/src/content/catalogue.generated.json'), 'utf8'),
    ) as { slug: string; path: string }[];
    const expected = registry.projects
      .filter((entry) => entry.deployment === 'catalogue')
      .map((entry) => entry.path)
      .sort();
    expect(published.map((entry) => entry.path).sort()).toEqual(expected);
  });
});

describe('the failure modes are real, not merely absent', () => {
  const base: ProjectEntry = {
    slug: 'alpha',
    name: 'Alpha',
    path: 'apps/alpha',
    owner: null,
    kind: 'catalogue',
    interface: ['cli'],
    deployment: 'catalogue',
    deploys: [],
    devPort: 5200,
    package: 'alpha',
    block: 'catalogue',
  };

  it('catches a duplicate slug', () => {
    const entries = [base, { ...base, path: 'apps/alpha-two', package: 'alpha-two' }];
    expect(duplicateSlugs(entries)).toEqual(['alpha']);
  });

  it('catches a duplicate dev port', () => {
    const entries = [base, { ...base, slug: 'beta', path: 'apps/beta', package: 'beta' }];
    expect(duplicatePorts(entries)).toEqual([5200]);
  });

  it('catches a duplicate package name', () => {
    const entries = [base, { ...base, slug: 'beta', path: 'apps/beta', devPort: 5201 }];
    expect(duplicatePackages(entries)).toEqual(['alpha']);
  });

  it('catches a port outside its block', () => {
    // 5300 belongs to companies; a catalogue project may not take it.
    const entries = [{ ...base, devPort: 5300 }];
    expect(misplacedPorts(entries, registry.blocks)).toEqual([
      'alpha: port 5300 is outside catalogue 5173–5299',
    ]);
  });

  it('catches a port taken from the wrong block even when the number is free', () => {
    // This is the 5173 failure in miniature: the number is valid, the block is not.
    const companies = [{ ...base, block: 'companies', devPort: 5178 }];
    expect(misplacedPorts(companies, registry.blocks)).toEqual([
      'alpha: port 5178 is outside companies 5300–5399',
    ]);
  });
});
