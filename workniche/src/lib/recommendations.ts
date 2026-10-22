/**
 * Explainable job recommendations. Every score ships with the exact
 * contributions that produced it — matched skills, keyword hits, preference
 * fit — and jobs whose skills all match say so rather than inventing a
 * confidence percentage.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from '@/lib/db';
import { applications, jobAlerts, jobs, organizations, profiles, skills, jobSkills, users } from '@/lib/db/schema';

export interface MatchExplanation {
  jobId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  keywordHits: string[];
  preferenceFit: string[];
  summary: string;
}

export interface RecommendedJob {
  id: string;
  title: string;
  slug: string;
  organizationName: string;
  workplaceType: string;
  employmentType: string;
  location: string;
  publishedAt: Date | null;
  match: MatchExplanation;
}

interface JobRow {
  id: string;
  title: string;
  slug: string;
  organizationName: string;
  workplaceType: string;
  employmentType: string;
  location: string;
  publishedAt: Date | null;
  description: string;
  skills: string[];
  salaryMin: number | null;
}

export function scoreMatch(
  job: {
    title: string;
    description: string;
    skills: string[];
    workplaceType: string;
    employmentType: string;
    salaryMin: number | null;
  },
  seeker: {
    skills: string[];
    technologies: string[];
    keywords: string[];
    preferredEmploymentTypes: string[];
    remotePreference: string;
    salaryExpectationMin: number | null;
  },
): MatchExplanation {
  const wanted = new Set(
    [...seeker.skills, ...seeker.technologies].map((s) => s.toLowerCase()),
  );
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of job.skills) {
    if (wanted.has(skill.toLowerCase())) matchedSkills.push(skill);
    else missingSkills.push(skill);
  }

  const haystack = `${job.title} ${job.description}`.toLowerCase();
  const keywordHits = seeker.keywords.filter((word) =>
    haystack.includes(word.toLowerCase()),
  );

  const preferenceFit: string[] = [];
  if (
    seeker.preferredEmploymentTypes.length > 0 &&
    seeker.preferredEmploymentTypes.includes(job.employmentType)
  ) {
    preferenceFit.push('employment type matches your preference');
  }
  if (seeker.remotePreference === 'REMOTE_ONLY' && job.workplaceType === 'REMOTE') {
    preferenceFit.push('remote role fits your remote-only preference');
  }
  if (
    seeker.salaryExpectationMin != null &&
    job.salaryMin != null &&
    job.salaryMin >= seeker.salaryExpectationMin
  ) {
    preferenceFit.push('salary floor meets your expectation');
  }

  const score =
    matchedSkills.length * 3 + keywordHits.length * 2 + preferenceFit.length * 2;

  const summaryParts: string[] = [];
  if (matchedSkills.length > 0) {
    summaryParts.push(`You match ${matchedSkills.length} of ${job.skills.length} listed skills`);
    if (missingSkills.length === 0 && job.skills.length > 0) {
      summaryParts.push('all listed skills match');
    }
  }
  if (keywordHits.length > 0) summaryParts.push(`mentions ${keywordHits.join(', ')}`);
  if (preferenceFit.length > 0) summaryParts.push(preferenceFit.join('; '));
  const summary =
    summaryParts.length > 0
      ? `${summaryParts.join('; ')}.`
      : 'No skills or keywords overlap yet — shown as a fresh listing.';

  return { jobId: '', score, matchedSkills, missingSkills, keywordHits, preferenceFit, summary };
}

async function loadPublishedJobs(db: Db): Promise<JobRow[]> {
  const result: unknown = await db.execute(sql`
    SELECT j.id, j.title, j.slug, o.name AS organization_name,
      j.workplace_type::text AS workplace_type, j.employment_type::text AS employment_type,
      j.location, j.published_at, j.description, j.salary_min,
      COALESCE(
        (SELECT array_agg(s.name ORDER BY s.name)
         FROM job_skills js JOIN skills s ON s.id = js.skill_id
         WHERE js.job_id = j.id),
        ARRAY[]::text[]
      ) AS skills
    FROM jobs j
    JOIN organizations o ON o.id = j.organization_id
    WHERE j.status = 'PUBLISHED'
    ORDER BY j.published_at DESC NULLS LAST
    LIMIT 200
  `);
  return rowsOf(result).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    organizationName: String(row.organization_name),
    workplaceType: String(row.workplace_type),
    employmentType: String(row.employment_type),
    location: String(row.location ?? ''),
    publishedAt: (row.published_at as Date | null) ?? null,
    description: String(row.description ?? ''),
    skills: (row.skills as string[]) ?? [],
    salaryMin: row.salary_min == null ? null : Number(row.salary_min),
  }));
}

/** Ranked, explained matches for one seeker. Deterministic tie-break: recent first. */
export async function recommendForSeeker(
  userId: string,
  limit = 5,
  db: Db = getDb(),
): Promise<RecommendedJob[]> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const applied = await db
    .select({ jobId: applications.jobId })
    .from(applications)
    .where(eq(applications.applicantId, userId));
  const appliedSet = new Set(applied.map((row) => row.jobId));

  const seeker = {
    skills: ((profile?.skills as string[]) ?? []).concat(
      ((profile?.technologies as string[]) ?? []).slice(0, 10),
    ),
    technologies: (profile?.technologies as string[]) ?? [],
    keywords: ((profile?.headline ?? '') + ' ' + (profile?.bio ?? ''))
      .split(/\s+/)
      .filter((word) => word.length >= 5)
      .slice(0, 12),
    preferredEmploymentTypes: (profile?.preferredEmploymentTypes as string[]) ?? [],
    remotePreference: profile?.remotePreference ?? 'ANY',
    salaryExpectationMin: profile?.salaryExpectationMin ?? null,
  };

  const allJobs = await loadPublishedJobs(db);
  const scored = allJobs
    .filter((job) => !appliedSet.has(job.id))
    .map((job) => {
      const match = scoreMatch(job, seeker);
      return { job, match: { ...match, jobId: job.id } };
    })
    .sort(
      (a, b) =>
        b.match.score - a.match.score ||
        (b.job.publishedAt?.getTime() ?? 0) - (a.job.publishedAt?.getTime() ?? 0),
    )
    .slice(0, limit);

  return scored.map(({ job, match }) => ({
    id: job.id,
    title: job.title,
    slug: job.slug,
    organizationName: job.organizationName,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType,
    location: job.location,
    publishedAt: job.publishedAt,
    match,
  }));
}

