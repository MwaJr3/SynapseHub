/**
 * Audit report presenter — findings (with full traceability), passing checks
 * and the governing pattern map. Shared by the live audit lab and command
 * console so every engine verdict renders identically.
 */
import {
  getPattern,
  getRule,
  type AuditReport,
  type Finding,
} from '@/features/ux-engine';
import { SeverityBadge } from './presenters';
import { cn } from '@/lib/cn';

export function FindingsList({
  report,
  defaultOpen = false,
}: {
  report: AuditReport;
  defaultOpen?: boolean;
}) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="ux-findings">
        <h3 id="ux-findings" className="mb-3 text-sm font-semibold text-ink">
          Findings ({report.findings.length})
        </h3>
        {report.findings.length === 0 ? (
          <p className="rounded-card border border-emerald-500/40 bg-emerald-500/[0.07] p-4 text-sm text-ink-muted">
            No rule violations. Every deterministic check passed against the
            descriptor.
          </p>
        ) : (
          <ol className="space-y-3">
            {report.findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                defaultOpen={defaultOpen}
              />
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="ux-passes">
        <h3 id="ux-passes" className="mb-3 text-sm font-semibold text-ink">
          What works ({report.passes.length})
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {report.passes.map((pass, index) => (
            <li
              key={`${pass.ruleId}-${index}`}
              className="rounded-card border border-line bg-panel p-3 text-xs text-ink-muted"
            >
              <span className="font-mono text-2xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                pass · {pass.ruleId}
              </span>
              <p className="mt-1">{pass.evidence}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ux-pattern-map">
        <h3 id="ux-pattern-map" className="mb-3 text-sm font-semibold text-ink">
          Governing patterns
        </h3>
        <ul className="flex flex-wrap gap-2">
          {report.patternMatches.map((match) => {
            const pattern = getPattern(match.patternId);
            return (
              <li key={match.patternId}>
                <span className="chip" title={match.reasons.join(' · ')}>
                  {match.patternId} {pattern.title}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function FindingCard({
  finding,
  defaultOpen,
}: {
  finding: Finding;
  defaultOpen: boolean;
}) {
  return (
    <li className="rounded-card border border-line bg-panel">
      <details open={defaultOpen}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <SeverityBadge severity={finding.severity} />
          <span className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
            {finding.ruleId}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium text-ink">
            {finding.title}
          </span>
          <span className="font-mono text-2xs uppercase text-ink-subtle">
            {finding.confidence}
          </span>
        </summary>
        <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
          <div>
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              Evidence
            </p>
            <p className="mt-1 text-ink-muted">{finding.evidence}</p>
          </div>
          <div>
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              Impacted users
            </p>
            <p className="mt-1 text-ink-muted">{finding.impactedUsers}</p>
          </div>
          <div>
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              Remediation
            </p>
            <p className="mt-1 text-ink-muted">{finding.remediation}</p>
          </div>
          <div>
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              Verification
            </p>
            <p className="mt-1 text-ink-muted">{finding.verification}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              Traceability
            </span>
            {finding.patternIds.map((id) => (
              <PatternChip key={id} id={id} />
            ))}
          </div>
          <p className={cn('font-mono text-2xs text-ink-subtle')}>
            {getRule(finding.ruleId).family} family · priority:{' '}
            {finding.priority}
            {finding.location ? ` · ${finding.location}` : ''}
          </p>
        </div>
      </details>
    </li>
  );
}

function PatternChip({ id }: { id: string }) {
  const pattern = getPattern(id);
  return (
    <span className="chip" title={pattern.summary}>
      {id} · {pattern.title}
    </span>
  );
}
