import { Badge, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { configReport, type CheckState } from '@/lib/config-check';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<CheckState, string> = {
  ready: 'Configured',
  missing: 'Missing',
  optional: 'Optional',
};

/**
 * The same report `npm run config:check` prints.
 *
 * It replaces a panel that echoed environment values — including the two contact
 * inboxes — and described requirements that are no longer true. This shows
 * variable *names* only: an operator who can sign in can see what is missing
 * without a page that prints configuration back to whoever holds the session.
 */
export default async function AdminSettingsPage() {
  await requireUser();
  const report = configReport();

  return (
    <div className="space-y-4">
      <Section title="Deployment configuration">
        <p className="text-sm text-muted">
          What this deployment is and is not configured to do. Values are never shown, only variable
          names — the same report is printed by <code>npm run config:check</code>, which exits non-zero
          when something required is absent.
        </p>
        <p className="mt-2 text-sm">
          <Badge tone={report.ready ? 'accent' : 'neutral'}>
            {report.ready
              ? 'All required configuration present'
              : `${report.blockers} required item(s) missing`}
          </Badge>
        </p>
        <div className="mt-3 grid gap-2">
          {report.checks.map((check) => (
            <div key={check.id} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{check.label}</strong>
                <Badge tone={check.state === 'missing' ? 'neutral' : 'accent'}>
                  {STATE_LABEL[check.state]}
                </Badge>
                {check.missing.length > 0 ? (
                  <span className="text-xs text-muted">Set: {check.missing.join(', ')}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">{check.effect}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Before public launch">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Supply legal names and registration details for both companies (currently empty).</li>
          <li>Replace all illustrative visuals with genuine application screenshots.</li>
          <li>Confirm the contact form delivers to each company inbox, not just that keys are present.</li>
          <li>Replace seed/demo people and accounts with real, verified records.</li>
          <li>Have legal review replace the working privacy and terms templates.</li>
          <li>Configure product demo/source URLs only where real deployments exist.</li>
          <li>Run the full test suite and accessibility audit in the deployment environment.</li>
        </ol>
      </Section>
    </div>
  );
}
