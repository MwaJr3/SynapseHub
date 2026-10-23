/**
 * Read models for the public site and dashboards. Every public query filters
 * on publication state and, where relevant, company id — drafts and the other
 * company's private records are excluded at this layer.
 */
import { and, eq } from 'drizzle-orm';

import { getDb, type Db } from '@/lib/db';
import {
  caseStudies,
  certifications,
  companies,
  companyMemberships,
  educationEntries,
  experienceEntries,
  personProfiles,
  portfolioLinks,
  products,
  projectContributions,
  resumeAssets,
  solutionAreas,
} from '@/lib/db/schema';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
} from '@/lib/validation';

export type ProductRow = typeof products.$inferSelect;
export type CaseStudyRow = typeof caseStudies.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;

export interface ProductFilters {
  q: string;
  category: string;
  company: string;
  technology: string;
  status: string;
  sort: 'featured' | 'alphabetical' | 'category';
}

export const emptyProductFilters: ProductFilters = {
  q: '',
  category: '',
  company: '',
  technology: '',
  status: '',
  sort: 'featured',
};

export function parseProductFilters(
  params: Record<string, string | string[] | undefined>,
): ProductFilters {
  const single = (key: string): string => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };
  const sortValue = single('sort');
  const sort = (PRODUCT_SORTS as readonly string[]).includes(sortValue)
    ? (sortValue as ProductFilters['sort'])
    : 'featured';
  return {
    q: single('q').trim(),
    category: single('category').trim(),
    company: single('company').trim(),
    technology: single('technology').trim(),
    status: single('status').trim(),
    sort,
  };
}

function productHaystack(product: {
  name: string;
  slug: string;
  purpose: string;
  summary: string;
  category: string;
  categories: string[];
  technologies: string[];
  keywords: string[];
  features: Array<{ title: string; description: string }>;
}): string {
  return [
    product.name,
    product.slug,
    product.purpose,
    product.summary,
    product.category,
    ...product.categories,
    ...product.technologies,
    ...product.keywords,
    ...product.features.flatMap((feature) => [feature.title, feature.description]),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Pure filter/sort over product rows — the single implementation used by the
 * catalogue page and exercised directly by tests.
 */
export function filterProducts<
  T extends ProductRow & { companySlug: string },
>(rows: T[], filters: ProductFilters): T[] {
  const q = filters.q.toLowerCase();
  const filtered = rows.filter((product) => {
    if (q && !productHaystack(product).includes(q)) return false;
    if (
      filters.category &&
      product.category !== filters.category &&
      !product.categories.includes(filters.category)
    )
      return false;
    if (filters.company && product.companySlug !== filters.company) return false;
    if (filters.technology && !product.technologies.includes(filters.technology))
      return false;
    if (filters.status && product.status !== filters.status) return false;
    return true;
  });

  const collator = new Intl.Collator('en');
  switch (filters.sort) {
    case 'alphabetical':
      return [...filtered].sort((a, b) => collator.compare(a.name, b.name));
    case 'category':
      return [...filtered].sort(
        (a, b) =>
          collator.compare(a.category, b.category) ||
          collator.compare(a.name, b.name),
      );
    case 'featured':
    default:
      // Featured first, then alphabetical for a stable order. No date sort:
      // the catalogue carries no invented chronology.
      return [...filtered].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          collator.compare(a.name, b.name),
      );
  }
}

export function describeProductFilters(filters: ProductFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`search “${filters.q}”`);
  if (filters.category) parts.push(`category “${filters.category}”`);
  if (filters.company) parts.push(`company “${filters.company}”`);
  if (filters.technology) parts.push(`technology “${filters.technology}”`);
  if (filters.status) parts.push(`status “${filters.status}”`);
  const sortLabel: Record<string, string> = {
    featured: 'featured first',
    alphabetical: 'alphabetical order',
    category: 'grouped by category',
  };
  const sortText = sortLabel[filters.sort] ?? filters.sort;
  if (parts.length === 0) return `All published products, ${sortText}.`;
  return `Filtered by ${parts.join(', ')}; ${sortText}.`;
}

export async function listPublishedProducts(
  db: Db = getDb(),
): Promise<Array<ProductRow & { companySlug: string; companyName: string }>> {
  const rows = await db
    .select({
      product: products,
      companySlug: companies.slug,
      companyName: companies.name,
    })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId))
    .where(eq(products.publicationState, 'PUBLISHED'));
  return rows.map((row) => ({
    ...row.product,
    companySlug: row.companySlug,
    companyName: row.companyName,
  }));
}

