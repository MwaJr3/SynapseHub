import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { categories, categoryLabels } from '@/data/categories';
import { projects } from '@/data/projects';
import { unconnectedSlugs } from '@/config/deployment';
import {
  availableSortOptions,
  clearFilters,
  filterProjects,
  hasActiveFilters,
  parseQueryParams,
  queryToParams,
  type ProjectQuery,
} from '@/lib/filters';
import { describeQuery } from '@/lib/filters';

const categoryIds = categories.map((category) => category.id);

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth so filtered views are shareable and survive
  // a refresh or a direct link from the home page.
  const query = useMemo<ProjectQuery>(
    () => parseQueryParams(searchParams, categoryIds),
    [searchParams],
  );

  // The search box is controlled locally and only written to the URL after a
  // short pause: it keeps typing responsive and avoids a history entry per
  // keystroke, while still producing a shareable filtered link.
  const [searchDraft, setSearchDraft] = useState(() => query.search);
  const lastSyncedSearch = useRef(query.search);

  useEffect(() => {
    if (query.search !== lastSyncedSearch.current) {
      lastSyncedSearch.current = query.search;
      setSearchDraft(query.search);
    }
  }, [query.search]);

  useEffect(() => {
    if (searchDraft === lastSyncedSearch.current) return undefined;

    const timeout = setTimeout(() => {
      lastSyncedSearch.current = searchDraft;
      setSearchParams(queryToParams({ ...query, search: searchDraft }), {
        replace: true,
      });
    }, 220);

    return () => clearTimeout(timeout);
  }, [searchDraft, query, setSearchParams]);

  const effectiveQuery = useMemo(
    () => ({ ...query, search: searchDraft }),
    [query, searchDraft],
  );
  const results = useMemo(
    () => filterProjects(projects, effectiveQuery),
    [effectiveQuery],
  );
  const sortOptions = useMemo(() => availableSortOptions(projects), []);
  const pendingLinks = unconnectedSlugs();

  usePageMeta({
    title: 'Project library — nine education-technology projects',
    description:
      'Search and filter nine education-technology projects covering offline-first learning, AI-assisted tutoring, virtual classrooms, assessment, teacher tools, open resources, analytics, phone delivery and access funding.',
    path: '/projects',
  });

  const updateQuery = (next: ProjectQuery) => {
    setSearchParams(queryToParams(next), { replace: true });
  };

  const resetQuery = () => {
    lastSyncedSearch.current = '';
    setSearchDraft('');
    setSearchParams(queryToParams(clearFilters()), { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Project library"
        title="Nine projects, one problem space: making learning reachable"
        summary={
          <>
            Each project addresses a different part of the education-access
            problem. Every case study explains the learning problem, the
            workflow, the architecture and the parts that are still unfinished.
          </>
        }
        aside={
          <div className="card p-5">
            <p className="eyebrow">Deployment links</p>
            <p className="prose-body mt-2 text-sm">
              {pendingLinks.length === projects.length
                ? 'No application or source repository is connected yet. The catalogue comes first; live demo and source buttons appear the moment a real URL is configured.'
                : `${projects.length - pendingLinks.length} of ${projects.length} projects have a connected application or repository.`}
            </p>
            <p className="mono-meta mt-3">
              {pendingLinks.length === 0
                ? 'All projects connected'
                : `${pendingLinks.length} awaiting links`}
            </p>
          </div>
        }
      />

      <section data-tone="surface" className="shell pb-20">
        <ProjectFilters
          query={query}
          search={searchDraft}
          onSearchChange={setSearchDraft}
          onChange={updateQuery}
          onClear={resetQuery}
          sortOptions={sortOptions}
          resultCount={results.length}
          totalCount={projects.length}
        />

        {hasActiveFilters(effectiveQuery) && (
          <p className="mono-meta mt-4">
            Active view:{' '}
            {describeQuery(effectiveQuery, categoryLabels) || 'default sort'}
          </p>
        )}

        <section aria-labelledby="results-heading" className="mt-8">
          <h2 id="results-heading" className="eyebrow">
            {hasActiveFilters(effectiveQuery)
              ? 'Matching projects'
              : 'All nine projects'}
          </h2>

          {results.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No projects match this combination"
                description={
                  effectiveQuery.categories.length > 1
                    ? 'Each selected filter narrows the list further, so a combination can return nothing. Remove one filter, or clear everything to see all nine projects again.'
                    : 'No project name, technology or feature contains that search term. Try a shorter term or clear the filters.'
                }
                action={
                  <Button variant="primary" onClick={resetQuery}>
                    Clear all filters
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((project) => (
                <li key={project.slug} className="flex">
                  <ProjectCard project={project} className="w-full" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-12 grid gap-6 rounded-card border border-line bg-panel p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-base font-semibold text-ink">
              How this catalogue is maintained
            </h2>
            <p className="prose-body mt-3 text-sm">
              Every card, filter result, home-page showcase and case study is
              rendered from one typed catalogue, so a project is described once
              and referenced everywhere. Categories, technologies and
              related-project links are validated when the site is built, and
              the test suite fails if a project references a category or a
              related slug that does not exist.
            </p>
            <p className="prose-body mt-3 text-sm">
              External links are treated as data too: a missing or malformed URL
              is omitted rather than replaced with a placeholder destination,
              and a repository URL is never substituted into a demo slot.
            </p>
          </div>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <dt className="text-ink-muted">Projects documented</dt>
              <dd className="font-mono text-ink">{projects.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <dt className="text-ink-muted">Categories</dt>
              <dd className="font-mono text-ink">{categories.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <dt className="text-ink-muted">Applications connected</dt>
              <dd className="font-mono text-ink">
                {projects.filter((project) => project.liveDemoUrl).length}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Repositories connected</dt>
              <dd className="font-mono text-ink">
                {projects.filter((project) => project.repositoryUrl).length}
              </dd>
            </div>
          </dl>
          <p className="mono-meta mt-3 leading-relaxed">
            Duplicate slugs, unknown categories and dangling related-project
            links are caught by the data validation in the test suite rather
            than reaching a visitor.
          </p>
        </div>
      </section>
    </>
  );
}
