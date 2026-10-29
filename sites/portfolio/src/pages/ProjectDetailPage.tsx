import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdjacentProjects, getProject, projects } from '@/data/projects';
import type { Project } from '@/types/project';
import { skillsByProject } from '@/data/skills';
import { usePageMeta } from '@/lib/seo';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { isUsableLink } from '@/lib/links';
import { cn } from '@/lib/cn';
import { Container, Section } from '@/components/ui/Layout';
import { Panel } from '@/components/ui/Panel';
import { Badge, TechTag } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { StateBlock } from '@/components/ui/StateBlock';
import { ProjectVisual } from '@/components/project/ProjectVisual';
import { ArchitectureDiagram, FlowDiagram } from '@/components/project/FlowDiagram';
import NotFoundPage from './NotFoundPage';

const sectionList = [
  { id: 'overview', label: 'Overview' },
  { id: 'problem', label: 'Problem' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'solution', label: 'Solution' },
  { id: 'features', label: 'Key features' },
  { id: 'architecture', label: 'Technology & architecture' },
  { id: 'decisions', label: 'Engineering decisions' },
  { id: 'testing', label: 'Testing & reliability' },
  { id: 'challenges', label: 'Challenges & lessons' },
  { id: 'demonstration', label: 'Demonstration' },
  { id: 'limitations', label: 'Limitations' },
] as const;