export async function getPublishedProductBySlug(
  slug: string,
  db: Db = getDb(),
): Promise<(ProductRow & { companyName: string; companySlug: string }) | null> {
  const [row] = await db
    .select({
      product: products,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId))
    .where(and(eq(products.slug, slug), eq(products.publicationState, 'PUBLISHED')))
    .limit(1);
  if (!row) return null;
  return { ...row.product, companyName: row.companyName, companySlug: row.companySlug };
}

export async function getCaseStudyBySlug(
  slug: string,
  db: Db = getDb(),
): Promise<(CaseStudyRow & { product: ProductRow; companyName: string; companySlug: string }) | null> {
  const [row] = await db
    .select({
      caseStudy: caseStudies,
      product: products,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(caseStudies)
    .innerJoin(products, eq(products.id, caseStudies.productId))
    .innerJoin(companies, eq(companies.id, products.companyId))
    .where(and(eq(caseStudies.slug, slug), eq(caseStudies.publicationState, 'PUBLISHED')))
    .limit(1);
  if (!row) return null;
  return {
    ...row.caseStudy,
    product: row.product,
    companyName: row.companyName,
    companySlug: row.companySlug,
  };
}

export async function listPublishedCaseStudies(
  db: Db = getDb(),
): Promise<
  Array<{
    slug: string;
    title: string;
    productSlug: string;
    productName: string;
    companyName: string;
    companySlug: string;
    category: string;
  }>
> {
  const rows = await db
    .select({
      slug: caseStudies.slug,
      title: caseStudies.title,
      problem: caseStudies.problem,
      productSlug: products.slug,
      productName: products.name,
      category: products.category,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(caseStudies)
    .innerJoin(products, eq(products.id, caseStudies.productId))
    .innerJoin(companies, eq(companies.id, products.companyId))
    .where(eq(caseStudies.publicationState, 'PUBLISHED'));
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    productSlug: row.productSlug,
    productName: row.productName,
    category: row.category,
    companyName: row.companyName,
    companySlug: row.companySlug,
  }));
}

export async function listPublishedSolutions(
  db: Db = getDb(),
): Promise<Array<typeof solutionAreas.$inferSelect & { companyName: string; companySlug: string }>> {
  const rows = await db
    .select({
      solution: solutionAreas,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(solutionAreas)
    .innerJoin(companies, eq(companies.id, solutionAreas.companyId))
    .where(eq(solutionAreas.publicationState, 'PUBLISHED'));
  return rows.map((row) => ({
    ...row.solution,
    companyName: row.companyName,
    companySlug: row.companySlug,
  }));
}

export async function getPublishedSolutionBySlug(
  slug: string,
  db: Db = getDb(),
) {
  const [row] = await db
    .select({
      solution: solutionAreas,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(solutionAreas)
    .innerJoin(companies, eq(companies.id, solutionAreas.companyId))
    .where(
      and(
        eq(solutionAreas.slug, slug),
        eq(solutionAreas.publicationState, 'PUBLISHED'),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row.solution,
    companyName: row.companyName,
    companySlug: row.companySlug,
  };
}

export async function getCompanyBySlug(slug: string, db: Db = getDb()) {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function listCompanies(db: Db = getDb()) {
  return db.select().from(companies);
}

export interface PublicPersonRow {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  pronouns: string;
  headline: string;
  shortBio: string;
  technicalSkills: string[];
  softSkills: string[];
  domains: string[];
  personalPortfolioUrl: string;
  githubUrl: string;
  professionalProfileUrl: string;
  contactVisible: boolean;
  contributions: Array<{
    productName: string;
    productSlug: string;
    description: string;
  }>;
  hasPublishedResume: boolean;
}

export async function listPublishedPeople(
  db: Db = getDb(),
): Promise<PublicPersonRow[]> {
  const profiles = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.publicationState, 'PUBLISHED'));
  return Promise.all(profiles.map((profile) => toPublicPerson(profile, db)));
}

export async function getPublishedPersonBySlug(
  slug: string,
  db: Db = getDb(),
): Promise<(PublicPersonRow & { longBio: string }) | null> {
  const [profile] = await db
    .select()
    .from(personProfiles)
    .where(
      and(
        eq(personProfiles.slug, slug),
        eq(personProfiles.publicationState, 'PUBLISHED'),
      ),
    )
    .limit(1);
  if (!profile) return null;
  const base = await toPublicPerson(profile, db);
  return { ...base, longBio: profile.longBio };
}

async function toPublicPerson(
  profile: typeof personProfiles.$inferSelect,
  db: Db,
): Promise<PublicPersonRow> {
  const contributionRows = await db
    .select({
      productName: products.name,
      productSlug: products.slug,
      description: projectContributions.description,
    })
    .from(projectContributions)
    .innerJoin(products, eq(products.id, projectContributions.productId))
    .where(
      and(
        eq(projectContributions.personProfileId, profile.id),
        eq(projectContributions.approved, true),
      ),
    );

  const [resume] = await db
    .select({ id: resumeAssets.id })
    .from(resumeAssets)
    .where(
      and(
        eq(resumeAssets.personProfileId, profile.id),
        eq(resumeAssets.published, true),
      ),
    )
    .limit(1);

  return {
    id: profile.id,
    userId: profile.userId,
    slug: profile.slug,
    displayName: profile.displayName,
    pronouns: profile.pronouns,
    headline: profile.headline,
    shortBio: profile.shortBio,
    technicalSkills: profile.technicalSkills ?? [],
    softSkills: profile.softSkills ?? [],
    domains: profile.domains ?? [],
    personalPortfolioUrl: profile.personalPortfolioUrl,
    githubUrl: profile.githubUrl,
    professionalProfileUrl: profile.professionalProfileUrl,
    contactVisible: profile.contactVisible,
    contributions: contributionRows.map((row) => ({
      productName: row.productName,
      productSlug: row.productSlug,
      description: row.description,
    })),
    hasPublishedResume: Boolean(resume),
  };
}

export async function getPersonProfileByUserId(
  userId: string,
  db: Db = getDb(),
) {
  const [profile] = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function listPersonExtras(
  personProfileId: string,
  db: Db = getDb(),
): Promise<{
  education: Array<{ id: string; institution: string; qualification: string; subject: string; period: string; description: string }>;
  experience: Array<{ id: string; role: string; organization: string; period: string; description: string; linkUrl: string }>;
  certifications: Array<{ id: string; name: string; issuer: string; period: string; note: string }>;
  links: Array<{ id: string; label: string; url: string }>;
  resumes: Array<{ id: string; filename: string; published: boolean }>;
}> {
  const education = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.personProfileId, personProfileId));
  const experience = await db
    .select()
    .from(experienceEntries)
    .where(eq(experienceEntries.personProfileId, personProfileId));
  const certs = await db
    .select()
    .from(certifications)
    .where(eq(certifications.personProfileId, personProfileId));
  const links = await db
    .select()
    .from(portfolioLinks)
    .where(eq(portfolioLinks.personProfileId, personProfileId));
  const resumes = await db
    .select({
      id: resumeAssets.id,
      filename: resumeAssets.filename,
      published: resumeAssets.published,
    })
    .from(resumeAssets)
    .where(eq(resumeAssets.personProfileId, personProfileId));

  return {
    education: education.map((row) => ({
      id: row.id,
      institution: row.institution,
      qualification: row.qualification,
      subject: row.subject,
      period: row.period,
      description: row.description,
    })),
    experience: experience.map((row) => ({
      id: row.id,
      role: row.role,
      organization: row.organization,
      period: row.period,
      description: row.description,
      linkUrl: row.linkUrl,
    })),
    certifications: certs.map((row) => ({
      id: row.id,
      name: row.name,
      issuer: row.issuer,
      period: row.period,
      note: row.note,
    })),
    links: links.map((row) => ({ id: row.id, label: row.label, url: row.url })),
    resumes: resumes.map((row) => ({
      id: row.id,
      filename: row.filename,
      published: row.published,
    })),
  };
}

/** Company membership list for editors; public pages never call this. */
export async function listCompanyMemberIds(
  companyId: string,
  db: Db = getDb(),
): Promise<string[]> {
  const rows = await db
    .select({ userId: companyMemberships.userId })
    .from(companyMemberships)
    .where(eq(companyMemberships.companyId, companyId));
  return rows.map((row) => row.userId);
}

export { PRODUCT_SORTS, PRODUCT_CATEGORIES, PRODUCT_STATUSES };
