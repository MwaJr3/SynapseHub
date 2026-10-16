import type { PortfolioProject } from '@/types';
import { projectSearchHaystack } from '@/data/projects';

export type SortOption = 'featured' | 'alphabetical' | 'category' | 'newest';

export interface ProjectQuery {
  search: string;
  /** Category ids. A project matches when it belongs to every selected filter. */
  categories: string[];
  sort: SortOption;
}

export const defaultQuery: ProjectQuery = {
  search: '',
  categories: [],
  sort: 'featured',
};

/** Free-text match across name, description, category, technology and feature data. */
export function matchesSearch(
  project: PortfolioProject,
  term: string,
): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  const haystack = projectSearchHaystack(project);
  return needle.split(/\s+/).every((token) => haystack.includes(token));
}

export function matchesCategories(
  project: PortfolioProject,
  categoryIds: string[],
): boolean {
  if (categoryIds.length === 0) return true;
  return categoryIds.every((id) => project.categories.includes(id));
}

export function filterProjects(
  projects: PortfolioProject[],
  query: ProjectQuery,
): PortfolioProject[] {
  const filtered = projects.filter(
    (project) =>
      matchesSearch(project, query.search) &&
      matchesCategories(project, query.categories),
  );
  return sortProjects(filtered, query.sort);
}

export function sortProjects(
  projects: PortfolioProject[],
  sort: SortOption,
): PortfolioProject[] {
  const sorted = [...projects];

  switch (sort) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'category':
      return sorted.sort(
        (a, b) =>
          a.primaryCategory.localeCompare(b.primaryCategory) ||
          a.displayOrder - b.displayOrder,
      );
    case 'newest':
      // Projects without a genuine date always sort last, never as "new".
      return sorted.sort((a, b) =>
        (b.projectDate ?? '').localeCompare(a.projectDate ?? ''),
      );
    case 'featured':
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          a.displayOrder - b.displayOrder,
      );
  }
}

export interface SortChoice {
  id: SortOption;
  label: string;
}

/**
 * "Newest" is only offered when at least two genuine project dates exist —
 * ordering by an invented date would be a fiction.
 */
export function availableSortOptions(
  projects: PortfolioProject[],
): SortChoice[] {
  const datedCount = projects.filter((project) =>
    Boolean(project.projectDate),
  ).length;

  const options: SortChoice[] = [
    { id: 'featured', label: 'Featured first' },
    { id: 'alphabetical', label: 'Alphabetical' },
    { id: 'category', label: 'Category' },
  ];

  if (datedCount >= 2) {
    options.push({ id: 'newest', label: 'Newest configured date' });
  }

  return options;
}

export function hasActiveFilters(query: ProjectQuery): boolean {
  return (
    query.search.trim().length > 0 ||
    query.categories.length > 0 ||
    query.sort !== defaultQuery.sort
  );
}

export function clearFilters(): ProjectQuery {
  return { ...defaultQuery, categories: [] };
}

export function toggleCategory(
  query: ProjectQuery,
  categoryId: string,
): ProjectQuery {
  const selected = query.categories.includes(categoryId)
    ? query.categories.filter((id) => id !== categoryId)
    : [...query.categories, categoryId];

  return { ...query, categories: selected };
}

/** Read a query string into a ProjectQuery (used for shareable filter links). */
export function parseQueryParams(
  params: URLSearchParams,
  availableCategories: string[],
): ProjectQuery {
  const search = params.get('q') ?? '';
  const categories = (params.get('category') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => availableCategories.includes(value));

  const sortParam = params.get('sort') as SortOption | null;
  const sort: SortOption =
    sortParam === 'alphabetical' ||
    sortParam === 'category' ||
    sortParam === 'newest' ||
    sortParam === 'featured'
      ? sortParam
      : defaultQuery.sort;

  return { search, categories, sort };
}

/** Serialize a ProjectQuery back into URLSearchParams, omitting defaults. */
export function queryToParams(query: ProjectQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set('q', query.search.trim());
  if (query.categories.length)
    params.set('category', [...query.categories].sort().join(','));
  if (query.sort !== defaultQuery.sort) params.set('sort', query.sort);
  return params;
}

export function describeQuery(
  query: ProjectQuery,
  labels: Record<string, string>,
): string {
  const parts: string[] = [];
  if (query.search.trim()) parts.push(`search "${query.search.trim()}"`);
  if (query.categories.length) {
    parts.push(
      `categories: ${query.categories.map((id) => labels[id] ?? id).join(', ')}`,
    );
  }
  return parts.join(' \u00b7 ');
}
