import { filters as filterDefinitions } from '@/config/nav';
import { projects } from '@/data/projects';
import { useProjectQuery } from '@/hooks/useProjectQuery';
import { usePageMeta } from '@/lib/seo';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/project/ProjectCard';
import { NoProjectResults, ProjectFilters } from '@/components/project/ProjectFilters';

export default function ProjectsPage() {
  const query = useProjectQuery();
  const activeFilter = filterDefinitions.find((definition) => definition.id === query.filter);

  usePageMeta({
    title: `Projects — ${projects.length} case studies · Mwangala`,
    description:
      'Every project in the portfolio: phishing analysis, network traffic inspection, threat intelligence, incident response, hash reputation, asset exposure, static analysis, security education and transcript-to-learning tooling.',
    path: '/projects',
  });

  return (
    <>
      <PageHeader
        eyebrow="Project directory"
        title="Nine applications, each with the engineering behind it"
        lead="Every entry links to a full case study: the problem, the design, the decisions and their trade-offs, how it was tested, and what it still cannot do. Use the filters or search to narrow the list — the current view is reflected in the URL."
      >
        <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
          <div>
            <dt className="eyebrow">Projects</dt>
            <dd className="mt-1 text-lg font-semibold text-fg">{projects.length}</dd>
          </div>
          <div>
            <dt className="eyebrow">Categories</dt>
            <dd className="mt-1 text-lg font-semibold text-fg">{filterDefinitions.length - 1}</dd>
          </div>
          <div>
            <dt className="eyebrow">Core stack</dt>
            <dd className="mt-1 text-lg font-semibold text-fg">Python · React</dd>
          </div>
          <div>
            <dt className="eyebrow">Case studies</dt>
            <dd className="mt-1 text-lg font-semibold text-fg">{projects.length} of {projects.length}</dd>
          </div>
        </dl>
      </PageHeader>

      <Section tone="light">
        <SectionSpacing className="py-12 sm:py-14">
          <Container>
            <ProjectFilters
              filter={query.filter}
              query={query.query}
              sort={query.sort}
              resultCount={query.results.length}
              totalCount={query.total}
              isFiltered={query.isFiltered}
              countFor={query.countFor}
              onFilterChange={query.setFilter}
              onQueryChange={query.setQuery}
              onSortChange={(sort) => query.setSort(sort as 'curated')}
              onReset={query.reset}
            />

            {activeFilter && activeFilter.id !== 'all' ? (
              <p className="mt-5 text-sm text-fg-subtle">
                <span className="font-medium text-fg-muted">{activeFilter.label}:</span> {activeFilter.hint}.
              </p>
            ) : null}

            <div className="mt-8">
              {query.results.length === 0 ? (
                <NoProjectResults query={query.query} onReset={query.reset} />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {query.results.map((project) => (
                    <ProjectCard key={project.slug} project={project} />
                  ))}
                </div>
              )}
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}
