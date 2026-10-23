import type { OperationsModule } from '@/types';
import { operationsModules, operationsProvenance } from '@/data/operations';
import { Callout } from '@/components/ui/Callout';
import { Section } from '@/components/ui/Section';
import { cn } from '@/lib/cn';

function StateList({ states }: { states: OperationsModule['states'] }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {states.map((state) => (
        <li key={state.id} className="rounded-lg border border-line bg-panel p-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-accent"
            />
            <h4 className="text-sm font-semibold text-ink">{state.label}</h4>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {state.meaning}
          </p>
        </li>
      ))}
    </ul>
  );
}

function MetricList({ metrics }: { metrics: OperationsModule['metrics'] }) {
  return (
    <dl className="mt-4 divide-y divide-line">
      {metrics.map((metric) => (
        <div key={metric.id} className="py-3 first:pt-0 last:pb-0">
          <dt className="text-sm font-semibold text-ink">{metric.name}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-muted">
            {metric.definition}
          </dd>
          <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            <span className="mono-meta">Unit · {metric.unit}</span>
            <span className="mono-meta">Source · {metric.source}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ModuleCard({ module }: { module: OperationsModule }) {
  return (
    <article
      id={`ops-${module.id}`}
      className="card scroll-mt-24 p-5 sm:p-6"
      aria-labelledby={`ops-${module.id}-title`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="mono-meta">
          Module {String(module.order).padStart(2, '0')} / 07
        </span>
        <h3
          id={`ops-${module.id}-title`}
          className="text-lg font-semibold tracking-tight text-ink sm:text-xl"
        >
          {module.title}
        </h3>
      </div>

      <p className="prose-body mt-3 max-w-prose">
        <strong className="font-semibold text-ink">What it does:</strong>{' '}
        {module.purpose}
      </p>

      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
        {module.context}
      </p>

      <p className="mt-2">
        <span className="mono-meta">Adapted from · {module.adaptedFrom}</span>
      </p>

      <h4 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Explicit states
      </h4>
      <StateList states={module.states} />

      <h4 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Metric definitions (no values invented)
      </h4>
      <MetricList metrics={module.metrics} />

      <Callout
        title="Integrity rule"
        variant="note"
        className="mt-6"
        as="div"
      >
        <p className="text-sm leading-relaxed">{module.integrityRule}</p>
      </Callout>
    </article>
  );
}

/**
 * The operations console: seven modules, each rendered as its specification —
 * states, metric definitions and the integrity rule that keeps it honest.
 * Deliberately free of numeric dashboards: this site has no measurement
 * backend, so it ships definitions instead of pretending to ship data.
 */
export function OpsConsole() {
  return (
    <>
      <Section
        id="modules"
        tone="surface"
        eyebrow="01 — Modules"
        title="Seven modules, adapted openly"
        description="Each module below names the dashboard concept it adapts, then replaces the concept’s demonstration figures with explicit states, metric definitions and one integrity rule."
        headingLevel={2}
      >
        <nav aria-label="Operations modules" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            {operationsModules.map((module) => (
              <li key={module.id}>
                <a
                  href={`#ops-${module.id}`}
                  className="inline-flex rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
                >
                  {String(module.order).padStart(2, '0')} · {module.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-6">
          {operationsModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </Section>

      <Section
        id="provenance"
        tone="quiet"
        eyebrow="02 — Provenance"
        title="Where these ideas come from"
        description="Borrowed ideas are named, not disguised."
        headingLevel={2}
      >
        <div className="card p-5 sm:p-6">
          <p className="prose-body max-w-prose">{operationsProvenance.source}</p>
          <p className="prose-body mt-3 max-w-prose">
            {operationsProvenance.adaptation}
          </p>
        </div>
      </Section>
    </>
  );
}

/** Compact integrity-rule summary used by the operations page header. */
export function OpsIntegritySummary() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {operationsModules.map((module) => (
        <li
          key={module.id}
          className={cn(
            'rounded-lg border border-line bg-panel p-3 text-sm leading-relaxed text-ink-muted',
          )}
        >
          <span className="font-semibold text-ink">
            {String(module.order).padStart(2, '0')} · {module.title}
          </span>
          <br />
          {module.integrityRule}
        </li>
      ))}
    </ul>
  );
}
