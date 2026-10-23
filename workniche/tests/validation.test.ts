import { describe, expect, it } from 'vitest';

import {
  jobSchema,
  jobUpdateSchema,
  registerSchema,
  reportSchema,
  jobQuerySchema,
  jobAlertSchema,
  zodFieldErrors,
} from '@/lib/validation';

const baseJob = {
  title: 'Backend Engineer',
  slug: '',
  department: '',
  categoryId: null,
  employmentType: 'FULL_TIME',
  experienceLevel: 'SENIOR',
  workplaceType: 'REMOTE',
  location: 'Remote',
  country: '',
  region: '',
  city: '',
  remoteRegions: [],
  salaryMin: 1000,
  salaryMax: 2000,
  salaryCurrency: 'USD',
  salaryPeriod: 'YEAR',
  benefits: [],
  description: 'This description is comfortably longer than forty characters.',
  responsibilities: '',
  requiredQualifications: '',
  preferredQualifications: '',
  applicationMethod: 'INTERNAL',
  externalApplicationUrl: '',
  applicationDeadline: null,
  skills: ['TypeScript'],
  questions: [],
};

describe('registerSchema', () => {
  it('rejects short passwords and bad emails with field errors', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      email: 'nope',
      password: 'short',
      role: 'JOB_SEEKER',
    });
    expect(result.success).toBe(false);
    const errors = zodFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('jobSchema', () => {
  it('accepts a well-formed job', () => {
    expect(jobSchema.safeParse(baseJob).success).toBe(true);
  });

  it('rejects salary min above max', () => {
    const result = jobSchema.safeParse({ ...baseJob, salaryMin: 5000, salaryMax: 100 });
    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!).salaryMin).toBeTruthy();
  });

  it('requires a destination URL for external applications', () => {
    const result = jobSchema.safeParse({ ...baseJob, applicationMethod: 'EXTERNAL' });
    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!).externalApplicationUrl).toBeTruthy();
  });

  it('rejects a description under 40 characters', () => {
    const result = jobSchema.safeParse({ ...baseJob, description: 'too short' });
    expect(result.success).toBe(false);
  });

  it('update schema accepts partial payloads', () => {
    expect(jobUpdateSchema.safeParse({ title: 'New title' }).success).toBe(true);
  });

  it('update schema still enforces invariants', () => {
    const result = jobUpdateSchema.safeParse({
      salaryMin: 10,
      salaryMax: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe('reportSchema', () => {
  it('requires something to report', () => {
    const result = reportSchema.safeParse({ reason: 'SPAM', details: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a job report', () => {
    expect(
      reportSchema.safeParse({ reason: 'SPAM', details: 'x', jobId: 'j1', organizationId: null })
        .success,
    ).toBe(true);
  });
});

describe('jobQuerySchema', () => {
  it('defaults empty input to recent page 1', () => {
    const parsed = jobQuerySchema.parse({});
    expect(parsed.sort).toBe('recent');
    expect(parsed.page).toBe(1);
  });

  it('coerces numeric params and rejects invalid enums', () => {
    const parsed = jobQuerySchema.parse({ salaryMin: '50000', page: '2' });
    expect(parsed.salaryMin).toBe(50000);
    expect(parsed.page).toBe(2);
    expect(jobQuerySchema.safeParse({ sort: 'bogus' }).success).toBe(false);
  });
});

describe('jobAlertSchema', () => {
  it('round-trips a preference set', () => {
    const parsed = jobAlertSchema.parse({
      keywords: 'backend',
      remoteOnly: true,
    });
    expect(parsed.keywords).toBe('backend');
    expect(parsed.remoteOnly).toBe(true);
    expect(parsed.employmentTypes).toEqual([]);
  });
});