const sectionIds = sectionList.map((section) => section.id);

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = getProject(slug);

  usePageMeta({
    title: project ? `${project.name} — ${project.tagline} · Mwangala` : 'Project not found · Mwangala',
    description: project ? project.summary : 'The requested project does not exist in this portfolio.',
    path: project ? `/projects/${project.slug}` : undefined,
    type: 'article',
  });

  if (!project) {
    return (
      <NotFoundPage
        reason={`No project with the slug "${slug ?? ''}" exists in this portfolio.`}
        suggestion={
          <ul className="mt-2 flex flex-wrap gap-2">
            {projects.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/projects/${item.slug}`}
                  className="inline-flex rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-fg"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        }
      />
    );
  }

  return <CaseStudy project={project} />;
}

/* -------------------------------------------------------------------------- */

function CaseStudy({ project }: { project: Project }) {
  const { previous, next } = getAdjacentProjects(project.slug);
  const activeSection = useScrollSpy(sectionIds);
  const skills = skillsByProject().get(project.slug) ?? [];
  const hasLive = isUsableLink(project.liveUrl);
  const hasRepo = isUsableLink(project.repoUrl);

  return (
    <div data-accent={project.accent}>
      {/* ------------------------------------------------------- header ---- */}
      <Section tone="dark" className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-fg-subtle">
              <li>
                <Link to="/" className="transition-colors hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden>
                <Icon name="chevron-right" size={13} />
              </li>
              <li>
                <Link to="/projects" className="transition-colors hover:text-accent">
                  Projects
                </Link>
              </li>
              <li aria-hidden>
                <Icon name="chevron-right" size={13} />
              </li>
              <li aria-current="page" className="font-medium text-fg">
                {project.name}
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {project.categories.map((category) => (
                  <Badge key={category} tone="project" size="md">
                    {category}
                  </Badge>
                ))}
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
                {project.name}
              </h1>
              <p className="mt-3 text-lg font-medium text-[var(--prj)] sm:text-xl">{project.tagline}</p>

              <div className="prose-study mt-6 max-w-2xl">
                {project.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {hasLive ? (
                  <LinkButton href={project.liveUrl} variant="primary" size="md" icon="external">
                    Live application
                  </LinkButton>
                ) : null}
                {hasRepo ? (
                  <LinkButton href={project.repoUrl} variant="outline" size="md" icon="github">
                    Source code
                  </LinkButton>
                ) : null}
                <LinkButton to="/projects" variant="ghost" size="md" icon="arrow-left">
                  Back to projects
                </LinkButton>
              </div>

              {!hasLive || !hasRepo ? (
                <p className="mt-4 max-w-xl text-xs leading-relaxed text-fg-subtle">
                  {!hasLive ? 'A live demo URL has not been configured for this project yet. ' : ''}
                  {!hasRepo
                    ? 'A public source repository has not been configured yet — links are set in src/config/projectLinks.ts and hidden until a real URL exists.'
                    : ''}
                </p>
              ) : null}

              <dl className="mt-9 grid gap-x-8 gap-y-5 border-t border-line pt-7 sm:grid-cols-3">
                <Meta term="Status" detail={project.status} />
                <Meta term="Year" detail={project.year} />
                <Meta term="Role" detail={project.role} />
              </dl>
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="aspect-[8/5] w-full">
                  <ProjectVisual project={project} className="h-full w-full" />
                </div>
                <div className="border-t border-line p-4">
                  <p className="text-xs leading-relaxed text-fg-subtle">{project.preview.screenshotNote}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.keyTech.map((tech) => (
                      <TechTag key={tech} name={tech} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------- body ---- */}
      <Section tone="light">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-14">
            {/* In-page navigation */}
            {/* min-w-0: the section list scrolls horizontally below `lg`. Without
                it, the nowrap links contribute their full min-content width to the
                grid track and push the whole page past the viewport. */}
            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <nav aria-label="Case study sections">
                <h2 className="eyebrow mb-3">On this page</h2>
                <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
                  {sectionList.map((section) => (
                    <li key={section.id} className="shrink-0 lg:shrink">
                      <a
                        href={`#${section.id}`}
                        aria-current={activeSection === section.id ? 'true' : undefined}
                        className={cn(
                          'block whitespace-nowrap rounded-md border-l-2 py-1.5 pl-3 pr-2 text-[0.83rem] transition-colors lg:whitespace-normal',
                          activeSection === section.id
                            ? 'border-[var(--prj)] font-medium text-fg'
                            : 'border-line text-fg-subtle hover:border-line-strong hover:text-fg-muted',
                        )}
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              {skills.length > 0 ? (
                <div className="mt-8 hidden lg:block">
                  <h2 className="eyebrow mb-3">Skills demonstrated</h2>
                  <ul className="space-y-1.5">
                    {skills.slice(0, 8).map((skill) => (
                      <li key={skill}>
                        <Link
                          to={`/skills#project-${project.slug}`}
                          className="text-[0.8rem] text-fg-subtle transition-colors hover:text-accent"
                        >
                          {skill}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>

            {/* Sections */}
            <div className="min-w-0">
              <Block id="overview" title="Overview" eyebrow="What it is">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {project.capabilities.map((capability) => (
                    <li
                      key={capability}
                      className="flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-sm leading-snug text-fg-muted"
                    >
                      <Icon name="spark" size={16} className="mt-0.5 shrink-0 text-[var(--prj)]" aria-hidden />
                      {capability}
                    </li>
                  ))}
                </ul>

                <h3 className="mt-8 text-sm font-semibold text-fg">What this project demonstrates</h3>
                <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {project.demonstrates.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-snug text-fg-muted">
                      <Icon name="check" size={14} className="mt-1 shrink-0 text-[var(--prj)]" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>

                <h3 className="mt-8 text-sm font-semibold text-fg">Who it is for</h3>
                <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {project.caseStudy.whoBenefits.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-snug text-fg-muted">
                      <span aria-hidden className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-[var(--prj)] opacity-70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Block>

              <Block id="problem" title="The problem" eyebrow="Why it exists">
                <div className="prose-study container-prose">
                  {project.caseStudy.problem.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </Block>

              <Block id="objectives" title="Objectives" eyebrow="What it had to achieve">
                <ol className="grid gap-3 sm:grid-cols-2">
                  {project.caseStudy.objectives.map((objective, index) => (
                    <li key={objective} className="flex gap-3 rounded-lg border border-line bg-surface p-3.5">
                      <span className="font-mono text-xs text-[var(--prj)]">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-sm leading-snug text-fg-muted">{objective}</span>
                    </li>
                  ))}
                </ol>
              </Block>

              <Block id="solution" title="Solution" eyebrow="How it works">
                <div className="prose-study container-prose">
                  {project.caseStudy.solution.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
                <Panel className="mt-8 bg-surface-sunken/60" tone="none">
                  <FlowDiagram flow={project.caseStudy.workflow} />
                </Panel>
              </Block>

              <Block id="features" title="Key features" eyebrow="What it does">
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.features.map((feature) => (
                    <article key={feature.title} className="rounded-lg border border-line bg-surface p-4">
                      <h3 className="text-[0.95rem] font-semibold text-fg">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
                    </article>
                  ))}
                </div>
              </Block>

              <Block id="architecture" title="Technology & architecture" eyebrow="How it is built">
                <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
                  {project.caseStudy.architecture.summary}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-1.5">
                  {project.tech.map((tech) => (
                    <TechTag key={tech} name={tech} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton
                    label={`Copy the ${project.name} technology stack`}
                    value={project.tech.join(', ')}
                  >
                    Copy full stack
                  </CopyButton>
                </div>

                <div className="mt-8">
                  <ArchitectureDiagram layers={project.caseStudy.architecture.layers} />
                </div>

                {project.caseStudy.architecture.security?.length ? (
                  <Panel className="mt-6 border-[var(--prj-line)] bg-[var(--prj-soft)]" tone="none">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Icon name="lock" size={15} className="text-[var(--prj)]" aria-hidden />
                      Security and authorisation
                    </h3>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {project.caseStudy.architecture.security.map((item) => (
                        <li key={item} className="flex gap-2 text-[0.85rem] leading-snug text-fg-muted">
                          <span aria-hidden className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-[var(--prj)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                ) : null}
              </Block>

              <Block id="decisions" title="Engineering decisions" eyebrow="Trade-offs, made explicitly">
                <div className="flex flex-col gap-4">
                  {project.caseStudy.decisions.map((decision) => (
                    <article key={decision.title} className="overflow-hidden rounded-lg border border-line bg-surface">
                      <header className="flex items-start gap-3 border-b border-line bg-surface-sunken/50 px-4 py-3">
                        <Icon name="git-branch" size={16} className="mt-0.5 shrink-0 text-[var(--prj)]" aria-hidden />
                        <h3 className="text-[0.95rem] font-semibold text-fg">{decision.title}</h3>
                      </header>
                      <dl className="grid gap-px bg-line sm:grid-cols-3">
                        <DecisionCell term="Context" detail={decision.context} />
                        <DecisionCell term="Decision" detail={decision.decision} />
                        <DecisionCell term="Trade-off" detail={decision.tradeoff} />
                      </dl>
                    </article>
                  ))}
                </div>
              </Block>

              <Block id="testing" title="Testing & reliability" eyebrow="How it was verified">
                <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
                  {project.caseStudy.testing.summary}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {project.caseStudy.testing.items.map((item) => (
                    <div key={item.title} className="rounded-lg border border-line bg-surface p-4">
                      <h3 className="flex items-center gap-2 text-[0.9rem] font-semibold text-fg">
                        <Icon name="beaker" size={14} className="text-[var(--prj)]" aria-hidden />
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">{item.body}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 rounded-lg border border-dashed border-line-strong bg-surface-sunken/60 px-4 py-3 text-xs leading-relaxed text-fg-subtle">
                  Test counts are deliberately not quoted here. The suite is described so a reviewer can judge
                  coverage; specific pass numbers belong in the repository&apos;s CI output, where they can be
                  verified.
                </p>
              </Block>

              <Block id="challenges" title="Challenges & lessons" eyebrow="What was hard">
                <div className="flex flex-col gap-4">
                  {project.caseStudy.challenges.map((challenge, index) => (
                    <article key={challenge.problem.slice(0, 40)} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
                      <h3 className="flex items-start gap-2.5 text-[0.95rem] font-semibold text-fg">
                        <span className="mt-0.5 font-mono text-xs text-[var(--prj)]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {challenge.problem}
                      </h3>
                      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                        <ChallengeCell term="Approach" detail={challenge.approach} />
                        <ChallengeCell term="Reasoning" detail={challenge.reasoning} />
                        <ChallengeCell term="Lesson" detail={challenge.lesson} highlight />
                      </dl>
                    </article>
                  ))}
                </div>
                {project.needsAuthorReview?.length ? (
                  <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
                    Sections flagged for author review in the registry:{' '}
                    {project.needsAuthorReview.join('; ')}.
                  </p>
                ) : null}
              </Block>

              <Block id="demonstration" title="Demonstration" eyebrow="The primary workflow">
                <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
                  {project.caseStudy.demonstration.summary}
                </p>
                <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                  {project.caseStudy.demonstration.steps.map((step, index) => (
                    <li key={step.title} className="rounded-lg border border-line bg-surface p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-[var(--prj-soft)] font-mono text-[0.7rem] font-semibold text-[var(--prj)]">
                          {index + 1}
                        </span>
                        <h3 className="text-[0.92rem] font-semibold text-fg">{step.title}</h3>
                      </div>
                      <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">{step.body}</p>
                    </li>
                  ))}
                </ol>
                <Panel className="mt-5 bg-surface-sunken/60" tone="none">
                  <p className="flex gap-2.5 text-[0.85rem] leading-relaxed text-fg-muted">
                    <Icon name="info" size={15} className="mt-0.5 shrink-0 text-[var(--prj)]" aria-hidden />
                    {project.caseStudy.demonstration.accessNote}
                  </p>
                </Panel>
              </Block>

              <Block id="limitations" title="Known limitations" eyebrow="What it does not do">
                <StateBlock tone="warning" icon="alert" title="Documented boundaries">
                  <p>
                    Every project here has real limits. They are recorded so a reviewer can judge fit rather
                    than discover the gap later.
                  </p>
                </StateBlock>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {project.caseStudy.limitations.map((limitation) => (
                    <li key={limitation} className="flex gap-2.5 rounded-lg border border-line bg-surface p-3.5">
                      <Icon name="close" size={14} className="mt-1 shrink-0 text-fg-subtle" aria-hidden />
                      <span className="text-[0.85rem] leading-snug text-fg-muted">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </Block>

              {/* --------------------------------------- final actions ---- */}
              <nav
                aria-label="Project navigation"
                className="mt-14 grid gap-4 border-t border-line pt-8 sm:grid-cols-2"
              >
                {previous ? (
                  <AdjacentLink project={previous} direction="previous" />
                ) : (
                  <span aria-hidden />
                )}
                {next ? <AdjacentLink project={next} direction="next" className="sm:text-right" /> : null}
              </nav>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LinkButton to="/projects" variant="secondary" size="md" icon="layers">
                  Back to all projects
                </LinkButton>
                {hasLive ? (
                  <LinkButton href={project.liveUrl} variant="primary" size="md" icon="external">
                    Live application
                  </LinkButton>
                ) : null}
                {hasRepo ? (
                  <LinkButton href={project.repoUrl} variant="outline" size="md" icon="github">
                    Source code
                  </LinkButton>
                ) : null}
                <LinkButton to="/contact" variant="ghost" size="md" icon="mail">
                  Ask about this project
                </LinkButton>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------- fragments -- */

function Meta({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="eyebrow">{term}</dt>
      <dd className="mt-1.5 text-sm leading-snug text-fg-muted">{detail}</dd>
    </div>
  );
}

function Block({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-10 first:border-t-0 first:pt-0">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DecisionCell({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="eyebrow">{term}</dt>
      <dd className="mt-1.5 text-[0.86rem] leading-relaxed text-fg-muted">{detail}</dd>
    </div>
  );
}

function ChallengeCell({
  term,
  detail,
  highlight = false,
}: {
  term: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-lg p-3', highlight ? 'bg-[var(--prj-soft)]' : 'bg-surface-sunken/60')}>
      <dt className="eyebrow">{term}</dt>
      <dd
        className={cn(
          'mt-1.5 text-[0.85rem] leading-relaxed',
          highlight ? 'font-medium text-fg' : 'text-fg-muted',
        )}
      >
        {detail}
      </dd>
    </div>
  );
}

function AdjacentLink({
  project,
  direction,
  className,
}: {
  project: Project;
  direction: 'previous' | 'next';
  className?: string;
}) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      data-accent={project.accent}
      className={cn(
        'group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-[var(--prj-line)]',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
        {direction === 'next' ? (
          <Icon
            name="arrow-right"
            size={13}
            aria-hidden
            className="order-first transition-transform group-hover:translate-x-0.5"
          />
        ) : null}
        {direction === 'previous' ? 'Previous project' : 'Next project'}
        {direction === 'previous' ? (
          <Icon
            name="arrow-left"
            size={13}
            aria-hidden
            className="transition-transform group-hover:-translate-x-0.5"
          />
        ) : null}
      </span>
      <span className="mt-1.5 block text-base font-semibold text-fg group-hover:text-[var(--prj)]">
        {project.name}
      </span>
      <span className="mt-1 block text-sm text-fg-muted">{project.tagline}</span>
    </Link>
  );
}

