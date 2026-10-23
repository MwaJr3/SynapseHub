import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { jobAlerts } from '@/lib/db/schema';
import { AlertForm, AlertRow } from '@/components/alert-actions';
import { Badge, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job alerts' };

export default async function AlertsPage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const db = getDb();
  const alerts = await db
    .select()
    .from(jobAlerts)
    .where(eq(jobAlerts.userId, actor.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job alerts</h1>
        <p className="mt-1 text-ink-muted">
          The notification worker matches alerts against newly published roles and
          writes one notification per (alert, job) pair — repeating the worker
          never duplicates them.
        </p>
      </div>

      <AlertForm />

      {alerts.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          body="Create an alert above and matching roles will arrive in your notifications."
        />
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="card flex flex-wrap items-center gap-3">
              <div>
                <p className="font-medium">
                  {alert.keywords || 'All roles'}
                  {alert.location ? ` · ${alert.location}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge tone={alert.enabled ? 'ok' : 'neutral'}>
                    {alert.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  {alert.remoteOnly ? <Badge>Remote only</Badge> : null}
                  {alert.salaryMin != null ? <Badge>Salary ≥ {alert.salaryMin}</Badge> : null}
                </div>
              </div>
              <span className="ml-auto">
                <AlertRow alertId={alert.id} enabled={alert.enabled} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
