import { Link } from 'react-router-dom';
import { profile, configuredLinks, hasContactEmail } from '@/config/profile';
import { featuredProjects, projects } from '@/data/projects';
import { usePageMeta } from '@/lib/seo';
import { isUsableLink } from '@/lib/links';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Panel } from '@/components/ui/Panel';
import { Icon } from '@/components/ui/Icon';
import { LinkButton } from '@/components/ui/Button';
import { StateBlock } from '@/components/ui/StateBlock';
import { AccentScope } from '@/components/project/AccentScope';

export default function AboutPage() {
  usePageMeta({
    title: `About — ${profile.name}`,
    description:
      'How Mwangala approaches software: understanding systems beneath their interfaces, building practical applications, and treating security and honesty as product requirements.',
    path: '/about',
  });

  const hasCredentials = profile.education.length > 0 || profile.certifications.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={profile.about.heading}
        lead={profile.about.paragraphs[0]}
        actions={
          <>
            <LinkButton to="/projects" variant="primary" icon="layers">
              See the projects
            </LinkButton>
            {hasContactEmail() ? (
              <LinkButton href={`mailto:${profile.email}`} variant="outline" icon="mail">
                {profile.email}
              </LinkButton>
            ) : (
              <LinkButton to="/contact" variant="outline" icon="mail">
                Contact
              </LinkButton>
            )}
          </>
        }
      />

      {/* ------------------------------------------------------- narrative -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
              <div className="prose-study container-prose">
                {profile.about.paragraphs.slice(1).map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}

                <h3>What the projects are for</h3>
                <p>
                  Each of the {projects.length} applications in this portfolio started as something I wanted to
                  understand properly: how a phishing verdict is actually justified, what a packet capture can
                  and cannot tell you, how intelligence from three feeds can be compared at all, or how a
                  transcript becomes something a person can study from. Building them was the way to find out.
                </p>
                <p>
                  That is also why every case study records its limitations. A tool that claims to do more than
                  it does is worse than no tool, and I would rather show the boundary than hide it.
                </p>

                <h3>How I work with other people</h3>
                <p>
                  I write things down. Designs, decisions, trade-offs and known gaps end up in documentation,
                  because a decision nobody recorded will be relitigated. I prefer small, working increments
                  that can be tested over large ones that can only be demonstrated, and I would rather ask a
                  clarifying question early than deliver the wrong thing confidently.
                </p>
              </div>

              <aside className="flex flex-col gap-4">
                <Panel className="bg-surface">
                  <h2 className="text-sm font-semibold text-fg">At a glance</h2>
                  <dl className="mt-4 space-y-3.5">
                    <div>
                      <dt className="eyebrow">Name</dt>
                      <dd className="mt-1 text-sm text-fg">{profile.name}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Positioning</dt>
                      <dd className="mt-1 text-sm leading-snug text-fg-muted">{profile.role}</dd>
                    </div>
                    {profile.location ? (
                      <div>
                        <dt className="eyebrow">Based in</dt>
                        <dd className="mt-1 text-sm text-fg-muted">{profile.location}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="eyebrow">Availability</dt>
                      <dd className="mt-1 text-sm leading-snug text-fg-muted">{profile.availability}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Contact</dt>
                      <dd className="mt-1 text-sm text-fg-muted">
                        {hasContactEmail() ? (
                          <a
                            href={`mailto:${profile.email}`}
                            className="text-accent underline-offset-4 hover:underline"
                          >
                            {profile.email}
                          </a>
                        ) : (
                          <span className="text-fg-subtle">
                            Not published yet — see the{' '}
                            <Link to="/contact" className="text-accent underline-offset-4 hover:underline">
                              contact page
                            </Link>
                            .
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {configuredLinks().length > 0 ? (
                    <ul className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                      {configuredLinks()
                        .filter((link) => isUsableLink(link.url))
                        .map((link) => (
                          <li key={link.kind}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-fg"
                            >
                              <Icon
                                name={link.kind === 'github' ? 'github' : link.kind === 'linkedin' ? 'linkedin' : 'external'}
                                size={14}
                                aria-hidden
                              />
                              {link.label}
                            </a>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </Panel>

                <Panel className="bg-surface" tone="none">
                  <h2 className="text-sm font-semibold text-fg">Core message</h2>
                  <p className="mt-2 font-mono text-[0.8rem] leading-relaxed text-fg-muted">
                    {profile.coreMessage}
                  </p>
                </Panel>

                {!hasCredentials ? (
                  <StateBlock tone="neutral" icon="info" title="No listed education or certifications">
                    <p>
                      This page does not claim academic qualifications, certifications, employers or awards.
                      Those fields exist in{' '}
                      <code className="font-mono text-[0.85em]">src/config/profile.ts</code> and render only
                      once real entries are added — the portfolio would rather show less than invent more.
                    </p>
                  </StateBlock>
                ) : (
                  <Panel className="bg-surface">
                    <h2 className="text-sm font-semibold text-fg">Education &amp; certifications</h2>
                    {profile.education.length > 0 ? (
                      <ul className="mt-3 space-y-3">
                        {profile.education.map((entry) => (
                          <li key={entry.institution}>
                            <p className="text-sm font-medium text-fg">{entry.institution}</p>
                            <p className="text-xs text-fg-muted">
                              {entry.detail} · {entry.period}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {profile.certifications.length > 0 ? (
                      <ul className="mt-4 space-y-2 border-t border-line pt-3">
                        {profile.certifications.map((entry) => (
                          <li key={entry.name} className="text-sm text-fg-muted">
                            <span className="font-medium text-fg">{entry.name}</span> — {entry.issuer},{' '}
                            {entry.year}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Panel>
                )}
              </aside>
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------------------ interests -- */}
      <Section tone="light" className="border-y border-line bg-canvas-alt">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Areas of interest"
              title="What I keep coming back to"
              description="Four areas that show up across the work, each with the projects where they appear."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {profile.about.interests.map((interest) => (
                <Panel key={interest.title} className="h-full bg-surface">
                  <h3 className="text-[0.98rem] font-semibold text-fg">{interest.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{interest.body}</p>
                </Panel>
              ))}
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* --------------------------------------------------------- values -- */}
      <Section tone="dark">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Engineering values"
              title="Five rules I try not to break"
              description="These are constraints on how the work is done, not aspirations."
            />
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.about.values.map((value, index) => (
                <li key={value.title}>
                  <Panel className="h-full bg-surface">
                    <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="mt-2 text-[0.98rem] font-semibold text-fg">{value.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{value.body}</p>
                  </Panel>
                </li>
              ))}
            </ol>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ---------------------------------------------- learning + links -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <SectionHeading eyebrow="Learning philosophy" title={profile.about.learning.heading} />
                <div className="prose-study mt-6 container-prose">
                  {profile.about.learning.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div>
                <SectionHeading
                  eyebrow="Selected work"
                  title="Start with these"
                  action={
                    <Link to="/projects" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
                      All {projects.length} projects
                    </Link>
                  }
                />
                <ul className="mt-6 flex flex-col gap-3">
                  {featuredProjects.map((project) => (
                    <li key={project.slug}>
                      <AccentScope accent={project.accent}>
                        <Link
                          to={`/projects/${project.slug}`}
                          className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-[var(--prj-line)]"
                        >
                          <span
                            aria-hidden
                            className="mt-1 size-2.5 shrink-0 rounded-full bg-[var(--prj)]"
                          />
                          <span className="min-w-0">
                            <span className="block text-[0.95rem] font-semibold text-fg group-hover:text-[var(--prj)]">
                              {project.name}
                            </span>
                            <span className="mt-0.5 block text-sm leading-snug text-fg-muted">
                              {project.summary}
                            </span>
                          </span>
                          <Icon
                            name="arrow-up-right"
                            size={16}
                            aria-hidden
                            className="ml-auto mt-1 shrink-0 text-fg-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </Link>
                      </AccentScope>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-14 rounded-xl border border-line bg-surface p-6 text-center sm:p-8">
              <h2 className="text-xl font-semibold text-fg sm:text-2xl">
                Want to know how a specific decision was made?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
                Every case study documents its engineering decisions and trade-offs. If something is unclear or
                you disagree with a choice, that is a conversation worth having.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <LinkButton to="/projects" variant="primary">
                  Read the case studies
                </LinkButton>
                <LinkButton to="/approach" variant="outline">
                  Engineering approach
                </LinkButton>
              </div>
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}
