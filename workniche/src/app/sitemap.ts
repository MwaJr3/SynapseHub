import type { MetadataRoute } from 'next';

import { getDb } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { jobs, organizations } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const db = getDb();

  const publishedJobs = await db
    .select({ slug: jobs.slug, updatedAt: jobs.updatedAt })
    .from(jobs)
    .where(eq(jobs.status, 'PUBLISHED'));
  const orgs = await db.select({ slug: organizations.slug }).from(organizations);

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/companies`, changeFrequency: 'weekly', priority: 0.6 },
    ...orgs.map((org) => ({
      url: `${base}/companies/${org.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    // Published jobs only — drafts and closed listings stay out.
    ...publishedJobs.map((job) => ({
      url: `${base}/jobs/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
