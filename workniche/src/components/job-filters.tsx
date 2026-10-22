'use client';

/**
 * Search and filter controls. All state lives in the URL, so results are
 * shareable and the back button works. Every active filter shows its own
 * removal chip, and "Clear all" restores the unfiltered list.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type JSX } from 'react';

const FILTER_DEFS = [
  { key: 'category', label: 'Category', options: [
    'backend-engineering', 'security-engineering', 'data-engineering',
    'technical-writing', 'developer-relations', 'site-reliability',
    'program-management',
  ] },
  { key: 'employmentType', label: 'Employment', options: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] },
  { key: 'workplaceType', label: 'Workplace', options: ['REMOTE', 'HYBRID', 'ONSITE'] },
  { key: 'experienceLevel', label: 'Experience', options: ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'] },
] as const;

const FILTER_LABELS: Record<string, string> = {
  q: 'Search',
  category: 'Category',
  employmentType: 'Employment',
  workplaceType: 'Workplace',
  experienceLevel: 'Experience',
  location: 'Location',
  skill: 'Skill',
  salaryMin: 'Salary ≥',
  postedWithinDays: 'Posted within (days)',
};

export function FilterBar({ resultCount }: { resultCount: number }): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [skill, setSkill] = useState(params.get('skill') ?? '');

  function apply(next: Record<string, string>): void {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    merged.delete('page');
    router.push(`/jobs?${merged.toString()}`);
  }

  function clearAll(): void {
    setQ('');
    setLocation('');
    setSkill('');
    router.push('/jobs');
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    apply({ q, location, skill });
  }

  const activeFilters = [...params.entries()].filter(
    ([key, value]) => key !== 'sort' && key !== 'page' && value !== '',
  );

  return (
    <section aria-label="Search and filters" className="card space-y-4">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="q" className="label">Keywords</label>
          <input
            id="q"
            className="input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Title, description, company, skill"
          />
        </div>
        <div>
          <label htmlFor="location" className="label">Location</label>
          <input
            id="location"
            className="input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City, country or remote"
          />
        </div>
        <div>
          <label htmlFor="skill" className="label">Skill</label>
          <input
            id="skill"
            className="input"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
            placeholder="e.g. PostgreSQL"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">Search</button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FILTER_DEFS.map((filter) => (
          <div key={filter.key}>
            <label htmlFor={`filter-${filter.key}`} className="label">{filter.label}</label>
            <select
              id={`filter-${filter.key}`}
              className="input"
              value={params.get(filter.key) ?? ''}
              onChange={(event) => apply({ [filter.key]: event.target.value })}
            >
              <option value="">Any</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label htmlFor="sort" className="label">Sort</label>
          <select
            id="sort"
            className="input"
            value={params.get('sort') ?? 'recent'}
            onChange={(event) => apply({ sort: event.target.value })}
          >
            <option value="recent">Newest first</option>
            <option value="relevance">Best match</option>
            <option value="salary">Highest salary</option>
            <option value="deadline">Soonest deadline</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-ink-muted">{resultCount} result{resultCount === 1 ? '' : 's'}</p>
        {activeFilters.length > 0 ? (
          <>
            <span className="text-sm font-medium">Active filters:</span>
            {activeFilters.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="badge bg-brand-50 text-brand-800 hover:bg-brand-100"
                onClick={() => apply({ [key]: '' })}
                aria-label={`Remove filter ${FILTER_LABELS[key] ?? key}`}
              >
                {FILTER_LABELS[key] ?? key}: {value} ✕
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={clearAll}>
              Clear all filters
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
