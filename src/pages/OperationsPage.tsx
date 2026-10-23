import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Callout } from '@/components/ui/Callout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { OpsConsole, OpsIntegritySummary } from '@/components/operations/OpsConsole';

export default function OperationsPage() {
  usePageMeta({
    title: 'Operations — how these systems stay honest',
    description:
      'An operations layer of seven modules — service status, changelog, learning analytics, access queue, funding reconciliation, provider health and performance budgets — each with explicit states, metric definitions and an integrity rule.',
    path: '/operations',
  });

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Dashboards that refuse to flatter"
        summary={
          <>
            Most product dashboards exist to look healthy. This operations
            layer adapts seven common dashboard concepts for
            education-technology programmes and strips out every invented
            figure — no uptime percentages, no revenue, no churn, no waitlist
            or user counts. What remains is what operations reporting should
            have been: explicit states, defined metrics and integrity rules
            that tests enforce.
          </>
        }
      />

      <Callout title="What this page is" variant="caution">
        <p className="text-sm leading-relaxed">
          This is a specification, not a live dashboard. The portfolio has no
          measurement backend, so the console shows states, definitions and
          rules — never fabricated values. Where the source concepts display
          demonstration numbers, the integrity rules here require real records,
          named measurement runs and published probe definitions before any
          figure may appear.
        </p>
      </Callout>

      <OpsConsole />

      <Section
        id="integrity"
        tone="contrast"
        motif
        eyebrow="03 — Integrity rules"
        title="Seven rules, one commitment"
        description="Each module carries its own rule; together they state the promise: operations reporting is only allowed to show what it can prove."
        headingLevel={2}
      >
        <OpsIntegritySummary />
      </Section>
    </>
  );
}
