import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { usePageMeta } from '@/hooks/usePageMeta';
import { journeyThemes } from '@/data/journey';
import { getProjectsBySlugs } from '@/data/projects';
import { Callout } from '@/components/ui/Callout';

export default function JourneyPage() {
  usePageMeta({
    title: 'Learning journey — how the projects connect',
    description:
      'The ten projects grouped by technical theme: learning access foundations, personalized learning and assessment, teaching workflows, shared resources and contextual access, and evidence and improvement.',
    path: '/journey',
  });

  return (
    <>
      <PageHeader
        eyebrow="Journey"
        title="Five themes, not a timeline"
        summary={
          <>
            The portfolio is organised by the problems each project addresses
            and the engineering they share. No dates or chronology are implied:
            any ordering by date only appears once genuine project dates are
            configured.
          </>
        }
      />

      <Section
        id="themes"
        tone="surface"
        eyebrow="01 — Themes"
        title="Where the threads overlap"
        description="Each theme explains what the projects have in common technically, and links back into the case studies."
      >
        <ol className="grid gap-8">
          {journeyThemes.map((theme, index) => {
            const themeProjects = getProjectsBySlugs(theme.slugs);

            return (
              <li key={theme.id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono-meta">
                    Theme {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                    {theme.title}
                  </h2>
                </div>

                <p className="prose-body mt-3 max-w-prose">
                  {theme.description}
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <div>
                    <p className="eyebrow mb-2">Technical threads</p>
                    <ul className="grid gap-2">
                      {theme.focusPoints.map((point) => (
                        <li
                          key={point}
                          className="rail rail-node text-sm text-ink-muted"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="eyebrow mb-2">Projects in this theme</p>
                    <ul className="grid gap-3">
                      {themeProjects.map((project) => (
                        <li key={project.slug}>
                          <Link
                            to={`/projects/${project.slug}`}
                            className="block rounded-card border border-line bg-panel-strong p-4 transition-colors duration-200 hover:border-accent/50"
                          >
                            <span className="text-sm font-semibold text-ink">
                              {project.name}
                            </span>
                            <span className="mono-meta mt-1 block">
                              {project.primaryCategory}
                            </span>
                            <span className="prose-body mt-2 block text-xs">
                              {project.shortDescription}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <Callout title="Conceptual grouping" variant="note" className="mt-8">
          These groupings describe shared engineering themes across the
          projects. They are not a completion timeline, a study plan or a claim
          about the order in which the work was done.
        </Callout>
      </Section>
    </>
  );
}
