/**
 * Repository configuration.
 *
 * The engine works with no configuration at all — discovery finds every UI root and
 * the gate defaults to P1. This file exists for the two things a repository
 * legitimately needs to say that source cannot:
 *
 * * **where not to look** (`ignore`) — a vendored copy, an archived project kept for
 *   reference, a directory with defects that are knowingly deferred;
 * * **how strict the gate is** (`gate`) — a young repository may start at P1 and
 *   tighten to P2 as the backlog empties.
 *
 * Everything else is computed. A config file that could disable a rule would let a
 * repository go green by editing JSON, which is the failure this whole engine exists
 * to argue against.
 */

import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_FILE = 'northstar.config.json';

const DEFAULTS = { gate: 'P1', ignore: [], report: 'docs/ux/audit-repository.md' };

export function loadConfig(cwd = process.cwd()) {
  const file = path.join(cwd, CONFIG_FILE);
  if (!fs.existsSync(file)) return { ...DEFAULTS, file: null };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    // A broken config must not silently fall back to defaults: the gate would then
    // be stricter or looser than the repository believes it is.
    throw new Error(`${CONFIG_FILE} is not valid JSON: ${error.message}`);
  }
  const gate = ['P0', 'P1', 'P2', 'P3'].includes(parsed.gate) ? parsed.gate : DEFAULTS.gate;
  {
    const ignore = Array.isArray(parsed.ignore) ? parsed.ignore.filter((entry) => typeof entry === 'string') : [];
    return { ...DEFAULTS, ...parsed, gate, ignore, file };
  }
}

/** Apply `ignore` to a discovered project list. Entries are name prefixes. */
export function applyIgnore(projects, config) {
  if (!config.ignore.length) return projects;
  return projects.filter(
    (project) => !config.ignore.some((prefix) => project.name === prefix || project.name.startsWith(`${prefix}/`)),
  );
}
