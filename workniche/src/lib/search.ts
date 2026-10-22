/**
 * Job search: filter, sort, paginate, explain. Built on raw parameterized
 * SQL so the same shape runs on PGlite and PostgreSQL, with filters
 * documented in `describeQuery` — every non-default filter appears in the
 * explanation.
 */
import { sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from '@/lib/db';
import type { JobQuery } from '@/lib/validation';

export interface JobCardData {
  id: string;
  title: string;
  slug: string;
  organizationName: string;
  organizationSlug: string;
  organizationVerification: string;
  category: string | null;
  employmentType: string;
  experienceLevel: string;
  workplaceType: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  publishedAt: Date | null;
  applicationDeadline: Date | null;
  skills: string[];
  descriptionExcerpt: string;
  score?: number;
  matchedSkills?: string[];
}

export interface SearchResult {
  jobs: JobCardData[];
  total: number;
  page: number;
  perPage: number;
  explanation: string;
}

function excerpt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 180 ? `${clean.slice(0, 180)}…` : clean;
}

/** Human-readable list of the filters actually applied. */
export function describeQuery(query: JobQuery): string {
  const parts: string[] = [];
  if (query.q) parts.push(`keywords matching “${query.q}”`);
  if (query.category) parts.push(`category “${query.category}”`);
  if (query.employmentType) parts.push(`${query.employmentType.toLowerCase()} roles`);
  if (query.workplaceType) parts.push(`${query.workplaceType.toLowerCase()} workplaces`);
  if (query.experienceLevel) parts.push(`${query.experienceLevel.toLowerCase()} level`);
  if (query.location) parts.push(`location near “${query.location}”`);
  if (query.skill) parts.push(`skill “${query.skill}”`);
  if (query.salaryMin != null) parts.push(`salary at least ${query.salaryMin}`);
  if (query.postedWithinDays != null) {
    parts.push(`posted within ${query.postedWithinDays} days`);
  }
  const sortLabel: Record<string, string> = {
    relevance: 'best match first',
    recent: 'newest first',
    salary: 'highest salary first',
    deadline: 'soonest deadline first',
  };
  const sortText = sortLabel[query.sort] ?? query.sort;
  if (parts.length === 0) return `All published jobs, ${sortText}.`;
  return `Filtered by ${parts.join(', ')}; ${sortText}.`;
}

const SELECT_JOB_CARDS = `
  SELECT j.id, j.title, j.slug, j.employment_type::text AS employment_type,
    j.experience_level::text AS experience_level, j.workplace_type::text AS workplace_type,
    j.location, j.salary_min, j.salary_max, j.salary_currency, j.salary_period::text AS salary_period,
    j.published_at, j.application_deadline, j.description,
    o.name AS organization_name, o.slug AS organization_slug,
    o.verification_status::text AS organization_verification,
    c.name AS category,
    COALESCE(
      (SELECT array_agg(s.name ORDER BY s.name)
       FROM job_skills js JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = j.id),
      ARRAY[]::text[]
    ) AS skills
  FROM jobs j
  JOIN organizations o ON o.id = j.organization_id
  LEFT JOIN job_categories c ON c.id = j.category_id
`;

