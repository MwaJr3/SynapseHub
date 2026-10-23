import { useId } from 'react';
import { filters as filterDefinitions } from '@/config/nav';
import { sortOptions } from '@/hooks/useProjectQuery';
import type { FilterId } from '@/types/project';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StateBlock } from '@/components/ui/StateBlock';

export interface ProjectFiltersProps {
  filter: FilterId;
  query: string;
  sort: string;
  resultCount: number;
  totalCount: number;
  isFiltered: boolean;
  countFor: (filter: FilterId) => number;
  onFilterChange: (filter: FilterId) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

/**
 * Directory controls: category facets with counts, text search and sorting.
 * All three write to the URL, so the visible state is always the real state.
 */
export function ProjectFilters({
  filter,
  query,
  sort,
  resultCount,
  totalCount,
  isFiltered,
  countFor,
  onFilterChange,
  onQueryChange,
  onSortChange,
  onReset,
}: ProjectFiltersProps) {
  const searchId = useId();
  const sortId = useId();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search projects by name, description, technology or category
            </label>
            <Icon
              name="search"
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search projects, technologies, categories…"
              className={cn(
                'h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-sm text-fg',
                'placeholder:text-fg-subtle focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/25',
                'sm:w-80 [&::-webkit-search-cancel-button]:appearance-none',
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle transition-colors hover:text-fg"
              >
                <span className="sr-only">Clear search</span>
                <Icon name="close" size={14} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="whitespace-nowrap text-xs font-medium text-fg-subtle">
              Sort
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
              className={cn(
                'h-10 rounded-lg border border-line bg-surface px-3 text-sm text-fg',
                'focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/25',
              )}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-fg-muted" role="status" aria-live="polite">
          Showing <span className="font-semibold text-fg">{resultCount}</span> of {totalCount} projects
          {isFiltered ? (
            <button
              type="button"
              onClick={onReset}
              className="ml-3 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              <Icon name="close" size={13} aria-hidden />
              Clear filters
            </button>
          ) : null}
        </p>
      </div>

      <div
        role="group"
        aria-label="Filter projects by category"
        className="flex flex-wrap gap-2"
      >
        {filterDefinitions.map((definition) => {
          const count = countFor(definition.id);
          const active = filter === definition.id;
          return (
            <button
              key={definition.id}
              type="button"
              onClick={() => onFilterChange(definition.id)}
              aria-pressed={active}
              title={definition.hint}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
                count === 0 && !active && 'opacity-50',
              )}
            >
              {definition.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-px font-mono text-[0.65rem]',
                  active ? 'bg-accent-fg/20 text-accent-fg' : 'bg-surface-sunken text-fg-subtle',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NoProjectResults({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) {
  return (
    <StateBlock
      tone="neutral"
      icon="search"
      title="No projects match those filters"
      action={
        <Button variant="secondary" size="sm" icon="close" onClick={onReset}>
          Clear filters
        </Button>
      }
    >
      {query.trim() ? (
        <p>
          Nothing in the registry matches <span className="font-mono text-fg">&ldquo;{query.trim()}&rdquo;</span>.
          Search covers project names, descriptions, technologies and categories — try a broader term such as
          &ldquo;FastAPI&rdquo;, &ldquo;network&rdquo; or &ldquo;testing&rdquo;.
        </p>
      ) : (
        <p>No project in the registry belongs to this category combination.</p>
      )}
    </StateBlock>
  );
}
