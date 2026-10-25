import { usePageMeta } from '@/lib/seo';
import { PORTFOLIO_BASE, companyName, siteUrl, absoluteUrl } from '@/config/site';
import { contactEmails } from '@/config/profile';
import { projects } from '@/data/projects';
import { Container, Section } from '@/components/ui/Layout';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Icon } from '@/components/ui/Icon';

/**
 * The company landing page.
 *
 * Everything here is a statement about work that actually exists in this
 * repository. There are no invented client names, headcounts, certifications or
 * year counts — the honest source of depth is the portfolio behind the link.
 */
const capabilities = [
  {
    icon: 'shield' as const,
    title: 'Defensive security engineering',
    body: 'Analysis tooling that explains itself: phishing and URL review, packet-capture inspection, threat-intelligence handling, incident workflow and exposure monitoring. Every result is framed as evidence to investigate, never as proof.',
  },
  {
    icon: 'layers' as const,
    title: 'Full-stack product engineering',
    body: 'React and TypeScript interfaces over typed FastAPI services, with SQLAlchemy models, Alembic migrations, role-based access control and tests on both sides. Documented trade-offs instead of unmeasured claims.',
  },
  {
    icon: 'code' as const,
    title: 'Developer tooling and automation',
    body: 'Static-analysis orchestration, dependency auditing, integrity monitoring and command-line utilities — built to be readable, testable and honest about their limits.',
  },
];

const principles = [
  'Never claim more than the evidence supports — no "proof of safety", no unverified benchmarks.',
  'Simulated and demonstration data is labelled as such, everywhere it appears.',
  'Access control and validation are enforced on the server, not hidden behind a disabled button.',
  'Failure states are designed: loading, empty, error and success are all real states, not afterthoughts.',
];

export function CompanyHomePage() {
  usePageMeta({
    title: `${companyName} — defensive security and full-stack software`,
    description:
      `${companyName} builds defensive-security analysis tools and full-stack applications. The engineering behind each product is documented in the portfolio, with its trade-offs and limitations stated plainly.`,
    path: '/',
  });

  const featured = projects.slice(0, 3);

  return (
    <>
      <Section tone="dark" className="border-b border-line">
        <Container className="py-16 sm:py-20 lg:py-24">
          <p className="eyebrow flex items-center gap-2">
            <span aria-hidden className="h-px w-8 bg-accent-line" />
            Software engineering practice
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
            Defensive security tools and full-stack products, built to explain themselves.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            SynapseHub builds software where the reasoning matters as much as the result: security
            analysis that shows the evidence behind a finding, and applications that state their
            limitations instead of hiding them.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton to={PORTFOLIO_BASE} size="lg">
              View the portfolio
              <Icon name="arrow-right" className="ml-2 h-4 w-4" />
            </LinkButton>
            <LinkButton to={PORTFOLIO_BASE + '/projects'} variant="secondary" size="lg">
              Browse the case studies
            </LinkButton>
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-fg-subtle">
            The portfolio is the detailed record: nine case studies covering the problem, the design,
            the decisions and what each project still cannot do.
          </p>
        </Container>
      </Section>

      <Section>
        <Container className="py-14 sm:py-16">
          <SectionHeading
            eyebrow="What we build"
            title="Three kinds of work, one standard of evidence"
            description="Each area below maps to shipped, tested code in the portfolio — not to a service menu."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {capabilities.map((item) => (
              <Panel key={item.title} as="article" className="p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-fg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-line bg-surface-sunken">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Selected work"
              title="Start with the case studies"
              description="Full write-ups live in the portfolio: the problem, the architecture, the decisions and the gaps."
            />
            <LinkButton to={PORTFOLIO_BASE + '/projects'} variant="secondary">
              All nine projects
            </LinkButton>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {featured.map((project) => (
              <Panel key={project.slug} as="article" className="flex flex-col p-6">
                <Badge tone="project">{project.categories[0]}</Badge>
                <h3 className="mt-3 text-base font-semibold text-fg">{project.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{project.tagline}</p>
                <LinkButton
                  to={`${PORTFOLIO_BASE}/projects/${project.slug}`}
                  variant="ghost"
                  className="mt-4 self-start"
                >
                  Read the case study
                  <Icon name="arrow-right" className="ml-2 h-4 w-4" />
                </LinkButton>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading eyebrow="How we work" title="Claims you can check" />
              <ul className="mt-6 flex flex-col gap-3">
                {principles.map((principle) => (
                  <li key={principle} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Panel className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-fg">Work with us</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Describe the problem and what a good outcome looks like. Enquiries reach both
                monitored inboxes below through the contact form.
              </p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {contactEmails.map((email) => (
                  <li key={email} className="font-mono text-sm text-fg-muted">
                    {email}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton to={PORTFOLIO_BASE + '/contact'}>Open the contact form</LinkButton>
                <LinkButton to={PORTFOLIO_BASE + '/about'} variant="secondary">
                  About the engineer
                </LinkButton>
              </div>
            </Panel>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line">
        <Container className="py-10">
          <p className="text-xs leading-relaxed text-fg-subtle">
            {companyName} — this site is the entry point; the portfolio at{' '}
            <code className="font-mono">{PORTFOLIO_BASE}</code> holds the detailed engineering
            record.{' '}
            {siteUrl ? (
              <>
                Canonical address: <code className="font-mono">{absoluteUrl('/')}</code>.
              </>
            ) : (
              'No production domain is configured yet, so no canonical URL is emitted.'
            )}
          </p>
        </Container>
      </Section>
    </>
  );
}

export default CompanyHomePage;
