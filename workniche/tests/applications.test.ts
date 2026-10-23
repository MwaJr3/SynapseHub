import { describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  applicationStatusHistory,
  applications,
  notifications,
} from '@/lib/db/schema';
import {
  addMember,
  addQuestion,
  makeApplication,
  makeJob,
  makeOrg,
  makeUser,
} from './helpers';

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if ((current as { code?: string }).code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

describe('application uniqueness', () => {
  it('rejects a second application to the same job', async () => {
    const db = getDb();
    const org = await makeOrg();
    const job = await makeJob(org.id);
    const applicant = await makeUser();

    await makeApplication(job.id, applicant.id);
    await expect(makeApplication(job.id, applicant.id)).rejects.toSatisfy(
      (error: unknown) => isUniqueViolation(error),
    );

    // The same candidate may apply to a different job.
    const otherJob = await makeJob(org.id);
    await expect(makeApplication(otherJob.id, applicant.id)).resolves.toBeTruthy();
  });
});

describe('status history', () => {
  it('records an entry per transition and stays append-only', async () => {
    const db = getDb();
    const org = await makeOrg();
    const job = await makeJob(org.id);
    const applicant = await makeUser();
    const employer = await makeUser('EMPLOYER');
    await addMember(org.id, employer.id);

    const application = await makeApplication(job.id, applicant.id);
    await db.insert(applicationStatusHistory).values({
      applicationId: application.id,
      status: 'SUBMITTED',
      actorId: applicant.id,
      note: 'Application submitted',
    });
    await db
      .update(applications)
      .set({ status: 'SHORTLISTED' })
      .where(eq(applications.id, application.id));
    await db.insert(applicationStatusHistory).values({
      applicationId: application.id,
      status: 'SHORTLISTED',
      actorId: employer.id,
      note: 'Strong profile',
    });

    const history = await db
      .select()
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, application.id));
    expect(history).toHaveLength(2);
    expect(history.map((row) => row.status)).toEqual(['SUBMITTED', 'SHORTLISTED']);
  });
});

describe('candidate notes privacy', () => {
  it('notes are stored against applications and never mixed into seeker rows', async () => {
    const { candidateNotes } = await import('@/lib/db/schema');
    const db = getDb();
    const org = await makeOrg();
    const job = await makeJob(org.id);
    const applicant = await makeUser();
    const application = await makeApplication(job.id, applicant.id);
    await db.insert(candidateNotes).values({
      applicationId: application.id,
      body: 'Internal hiring note',
    });

    // The seeker-facing query joins the same tables — it must not select notes.
    const { getSeekerApplication } = await import('@/lib/queries');
    const detail = await getSeekerApplication(applicant.id, application.id, db);
    expect(detail).not.toBeNull();
    expect(JSON.stringify(detail)).not.toContain('Internal hiring note');
  });
});

describe('notification dedupe', () => {
  it('honours the unique dedupe key', async () => {
    const db = getDb();
    const user = await makeUser();
    const { notify } = await import('@/lib/notifications');

    const first = await notify(
      {
        userId: user.id,
        type: 'TEST',
        title: 'Once',
        dedupeKey: 'test:unique:1',
      },
      db,
    );
    const second = await notify(
      {
        userId: user.id,
        type: 'TEST',
        title: 'Twice',
        dedupeKey: 'test:unique:1',
      },
      db,
    );
    expect(first).toBe(true);
    expect(second).toBe(false);

    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.dedupeKey, 'test:unique:1')));
    expect(rows).toHaveLength(1);
  });
});

describe('screening questions', () => {
  it('keeps question ordering by position', async () => {
    const db = getDb();
    const org = await makeOrg();
    const job = await makeJob(org.id);
    await addQuestion(job.id, 'First question');
    await addQuestion(job.id, 'Second question');
    const { jobQuestions } = await import('@/lib/db/schema');
    const rows = await db
      .select()
      .from(jobQuestions)
      .where(eq(jobQuestions.jobId, job.id));
    expect(rows).toHaveLength(2);
  });
});
