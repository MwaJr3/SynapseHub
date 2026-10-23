import type { MetadataRoute } from 'next';

import { getDb } from '@/lib/db';
import {
  getPublishedPersonBySlug,
  listCompanies,
  listPublishedCaseStudies,
  listPublishedPeople,
  listPublishedProducts,
  listPublishedSolutions,
} from '@/lib/queries';

/**
 * Sitemap over published records only — drafts and member/admin surfaces are
 * excluded by construction. Without a configured site URL, entries are omitted
 * rather than invented.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return [];

  const db = getDb();
  const [companies, products, studies, solutions, people] = await Promise.all([
    listCompanies(db),
    listPublishedProducts(db),
    listPublishedCaseStudies(db),
    listPublishedSolutions(db),
    listPublishedPeople(db),
  ]);

  const staticRoutes = [
    '',
    '/products',
    '/case-studies',
    '/companies',
    '/solutions',
    '/people',
    '/about',
    '/contact',
    ...companies.flatMap((company) => [
      `/companies/${company.slug}`,
      `/companies/${company.slug}/about`,
      `/privacy/${company.slug}`,
      `/terms/${company.slug}`,
    ]),
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...studies.map((study) => ({
      url: `${base}/case-studies/${study.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...solutions.map((solution) => ({
      url: `${base}/solutions/${solution.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...people.map((person) => ({
      url: `${base}/people/${person.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