export function buildJobWhere(query: JobQuery): ReturnType<typeof sql> {
  const conditions = [sql`j.status = 'PUBLISHED'`];
  if (query.q) {
    const like = `%${query.q}%`;
    conditions.push(sql`(
      j.title ILIKE ${like}
      OR j.description ILIKE ${like}
      OR j.responsibilities ILIKE ${like}
      OR o.name ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM job_skills js JOIN skills s ON s.id = js.skill_id
        WHERE js.job_id = j.id AND s.name ILIKE ${like}
      )
    )`);
  }
  if (query.category) {
    conditions.push(sql`c.slug = ${query.category}`);
  }
  if (query.employmentType) {
    conditions.push(sql`j.employment_type = ${query.employmentType}::employment_type`);
  }
  if (query.workplaceType) {
    conditions.push(sql`j.workplace_type = ${query.workplaceType}::workplace_type`);
  }
  if (query.experienceLevel) {
    conditions.push(
      sql`j.experience_level = ${query.experienceLevel}::experience_level`,
    );
  }
  if (query.location) {
    const like = `%${query.location}%`;
    conditions.push(sql`(
      j.location ILIKE ${like} OR j.city ILIKE ${like}
      OR j.region ILIKE ${like} OR j.country ILIKE ${like}
    )`);
  }
  if (query.skill) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM job_skills js JOIN skills s ON s.id = js.skill_id
      WHERE js.job_id = j.id AND s.name ILIKE ${`%${query.skill}%`}
    )`);
  }
  if (query.salaryMin != null) {
    conditions.push(sql`(j.salary_max IS NULL OR j.salary_max >= ${query.salaryMin})`);
  }
  if (query.postedWithinDays != null) {
    conditions.push(
      sql`j.published_at >= now() - make_interval(days => ${query.postedWithinDays})`,
    );
  }
  return sql.join(conditions, sql` AND `);
}

export function buildJobOrder(query: JobQuery): ReturnType<typeof sql> {
  switch (query.sort) {
    case 'salary':
      return sql`COALESCE(j.salary_max, j.salary_min, -1) DESC, j.published_at DESC NULLS LAST`;
    case 'deadline':
      return sql`j.application_deadline ASC NULLS LAST, j.published_at DESC NULLS LAST`;
    case 'recent':
      return sql`j.published_at DESC NULLS LAST, j.created_at DESC`;
    case 'relevance':
    default:
      if (query.q) {
        const like = `%${query.q}%`;
        return sql`(
          CASE WHEN j.title ILIKE ${like} THEN 3 ELSE 0 END
          + CASE WHEN o.name ILIKE ${like} THEN 1 ELSE 0 END
          + CASE WHEN j.description ILIKE ${like} THEN 1 ELSE 0 END
        ) DESC, j.published_at DESC NULLS LAST`;
      }
      return sql`j.published_at DESC NULLS LAST, j.created_at DESC`;
  }
}

export async function searchJobs(
  query: JobQuery,
  db: Db = getDb(),
): Promise<SearchResult> {
  const where = buildJobWhere(query);
  const order = buildJobOrder(query);
  const offset = (query.page - 1) * query.perPage;

  const countResult: unknown = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM jobs j
    JOIN organizations o ON o.id = j.organization_id
    LEFT JOIN job_categories c ON c.id = j.category_id
    WHERE ${where}
  `);
  const total = Number(rowsOf(countResult)[0]?.n ?? 0);

  const rows: unknown = await db.execute(sql`
    ${sql.raw(SELECT_JOB_CARDS)}
    WHERE ${where}
    ORDER BY ${order}
    LIMIT ${query.perPage} OFFSET ${offset}
  `);

  const jobs = rowsOf(rows).map((row) => toJobCard(row));
  return {
    jobs,
    total,
    page: query.page,
    perPage: query.perPage,
    explanation: describeQuery(query),
  };
}

function coerceDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return new Date(String(value));
}

export function toJobCard(row: Record<string, unknown>): JobCardData {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    organizationName: String(row.organization_name),
    organizationSlug: String(row.organization_slug),
    organizationVerification: String(row.organization_verification),
    category: row.category == null ? null : String(row.category),
    employmentType: String(row.employment_type),
    experienceLevel: String(row.experience_level),
    workplaceType: String(row.workplace_type),
    location: String(row.location ?? ''),
    salaryMin: row.salary_min == null ? null : Number(row.salary_min),
    salaryMax: row.salary_max == null ? null : Number(row.salary_max),
    salaryCurrency: String(row.salary_currency ?? 'USD'),
    salaryPeriod: String(row.salary_period ?? 'YEAR'),
    publishedAt: coerceDate(row.published_at),
    applicationDeadline: coerceDate(row.application_deadline),
    skills: (row.skills as string[]) ?? [],
    descriptionExcerpt: excerpt(String(row.description ?? '')),
  };
}

export async function listCategories(
  db: Db = getDb(),
): Promise<Array<{ name: string; slug: string; count: number }>> {
  const result: unknown = await db.execute(sql`
    SELECT c.name, c.slug,
      (SELECT count(*)::int FROM jobs j WHERE j.category_id = c.id AND j.status = 'PUBLISHED') AS count
    FROM job_categories c
    ORDER BY c.name
  `);
  return rowsOf(result).map((row) => ({
    name: String(row.name),
    slug: String(row.slug),
    count: Number(row.count ?? 0),
  }));
}

export async function listSkillNames(db: Db = getDb()): Promise<string[]> {
  const result: unknown = await db.execute(sql`
    SELECT DISTINCT s.name
    FROM skills s
    JOIN job_skills js ON js.skill_id = s.id
    JOIN jobs j ON j.id = js.job_id AND j.status = 'PUBLISHED'
    ORDER BY s.name
  `);
  return rowsOf(result).map((row) => String(row.name));
}
