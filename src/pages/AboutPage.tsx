import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { projects, projectsInCategory } from '@/data/projects';
import { profileConfig } from '@/config/site';

const values = [
  {
    title: 'Curiosity',
    body: 'I start by trying to understand how a system actually behaves — what the data means, where it breaks, and who it fails.',
  },
  {
    title: 'Accessibility',
    body: 'Interfaces should work on a small screen, a slow connection and a keyboard. Offline and low-bandwidth paths are designed, not assumed away.',
  },
  {
    title: 'Accuracy',
    body: 'If a number cannot be measured honestly, I do not publish it. Metric definitions are written down next to the numbers they produce.',
  },
  {
    title: 'Privacy',
    body: 'Records are minimised, phone numbers are redacted from logs, and reporting for sponsors is bounded to aggregates rather than individual learners.',
  },
  {
    title: 'Responsible AI',
    body: 'Model output is grounded in approved material, validated against a schema, cited, and reviewed by a human before it can influence a decision.',
  },
  {
    title: 'Clear explanations',
    body: 'Recommendations, flags and access decisions carry their rationale. An explanation that a teacher cannot interrogate will not be used.',
  },
  {
    title: 'Human oversight',
    body: 'Teachers override recommendations, reviewers approve content, and people decide scholarships. Software prepares the decision; it does not take it.',
  },
  {
    title: 'Continuous improvement',
    body: 'Improvements come from tests, feedback and data-quality reports — and are described as measured or unmeasured, never as claimed impact.',
  },
];

const buildAreas = [
  { title: 'Learning applications', categoryId: 'offline-first' },
  { title: 'Teacher and classroom tools', categoryId: 'teacher-tools' },
  { title: 'AI-assisted learning systems', categoryId: 'ai-personalized' },
  {
    title: 'Assessment and analytics workflows',
    categoryId: 'assessment-analytics',
  },
  {
    title: 'Open-resource and localisation systems',
    categoryId: 'open-resources',
  },
  { title: 'Low-connectivity delivery', categoryId: 'mobile-low-bandwidth' },
  {
    title: 'Access and sponsorship workflows',
    categoryId: 'affordable-access',
  },
];

export default function AboutPage() {
  usePageMeta({
    title: 'About — how I work and what I build',
    description:
      'Mwangala is a developer building education-technology software: offline-first learning, teaching workflows, assessment, analytics, low-bandwidth delivery and responsible AI support.',
    path: '/about',
  });

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Understanding systems, then building software that makes hard things manageable"
        summary={
          <>
            I&apos;m {profileConfig.name}. My work sits between software
            engineering and the practical problems of learning: how content
            reaches someone with an unreliable connection, how a teacher knows
            what to reteach, how a learner gets help without being handed the
            answer, and how support is allocated without leaving anyone
            unexplained.
          </>
        }
        aside={
          <div className="card p-5">
            <p className="eyebrow">Positioning</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {profileConfig.role}
            </p>
            <p className="prose-body mt-3 text-sm">
              Full-stack development, data processing, offline-first
              architecture and responsible AI integration — applied to education
              access.
            </p>
            <p className="mono-meta mt-4">
              {projects.length} documented projects ·{' '}
              {new Set(projects.flatMap((project) => project.categories)).size}{' '}
              categories
            </p>
          </div>
        }
      />

      <Section
        id="how-i-think"
        tone="surface"
        eyebrow="01 — How I think"
        title="Understand the user and the constraint, design a workable system, test what matters, improve with evidence"
      >
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-4">
            <p className="prose-body max-w-prose">
              Most of the interesting work in these projects is not the feature
              list — it is deciding what happens when something fails. A lesson
              pack download stops at 80 percent. A sync arrives twice. A model
              provider times out halfway through an answer. A messaging provider
              never returns a delivery receipt. A cohort is too small for a
              group statistic to be safe. Each of those is a design decision,
              and each one shows up in the case studies rather than being hidden
              behind a success message.
            </p>
            <p className="prose-body max-w-prose">
              That habit explains the recurring patterns: append-only progress
              queues and idempotent uploads in LearnBridge, verified citations
              and untrusted-input handling in TutorSpring, evidence records and
              explicit &ldquo;not yet assessed&rdquo; states in PathWise, rule
              traces with a written rationale, and recorded reasons for every
              decision in EduAccess. It also explains the restraint: no accuracy
              figure for the AI features, no learning-gain claim for the
              recommendations, no compliance claim for privacy work.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink">
                The questions I keep asking
              </h3>
              <ul className="mt-3 grid gap-2 text-sm text-ink-muted">
                <li>What does this look like with no connection?</li>
                <li>What does the person see when the provider is down?</li>
                <li>Can the claim be checked by the learner or teacher?</li>
                <li>What is stored that does not need to be?</li>
                <li>Which decision must stay with a human?</li>
              </ul>
            </div>
            <Callout title="On experience and credentials" variant="note">
              This page describes work and approach. No employers, institutions,
              certifications, awards or partnerships are listed, because none
              have been supplied — and I would rather leave a section out than
              write something unverifiable.
            </Callout>
          </div>
        </div>
      </Section>

      <Section
        id="what-i-build"
        tone="quiet"
        eyebrow="02 — What I build"
        title="Seven kinds of system, one question underneath"
        description="Each area links to the projects that demonstrate it."
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildAreas.map((area) => {
            const count = projectsInCategory(area.categoryId).length;
            return (
              <li key={area.categoryId}>
                <Link
                  to={`/projects?category=${area.categoryId}`}
                  className="card card-interactive flex h-full flex-col gap-2 p-5"
                >
                  <span className="text-base font-semibold text-ink">
                    {area.title}
                  </span>
                  <span className="mono-meta">{count} projects</span>
                  <span className="mt-auto pt-2 text-xs text-accent">
                    Open filtered library →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        id="values"
        tone="surface"
        eyebrow="03 — Values in practice"
        title="What these values actually change"
        description="Stated as decisions rather than slogans, because a value that does not change the build is decoration."
      >
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value) => (
            <li key={value.title} className="card p-5">
              <h3 className="text-sm font-semibold text-ink">{value.title}</h3>
              <p className="prose-body mt-2 text-sm">{value.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="next"
        tone="contrast"
        eyebrow="04 — Next"
        title="Where to go from here"
        description="The engineering approach explains the method behind these decisions, and the journey page groups the work by technical theme."
        motif
      >
        <div className="flex flex-wrap gap-3">
          <Button to="/approach" variant="primary">
            Development approach
          </Button>
          <Button to="/skills" variant="secondary">
            Skills and evidence
          </Button>
          <Button to="/journey" variant="secondary">
            Learning journey
          </Button>
        </div>
      </Section>
    </>
  );
}
