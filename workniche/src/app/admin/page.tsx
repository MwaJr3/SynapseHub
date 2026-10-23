import type { JSX } from 'react';

import { platformAnalytics } from '@/actions/admin';
import { getDb } from '@/lib/db';
import { StatCard, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin overview' };

export default async function AdminOverviewPage(): Promise<JSX.Element> {
  const stats = await platformAnalytics(getDb());
  const totalUsers = Object.values(stats.usersByRole).reduce((a, b) => a + b, 0);
  const totalJobs = Object.values(stats.jobsByStatus).reduce((a, b) => a + b, 0);
  const totalApplications = Object.values(stats.applicationsByStatus).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform overview</h1>
        <p className="mt-1 text-ink-muted">
          Raw counts from the database. No projections, no invented metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={totalUsers} />
        <StatCard label="Jobs" value={totalJobs} />
        <StatCard label="Applications" value={totalApplications} />
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold">Open reports</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.openReports}</p>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Breakdown</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">Users by role</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <Badge key={role}>{role}: {count}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Jobs by status</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(stats.jobsByStatus).map(([status, count]) => (
                <Badge key={status}>{status}: {count}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Applications by status</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(stats.applicationsByStatus).map(([status, count]) => (
                <Badge key={status}>{status}: {count}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Organizations by verification</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(stats.organizationsByVerification).map(([status, count]) => (
                <Badge key={status}>{status}: {count}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
