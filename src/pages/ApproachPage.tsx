import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { principles } from '@/data/focus-areas';
import { approachStages } from '@/data/approach';

export default function ApproachPage() {
  usePageMeta({
    title: 'Approach — the five-stage engineering method',
    description:
      'Understand, Design, Build, Test, Improve: the framework used across the portfolio, including how failure states, provider boundaries, permissions and limitations are handled.',
    path: '/approach',
  });

  return (
    <>
      <PageHeader
        eyebrow="Approach"
        title="Understand → Design → Build → Test → Improve"
        summary={
          <>
            This is the framework the portfolio is organised around. It is a way
            of keeping the work honest — design the failure states, test the
            risky behaviours, and write down what is not finished.
          </>
        }
      />

      <Section
        id="stages"
        tone="surface"
        eyebrow="01 — The five stages"
        title="What each stage means in practice"
      >
        <ol className="grid gap-6">
          {approachStages.map((stage, index) => (
            <li key={stage.id} className="card p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr_1fr]">
                <div>
                  <p className="mono-meta">
                    Stage {String(index + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                    {stage.title}
                  </h2>
                  <p className="prose-body mt-3 text-sm">{stage.summary}</p>
                </div>

                <div>
                  <p className="eyebrow mb-2">Practices</p>
                  <ul className="grid gap-2">
                    {stage.practices.map((practice) => (
                      <li
                        key={practice}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        />
                        {practice}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="eyebrow mb-2">Artefacts</p>
                  <ul className="grid gap-2">
                    {stage.artefacts.map((artefact) => (
                      <li
                        key={artefact}
                        className="rounded-card border border-line bg-panel-strong p-3 text-sm text-ink-muted"
                      >
                        {artefact}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <Callout
          title="Framework, not a historical claim"
          variant="note"
          className="mt-8"
        >
          This is the method used to organise and review the portfolio. It is
          not a claim that every project followed the same sequence on a
          documented timeline.
        </Callout>
      </Section>

      <Section
        id="principles"
        tone="quiet"
        eyebrow="02 — Responsible engineering"
        title="The principles each stage is measured against"
        description="These describe how the software is built; they are not claims of regulatory compliance, certification or measured learning impact."
      >
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {principles.map((principle, index) => (
            <li key={principle.id} className="card p-5">
              <p className="mono-meta">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-sm font-semibold text-ink">
                {principle.title}
              </h3>
              <p className="prose-body mt-2 text-sm">{principle.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="where-it-shows"
        tone="contrast"
        eyebrow="03 — Where it shows up"
        title="The method is visible in the details"
        description="Every case study ends with the tests that cover risky behaviour and the limits that remain."
        motif
      >
        <div className="flex flex-wrap gap-3">
          <Button to="/projects" variant="primary">
            Read a case study
          </Button>
          <Button to="/skills" variant="secondary">
            Skills and evidence
          </Button>
        </div>
      </Section>
    </>
  );
}
