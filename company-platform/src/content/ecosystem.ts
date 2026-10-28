/**
 * The Tamuzi learning systems, and how they reach each other.
 *
 * Several products do different jobs — Tessera holds the learner model and the
 * review engine, ReachLearn, OpenLearn Commons and EduAccess each cover a
 * different part of learning — and none of them is useful as an island. This
 * module is the one place that says what exists, which company it belongs to,
 * and where its front door is.
 *
 * Two rules, both enforced here rather than in a component:
 *
 * 1. **A URL is configuration.** Nothing is hard-coded, so a deployment can be
 *    staged, internal, or absent without a code change.
 * 2. **An unconfigured system is listed, not linked.** It is told the truth —
 *    "not deployed yet" — rather than given a dead `#` or quietly dropped, because
 *    both of those mislead a visitor about what exists.
 *
 * Build the environment with `resolveSystems(env)`; the page passes
 * `process.env`, and the tests pass a literal object.
 */

export type SystemStatus = 'live' | 'staged' | 'planned';

export interface EcosystemSystem {
  /** Stable id, used as a React key and in the URL fragment. */
  id: string;
  name: string;
  companySlug: string;
  tagline: string;
  /** The environment variable that holds its public URL, if it has one. */
  urlEnvVar: string;
  status: SystemStatus;
  /** What it does that its neighbours do not. */
  distinctFrom: string;
}

export interface ResolvedSystem extends EcosystemSystem {
  /** A safe http(s) URL, or null when nothing is configured. */
  url: string | null;
}

export const SYSTEMS: EcosystemSystem[] = [
  {
    id: 'tessera',
    name: 'Tessera',
    companySlug: 'tamuzi-learning',
    tagline: 'The learner model: what you actually retain, and what to do next.',
    urlEnvVar: 'NEXT_PUBLIC_TESSERA_URL',
    status: 'staged',
    distinctFrom: 'Holds the knowledge graph, the spaced-review engine and the learner profile. Not a catalogue.',
  },
  {
    id: 'reachlearn',
    name: 'ReachLearn',
    companySlug: 'tamuzi-learning',
    tagline: 'Accessible course delivery for learners who are often left out of it.',
    urlEnvVar: 'NEXT_PUBLIC_REACHLEARN_URL',
    status: 'staged',
    distinctFrom: 'Delivers material. It does not decide what you remember.',
  },
  {
    id: 'openlearn-commons',
    name: 'OpenLearn Commons',
    companySlug: 'tamuzi-learning',
    tagline: 'Open-licensed material, catalogued with its provenance attached.',
    urlEnvVar: 'NEXT_PUBLIC_OPENLEARN_URL',
    status: 'staged',
    distinctFrom: 'A catalogue of other people\u2019s openly licensed courses, linked rather than copied.',
  },
  {
    id: 'eduaccess',
    name: 'EduAccess',
    companySlug: 'tamuzi-learning',
    tagline: 'Getting to the learning in the first place: access, prerequisites, paperwork.',
    urlEnvVar: 'NEXT_PUBLIC_EDUACCESS_URL',
    status: 'staged',
    distinctFrom: 'Solves the barrier before study starts, not the studying itself.',
  },
];

/**
 * Only http(s) URLs survive. A `javascript:`, `data:` or relative value is
 * treated as unconfigured: a link is either safe to follow or absent.
 */
export function safeUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolveSystems(env: Record<string, string | undefined>): ResolvedSystem[] {
  return SYSTEMS.map((system) => ({ ...system, url: safeUrl(env[system.urlEnvVar]) }));
}

/** What a visitor is told when a system has no address yet. */
export function unconfiguredLabel(status: SystemStatus): string {
  return status === 'planned' ? 'Planned' : 'Not deployed yet';
}