export interface AlertDigestItem {
  alertId: string;
  job: JobRow;
}

/**
 * Jobs matching each enabled alert — the input to the notification worker.
 * Pure selection; the worker owns dedupe keys and notifications.
 */
export async function matchAlerts(
  db: Db = getDb(),
): Promise<AlertDigestItem[]> {
  const alerts = await db
    .select()
    .from(jobAlerts)
    .where(eq(jobAlerts.enabled, true));
  const jobsCache = await loadPublishedJobs(db);
  const out: AlertDigestItem[] = [];

  for (const alert of alerts) {
    const keywords = (alert.keywords ?? '')
      .split(',')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);
    const alertSkills = ((alert.skills as string[]) ?? []).map((s) =>
      s.toLowerCase(),
    );
    for (const job of jobsCache) {
      if (alert.remoteOnly && job.workplaceType !== 'REMOTE') continue;
      if (alert.salaryMin != null && job.salaryMin != null && job.salaryMin < alert.salaryMin) {
        continue;
      }
      const types = (alert.employmentTypes as string[]) ?? [];
      if (types.length > 0 && !types.includes(job.employmentType)) continue;
      const haystack = `${job.title} ${job.description}`.toLowerCase();
      const keywordOk =
        keywords.length === 0 || keywords.some((word) => haystack.includes(word));
      const skillOk =
        alertSkills.length === 0 ||
        job.skills.some((skill) => alertSkills.includes(skill.toLowerCase()));
      if (keywordOk && skillOk) {
        out.push({ alertId: alert.id, job });
      }
    }
  }
  return out;
}

/** Simple org-side counts for the employer overview. No fabricated metrics. */
export async function employerOverviewStats(
  organizationId: string,
  db: Db = getDb(),
): Promise<{
  jobsByStatus: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  applicationsLast7Days: number;
}> {
  const jobRows: unknown = await db.execute(sql`
    SELECT status::text AS status, count(*)::int AS n FROM jobs
    WHERE organization_id = ${organizationId} GROUP BY status
  `);
  const appRows: unknown = await db.execute(sql`
    SELECT a.status::text AS status, count(*)::int AS n
    FROM applications a JOIN jobs j ON j.id = a.job_id
    WHERE j.organization_id = ${organizationId} GROUP BY a.status
  `);
  const recentRows: unknown = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM applications a JOIN jobs j ON j.id = a.job_id
    WHERE j.organization_id = ${organizationId}
      AND a.submitted_at >= now() - interval '7 days'
  `);
  const jobsByStatus: Record<string, number> = {};
  for (const row of rowsOf(jobRows)) jobsByStatus[String(row.status)] = Number(row.n);
  const applicationsByStatus: Record<string, number> = {};
  for (const row of rowsOf(appRows)) {
    applicationsByStatus[String(row.status)] = Number(row.n);
  }
  return {
    jobsByStatus,
    applicationsByStatus,
    applicationsLast7Days: Number(rowsOf(recentRows)[0]?.n ?? 0),
  };
}
