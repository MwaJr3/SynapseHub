/**
 * Notification worker tick: match enabled alerts to new published jobs and
 * send application-deadline reminders. Idempotent by construction — every
 * notification carries a dedupe key the worker can safely re-run with.
 */
import { eq, sql } from 'drizzle-orm';

import { getDb, type Db } from '../src/lib/db';
import { jobAlerts } from '../src/lib/db/schema';
import { notify } from '../src/lib/notifications';
import { matchAlerts } from '../src/lib/recommendations';

export async function runWorkerTick(db: Db = getDb()): Promise<{
  alertNotifications: number;
  deadlineReminders: number;
}> {
  let alertNotifications = 0;
  let deadlineReminders = 0;

  for (const { alertId, job } of await matchAlerts(db)) {
    const [alert] = await db
      .select()
      .from(jobAlerts)
      .where(eq(jobAlerts.id, alertId))
      .limit(1);
    if (!alert) continue;
    const created = await notify(
      {
        userId: alert.userId,
        type: 'JOB_ALERT',
        title: `New match: ${job.title}`,
        body: `${job.organizationName} — ${job.skills.slice(0, 4).join(', ')}`,
        link: `/jobs/${job.slug}`,
        dedupeKey: `alert:${alertId}:${job.id}`,
      },
      db,
    );
    if (created) alertNotifications += 1;
  }

  // Deadline reminders: 3 days before the application deadline.
  const result: unknown = await db.execute(sql`
    SELECT a.id AS application_id, a.applicant_id, j.title, j.slug, j.application_deadline
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE j.application_deadline IS NOT NULL
      AND j.application_deadline > now()
      AND j.application_deadline - interval '3 days' <= now()
      AND a.status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED')
  `);
  const rows = Array.isArray(result)
    ? (result as Array<Record<string, unknown>>)
    : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? []);
  const day = new Date().toISOString().slice(0, 10);
  for (const row of rows) {
    const created = await notify(
      {
        userId: String(row.applicant_id),
        type: 'DEADLINE_REMINDER',
        title: `Deadline approaching: ${String(row.title)}`,
        body: 'This role closes its application window within three days.',
        link: `/jobs/${String(row.slug)}`,
        dedupeKey: `deadline-reminder:${String(row.application_id)}:${day}`,
      },
      db,
    );
    if (created) deadlineReminders += 1;
  }

  return { alertNotifications, deadlineReminders };
}
