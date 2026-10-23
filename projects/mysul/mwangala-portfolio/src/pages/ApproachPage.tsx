import { Link } from 'react-router-dom';
import { engineeringProcess } from '@/config/nav';
import { profile } from '@/config/profile';
import { projects } from '@/data/projects';
import { usePageMeta } from '@/lib/seo';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Panel } from '@/components/ui/Panel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/Button';
import { AccentScope } from '@/components/project/AccentScope';

const stageIcons: IconName[] = ['eye', 'layers', 'code', 'beaker', 'spark'];

const practices = [
  {
    title: 'Separate the layers that change at different speeds',
    body: 'Retrieval, parsing, analysis, storage and presentation are kept apart so any one of them can be replaced. A transcript provider, a scanner adapter or an intelligence connector should be swappable without touching the domain model or the UI.',
    projects: ['transcriptwise', 'securecode-workbench', 'threatintel-desk'],
  },
  {
    title: 'Model failure as part of the domain',
    body: 'External services fail in specific ways. Rather than one generic error, the model distinguishes unavailable, unauthorized, rate-limited, malformed and partial — because each needs a different message and a different recovery action.',
    projects: ['transcriptwise', 'netscope', 'hashsight'],
  },
  {
    title: 'Keep the original and record the change',
    body: 'Snapshots, observations, timeline events and lookup history are append-only. Derived state can be recomputed; history cannot be reconstructed once it has been overwritten.',
    projects: ['incidentflow', 'assetwatch', 'hashsight'],
  },
  {
    title: 'Provenance is a first-class field',
    body: 'Every value carries where it came from and when: which feed reported an indicator, which rule produced a finding, which provider returned a reputation, which transcript segment supports a claim.',
    projects: ['threatintel-desk', 'securecode-workbench', 'transcriptwise'],
  },
  {
    title: 'Validate untrusted input before it is processed',
    body: 'Size limits, structure checks, magic bytes, path-traversal and archive-bomb protection, SSRF restriction, resource ceilings on subprocesses — and the failure mode is designed before the happy path.',
    projects: ['securecode-workbench', 'netscope', 'assetwatch'],
  },
  {
    title: 'Say what the result does not mean',
    body: 'A heuristic is labelled a heuristic. "No known detection" is not "safe". A completed lesson is not mastery. The sentence explaining the limitation is part of the feature, not a disclaimer bolted on afterwards.',
    projects: ['hashsight', 'phishlens', 'cyberaware-lab'],
  },
  {
    title: 'Authorisation lives on the server, in one place',
    body: 'Role checks are declared per route and ownership is enforced through query scope, so a missing check is visible in review and an identifier in a URL cannot reach another user\'s record.',
    projects: ['incidentflow', 'cyberaware-lab', 'assetwatch'],
  },
  {
    title: 'Write the limitation down while it is still fresh',
    body: 'Every case study here ends with what the project cannot do. Documenting it at the time is cheap; reconstructing it later is guesswork.',
    projects: projects.slice(0, 3).map((project) => project.slug),
  },
];

export default function ApproachPage() {
  usePageMeta({
    title: `Engineering Approach — ${profile.name}`,
    description:
      'The five-stage process behind every project — understand, design, build, test, improve — plus the recurring engineering practices and the reasoning behind them.',
    path: '/approach',
  });

  return (
    <>
      <PageHeader
        eyebrow="Engineering approach"
        title="Understand → Design → Build → Test → Improve"
        lead="The same five stages in every project, whether it is a packet parser, an incident workflow or a learning platform. The stages are not a methodology I adopted — they are what kept happening when I paid attention to what actually worked."
        actions={
          <LinkButton to="/projects" variant="primary" icon="arrow-right" iconPosition="end">
            See it applied in {projects.length} projects
          </LinkButton>
        }
      />

      {/* ------------------------------------------------------ the stages -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {engineeringProcess.map((stage, index) => (
                <li key={stage.stage}>
                  <Panel className="h-full bg-surface">
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface-sunken text-accent">
                        <Icon name={stageIcons[index] ?? 'spark'} size={17} aria-hidden />
                      </span>
                      <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-fg">{stage.stage}</h2>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">{stage.body}</p>
                  </Panel>
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <Panel className="bg-surface-sunken/60" tone="none">
                <h2 className="text-sm font-semibold text-fg">What each stage produces</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ['Understand', 'A written problem statement and a list of who it affects.'],
                    ['Design', 'A data model, module boundaries, an API contract and the failure modes.'],
                    ['Build', 'Working increments, each independently testable.'],
                    ['Test', 'Automated coverage of the domain rules plus a manual pass over the states.'],
                    ['Improve', 'A documented limitation list and the next change worth making.'],
                  ].map(([term, detail]) => (
                    <div key={term} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
                      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-fg-subtle">
                        {term}
                      </dt>
                      <dd className="text-fg-muted">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel className="bg-surface-sunken/60" tone="none">
                <h2 className="text-sm font-semibold text-fg">What I deliberately skip</h2>
                <ul className="mt-4 space-y-3 text-sm text-fg-muted">
                  {[
                    'Infrastructure that has no current need — no queue, cache or vector store until something measurably requires it.',
                    'Visual polish before the workflow works. Decoration that hides a broken path is worse than a plain interface.',
                    'Confidence the evidence does not support. If a result is heuristic, incomplete or unverifiable, the UI says so.',
                    'Features that cannot be tested. Anything that depends on a live external service gets a mocked seam.',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Icon name="close" size={15} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------------------ practices -- */}
      <Section tone="dark" className="border-y border-line">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Recurring practices"
              title="Eight habits that show up across the work"
              description="Each one is tied to the projects where it mattered, so the claim can be checked against a case study."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {practices.map((practice, index) => (
                <Panel key={practice.title} className="h-full bg-surface">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="text-[0.98rem] font-semibold text-fg">{practice.title}</h3>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{practice.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    {practice.projects.map((slug) => {
                      const project = projects.find((item) => item.slug === slug);
                      if (!project) return null;
                      return (
                        <li key={slug}>
                          <AccentScope accent={project.accent} as="span">
                            <Link
                              to={`/projects/${project.slug}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-sunken px-2 py-0.5 text-[0.72rem] text-fg-muted transition-colors hover:border-[var(--prj-line)] hover:text-fg"
                            >
                              <span aria-hidden className="size-1.5 rounded-full bg-[var(--prj)]" />
                              {project.name}
                            </Link>
                          </AccentScope>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ))}
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* -------------------------------------------------------- values -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <SectionHeading eyebrow="Principles" title="Rules I apply when a decision is close" />
                <p className="mt-5 max-w-prose text-sm leading-relaxed text-fg-muted">
                  Most engineering arguments are not about right and wrong but about which cost you prefer to
                  pay. These are the tie-breakers I use, in order.
                </p>
              </div>
              <ol className="flex flex-col gap-3">
                {profile.about.values.map((value, index) => (
                  <li key={value.title}>
                    <Panel className="bg-surface">
                      <div className="flex items-start gap-4">
                        <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h3 className="text-[0.98rem] font-semibold text-fg">{value.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{value.body}</p>
                        </div>
                      </div>
                    </Panel>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-14 rounded-xl border border-line bg-surface p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold text-fg sm:text-2xl">
                    Read the reasoning in context
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                    Each case study documents two or three decisions with the context, the choice and what it
                    cost. That is where this approach is easiest to judge.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <LinkButton to="/projects" variant="primary">
                    All projects
                  </LinkButton>
                  <LinkButton to="/skills" variant="outline">
                    Skills &amp; evidence
                  </LinkButton>
                </div>
              </div>
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}
