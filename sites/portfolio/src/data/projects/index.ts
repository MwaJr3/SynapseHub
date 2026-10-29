import type { FilterId, Project } from '@/types/project';
import { filters as filterDefinitions } from '@/config/nav';
import { phishLens } from './phishLens';
import { netScope } from './netScope';
import { threatIntelDesk } from './threatIntelDesk';
import { incidentFlow } from './incidentFlow';
import { hashSight } from './hashSight';
import { assetWatch } from './assetWatch';
import { secureCodeWorkbench } from './secureCodeWorkbench';
import { cyberAwareLab } from './cyberAwareLab';
import { transcriptWise } from './transcriptWise';

/**
 * THE single source of truth for portfolio projects.
 *
 * The homepage highlights, the project directory, the filters, the search
 * index, the case-study routes and the prev/next navigation all derive from
 * this array. Nothing else in the app defines project content.
 */
const registry: Project[] = [
  phishLens,
  netScope,
  threatIntelDesk,
  incidentFlow,
  hashSight,
  assetWatch,
  secureCodeWorkbench,
  cyberAwareLab,
  transcriptWise,
];

/**
 * Projects from an earlier portfolio iteration that must never reappear here —
 * not as registry entries, demo data, fallbacks or "recommended" sections.
 * Enforced by `validateRegistry()` at module load and by the registry tests.
 */
export const excludedProjectNames = [
  'SentinelLog',
  'FileGuard',
  'DependSecure',
  'CampusFlow',
  'CircuitLab Calc',
  'ChessScope',
  'SentinelCore',
] as const;

export const expectedProjectCount = 9;

