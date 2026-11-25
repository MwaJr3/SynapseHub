/**
 * The registry entry schema — one validator, three consumers.
 *
 * `projects.json` may describe two kinds of product: one whose source lives in
 * this repository (`local`, and `extracting` while a move is underway) and one
 * whose source lives elsewhere (`external`, and `archived` once the original
 * here has been retired). An external repository is a first-class entry: it
 * carries the same slug, block, kind and uniqueness obligations as a local one,
 * and it satisfies them with different evidence — a `repository` URL and
 * `defaultBranch` instead of a directory on disk.
 *
 * Consumers:
 *   - scripts/build-registry.mjs — validates before writing or passing --check
 *   - src/registry.test.ts       — validates the committed registry in CI
 *   - tests in registry.test.ts  — demonstrate each failure on synthetic data
 *
 * Rules here are per-entry shape and state rules. Cross-entry rules (duplicate
 * slugs, ports, packages; port blocks; tree agreement) live in registry.test.ts
 * and are not duplicated.
 */

/** The four states a project's source can be in. */
export const SOURCE_STATES = ['local', 'external', 'extracting', 'archived'];

const SLUG = /^[a-z0-9]+([_-][a-z0-9]+)*$/;
const KINDS = ['catalogue', 'project', 'product', 'coursework'];
const DEPLOYMENTS = ['separate', 'catalogue', 'none'];

/** Absent `source` means the source is here: every pre-state entry is local. */
export function sourceOf(entry) {
  return entry.source ?? 'local';
}

/** True when the entry claims a directory in this repository. */
export function hasPath(entry) {
  return typeof entry.path === 'string' && entry.path.length > 0;
}

function httpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Problems with one entry, each prefixed with the slug. An empty array means
 * the entry is valid for its claimed source state. `pathExists` is injected so
 * the same rules run against the real tree (build-registry) and against a
 * stubbed disk (tests).
 *
 * @param {Record<string, unknown>} entry
 * @param {Record<string, [number, number]>} blocks
 * @param {(path: string) => boolean} pathExists
 * @returns {string[]}
 */
export function validateEntry(entry, blocks, pathExists) {
  const slug = typeof entry.slug === 'string' ? entry.slug : '';
  const problems = [];
  const say = (message) => problems.push(`${slug || '<no slug>'}: ${message}`);

  if (!SLUG.test(slug)) say(`slug "${slug}" is not lowercase-with-separators`);
  if (typeof entry.name !== 'string' || entry.name.trim() === '') say('name is missing');
  if (!blocks[entry.block]) say(`block "${entry.block}" is not a known port block`);
  if (!Array.isArray(entry.interface) || entry.interface.length === 0)
    say('interface must be a non-empty array of surfaces');
  if (!KINDS.includes(entry.kind)) say(`kind "${entry.kind}" is not known`);
  if (!DEPLOYMENTS.includes(entry.deployment))
    say(`deployment "${entry.deployment}" is not known`);

  const source = sourceOf(entry);
  if (!SOURCE_STATES.includes(source)) {
    say(`source "${entry.source}" is not one of ${SOURCE_STATES.join(', ')}`);
    return problems; // every other rule keys off a known state
  }

  const path = hasPath(entry);
  const repository =
    typeof entry.repository === 'string' && entry.repository.length > 0
      ? entry.repository
      : undefined;
  const branch =
    typeof entry.defaultBranch === 'string' && entry.defaultBranch.length > 0
      ? entry.defaultBranch
      : undefined;

  // Invariants that hold for every state.
  if (entry.deployment === 'catalogue' && !path)
    say('deployment "catalogue" requires a local path — the catalogue is generated from this tree');
  const honestNothing = Array.isArray(entry.interface) &&
    entry.interface.length === 1 && entry.interface[0] === 'other';
  if (entry.deployment === 'none' && !honestNothing)
    say('deployment "none" requires interface ["other"] — nothing to deliver, nothing to claim');
  if (entry.pausedDeployment !== undefined && !path)
    say('pausedDeployment records a rootDirectory in this tree; a path-less entry cannot carry it');
  if (Array.isArray(entry.deploys) && entry.deploys.length > 0 && !path)
    say('deploys points at a vercel.json manifest in this tree; a path-less entry cannot ship one');

  switch (source) {
    case 'local': {
      if (!path) say('local source requires a path in this repository');
      else if (!pathExists(entry.path)) say(`path "${entry.path}" does not exist`);
      if (repository) say('local source must not carry repository — its home is this repository');
      if (branch) say('local source must not carry defaultBranch — this repository\'s branch is not per-entry');
      break;
    }
    case 'extracting': {
      if (!path) say('extracting source requires the path being extracted to still exist');
      else if (!pathExists(entry.path)) say(`path "${entry.path}" does not exist`);
      if (!repository) say('extracting source requires the target repository URL');
      else if (!httpsUrl(repository)) say('repository must be an https URL');
      if (!branch) say('extracting source requires defaultBranch in the target repository');
      break;
    }
    case 'external': {
      if (path) say('external source must not carry a path in this repository');
      if (!repository) say('external source requires a repository URL');
      else if (!httpsUrl(repository)) say('repository must be an https URL');
      if (!branch) say('external source requires defaultBranch');
      if (entry.devPort !== undefined)
        say('external source must not claim a devPort — its dev server lives in its own repository');
      if (!['project', 'product'].includes(entry.kind))
        say(`external kind "${entry.kind}" must be project or product — catalogue and coursework are this tree's concepts`);
      break;
    }
    case 'archived': {
      if (path) say('archived source must not carry a path — the original implementation was retired');
      if (repository && !httpsUrl(repository)) say('repository must be an https URL');
      if (branch && !repository)
        say('defaultBranch without a repository names no branch');
      // A devPort stays allowed on purpose: the port block rule never reuses a
      // number even after a project is archived (notes.blocks in projects.json).
      break;
    }
  }

  return problems;
}

/**
 * Validate every entry of a built registry document.
 * @param {{ projects: Record<string, unknown>[] }} doc
 * @param {Record<string, [number, number]>} blocks
 * @param {(path: string) => boolean} pathExists
 * @returns {string[]}
 */
export function validateRegistry(doc, blocks, pathExists) {
  return doc.projects.flatMap((entry) => validateEntry(entry, blocks, pathExists));
}
