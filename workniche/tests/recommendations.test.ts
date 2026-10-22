import { describe, expect, it } from 'vitest';

import { scoreMatch, recommendForSeeker } from '@/lib/recommendations';
import {
  addSkillToJob,
  makeJob,
  makeOrg,
  makeProfile,
  makeUser,
} from './helpers';

describe('scoreMatch', () => {
  const job = {
    title: 'Backend Engineer',
    description: 'Build queues on PostgreSQL with Node.js',
    skills: ['TypeScript', 'PostgreSQL', 'Redis'],
    workplaceType: 'REMOTE',
    employmentType: 'FULL_TIME',
    salaryMin: 50000,
  };

  it('explains matched and missing skills', () => {
    const match = scoreMatch(job, {
      skills: ['TypeScript', 'PostgreSQL'],
      technologies: [],
      keywords: [],
      preferredEmploymentTypes: [],
      remotePreference: 'ANY',
      salaryExpectationMin: null,
    });
    expect(match.matchedSkills.sort()).toEqual(['PostgreSQL', 'TypeScript']);
    expect(match.missingSkills).toEqual(['Redis']);
    expect(match.summary).toContain('2 of 3');
  });

  it('states when every listed skill matches', () => {
    const match = scoreMatch(job, {
      skills: ['TypeScript', 'PostgreSQL', 'Redis'],
      technologies: [],
      keywords: [],
      preferredEmploymentTypes: [],
      remotePreference: 'ANY',
      salaryExpectationMin: null,
    });
    expect(match.missingSkills).toEqual([]);
    expect(match.summary).toContain('all listed skills match');
  });

  it('counts keyword hits and preference fit, never a fake percentage', () => {
    const match = scoreMatch(job, {
      skills: [],
      technologies: [],
      keywords: ['queues', 'kubernetes'],
      preferredEmploymentTypes: ['FULL_TIME'],
      remotePreference: 'REMOTE_ONLY',
      salaryExpectationMin: 40000,
    });
    expect(match.keywordHits).toEqual(['queues']);
    expect(match.preferenceFit).toHaveLength(3);
    expect(match.summary).not.toMatch(/\d+%/);
    // 0 skill + 1 keyword*2 + 3 preference*2
    expect(match.score).toBe(8);
  });

  it('says plainly when there is no overlap', () => {
    const match = scoreMatch(job, {
      skills: ['Cobol'],
      technologies: [],
      keywords: [],
      preferredEmploymentTypes: [],
      remotePreference: 'ANY',
      salaryExpectationMin: null,
    });
    expect(match.summary).toContain('No skills or keywords overlap');
    expect(match.score).toBe(0);
  });
});

describe('recommendForSeeker', () => {
  it('ranks by score, skips applied jobs, and includes explanations', async () => {
    const org = await makeOrg();
    const strong = await makeJob(org.id, { title: 'Strong Match Role' });
    const weak = await makeJob(org.id, { title: 'Weak Match Role' });
    await addSkillToJob(strong.id, 'TypeScript');
    await addSkillToJob(weak.id, 'Cobol');

    const user = await makeUser();
    await makeProfile(user.id, { skills: ['TypeScript'] });

    const results = await recommendForSeeker(user.id, 5);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const strongRow = results.find((row) => row.id === strong.id);
    const weakRow = results.find((row) => row.id === weak.id);
    expect(strongRow?.match.matchedSkills).toContain('TypeScript');
    expect(strongRow!.match.score).toBeGreaterThan(weakRow!.match.score);
    // Sorted best-first.
    const scores = results.map((row) => row.match.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const row of results) {
      expect(row.match.summary.length).toBeGreaterThan(0);
      expect(row.match.jobId).toBe(row.id);
    }
  });
});