/* ---------------------------------------------------------------- validation */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[project-registry] ${message}`);
  }
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Fails loudly at module load if the registry drifts from the portfolio's
 * contract. A typo'd slug or a re-added excluded project should break the
 * build, not silently ship.
 */
export function validateRegistry(projects: Project[] = registry): string[] {
  const problems: string[] = [];
  const check = (condition: unknown, message: string) => {
    if (!condition) problems.push(message);
  };

  check(
    projects.length === expectedProjectCount,
    `expected exactly ${expectedProjectCount} projects, found ${projects.length}`,
  );

  const slugs = new Set<string>();
  const ids = new Set<string>();
  const accents = new Set<string>();
  const knownFilters = new Set<string>(filterDefinitions.map((f) => f.id));

  for (const project of projects) {
    const at = `${project.name || project.slug || '(unnamed)'}`;

    check(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.slug), `${at}: slug "${project.slug}" is not kebab-case`);
    check(!slugs.has(project.slug), `${at}: duplicate slug "${project.slug}"`);
    check(!ids.has(project.id), `${at}: duplicate id "${project.id}"`);
    slugs.add(project.slug);
    ids.add(project.id);

    check(project.name.trim().length > 0, `${at}: empty name`);
    check(project.tagline.trim().length > 0, `${at}: empty tagline`);
    check(project.summary.trim().length > 0, `${at}: empty summary`);
    check(project.description.length >= 2, `${at}: needs at least two description paragraphs`);
    check(project.categories.length >= 1, `${at}: needs at least one category`);
    check(project.features.length >= 4, `${at}: needs at least four features`);
    check(project.demonstrates.length >= 4, `${at}: needs at least four "demonstrates" entries`);
    check(project.capabilities.length >= 1, `${at}: needs at least one key capability`);
    check(project.tech.length >= 4, `${at}: needs a technology stack`);
    check(project.caseStudy.decisions.length >= 2, `${at}: needs at least two engineering decisions`);
    check(project.caseStudy.challenges.length >= 2, `${at}: needs at least two challenges`);
    check(project.caseStudy.limitations.length >= 3, `${at}: needs documented limitations`);
    check(project.caseStudy.testing.items.length >= 3, `${at}: needs a testing breakdown`);
    check(project.caseStudy.workflow.steps.length >= 4, `${at}: needs a workflow diagram`);

    for (const filter of project.filters) {
      check(knownFilters.has(filter), `${at}: unknown filter id "${filter}"`);
    }

    // Every project must be reachable from at least one filter besides "all".
    check(
      project.filters.some((f) => f !== 'all'),
      `${at}: must belong to at least one filter facet`,
    );

    check(!accents.has(project.accent), `${at}: accent "${project.accent}" is used by another project`);
    accents.add(project.accent);

    for (const url of [project.liveUrl, project.repoUrl]) {
      if (url) check(/^https:\/\//.test(url), `${at}: external URL must be https and real, got "${url}"`);
    }

    // Excluded projects must not reappear under any field.
    const haystack = normalise(
      [project.name, project.slug, project.id, project.summary, ...project.description].join(' '),
    );
    for (const excluded of excludedProjectNames) {
      check(
        !haystack.includes(normalise(excluded)),
        `${at}: excluded project "${excluded}" must not appear in the registry`,
      );
    }
  }

  const orders = projects.map((p) => p.order);
  check(new Set(orders).size === orders.length, 'project `order` values must be unique');

  const featured = projects.filter((p) => p.featured);
  // Five: the four recommended highlights (PhishLens, NetScope, IncidentFlow,
  // SecureCode Workbench) plus TranscriptWise, the AI/learning platform.
  check(featured.length >= 3 && featured.length <= 5, `expected 3-5 featured projects, found ${featured.length}`);

  if (problems.length > 0) {
    throw new Error(`[project-registry] invalid:\n- ${problems.join('\n- ')}`);
  }
  return problems;
}

// Validate on load: a bad registry breaks the build/dev server immediately.
validateRegistry(registry);

/* ------------------------------------------------------------------ queries */

export const projects: Project[] = [...registry].sort((a, b) => a.order - b.order);

export const projectSlugs: string[] = projects.map((p) => p.slug);

export const featuredProjects: Project[] = projects.filter((p) => p.featured);

export function getProject(slug: string | undefined): Project | undefined {
  if (!slug) return undefined;
  return projects.find((p) => p.slug === slug);
}

export function getProjectOrThrow(slug: string | undefined): Project {
  const project = getProject(slug);
  assert(project, `no project with slug "${slug}"`);
  return project;
}

/** Previous / next by curated order, wrapping at the ends. */
export function getAdjacentProjects(slug: string): {
  previous: Project | undefined;
  next: Project | undefined;
} {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return { previous: undefined, next: undefined };
  return {
    previous: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  };
}

export function projectsByFilter(filter: FilterId): Project[] {
  if (filter === 'all') return projects;
  return projects.filter((p) => p.filters.includes(filter));
}

/** Fields searched by the directory's text search. */
export function projectSearchText(project: Project): string {
  return [
    project.name,
    project.tagline,
    project.summary,
    ...project.description,
    ...project.categories,
    ...project.tech,
    ...project.capabilities,
    ...project.features.map((f) => `${f.title} ${f.body}`),
    ...project.demonstrates,
  ]
    .join(' ')
    .toLowerCase();
}

const searchIndex = new Map<string, string>(
  projects.map((p) => [p.slug, projectSearchText(p)]),
);

export function searchProjects(query: string, within: Project[] = projects): Project[] {
  const q = query.trim().toLowerCase();
  if (!q) return within;
  const terms = q.split(/\s+/).filter(Boolean);
  return within.filter((project) => {
    const haystack = searchIndex.get(project.slug) ?? projectSearchText(project);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Every technology used anywhere in the registry, with the projects using it. */
export function technologyIndex(): { tech: string; projects: Project[] }[] {
  const map = new Map<string, Project[]>();
  for (const project of projects) {
    for (const tech of project.tech) {
      const list = map.get(tech) ?? [];
      list.push(project);
      map.set(tech, list);
    }
  }
  return [...map.entries()]
    .map(([tech, list]) => ({ tech, projects: list }))
    .sort((a, b) => b.projects.length - a.projects.length || a.tech.localeCompare(b.tech));
}
