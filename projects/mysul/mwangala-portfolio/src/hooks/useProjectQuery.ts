import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filters as filterDefinitions } from '@/config/nav';
import { projectsByFilter, searchProjects } from '@/data/projects';
import type { FilterId, Project } from '@/types/project';

export type SortId = 'curated' | 'name' | 'newest' | 'tech';

export const sortOptions: { id: SortId; label: string }[] = [
  { id: 'curated', label: 'Curated order' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'newest', label: 'Most recent' },
  { id: 'tech', label: 'Broadest stack' },
];

const validFilters = new Set<FilterId>(filterDefinitions.map((f) => f.id));
const validSorts = new Set<SortId>(sortOptions.map((s) => s.id));

export interface ProjectQueryState {
  filter: FilterId;
  query: string;
  sort: SortId;
}

/**
 * Directory state lives in the URL so a filtered view can be linked to, shared
 * and reloaded. `?filter=cybersecurity&q=scapy` is a real address.
 */
export function useProjectQuery(): ProjectQueryState & {
  setFilter: (filter: FilterId) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortId) => void;
  reset: () => void;
  results: Project[];
  total: number;
  countFor: (filter: FilterId) => number;
  isFiltered: boolean;
} {
  const [params, setParams] = useSearchParams();

  const filterParam = params.get('filter');
  const filter: FilterId = filterParam && validFilters.has(filterParam as FilterId)
    ? (filterParam as FilterId)
    : 'all';
  const query = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort: SortId = sortParam && validSorts.has(sortParam as SortId) ? (sortParam as SortId) : 'curated';

  const update = (patch: Partial<Record<'filter' | 'q' | 'sort', string>>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all' || value === 'curated') next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const results = useMemo(() => {
    const filtered = projectsByFilter(filter);
    const searched = searchProjects(query, filtered);
    const sorted = [...searched];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        sorted.sort((a, b) => b.year.localeCompare(a.year) || a.order - b.order);
        break;
      case 'tech':
        sorted.sort((a, b) => b.tech.length - a.tech.length || a.order - b.order);
        break;
      default:
        sorted.sort((a, b) => a.order - b.order);
    }
    return sorted;
  }, [filter, query, sort]);

  const counts = useMemo(() => {
    const map = new Map<FilterId, number>();
    for (const definition of filterDefinitions) {
      map.set(definition.id, projectsByFilter(definition.id).length);
    }
    return map;
  }, []);

  return {
    filter,
    query,
    sort,
    results,
    total: projectsByFilter('all').length,
    setFilter: (next) => update({ filter: next }),
    setQuery: (next) => update({ q: next }),
    setSort: (next) => update({ sort: next }),
    reset: () => setParams(new URLSearchParams(), { replace: true }),
    countFor: (id) => counts.get(id) ?? 0,
    isFiltered: filter !== 'all' || query.trim().length > 0 || sort !== 'curated',
  };
}
