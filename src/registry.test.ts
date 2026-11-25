import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasPath, sourceOf, validateEntry, validateRegistry } from '../scripts/registry-schema.mjs';

/**
 * The registry guard.
 *
 * `projects.json` records every project once — its slug, path, port, npm package
 * name and deployment. This test is the thing that stops the repository drifting
 * back into the state documented in `docs/PROJECTS.md`: four apps on 5173, two
 * packages called `mwangala-portfolio`, four slugs naming both a CLI and a
 * deployed product.
 *
 * Two kinds of entry exist: `local` (source in this repository, a path on disk)
 * and path-less (`external` / `archived`, source elsewhere — see
 * `scripts/registry-schema.mjs`). Per-entry shape and state rules live in that
 * module and are run over the committed registry below; cross-entry rules
 * (uniqueness, blocks, tree agreement) live here. Both run in CI via `npm test`.
 *
 * The checks are written as pure functions over an entry list so the failure
 * paths can be demonstrated on synthetic data (see the last describe blocks)
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

/**
 * Projects deployed on the owner's explicit request while everything else stays paused.
 * Each entry is the only manifest that project may ship, as `<path>/vercel.json`.
 */
const DEPLOYED_ON_REQUEST = new Set(['company-platform/vercel.json']);

interface ProjectEntry {
  slug: string;
  name: string;
  /** Directory in this repository. Absent exactly when the source lives elsewhere. */
  path?: string;
  /**
   * Where the code lives: `local` (this repository), `external` (its own
   * repository), `extracting` (migration underway), `archived` (original
   * retired). Absent ≡ `local`. Validated by scripts/registry-schema.mjs.
   */
  source?: 'local' | 'external' | 'extracting' | 'archived';
  /** Target repository while extracting, home repository when external. */
  repository?: string;
  defaultBranch?: string;
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
  deploys: (PausedDeployment & { rootDirectory?: string })[];
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
    // Path-less entries (external/archived) are excluded here by construction —
    // their claim is a repository URL, checked by registry-schema, not a directory.
    const missing = registry.projects
      .filter(hasPath)
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
    const registered = new Set(registry.projects.filter(hasPath).map((entry) => entry.path));
    const excluded = new Set(registry.excluded.map((entry) => entry.path));
    const unregistered: string[] = [];
    // Installed dependencies are never projects. The companies workspace hoists
    // a shared `node_modules`, and without this the check reports a hundred
    // directories that nobody registered because nobody could.
    const IGNORED = new Set(['node_modules', '__pycache__', '.venv', 'dist', 'build', '.next']);

    const walk = (relative: string, depth: number): void => {
      for (const name of readdirSync(join(REPO, relative))) {
        if (IGNORED.has(name)) continue;
        const child = `${relative}/${name}`;
        if (!statSync(join(REPO, child)).isDirectory()) continue;
        if (registered.has(child) || excluded.has(child)) continue;
        // A registered project owns everything beneath it.
        if ([...registered].some((path) => path.startsWith(`${child}/`))) continue;
        // `companies/<company>/<product>` groups are containers, not projects.
        if (depth < 2 && readdirSync(join(REPO, child)).length > 0) {
          walk(child, depth + 1);
          continue;
        }
        unregistered.push(child);
      }
    };

    // Two levels under each company, one under coursework, and the portfolio.
    for (const company of ['velaqori', 'tamuzi']) walk(`companies/${company}`, 1);
    walk('coursework', 1);
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

  it('deploys nothing but what the owner asked for, because deployment is paused', () => {
    const stillDeploying = registry.projects.filter((entry) => entry.deploys.length > 0);
    expect(stillDeploying.map((entry) => entry.path)).toEqual(['company-platform']);
    // A manifest is only allowed where the owner asked for a deployment, and that project
    // must exist in the registry and carry no paused-deployment history.
    for (const manifest of DEPLOYED_ON_REQUEST) {
      const entry = registry.projects.find((project) => manifest.startsWith(`${project.path}/`));
      expect(entry, `${manifest} has no registry project`).toBeDefined();
      expect(entry?.pausedDeployment).toBeUndefined();
      expect(entry?.deploys.length).toBeGreaterThan(0);
    }
  });

