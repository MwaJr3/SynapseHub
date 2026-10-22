import { describe, expect, it } from 'vitest';

import { describeQuery, searchJobs } from '@/lib/search';
import { jobQuerySchema } from '@/lib/validation';
import { getDb } from '@/lib/db';
import {
  addSkillToJob,
  makeJob,
  makeOrg,
  uniqueSlug,
} from './helpers';

async function makeSearchableJob(
  title: string,
  skill?: string,
  overrides: Parameters<typeof makeJob>[1] = {},
): Promise<{ id: string; slug: string; orgSlug: string }> {
  const org = await makeOrg();
  const job = await makeJob(org.id, { title, ...overrides });
  if (skill) await addSkillToJob(job.id, skill);
  return { id: job.id, slug: job.slug, orgSlug: org.slug };
}

describe('searchJobs', () => {
  it('finds jobs by keyword and by skill', async () => {
    const marker = uniqueSlug('ZebraTerm');
    const job = await makeSearchableJob(
      `ZebraTerm Platform Engineer ${marker}`,
      'Kubernetes',
      { description: 'A role about orchestration and reliability work.' },
    );
    await makeSearchableJob(`Unrelated Accountant ${marker}`);

    const byKeyword = await searchJobs(
      jobQuerySchema.parse({ q: marker, perPage: 50 }),
      getDb(),
    );
    expect(byKeyword.jobs.map((row) => row.id)).toContain(job.id);
    expect(byKeyword.total).toBeGreaterThanOrEqual(1);

    const bySkill = await searchJobs(
      jobQuerySchema.parse({ skill: 'Kubernetes', perPage: 50 }),
      getDb(),
    );
    expect(bySkill.jobs.map((row) => row.id)).toContain(job.id);
    expect(bySkill.jobs.find((row) => row.id === job.id)?.skills).toContain(
      'Kubernetes',
    );
  });

  it('never returns drafts', async () => {
    const org = await makeOrg();
    const draft = await makeJob(org.id, {
      title: `Draft Only Role ${uniqueSlug('d')}`,
      status: 'DRAFT',
      publishedAt: null,
    });
    const result = await searchJobs(
      jobQuerySchema.parse({ q: 'Draft Only Role', perPage: 50 }),
      getDb(),
    );
    expect(result.jobs.map((row) => row.id)).not.toContain(draft.id);
  });

  it('combines filters and reflects them in the explanation', async () => {
    const marker = uniqueSlug('ComboTerm');
    const remote = await makeSearchableJob(`ComboTerm Remote ${marker}`, undefined, {
      workplaceType: 'REMOTE',
      employmentType: 'CONTRACT',
    });
    await makeSearchableJob(`ComboTerm Onsite ${marker}`, undefined, {
      workplaceType: 'ONSITE',
      employmentType: 'FULL_TIME',
    });

    const result = await searchJobs(
      jobQuerySchema.parse({
        q: marker,
        workplaceType: 'REMOTE',
        employmentType: 'CONTRACT',
      }),
      getDb(),
    );
    expect(result.jobs.map((row) => row.id)).toEqual([remote.id]);
    expect(result.explanation).toContain('remote');
    expect(result.explanation).toContain(marker);
  });

  it('shows an empty result set without inventing content', async () => {
    const result = await searchJobs(
      jobQuerySchema.parse({ q: 'NoSuchListingExistsAnywhere9999' }),
      getDb(),
    );
    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it('paginates', async () => {
    const result = await searchJobs(
      jobQuerySchema.parse({ perPage: 1, page: 1 }),
      getDb(),
    );
    expect(result.jobs.length).toBeLessThanOrEqual(1);
    expect(result.perPage).toBe(1);
  });
});

describe('describeQuery', () => {
  it('lists every non-default filter', () => {
    const query = jobQuerySchema.parse({
      q: 'backend',
      skill: 'Go',
      workplaceType: 'REMOTE',
      postedWithinDays: '7',
      sort: 'salary',
    });
    const text = describeQuery(query);
    expect(text).toContain('backend');
    expect(text).toContain('Go');
    expect(text).toContain('remote');
    expect(text).toContain('7 days');
    expect(text).toContain('highest salary first');
  });

  it('describes the unfiltered default plainly', () => {
    expect(describeQuery(jobQuerySchema.parse({}))).toContain('All published jobs');
  });
});
