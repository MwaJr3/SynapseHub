import { describe, expect, it } from 'vitest';
import {
  availableSortOptions,
  clearFilters,
  defaultQuery,
  describeQuery,
  filterProjects,
  hasActiveFilters,
  matchesCategories,
  matchesSearch,
  parseQueryParams,
  queryToParams,
  sortProjects,
  type ProjectQuery,
} from './filters';
import { categoryLabels } from '@/data/categories';
import { catalogue, getProject } from '@/data/projects';

const learnbridge = getProject('learnbridge')!;
const tutorspring = getProject('tutorspring')!;

describe('search', () => {
  it('matches a project name case-insensitively', () => {
    expect(matchesSearch(learnbridge, 'LEARNBRIDGE')).toBe(true);
  });

  it('matches descriptions, technologies, features and categories', () => {
    expect(matchesSearch(learnbridge, 'indexeddb')).toBe(true);
    expect(matchesSearch(learnbridge, 'progress')).toBe(true);
    expect(matchesSearch(learnbridge, 'offline')).toBe(true);
    expect(matchesSearch(tutorspring, 'provider-agnostic')).toBe(true);
    expect(matchesSearch(learnbridge, 'photosynthesis')).toBe(false);
  });

  it('requires every search token to match', () => {
    expect(matchesSearch(tutorspring, 'tutor grounding')).toBe(true);
    expect(matchesSearch(tutorspring, 'tutor welding')).toBe(false);
  });

  it('treats an empty search as "match everything"', () => {
    expect(matchesSearch(learnbridge, '   ')).toBe(true);
    expect(
      filterProjects(catalogue, { ...defaultQuery, search: '' }),
    ).toHaveLength(10);
  });
});

describe('category filters', () => {
  it('combines multiple filters with AND semantics', () => {
    expect(matchesCategories(tutorspring, ['ai-personalized', 'python'])).toBe(
      true,
    );
    expect(
      matchesCategories(tutorspring, ['ai-personalized', 'virtual-classrooms']),
    ).toBe(false);
  });

  it('filters the library and combines with search', () => {
    const offline: ProjectQuery = {
      search: '',
      categories: ['offline-first'],
      sort: 'featured',
    };
    expect(
      filterProjects(catalogue, offline)
        .map((project) => project.slug)
        .sort(),
    ).toEqual(['learnbridge', 'openlearn-commons', 'reachlearn'].sort());

    const combined: ProjectQuery = {
      search: 'sync',
      categories: ['offline-first'],
      sort: 'featured',
    };
    const results = filterProjects(catalogue, combined);
    expect(results.length).toBeGreaterThan(0);
    for (const project of results) {
      expect(project.categories).toContain('offline-first');
    }
  });

  it('clearing filters restores all ten projects', () => {
    const restored = filterProjects(catalogue, clearFilters());
    expect(restored).toHaveLength(10);
    expect(hasActiveFilters(clearFilters())).toBe(false);
    expect(hasActiveFilters({ ...defaultQuery, search: 'ai' })).toBe(true);
    expect(hasActiveFilters({ ...defaultQuery, categories: ['python'] })).toBe(
      true,
    );
  });
});

describe('sorting', () => {
  it('orders featured projects first by default', () => {
    const sorted = filterProjects(catalogue, defaultQuery);
    expect(sorted.slice(0, 4).every((project) => project.featured)).toBe(true);
    expect(sorted[4]?.featured).toBe(false);
  });

  it('sorts alphabetically and by category', () => {
    const alphabetical = sortProjects(catalogue, 'alphabetical').map(
      (project) => project.name,
    );
    expect(alphabetical[0]).toBe('ClassConnect');
    expect([...alphabetical].sort((a, b) => a.localeCompare(b))).toEqual(
      alphabetical,
    );

    const byCategory = sortProjects(catalogue, 'category');
    const firstCategories = byCategory.map(
      (project) => project.primaryCategory,
    );
    expect([...firstCategories].sort()).toEqual(firstCategories);
  });

  it('hides "newest" while no genuine project dates are configured', () => {
    const options = availableSortOptions(catalogue);
    expect(options.map((option) => option.id)).toEqual([
      'featured',
      'alphabetical',
      'category',
    ]);

    const dated = catalogue.map((project, index) =>
      index < 2
        ? { ...project, projectDate: `2026-0${index + 1}-01` }
        : project,
    );
    expect(availableSortOptions(dated).map((option) => option.id)).toContain(
      'newest',
    );

    const newestFirst = sortProjects(dated, 'newest');
    expect(newestFirst[0]?.projectDate).toBe('2026-02-01');
  });
});

describe('query string round trip', () => {
  const categoryIds = ['offline-first', 'python', 'ai-personalized'];

  it('parses search, categories and sort from the URL', () => {
    const params = new URLSearchParams(
      '?q=sync&category=offline-first,python&sort=alphabetical',
    );
    const query = parseQueryParams(params, categoryIds);

    expect(query.search).toBe('sync');
    expect(query.categories).toEqual(['offline-first', 'python']);
    expect(query.sort).toBe('alphabetical');
  });

  it('ignores unknown categories and invalid sort values', () => {
    const params = new URLSearchParams(
      '?category=not-a-category&sort=sideways',
    );
    const query = parseQueryParams(params, categoryIds);

    expect(query.categories).toEqual([]);
    expect(query.sort).toBe('featured');
  });

  it('serialises a query back to parameters without defaults', () => {
    const params = queryToParams({
      search: 'ai',
      categories: ['python'],
      sort: 'alphabetical',
    });
    expect(params.get('q')).toBe('ai');
    expect(params.get('category')).toBe('python');
    expect(params.get('sort')).toBe('alphabetical');

    expect(queryToParams(clearFilters()).toString()).toBe('');
  });

  it('describes an active query for the UI', () => {
    const description = describeQuery(
      { search: 'ai', categories: ['python'], sort: 'featured' },
      categoryLabels,
    );
    expect(description).toContain('search "ai"');
    expect(description).toContain('Python');
  });
});