  it('keeps the nine former deployments as history, with a root directory', () => {
    const paused = registry.projects.filter((entry) => entry.pausedDeployment !== undefined);
    expect(paused).toHaveLength(9);
    // pausedDeployment asserts a directory in *this* tree, so every such entry
    // must be path-bearing; registry-schema enforces the same rule.
    const pathed = paused.filter(hasPath);
    expect(pathed).toHaveLength(paused.length);
    for (const entry of pathed) {
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
    //
    // The root is included deliberately: a config there deploys the entire repository
    // as one project, which is a larger claim than any single project's config.
    const MANIFESTS = new Set(['vercel.json', 'netlify.toml', 'wrangler.toml', 'now.json']);
    // The one deliberate exception (see DEPLOYED_ON_REQUEST): the owner asked for the company
    // website to be deployed on 2026-10-29 (docs/deployment/README.md); its manifest only scopes
    // rebuilds with an ignoreCommand. Anything else added here still fails this test.
    const found: string[] = [];

    const visit = (relative: string): void => {
      for (const name of readdirSync(join(REPO, relative))) {
        if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
        const child = `${relative}/${name}`;
        if (statSync(join(REPO, child)).isDirectory()) visit(child);
        else if (MANIFESTS.has(name) && !DEPLOYED_ON_REQUEST.has(child)) found.push(child);
      }
    };

    for (const entry of registry.projects.filter(hasPath)) visit(entry.path);
    // The repository root is checked too. A root config deploys the whole tree as one
    // project, which is more than any single project's wiring, not less.
    if (existsSync(join(REPO, 'vercel.json'))) found.push('vercel.json');
    expect(found).toEqual([]);
  });});

