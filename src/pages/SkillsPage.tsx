import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { skillGroups } from '@/data/skills';
import { getProjectsBySlugs } from '@/data/projects';
import { categories } from '@/data/categories';
import { Button } from '@/components/ui/Button';

export default function SkillsPage() {
  usePageMeta({
    title: 'Skills — technologies evidenced by the projects',
    description:
      'Python, FastAPI, PostgreSQL, React, TypeScript, offline-first synchronisation, assessment logic, AI provider integration, privacy-aware reporting and the workflows behind them — each linked to the projects that demonstrate it.',
    path: '/skills',
  });

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Technologies and capabilities, with the project that demonstrates each one"
        summary={
          <>
            This page lists what the portfolio actually uses and links every
            group to the case studies where it appears. There are no proficiency
            percentages, because there is no defensible way to measure one here.
          </>
        }
        aside={
          <div className="card p-5">
            <p className="eyebrow">Primary stack</p>
            <ul className="mt-3 grid gap-2 text-sm text-ink-muted">
              <li>Python · FastAPI · Pydantic · SQLAlchemy</li>
              <li>PostgreSQL · Redis · SQLite · IndexedDB</li>
              <li>React · TypeScript · Tailwind CSS · Vite</li>
              <li>
                Provider adapters for AI, realtime, messaging and payments
              </li>
            </ul>
          </div>
        }
      />

      <Section
        id="groups"
        tone="surface"
        eyebrow="01 — Capability groups"
        title="Six groups, each traced to project evidence"
      >
        <div className="grid gap-6">
          {skillGroups.map((group) => {
            const evidence = getProjectsBySlugs(group.evidenceSlugs);
            return (
              <article key={group.id} className="card p-5 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink">
                      {group.title}
                    </h3>
                    <p className="prose-body mt-2 text-sm">{group.summary}</p>

                    {group.caveat && (
                      <p className="mt-4 rounded-card border border-line bg-panel-strong p-3 text-xs text-ink-subtle">
                        {group.caveat}
                      </p>
                    )}

                    <div className="mt-4">
                      <p className="eyebrow mb-2">Evidenced in</p>
                      <ul className="flex flex-wrap gap-2">
                        {evidence.map((project) => (
                          <li key={project.slug}>
                            <Link
                              to={`/projects/${project.slug}`}
                              className="chip chip-interactive"
                            >
                              {project.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section
        id="browse-by-technology"
        tone="quiet"
        eyebrow="02 — Browse by technology"
        title="Filter the library by stack"
        description="Python and full-stack filters cut across every domain, so the same project appears in several views."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {categories
            .filter((category) => category.group === 'technology')
            .map((category) => (
              <Link
                key={category.id}
                to={`/projects?category=${category.id}`}
                className="card card-interactive flex flex-col gap-2 p-5"
              >
                <span className="text-base font-semibold text-ink">
                  {category.label}
                </span>
                <span className="prose-body text-sm">
                  {category.description}
                </span>
                <span className="mono-meta mt-auto pt-2 text-accent">
                  Open filtered library →
                </span>
              </Link>
            ))}
        </div>

        <Callout
          title="How these capabilities were developed"
          variant="note"
          className="mt-6"
        >
          These capabilities come from building the portfolio projects and
          documenting the decisions inside them — including the parts that did
          not work as intended. They are not formal qualifications, and nothing
          here claims regulatory or accessibility compliance.
        </Callout>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button to="/projects" variant="secondary">
            Browse all nine projects
          </Button>
          <Button to="/approach" variant="ghost">
            See the engineering approach
          </Button>
        </div>
      </Section>
    </>
  );
}
