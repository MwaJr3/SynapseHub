import { Link } from 'react-router-dom';
import { profile, configuredLinks, hasContactEmail } from '@/config/profile';
import { engineeringProcess, technicalFocus } from '@/config/nav';
import { featuredProjects, projects } from '@/data/projects';
import { usePageMeta } from '@/lib/seo';
import { isUsableLink } from '@/lib/links';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { ProjectCard } from '@/components/project/ProjectCard';
import { HeroDiagram } from '@/components/home/HeroDiagram';

export default function HomePage() {
  usePageMeta({
    title: `${profile.name} — Building Software. Understanding Security. Solving Real Problems.`,
    description: profile.supportingMessage,
    path: '/',
  });

  const github = profile.links.find((link) => link.kind === 'github' && isUsableLink(link.url));

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <Section tone="light" className="overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 surface-grid opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-0 size-[28rem] rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--hero-glow-a), transparent 70%)' }}
        />
        <Container className="relative py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <p className="eyebrow mb-5 flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                {profile.role}
              </p>

              <h1 className="text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">
                Building Software.
                <br />
                Understanding Security.
                <br />
                <span className="text-accent">Solving Real Problems.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-[1.08rem]">
                {profile.supportingMessage}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton to="/projects" variant="primary" size="lg" icon="arrow-right" iconPosition="end">
                  Explore my projects
                </LinkButton>
                <LinkButton to="/contact" variant="outline" size="lg">
                  Get in touch
                </LinkButton>
                {github ? (
                  <LinkButton href={github.url} variant="ghost" size="lg" icon="github">
                    View GitHub
                  </LinkButton>
                ) : null}
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  { term: 'Projects', detail: `${projects.length} case studies` },
                  { term: 'Focus', detail: 'Python · React · FastAPI' },
                  { term: 'Domain', detail: 'Defensive security' },
                ].map((item) => (
                  <div key={item.term}>
                    <dt className="eyebrow">{item.term}</dt>
                    <dd className="mt-1.5 text-sm font-medium text-fg">{item.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroDiagram className="w-full" />
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------- featured projects ---- */}
      <Section tone="dark" className="border-y border-line">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Selected work"
              title="Five projects that show how I work"
              description="Security analysis, network understanding, workflow engineering, developer tooling and applied AI — each one built end to end, with the trade-offs documented."
              action={
                <LinkButton to="/projects" variant="outline" size="sm" icon="arrow-right" iconPosition="end">
                  View all {projects.length} projects
                </LinkButton>
              }
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} variant="compact" />
              ))}
            </div>

            <p className="mt-6 text-sm text-fg-subtle">
              Previews are representative artwork drawn from each project&apos;s documented feature set — not
              screenshots of deployed instances.
            </p>
          </Container>
        </SectionSpacing>
      </Section>

      {/* --------------------------------------------------- introduction -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <SectionHeading
                  eyebrow="Approach"
                  title="Curiosity Is the Starting Point. Building Is How I Learn."
                />
              </div>
              <div className="prose-study container-prose">
                <p>
                  I approach software development by studying how systems work, identifying problems worth
                  solving, and turning what I learn into functioning applications. My projects help me explore
                  programming, application security, defensive cybersecurity, and the engineering decisions
                  behind reliable software.
                </p>
                <p>
                  Reading about a packet header is not the same as writing a parser that survives a truncated
                  capture. Reading about phishing detection is not the same as deciding what to do when a
                  message contains no SPF result at all. The projects in this portfolio exist because those
                  questions needed answers I could not get from documentation alone.
                </p>
                <p>
                  Each case study records the problem, the design, two or three engineering decisions with
                  their trade-offs, how it was tested, and what remains limited. The limitations are written
                  down on purpose — they are usually the most informative part.
                </p>
                <p className="mt-6">
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
                  >
                    More about how I work
                    <Icon name="arrow-right" size={15} aria-hidden />
                  </Link>
                </p>
              </div>
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------------ technical focus -- */}
      <Section tone="light" className="border-y border-line bg-canvas-alt">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Technical focus"
              title="What I spend my time on"
              description="Six areas, each grounded in shipped projects rather than listed as a specialisation."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {technicalFocus.map((area) => (
                <Panel key={area.title} className="card-interactive h-full bg-surface">
                  <Link to={area.to} className="group flex h-full flex-col">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface-sunken text-accent">
                      <FocusIcon title={area.title} />
                    </span>
                    <h3 className="mt-4 text-[0.98rem] font-semibold text-fg group-hover:text-accent">
                      {area.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{area.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors group-hover:text-accent">
                      Related projects
                      <Icon
                        name="arrow-right"
                        size={13}
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </Panel>
              ))}
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------- engineering approach -- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Engineering approach"
              title="Understand → Design → Build → Test → Improve"
              description="The same five stages in every project, whether it is a packet parser or a learning platform."
              action={
                <LinkButton to="/approach" variant="outline" size="sm" icon="arrow-right" iconPosition="end">
                  Full write-up
                </LinkButton>
              }
            />

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {engineeringProcess.map((stage, index) => (
                <li key={stage.stage} className="relative">
                  <Panel className="h-full bg-surface">
                    <span className="font-mono text-[0.7rem] text-accent">0{index + 1}</span>
                    <h3 className="mt-2 text-base font-semibold text-fg">{stage.stage}</h3>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-fg-muted">{stage.body}</p>
                  </Panel>
                </li>
              ))}
            </ol>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------------------ contact CTA */}
      <Section tone="dark" className="border-t border-line">
        <SectionSpacing>
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow mb-4 flex items-center justify-center gap-2">
                <span aria-hidden className="h-px w-8 bg-accent-line" />
                Contact
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                Have a Problem Worth Solving? Let&apos;s Talk.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
                I&apos;m interested in opportunities to build useful software, learn from challenging technical
                problems, and contribute to meaningful projects.
              </p>
              <p className="mt-4 text-sm text-fg-subtle">{profile.availability}</p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <LinkButton to="/contact" variant="primary" size="lg" icon="mail">
                  {hasContactEmail() ? `Email ${profile.email}` : 'Contact details'}
                </LinkButton>
                <LinkButton to="/projects" variant="outline" size="lg">
                  Browse the projects first
                </LinkButton>
              </div>

              {configuredLinks().length > 0 ? (
                <ul className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-fg-subtle">
                  {configuredLinks().map((link) => (
                    <li key={link.kind}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
                      >
                        <Icon name={link.kind === 'github' ? 'github' : 'linkedin'} size={15} aria-hidden />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-fg-subtle">
                  Profile links and a contact address have not been published yet. They are configured in{' '}
                  <code className="font-mono">src/config/profile.ts</code> — nothing here links to a
                  placeholder destination.
                </p>
              )}
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}

function FocusIcon({ title }: { title: string }) {
  const name =
    title.startsWith('Python')
      ? 'terminal'
      : title.startsWith('Full-Stack')
        ? 'layers'
        : title.startsWith('Defensive')
          ? 'shield'
          : title.startsWith('Data')
            ? 'database'
            : title.startsWith('Secure')
              ? 'lock'
              : 'spark';
  return <Icon name={name} size={18} aria-hidden />;
}