describe('the delivery rule', () => {
  const hasFrontend = (entry: ProjectEntry) =>
    entry.interface.includes('react') || entry.interface.includes('nextjs');
  const hasBackend = (entry: ProjectEntry) =>
    entry.interface.includes('fastapi') || entry.interface.includes('python');

  it('keeps full-stack company builds as their own deployment', () => {
    const fullStack = registry.projects.filter(
      (entry) => entry.path?.startsWith('companies/') === true && hasFrontend(entry) && hasBackend(entry),
    );
    expect(fullStack.length).toBeGreaterThan(10);
    for (const entry of fullStack) {
      expect(entry.deployment, `${entry.slug} is full-stack`).toBe('separate');
    }
  });

  it('catalogues the company builds that are not full-stack', () => {
    const cliOnly = registry.projects.filter(
      (entry) => entry.path?.startsWith('companies/') === true && !(hasFrontend(entry) && hasBackend(entry)),
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
    path: 'companies/velaqori/alpha',
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
    const entries = [base, { ...base, path: 'companies/velaqori/alpha-two', package: 'alpha-two' }];
    expect(duplicateSlugs(entries)).toEqual(['alpha']);
  });

  it('catches a duplicate dev port', () => {
    const entries = [base, { ...base, slug: 'beta', path: 'companies/velaqori/beta', package: 'beta' }];
    expect(duplicatePorts(entries)).toEqual([5200]);
  });

  it('catches a duplicate package name', () => {
    const entries = [base, { ...base, slug: 'beta', path: 'companies/velaqori/beta', devPort: 5201 }];
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

describe('every entry satisfies its source-state schema', () => {
  it('validates the committed registry against registry-schema', () => {
    const problems = validateRegistry(registry, registry.blocks, (path) =>
      existsSync(join(REPO, path)),
    );
    expect(problems).toEqual([]);
  });

  it('names a known source state for every entry', () => {
    const known = new Set(['local', 'external', 'extracting', 'archived']);
    for (const entry of registry.projects) {
      expect(known.has(sourceOf(entry)), `${entry.slug} has source "${entry.source}"`).toBe(true);
    }
  });

  it('discovers the ContextVault pilot as an extracting entry', () => {
    // Extraction map §4.1 #1. The original directory still lives here, so the
    // tree must discover the project — only the source state and target
    // repository are hand-kept (REGISTRY_META). A contextvault missing from
    // ROOT_PRODUCTS would silently drop the pilot from the registry while the
    // schema still passed; this test is the tripwire for that gap.
    const entry = registry.projects.find((p) => p.slug === 'contextvault');
    expect(entry, 'contextvault must be discovered by the generator').toBeDefined();
    expect(entry).toMatchObject({
      path: 'contextvault',
      source: 'extracting',
      repository: 'https://github.com/MwaJr3/contextvault',
      defaultBranch: 'main',
      kind: 'product',
      name: 'ContextVault',
    });
    expect(existsSync(join(REPO, 'contextvault'))).toBe(true);
  });

  it('holds path-less entries to the same slug uniqueness as local ones', () => {
    // First-class, not an exception: an external entry squatting a local slug
    // is a duplicate like any other.
    const local: ProjectEntry = {
      slug: 'alpha',
      name: 'Alpha',
      path: 'companies/velaqori/alpha',
      source: 'local',
      owner: null,
      kind: 'project',
      block: 'companies',
      interface: ['react'],
      deployment: 'separate',
      deploys: [],
    };
    const squatter: ProjectEntry = {
      ...local,
      path: undefined,
      source: 'external',
      repository: 'https://github.com/example/alpha',
      defaultBranch: 'main',
    };
    expect(duplicateSlugs([local, squatter])).toEqual(['alpha']);
  });
});

describe('the source-state schema, demonstrated on synthetic data', () => {
  const blocks = { catalogue: [5173, 5299] as [number, number], products: [5500, 5599] as [number, number] };
  const exists = (path: string) => path === 'contextvault';
  // Typed at the validator's parameter so bad states (unknown `source`) can be
  // fed in without fighting ProjectEntry's union.
  const problems = (entry: Parameters<typeof validateEntry>[0]) => validateEntry(entry, blocks, exists);

  const local: ProjectEntry = {
    slug: 'contextvault',
    name: 'ContextVault',
    path: 'contextvault',
    source: 'local',
    owner: null,
    kind: 'product',
    block: 'products',
    interface: ['nextjs'],
    deployment: 'separate',
    deploys: [],
  };
  const external: ProjectEntry = {
    slug: 'contextvault',
    name: 'ContextVault',
    source: 'external',
    repository: 'https://github.com/example/contextvault',
    defaultBranch: 'main',
    owner: null,
    kind: 'product',
    block: 'products',
    interface: ['nextjs'],
    deployment: 'separate',
    deploys: [],
  };

  it('accepts a correct entry for each of the four states', () => {
    expect(problems(local)).toEqual([]);
    expect(problems(external)).toEqual([]);
    expect(
      problems({ ...local, source: 'extracting', repository: external.repository, defaultBranch: 'main' }),
    ).toEqual([]);
    expect(problems({ ...external, path: undefined, source: 'archived', defaultBranch: undefined })).toEqual([]);
  });

  it('rejects an unknown source state', () => {
    expect(problems({ ...local, source: 'mirrored' })).toEqual([
      'contextvault: source "mirrored" is not one of local, external, extracting, archived',
    ]);
  });

  it('rejects a local entry without an existing path', () => {
    expect(problems({ ...local, path: undefined })).toContain(
      'contextvault: local source requires a path in this repository',
    );
    expect(problems({ ...local, path: 'nowhere' })).toContain(
      'contextvault: path "nowhere" does not exist',
    );
  });

  it('rejects a local entry claiming its own repository URL', () => {
    // The central repository is the home of local entries; recording it per
    // entry would let two entries disagree about where the code lives.
    expect(problems({ ...local, repository: 'https://github.com/example/central' })).toContain(
      'contextvault: local source must not carry repository — its home is this repository',
    );
  });

  it('rejects an external entry missing its repository evidence', () => {
    expect(problems({ ...external, repository: undefined })).toContain(
      'contextvault: external source requires a repository URL',
    );
    expect(problems({ ...external, defaultBranch: undefined })).toContain(
      'contextvault: external source requires defaultBranch',
    );
    expect(problems({ ...external, repository: 'http://github.com/example/contextvault' })).toContain(
      'contextvault: repository must be an https URL',
    );
  });

  it('rejects an external entry still holding a local path', () => {
    expect(problems({ ...external, path: 'contextvault' })).toContain(
      'contextvault: external source must not carry a path in this repository',
    );
  });

  it('rejects deployment claims this tree cannot back for a path-less entry', () => {
    expect(problems({ ...external, devPort: 5501 })).toContain(
      'contextvault: external source must not claim a devPort — its dev server lives in its own repository',
    );
    expect(
      problems({ ...external, deployment: 'catalogue', interface: ['cli'] }),
    ).toContain(
      'contextvault: deployment "catalogue" requires a local path — the catalogue is generated from this tree',
    );
    expect(
      problems({ ...external, deploys: [{ target: 'vercel-site', project: 'vault' }] }),
    ).toContain(
      'contextvault: deploys points at a vercel.json manifest in this tree; a path-less entry cannot ship one',
    );
    expect(
      problems({
        ...external,
        pausedDeployment: { target: 'vercel-site', project: 'vault', rootDirectory: 'contextvault' },
      }),
    ).toContain(
      'contextvault: pausedDeployment records a rootDirectory in this tree; a path-less entry cannot carry it',
    );
  });

  it('rejects an extracting entry without its target repository', () => {
    expect(problems({ ...local, source: 'extracting' })).toContain(
      'contextvault: extracting source requires the target repository URL',
    );
    expect(problems({ ...local, source: 'extracting', repository: external.repository })).toContain(
      'contextvault: extracting source requires defaultBranch in the target repository',
    );
  });

  it('rejects an archived entry that still points at a directory here', () => {
    expect(problems({ ...local, source: 'archived', repository: undefined, defaultBranch: undefined })).toContain(
      'contextvault: archived source must not carry a path — the original implementation was retired',
    );
  });

  it('keeps the honest pairing for entries with nothing to deliver', () => {
    expect(
      problems({ ...external, deployment: 'none', interface: ['other'] }),
    ).toEqual([]);
    expect(problems({ ...external, deployment: 'none', interface: ['nextjs'] })).toContain(
      'contextvault: deployment "none" requires interface ["other"] — nothing to deliver, nothing to claim',
    );
  });
});
