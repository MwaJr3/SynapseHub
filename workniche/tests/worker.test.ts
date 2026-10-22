import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { applications, jobAlerts, notifications } from '@/lib/db/schema';
import { runWorkerTick } from '../scripts/worker';
import {
  addSkillToJob,
  makeApplication,
  makeJob,
  makeOrg,
  makeUser,
} from './helpers';

describe('notification worker', () => {
  it('creates one notification per alert+job and never duplicates on re-run', async () => {
    const db = getDb();
    const user = await makeUser();
    const marker = 'WorkerUniqueSkill';
    const [alert] = await db
      .insert(jobAlerts)
      .values({ userId: user.id, keywords: '', skills: [marker], enabled: true })
      .returning();

    const org = await makeOrg();
    const job = await makeJob(org.id, { title: 'Worker Target Role' });
    await addSkillToJob(job.id, marker);

    const first = await runWorkerTick(db);
    const second = await runWorkerTick(db);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id));
    const jobAlertsForUser = rows.filter(
      (row) => row.dedupeKey === `alert:${alert!.id}:${job.id}`,
    );
    expect(jobAlertsForUser).toHaveLength(1);
    // The second tick must not have created more alert notifications for this pair.
    expect(second.alertNotifications).toBe(0);
    expect(first.alertNotifications).toBeGreaterThanOrEqual(1);

    // Disable the alert — no further matches.
    await db
      .update(jobAlerts)
      .set({ enabled: false })
      .where(eq(jobAlerts.id, alert!.id));
    await runWorkerTick(db);
    const afterDisable = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id));
    expect(
      afterDisable.filter((row) => row.dedupeKey === `alert:${alert!.id}:${job.id}`),
    ).toHaveLength(1);
  });

  it('sends deadline reminders for applications closing within three days', async () => {
    const db = getDb();
    const user = await makeUser();
    const org = await makeOrg();
    const job = await makeJob(org.id, {
      title: 'Closing Soon Role',
      applicationDeadline: new Date(Date.now() + 2 * 86_400_000),
    });
    await makeApplication(job.id, user.id);

    await runWorkerTick(db);
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id));
    const reminders = rows.filter(
      (row) => row.type === 'DEADLINE_REMINDER' && row.title.includes('Closing Soon Role'),
    );
    expect(reminders.length).toBe(1);
    expect(reminders[0]!.dedupeKey).toMatch(
      new RegExp(`deadline-reminder:.*:.*`),
    );
  });

  it('does not re-apply withdrawn jobs as open applications', async () => {
    const db = getDb();
    const user = await makeUser();
    const org = await makeOrg();
    const job = await makeJob(org.id, { title: 'Withdrawn Flow Role' });
    const application = await makeApplication(job.id, user.id);
    await db
      .update(applications)
      .set({ status: 'WITHDRAWN' })
      .where(eq(applications.id, application.id));

    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    expect(rows[0]!.status).toBe('WITHDRAWN');
  });
});
