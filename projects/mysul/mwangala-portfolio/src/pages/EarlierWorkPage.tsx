import { earlierProjects, type EarlierProject } from '@/data/earlierWork';
import { usePageMeta } from '@/lib/seo';
import { Container, Section } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';

function ProseList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-line" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">{label}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function EarlierCaseStudy({ project }: { project: EarlierProject }) {
  return (
    <Panel as="article" id={project.slug} className="scroll-mt-24 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-ink">{project.name}</h3>
          <p className="mt-1 text-sm text-ink-2">{project.tagline}</p>
          <p className="mt-2 text-xs text-ink-3">
            {project.category} · {project.status} · {project.difficulty}
          </p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-ink-3">
          Archived case study from my standalone portfolio. Source repositories were never
          published for this earlier work, so no code link is shown.
        </p>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-2">{project.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.technologies.map((tech) => (
          <Badge key={tech}>{tech}</Badge>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FieldBlock label="Problem">
          <p className="text-sm leading-relaxed text-ink-2">{project.problem}</p>
        </FieldBlock>
        <FieldBlock label="Objective">
          <p className="text-sm leading-relaxed text-ink-2">{project.objective}</p>
        </FieldBlock>
        <FieldBlock label="Solution">
          <p className="text-sm leading-relaxed text-ink-2">{project.solution}</p>
        </FieldBlock>
        <FieldBlock label="Features">
          <ProseList items={project.features} />
        </FieldBlock>
        <FieldBlock label="Architecture">
          <ProseList items={project.architecture} />
        </FieldBlock>
        <FieldBlock label="Tech stack">
          <dl className="flex flex-col gap-2">
            {project.techStack.map((entry) => (
              <div key={entry.name}>
                <dt className="text-sm font-medium text-ink">{entry.name}</dt>
                <dd className="text-sm text-ink-2">{entry.desc}</dd>
              </div>
            ))}
          </dl>
        </FieldBlock>
        <FieldBlock label="Key decisions">
          <ProseList items={project.decisions} />
        </FieldBlock>
        <FieldBlock label="Security notes">
          <ProseList items={project.security} />
        </FieldBlock>
        <FieldBlock label="Testing">
          <ProseList items={project.testing} />
        </FieldBlock>
        <FieldBlock label="Challenges">
          <ProseList items={project.challenges} />
        </FieldBlock>
        <FieldBlock label="Lessons">
          <ProseList items={project.lessons} />
        </FieldBlock>
        <FieldBlock label="Future directions">
          <ProseList items={project.future} />
        </FieldBlock>
      </div>
    </Panel>
  );
}

export function EarlierWorkPage() {
  usePageMeta({
    title: 'Earlier work',
    description:
      'Archived case studies from my standalone Mwangala portfolio: seven earlier full-stack and analytical applications, presented with their original honest framing.',
    path: '/earlier-work',
  });

  return (
    <>
      <PageHeader
        eyebrow="Archive"
        title="Earlier work"
        lead="Before the current project registry I built seven standalone applications — a mini-SIEM, a file-integrity monitor, a dependency auditor, a university management system, a chess analyzer, an electrical-engineering calculator and a log analyzer. Their case studies are preserved here as an archive: the framing and claims are kept exactly as they were written, including the decision to publish no source links until real repositories exist."
      />
      <Section>
        <Container className="flex flex-col gap-8 py-12 sm:py-16">
          <nav aria-label="Earlier projects" className="flex flex-wrap gap-2">
            {earlierProjects.map((project) => (
              <a
                key={project.slug}
                href={`#${project.slug}`}
                className="rounded-full border border-line px-4 py-2 text-sm text-ink-2 transition hover:border-accent-line hover:text-ink"
              >
                {project.name}
              </a>
            ))}
          </nav>

          <SectionHeading
            title="Seven archived case studies"
            description="Each entry keeps the original problem, objective, solution, architecture, decisions, security notes, testing approach, challenges and lessons."
          />

          <div className="flex flex-col gap-6">
            {earlierProjects.map((project) => (
              <EarlierCaseStudy key={project.slug} project={project} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

export default EarlierWorkPage;
