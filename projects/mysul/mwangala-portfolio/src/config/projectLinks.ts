/**
 * External links for each project.
 *
 * Nothing here is invented. A URL is only listed once it genuinely exists; an
 * empty string means "not configured yet", and the UI hides that action (or
 * shows a deliberate unavailable state) instead of pointing at a placeholder.
 *
 * Configure at build time, e.g.:
 *   VITE_REPO_OWNER=your-username npm run build
 * or fill in explicit `live` / `repo` overrides below.
 */

const repoOwner = (import.meta.env.VITE_REPO_OWNER as string | undefined)?.replace(/^\/+|\/+$/g, '') ?? '';

function repo(name: string): string {
  if (!repoOwner) return '';
  return `https://github.com/${repoOwner}/${name}`;
}

export interface ProjectLinks {
  /** Deployed application. Empty = no live demo configured. */
  live: string;
  /** Source repository. Empty = not published / not configured. */
  repo: string;
}

const explicit: Record<string, Partial<ProjectLinks>> = {
  // Example (uncomment and replace with real URLs):
  // phishlens: { live: 'https://phishlens.example.com', repo: 'https://github.com/owner/phishlens' },
};

const repoNames: Record<string, string> = {
  phishlens: 'phishlens',
  netscope: 'netscope',
  'threatintel-desk': 'threatintel-desk',
  incidentflow: 'incidentflow',
  hashsight: 'hashsight',
  assetwatch: 'assetwatch',
  'securecode-workbench': 'securecode-workbench',
  'cyberaware-lab': 'cyberaware-lab',
  transcriptwise: 'transcriptwise',
};

export function projectLinks(slug: string): ProjectLinks {
  const override = explicit[slug] ?? {};
  return {
    live: override.live ?? '',
    repo: override.repo ?? repo(repoNames[slug] ?? slug),
  };
}
