/**
 * External links for each project.
 *
 * Nothing here is invented. A URL is only listed once it genuinely exists; an
 * empty string means "not configured yet", and the UI hides that action (or
 * shows a deliberate unavailable state) instead of pointing at a placeholder.
 *
 * All project code lives in the SynapseHub monorepo, so repo links point at
 * verified in-repo tree paths — never at per-project repositories that do
 * not exist.
 *
 * Configure at build time, e.g.:
 *   VITE_REPO_OWNER=MwaJr3 npm run build
 * or fill in explicit `live` / `repo` overrides below.
 */

const repoOwner = (import.meta.env.VITE_REPO_OWNER as string | undefined)?.replace(/^\/+|\/+$/g, '') ?? '';

export interface ProjectLinks {
  /** Deployed application. Empty = no live demo configured. */
  live: string;
  /** Source repository. Empty = not published / not configured. */
  repo: string;
}

const explicit: Record<string, Partial<ProjectLinks>> = {
  // Example (uncomment and replace with real URLs):
  // phishlens: { live: 'https://phishlens.example.com', repo: 'https://github.com/owner/repo' },
};

/**
 * Verified paths inside the SynapseHub monorepo (checked against the working
 * tree at build time of this portfolio data).
 */
const repoPaths: Record<string, string> = {
  phishlens: 'apps/phishlens-cli',
  netscope: 'apps/netscope-cli',
  'threatintel-desk': 'apps/threatintel-desk-cli',
  incidentflow: 'apps/incidentflow-cli',
  hashsight: 'projects/hashsight',
  assetwatch: 'projects/assetwatch',
  'securecode-workbench': 'projects/securecode-workbench',
  'cyberaware-lab': 'projects/cyberaware-lab',
  transcriptwise: 'projects/transcriptwise',
};

export const monorepoTreeBase = 'https://github.com';

function repo(slug: string): string {
  if (!repoOwner) return '';
  const path = repoPaths[slug];
  if (!path) return '';
  return `${monorepoTreeBase}/${repoOwner}/SynapseHub/tree/main/${path}`;
}

export function projectLinks(slug: string): ProjectLinks {
  const override = explicit[slug] ?? {};
  return {
    live: override.live ?? '',
    repo: override.repo ?? repo(slug),
  };
}
