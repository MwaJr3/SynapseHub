import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { EngineStudio } from '@/components/ux-engine/EngineStudio';
import { PATTERNS, RULES } from '@/features/ux-engine';

export default function UXEnginePage() {
  usePageMeta({
    title: 'UX engine — pattern-driven design intelligence',
    description:
      'An advanced UX/UI reasoning engine: 76 encoded patterns, deterministic constraint checks, state-machine models, a primitive-to-component token graph, evidence-based audits and framework adapters — every recommendation traceable to a rule and a pattern.',
    path: '/ux-engine',
  });

  return (
    <>
      <PageHeader
        eyebrow="Advanced UX/UI engine"
        title="A senior product designer, auditor and design-systems architect in one engine"
        summary={
          <>
            The engine encodes the 76-pattern catalog as executable knowledge:
            structured patterns and rules, WCAG contrast math, a fourteen-state
            component matrix, a primitive → semantic → component token graph and
            an evidence-based auditor. It takes an unfamiliar screen and
            produces intent, hierarchy, state coverage, accessibility,
            responsive behavior, microcopy, token mapping, implementation specs
            and testable acceptance criteria — with every verdict traced to a
            rule and the pattern behind it.
          </>
        }
      />

      <Callout title="How to read this page" variant="setup">
        <p className="text-sm leading-relaxed">
          Everything runs locally and deterministically in the browser — the
          same input always produces the same verdict. The studio has five
          workspaces: a live audit lab, the {PATTERNS.length}-pattern library,
          the state-machine studio, the design system studio and the
          slash-command console. {RULES.length} executable rules sit behind
          every finding, each one citing its originating patterns.
        </p>
      </Callout>

      <Section
        tone="quiet"
        eyebrow="01 — Engine studio"
        title="Inspect, reason and specify"
        description="Configure a component, browse the pattern knowledge layer, model states, generate tokens or run the blueprint's slash commands."
        headingLevel={2}
      >
        <EngineStudio />
      </Section>

      <Section
        tone="contrast"
        motif
        eyebrow="02 — Operating principle"
        title="Never ask only whether the UI looks good"
        description="The final operating principle from the blueprint, encoded as the engine's audit contract."
        headingLevel={2}
      >
        <ol className="grid gap-3 md:grid-cols-2">
          {[
            'What is the user trying to do?',
            'What can happen — every state and transition?',
            'What does the interface communicate at every moment?',
            'What happens when it fails, and is recovery obvious?',
            'Can every person operate it, with any input device?',
            'Does it stay coherent across viewports and pointers?',
            'Is state truthful, and are actions recoverable?',
            'Is every decision traceable to a reusable system rule?',
          ].map((question, index) => (
            <li
              key={question}
              className="flex gap-3 rounded-card border border-line bg-panel p-4 text-sm text-ink-muted"
            >
              <span className="font-mono text-2xs uppercase tracking-wider text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{question}</span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
