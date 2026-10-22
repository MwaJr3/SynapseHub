import type { CategoryDefinition, PortfolioProject } from '@/types';
import { SOURCE_HOSTS, deploymentRegistry } from '@/config/deployment';
import { resolveExternalUrl } from '@/config/site';
import { categories } from '@/data/categories';
import { catalogue } from '@/data/projects';

export interface DataIssue {
  level: 'error' | 'warning';
  slug?: string;
  message: string;
}

const PLACEHOLDER_PATTERNS = [
  /example\.(com|org|net)/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /lorem ipsum/i,
  /^#$/,
  /^javascript:/i,
];
const EXPECTED_PROJECT_COUNT = 10;

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Structural checks over the centralized catalogue.
 *
 * Run in development (a console report), in the test suite (a hard failure)
 * and available to any future build step, so a broken project record cannot
 * reach production silently.
 */
export function projectDataIssues(
  projects: PortfolioProject[] = catalogue,
  categoryList: CategoryDefinition[] = categories,
): DataIssue[] {
  const issues: DataIssue[] = [];
  const add = (level: DataIssue['level'], message: string, slug?: string) =>
    issues.push(slug ? { level, message, slug } : { level, message });

  if (projects.length !== EXPECTED_PROJECT_COUNT) {
    add(
      'error',
      `Expected ${EXPECTED_PROJECT_COUNT} projects in the catalogue, found ${projects.length}.`,
    );
  }

  const knownCategories = new Set(categoryList.map((category) => category.id));
  const slugs = projects.map((project) => project.slug);
  const slugSet = new Set(slugs);
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  const seenDescriptions = new Map<string, string>();
  const knownSlugs = new Set<string>(slugs);

  for (const project of projects) {
    const { slug } = project;

    if (seenIds.has(project.id))
      add('error', `Duplicate project id "${project.id}".`, slug);
    seenIds.add(project.id);

    if (seenOrders.has(project.displayOrder)) {
      add('error', `Duplicate displayOrder ${project.displayOrder}.`, slug);
    }
    seenOrders.add(project.displayOrder);

    if (project.relatedSlugs.includes(slug)) {
      add('error', 'Project lists itself as a related project.', slug);
    }

    if (new Set(project.relatedSlugs).size !== project.relatedSlugs.length) {
      add('error', 'Duplicate entries in relatedSlugs.', slug);
    }

    if (project.relatedSlugs.length < 2 || project.relatedSlugs.length > 4) {
      add(
        'warning',
        `relatedSlugs should contain 2–4 projects, found ${project.relatedSlugs.length}.`,
        slug,
      );
    }

    for (const related of project.relatedSlugs) {
      if (!slugSet.has(related)) {
        add(
          'error',
          `relatedSlugs references unknown project "${related}".`,
          slug,
        );
      } else {
        const other = projects.find((candidate) => candidate.slug === related);
        if (other && !other.relatedSlugs.includes(slug)) {
          add(
            'warning',
            `Related link to "${related}" is not reciprocated.`,
            slug,
          );
        }
      }
    }

    for (const categoryId of project.categories) {
      if (!knownCategories.has(categoryId)) {
        add('error', `Unknown category id "${categoryId}".`, slug);
      }
    }

    if (!knownCategories.has(project.categories[0] ?? '')) {
      add('error', 'Primary category is not listed in categories[].', slug);
    }

    if (project.featureTags.length < 3 || project.featureTags.length > 5) {
      add(
        'warning',
        `A card should show 3–5 feature tags, found ${project.featureTags.length}.`,
        slug,
      );
    }

    if (project.previews.length < 2) {
      add('warning', 'Case study should offer at least two previews.', slug);
    }

    for (const preview of project.previews) {
      if (preview.isIllustrative && preview.caption.trim().length < 20) {
        add(
          'warning',
          `Illustrative preview "${preview.id}" needs a descriptive caption.`,
          slug,
        );
      }
      if (/screenshot/i.test(preview.caption) && preview.isIllustrative) {
        add(
          'error',
          `Illustrative preview "${preview.id}" must not be described as a screenshot.`,
          slug,
        );
      }
      if (!preview.isIllustrative && !preview.screenshotSrc) {
        add(
          'error',
          `Preview "${preview.id}" claims to be real but has no screenshotSrc.`,
          slug,
        );
      }
    }

    if (project.features.length < 6) {
      add(
        'warning',
        `Case study should describe at least six features, found ${project.features.length}.`,
        slug,
      );
    }

    if (project.caseStudy.workflow.length < 4) {
      add(
        'warning',
        'Case study workflow should have at least four steps.',
        slug,
      );
    }

    if (project.architecture.length < 4) {
      add(
        'warning',
        'Architecture diagram should show at least four components.',
        slug,
      );
    }

    const architectureIds = project.architecture.map((node) => node.id);
    if (new Set(architectureIds).size !== architectureIds.length) {
      add('error', 'Duplicate architecture node ids.', slug);
    }

    for (const node of project.architecture) {
      for (const target of node.connectsTo ?? []) {
        if (!architectureIds.includes(target)) {
          add(
            'error',
            `Architecture node "${node.id}" connects to unknown node "${target}".`,
            slug,
          );
        }
      }
    }

    if (project.caseStudy.limitations.length < 3) {
      add(
        'warning',
        'Case study should be explicit about at least three limitations.',
        slug,
      );
    }

    if (project.caseStudy.testing.length < 4) {
      add('warning', 'Case study should describe the tested behaviours.', slug);
    }

    const descriptionKey = project.shortDescription.trim().toLowerCase();
    const existing = seenDescriptions.get(descriptionKey);
    if (existing) {
      add('error', `Short description is duplicated with "${existing}".`, slug);
    }
    seenDescriptions.set(descriptionKey, slug);

    const fields: Array<[string, string | undefined]> = [
      ['liveDemoUrl', project.liveDemoUrl],
      ['repositoryUrl', project.repositoryUrl],
      ['projectDate', project.projectDate],
    ];

    for (const [field, value] of fields) {
      if (value && looksLikePlaceholder(value)) {
        add(
          'error',
          `${field} looks like a placeholder value ("${value}").`,
          slug,
        );
      }
    }

    if (project.liveDemoUrl) {
      const resolved = resolveExternalUrl(project.liveDemoUrl);
      if (!resolved) {
        add(
          'error',
          `liveDemoUrl "${project.liveDemoUrl}" is not a usable http(s) URL.`,
          slug,
        );
      } else if (
        SOURCE_HOSTS.some((host) => new URL(resolved).hostname.endsWith(host))
      ) {
        add(
          'warning',
          'liveDemoUrl points at a source-code host — check that the fields were not swapped.',
          slug,
        );
      }
    }

    if (project.repositoryUrl) {
      const resolved = resolveExternalUrl(project.repositoryUrl);
      if (!resolved) {
        add(
          'error',
          `repositoryUrl "${project.repositoryUrl}" is not a usable http(s) URL.`,
          slug,
        );
      } else if (
        !SOURCE_HOSTS.some((host) => new URL(resolved).hostname.endsWith(host))
      ) {
        add(
          'warning',
          'repositoryUrl does not point at a known source-code host.',
          slug,
        );
      }
    }
  }

  for (const [slug, details] of Object.entries(deploymentRegistry)) {
    if (!knownSlugs.has(slug)) {
      add('error', `Deployment registry references unknown project "${slug}".`);
    }
    if (details?.liveDemoUrl && looksLikePlaceholder(details.liveDemoUrl)) {
      add(
        'error',
        'Deployment registry contains a placeholder live demo URL.',
        slug,
      );
    }
    if (details?.repositoryUrl && looksLikePlaceholder(details.repositoryUrl)) {
      add(
        'error',
        'Deployment registry contains a placeholder repository URL.',
        slug,
      );
    }
  }

  const featured = projects.filter((project) => project.featured);
  if (featured.length !== 4) {
    add(
      'warning',
      `Home page showcases four featured projects, found ${featured.length}.`,
    );
  }

  return issues;
}

export function projectDataErrors(
  projects: PortfolioProject[] = catalogue,
  categoryList: CategoryDefinition[] = categories,
): DataIssue[] {
  return projectDataIssues(projects, categoryList).filter(
    (issue) => issue.level === 'error',
  );
}

/** Dev-only console report so a broken record is noticed while editing data. */
export function reportProjectDataIssuesInDev(): void {
  if (!import.meta.env.DEV) return;
  const issues = projectDataIssues();
  if (issues.length === 0) return;
  const label = `[portfolio] ${issues.length} catalogue issue(s)`;
  console.warn(label, issues);
}
