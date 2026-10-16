import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectSubNav } from '@/components/projects/ProjectSubNav';
import { WorkflowSteps } from '@/components/projects/WorkflowSteps';
import { FeatureList } from '@/components/projects/FeatureList';
import { ArchitectureDiagram } from '@/components/projects/ArchitectureDiagram';
import { PreviewGallery } from '@/components/projects/PreviewGallery';
import { ResponsibleNote } from '@/components/projects/ResponsibleNote';
import { RelatedProjects } from '@/components/projects/RelatedProjects';
import { DeploymentPanel } from '@/components/projects/DeploymentPanel';
import { ProjectExternalActions } from '@/components/projects/ProjectExternalActions';
import { CopyLinkButton } from '@/components/projects/CopyLinkButton';
import { TagList } from '@/components/ui/TagList';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { projects, getProject } from '@/data/projects';
import { categoryLabels } from '@/data/categories';
import { formatIsoDate } from '@/lib/format';

function CaseStudySection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 border-t border-line pt-10"
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={`${id}-heading`}
        className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = getProject(slug);

  usePageMeta({
    title: project ? `${project.name} — case study` : 'Project not found',
    description: project
      ? project.shortDescription
      : `This project route does not match any of the ${projects.length} documented projects.`,
    path: project ? `/projects/${project.slug}` : '/projects',
    ...(project ? {} : { noIndex: true }),
    ...(project
      ? {
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: project.name,
            applicationCategory: 'EducationalApplication',
            description: project.shortDescription,
            operatingSystem: 'Web',
            featureList: project.features.map((feature) => feature.title),
            keywords: [
              ...project.categories.map((id) => categoryLabels[id] ?? id),
              ...project.technologies,
            ].join(', '),
          },
        }
      : {}),
  });

  if (!project) {
    return (
      <>
        <PageHeader
          tone="contrast"
          eyebrow="Unknown project"
          title="That project is not in this catalogue"
          summary="The address may be mistyped, or the project may have been renamed. Every documented project is listed in the library."
        />
        <Section tone="surface">
          <EmptyState
            title="Project not found"
            description={`${projects.length} projects are documented. Open the library to search them by name, technology or feature.`}
            action={
              <Button to="/projects" variant="primary">
                Back to the project library
              </Button>
            }
          />
        </Section>
      </>
    );
  }

  const subNavItems = [
    { id: 'problem', label: 'Problem and users' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'features', label: 'Core features' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'decisions', label: 'Engineering decisions' },
    { id: 'testing', label: 'Testing' },
    { id: 'previews', label: 'Interface previews' },
    { id: 'limits', label: 'Limits and next steps' },
    { id: 'related', label: 'Related projects' },
  ];

  const projectDate = formatIsoDate(project.projectDate);

  return (
    <>
      <PageHeader
        tone="contrast"
        eyebrow={`${project.primaryCategory} · project ${String(project.displayOrder).padStart(2, '0')}`}
        title={project.name}
        summary={project.longDescription}
        aside={
          <div className="grid gap-5">
            <TagList
              tags={project.technologies}
              label={`${project.name} technologies`}
              limit={8}
            />
            <ProjectExternalActions project={project} />
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/projects" className="btn btn-ghost px-3 py-2 text-sm">
                <span aria-hidden="true">←</span> All projects
              </Link>
              <CopyLinkButton
                path={`/projects/${project.slug}`}
                label="Share case study"
              />
            </div>
            {projectDate && (
              <p className="mono-meta">
                Genuine project date on record: {projectDate}
              </p>
            )}
          </div>
        }
      />

      <section data-tone="surface" className="bg-surface text-ink">
        <div className="shell grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_220px] lg:py-16">
          <div className="grid gap-10">
            <CaseStudySection
              id="problem"
              eyebrow="01 — Problem and intended users"
              title="What it is built to fix"
            >
              <p className="prose-body max-w-prose">
                {project.caseStudy.problem}
              </p>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-ink">
                    Intended users
                  </h3>
                  <ul className="mt-3 grid gap-2">
                    {project.caseStudy.users.map((user) => (
                      <li
                        key={user}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {user}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-ink">
                    Constraints that shaped it
                  </h3>
                  <ul className="mt-3 grid gap-2">
                    {project.caseStudy.constraints.map((constraint) => (
                      <li
                        key={constraint}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
                        />
                        {constraint}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CaseStudySection>

            <CaseStudySection
              id="workflow"
              eyebrow="02 — Primary workflow"
              title="How the application is used"
            >
              <WorkflowSteps
                steps={project.caseStudy.workflow}
                projectName={project.name}
              />
            </CaseStudySection>

            <CaseStudySection
              id="features"
              eyebrow="03 — Core features"
              title="What each part does and why"
            >
              <FeatureList features={project.features} />
            </CaseStudySection>

            <CaseStudySection
              id="architecture"
              eyebrow="04 — Technical architecture"
              title="Components and connections"
            >
              <ArchitectureDiagram
                nodes={project.architecture}
                projectName={project.name}
              />
              <p className="mono-meta mt-3">
                Stored as structured metadata and rendered from the same
                component for every project, so the diagram cannot drift from
                the case study text.
              </p>
            </CaseStudySection>

            <CaseStudySection
              id="decisions"
              eyebrow="05 — Engineering decisions"
              title="Choices that shaped the build"
            >
              <ul className="grid gap-4">
                {project.caseStudy.engineeringDecisions.map(
                  (decision, index) => (
                    <li key={decision.title} className="rail rail-node">
                      <p className="mono-meta">
                        Decision {String(index + 1).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {decision.title}
                      </p>
                      <p className="prose-body mt-1.5 text-sm">
                        {decision.description}
                      </p>
                    </li>
                  ),
                )}
              </ul>
            </CaseStudySection>

            <CaseStudySection
              id="testing"
              eyebrow="06 — Testing and reliability"
              title="Behaviours covered by tests"
            >
              <p className="prose-body max-w-prose text-sm">
                No coverage percentage, uptime figure or benchmark is published
                here, because those numbers are not measured for this portfolio.
                What follows is the behaviour the project&apos;s own test suite
                is written to exercise.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {project.caseStudy.testing.map((item) => (
                  <li
                    key={item}
                    className="card flex gap-3 p-4 text-sm text-ink-muted"
                  >
                    <span aria-hidden="true" className="mono-meta">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </CaseStudySection>

            <CaseStudySection
              id="previews"
              eyebrow="07 — Interface previews"
              title="What the screens are designed to do"
            >
              <PreviewGallery project={project} />
            </CaseStudySection>

            <CaseStudySection
              id="limits"
              eyebrow="08 — Limits and next steps"
              title="What is unfinished, stated plainly"
            >
              <ResponsibleNote
                caseStudy={project.caseStudy}
                projectName={project.name}
              />
            </CaseStudySection>

            <CaseStudySection
              id="related"
              eyebrow="09 — Related projects"
              title="Where else this thread continues"
            >
              <RelatedProjects project={project} />
            </CaseStudySection>
          </div>

          <aside className="hidden lg:block">
            <ProjectSubNav
              items={subNavItems}
              ariaLabel={`${project.name} case study sections`}
            />
          </aside>
        </div>
      </section>

      <Section
        tone="quiet"
        eyebrow="Connecting this project"
        title="Application and source repository"
        description="This portfolio is catalogue-first: a project is documented as a case study before its deployment exists. The panel below shows exactly what is connected today."
      >
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <DeploymentPanel project={project} />
          <div className="grid gap-5">
            <Callout title="No placeholder destinations" variant="setup">
              Every external action on this site comes from a validated
              configuration value. If a URL is missing, the button is absent
              rather than pointing somewhere unreliable — and a repository link
              is never used in place of a demo link.
            </Callout>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink">
                Try the neighbouring projects
              </h3>
              <p className="prose-body mt-2 text-sm">
                Case studies are grouped by shared categories, so following a
                thread is a click away.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button to="/projects" variant="secondary" size="sm">
                  Project library
                </Button>
                <Button to="/contact" variant="ghost" size="sm">
                  Discuss this project
                </Button>
              </div>
            </div>
            <CopyLinkButton
              path={`/projects/${project.slug}`}
              label="Copy a link to this case study"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
