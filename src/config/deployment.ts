import type { DeploymentRegistry, ProjectSlug } from '@/types';

/**
 * Deployment registry — the single place where a project is connected to the
 * application it runs as and the repository it lives in.
 *
 * The portfolio is built catalogue-first: every one of the ten projects is
 * fully documented before a deployment or repository exists. When those become
 * available, add an entry below and the links appear everywhere at once —
 * project card, case-study header, project-links panel, related-project
 * sections and footer — with no component edits.
 *
 * Rules enforced by `src/lib/validate.ts` and the test suite:
 *  - only http(s) URLs are accepted; malformed or unsafe values are ignored,
 *    and a rejected URL is never silently swapped for a different destination;
 *  - `repositoryUrl` must point at a source host (GitHub by default) and
 *    `liveDemoUrl` must not — the two fields are never interchanged;
 *  - never put real credentials here. `demoNote` is for resettable, synthetic
 *    demo access only.
 *
 * Example (uncomment and replace with the real values once they exist):
 *
 *   learnbridge: {
 *     liveDemoUrl: 'https://learnbridge.example.org',
 *     repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
 *     demoNote: 'Seeded demo learner: demo.learner@example.org / demo-password',
 *     note: 'Connected 2026-11-02',
 *   },
 */
export const deploymentRegistry: DeploymentRegistry = {
  // Intentionally empty: no deployment or repository has been confirmed yet,
  // so every project is presented as a documented case study with its
  // application and source links clearly marked "not yet connected".
};

/** Project slugs that still have no configured application or repository. */
export function unconnectedSlugs(
  registry: DeploymentRegistry = deploymentRegistry,
): ProjectSlug[] {
  return (Object.keys(registry) as ProjectSlug[]).filter((slug) => {
    const details = registry[slug];
    return !details?.liveDemoUrl && !details?.repositoryUrl;
  });
}

/** Where repository links are expected to point, used by URL validation. */
export const SOURCE_HOSTS = [
  'github.com',
  'gitlab.com',
  'codeberg.org',
  'bitbucket.org',
];
