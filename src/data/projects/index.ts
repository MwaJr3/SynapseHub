import type {
  DeploymentRegistry,
  PortfolioProject,
  ProjectSlug,
} from '@/types';
import { deploymentRegistry } from '@/config/deployment';
import { resolveExternalUrl } from '@/config/site';
import { categoryLabels } from '@/data/categories';

import { learnbridge } from './learnbridge';
import { classconnect } from './classconnect';
import { tutorspring } from './tutorspring';
import { pathwise } from './pathwise';
import { teachcraft } from './teachcraft';
import { openlearnCommons } from './openlearn-commons';
import { learnpulse } from './learnpulse';
import { reachlearn } from './reachlearn';
import { eduaccess } from './eduaccess';
import { workniche } from './workniche';

/**
 * The centralized catalogue: every page, card, filter and case study renders
 * from these ten records. Adding a project means adding a record here — not
 * editing components.
 */
export const catalogue: PortfolioProject[] = [
  learnbridge,
  classconnect,
  tutorspring,
  pathwise,
  teachcraft,
  openlearnCommons,
  learnpulse,
  reachlearn,
  eduaccess,
  workniche,
].sort((a, b) => a.displayOrder - b.displayOrder);

/**
 * Merge the catalogue with the deployment registry.
 *
 * A URL is only attached when it passes `resolveExternalUrl`, and the two
 * fields are kept strictly separate: `repositoryUrl` never appears in a demo
 * slot and vice versa. Rejected or unconfigured values are simply absent, and
 * the UI hides those actions rather than rendering a placeholder.
 */
export function connectProjects(
  registry: DeploymentRegistry = deploymentRegistry,
  records: PortfolioProject[] = catalogue,
): PortfolioProject[] {
  return records.map((project) => {
    const details = registry[project.slug];
    if (!details) return project;

    const liveDemoUrl = resolveExternalUrl(details.liveDemoUrl);
    const repositoryUrl = resolveExternalUrl(details.repositoryUrl);

    return {
      ...project,
      ...(liveDemoUrl ? { liveDemoUrl } : {}),
      ...(repositoryUrl ? { repositoryUrl } : {}),
      ...(details.demoNote ? { demoRequirements: details.demoNote } : {}),
    };
  });
}

export const projects: PortfolioProject[] = connectProjects();

const bySlug = new Map<string, PortfolioProject>(
  projects.map((project) => [project.slug, project]),
);

export const featuredProjects: PortfolioProject[] = projects.filter(
  (project) => project.featured,
);

export function getProject(
  slug: string | undefined,
): PortfolioProject | undefined {
  if (!slug) return undefined;
  return bySlug.get(slug);
}

export function getProjectsBySlugs(slugs: ProjectSlug[]): PortfolioProject[] {
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((project): project is PortfolioProject => project !== undefined);
}

export function getRelatedProjects(
  project: PortfolioProject,
): PortfolioProject[] {
  return getProjectsBySlugs(project.relatedSlugs);
}

/** Projects that share at least one category id with the given project. */
export function projectsInCategory(categoryId: string): PortfolioProject[] {
  return projects.filter((project) => project.categories.includes(categoryId));
}

export function projectCountByCategory(categoryId: string): number {
  return projectsInCategory(categoryId).length;
}

/**
 * Fields are joined into one searchable haystack per project so a single
 * filter function can serve every search interaction on the site.
 *
 * Covers the search dimensions the library promises: name, description,
 * categories, technologies, features and the problem domain — including the
 * intended users, so "basic phones" or "scholarship" find the right projects.
 */
export function projectSearchHaystack(project: PortfolioProject): string {
  return [
    project.name,
    project.shortDescription,
    project.longDescription,
    project.primaryCategory,
    project.categories.map((id) => categoryLabels[id] ?? id).join(' '),
    project.technologies.join(' '),
    project.featureTags.join(' '),
    project.features
      .map((feature) => `${feature.title} ${feature.description}`)
      .join(' '),
    project.caseStudy.problem,
    project.caseStudy.users.join(' '),
  ]
    .join(' \u2022 ')
    .toLowerCase();
}

export { deploymentRegistry };
export type { PortfolioProject, ProjectSlug };
