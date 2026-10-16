import { useId } from 'react';
import { categories } from '@/data/categories';
import type { SortChoice } from '@/lib/filters';
import type { ProjectQuery } from '@/lib/filters';
import { cn } from '@/lib/cn';
import { pluralise } from '@/lib/format';

interface ProjectFiltersProps {
  query: ProjectQuery;
  /** Current text in the search box (kept local until the visitor pauses). */
  search: string;
  onSearchChange: (value: string) => void;
  onChange: (next: ProjectQuery) => void;
  onClear: () => void;
  sortOptions: SortChoice[];
  resultCount: number;
  totalCount: number;
}

const groupLabels: Record<'domain' | 'technology' | 'practice', string> = {
  domain: 'Learning domain',
  technology: 'Technology',
  practice: 'Practice',
};

/**
 * Search, category filters and sorting for the project library.
 *
 * Search and filters combine: the query object holds both, matching is done by
 * `filterProjects`, and the URL is kept in sync by the page. Active filters are
 * listed with individual remove controls, and the result count is announced
 * through a live region.
 */
export function ProjectFilters({
  query,
  search,
  onSearchChange,
  onChange,
  onClear,
  sortOptions,
  resultCount,
  totalCount,
}: ProjectFiltersProps) {
  const searchId = useId();
  const sortId = useId();
  const groups = ['domain', 'technology'] as const;

  return (
    <div className="rounded-card border border-line bg-panel p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
        <div>
          <label htmlFor={searchId} className="eyebrow block">
            Search projects
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Name, technology, feature or problem…"
            autoComplete="off"
            aria-describedby={`${searchId}-hint`}
            className="mt-2 w-full rounded-pill border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-subtle"
          />
          <p id={`${searchId}-hint`} className="mono-meta mt-2">
            Matches project names, descriptions, categories, technologies and
            features.
          </p>
        </div>

        <div>
          <label htmlFor={sortId} className="eyebrow block">
            Sort by
          </label>
          <select
            id={sortId}
            value={query.sort}
            onChange={(event) =>
              onChange({
                ...query,
                sort: event.target.value as ProjectQuery['sort'],
              })
            }
            className="mt-2 w-full rounded-pill border border-line bg-surface px-4 py-2.5 text-sm text-ink"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mono-meta mt-2">
            Newest is offered only when genuine project dates are configured.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {groups.map((group) => (
          <fieldset key={group}>
            <legend className="eyebrow">{groupLabels[group]}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {group === 'domain' && (
                <button
                  type="button"
                  aria-pressed={query.categories.length === 0}
                  title="Show every project in the catalogue"
                  onClick={() => onChange({ ...query, categories: [] })}
                  className={cn(
                    'chip chip-interactive',
                    query.categories.length === 0 && 'chip-active',
                  )}
                >
                  All projects
                </button>
              )}
              {categories
                .filter(
                  (category) =>
                    category.group === group ||
                    (group === 'technology' && category.group === 'practice'),
                )
                .map((category) => {
                  const active = query.categories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={active}
                      title={category.description}
                      onClick={() =>
                        onChange({
                          ...query,
                          categories: active
                            ? query.categories.filter(
                                (id) => id !== category.id,
                              )
                            : [...query.categories, category.id],
                        })
                      }
                      className={cn(
                        'chip chip-interactive',
                        active && 'chip-active',
                      )}
                    >
                      {category.label}
                      {active && (
                        <span aria-hidden="true" className="ml-0.5">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted" role="status" aria-live="polite">
          Showing {pluralise(resultCount, 'project')} of {totalCount}
          {query.categories.length > 0 && (
            <>
              {' '}
              · {query.categories.length} filter
              {query.categories.length === 1 ? '' : 's'} active
            </>
          )}
        </p>
        <button
          type="button"
          className="btn btn-ghost self-start px-3.5 py-2 text-sm"
          onClick={onClear}
        >
          Clear all filters
        </button>
      </div>

      {query.categories.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow">Active filters</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {query.categories.map((id) => {
              const category = categories.find((item) => item.id === id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="chip chip-interactive chip-active"
                    onClick={() =>
                      onChange({
                        ...query,
                        categories: query.categories.filter(
                          (item) => item !== id,
                        ),
                      })
                    }
                    aria-label={`Remove filter: ${category?.label ?? id}`}
                  >
                    {category?.label ?? id}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
