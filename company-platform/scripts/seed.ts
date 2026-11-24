/**
 * Seed: two companies, solution areas, 25 products with case studies, demo
 * accounts and profiles. All demo people are synthetic and labelled; nothing
 * about legal entities, URLs, or credentials is invented. Idempotent: re-running
 * upserts by deterministic ids.
 */
import { eq } from 'drizzle-orm';

import { caseStudies as caseStudyContent, content } from './seed-data';
import { runMigrations } from '../src/lib/db/migrate';
import { getDb, waitDbReady, type Db } from '../src/lib/db';
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
  solutionAreas,
  users,
} from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/auth/password';

/** What to write. */
export interface SeedOptions {
  /**
   * Create the three synthetic demo accounts and their profiles.
   *
   * Off in production: the accounts have published passwords (`demo-password-123`)
   * and an EDITOR can change company content, so a public deployment that seeds
   * them hands editing rights to anyone who reads the README. The public pages do
   * not need them — they read companies, products and case studies, all of which
   * are seeded either way.
   */
  includeDemoAccounts?: boolean;
  /** Reuse an open transaction instead of `getDb()`. */
  db?: Db;
}

/**
 * Create the catalogue. Exported rather than run at import time, so the same code
 * can be called from `npm run db:seed`, from the first-request bootstrap, or from
 * a script that needs a seeded database without spawning a process.
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<void> {
  const { includeDemoAccounts = true } = options;
  // Demo accounts use passwords that are published in the repository. Never create
  // them in production unless the operator opts in explicitly.
  if (includeDemoAccounts && process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_ACCOUNTS !== 'true') {
    throw new Error('Refusing to seed demo accounts in production (set ALLOW_DEMO_ACCOUNTS=true to override).');
  }
  // A caller that passes a transaction has already created the schema and waited
  // for the connection. Running the migrations again here would open a *second*
  // transaction on a single-connection database (PGlite) and deadlock.
  if (options.db === undefined) {
    await runMigrations();
    await waitDbReady();
  }
  const db = options.db ?? getDb();

  // Companies
  for (const company of content.companies) {
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, company.slug));
    if (existing.length > 0) {
      await db
        .update(companies)
        .set({
          name: company.name,
          workingNameNotice: company.workingNameNotice,
          tagline: company.tagline,
          overview: company.overview,
          focusAreas: company.focusAreas,
          aboutStory: company.aboutStory,
          values: company.values,
          approach: company.approach,
          accentToken: company.accentToken,
          featuredProductSlugs: company.featuredProductSlugs,
          featuredCaseStudySlugs: company.featuredCaseStudySlugs,
        })
        .where(eq(companies.slug, company.slug));
    } else {
      await db.insert(companies).values({
        id: `company-${company.slug}`,
        slug: company.slug,
        name: company.name,
        workingNameNotice: company.workingNameNotice,
        tagline: company.tagline,
        overview: company.overview,
        focusAreas: company.focusAreas,
        aboutStory: company.aboutStory,
        values: company.values,
        approach: company.approach,
        accentToken: company.accentToken,
        featuredProductSlugs: company.featuredProductSlugs,
        featuredCaseStudySlugs: company.featuredCaseStudySlugs,
      });
    }
  }

  const companyRows = await db.select().from(companies);
  const companyBySlug = new Map(companyRows.map((row) => [row.slug, row]));

  // Solution areas
  for (const solution of content.solutionAreas) {
    const company = companyBySlug.get(solution.companySlug);
    if (!company) throw new Error(`Missing company ${solution.companySlug}`);
    const values = {
      title: solution.title,
      problem: solution.problem,
      approach: solution.approach,
      audiences: solution.audiences,
      publicationState: 'PUBLISHED' as const,
    };
    const existing = await db
      .select({ id: solutionAreas.id })
      .from(solutionAreas)
      .where(eq(solutionAreas.slug, solution.slug));
    if (existing.length > 0) {
      await db
        .update(solutionAreas)
        .set(values)
        .where(eq(solutionAreas.slug, solution.slug));
    } else {
      await db
        .insert(solutionAreas)
        .values({ id: `solution-${solution.slug}`, slug: solution.slug, companyId: company.id, ...values });
    }
  }

  // Products
  for (const product of content.products) {
    const company = companyBySlug.get(product.companySlug);
    if (!company) throw new Error(`Missing company ${product.companySlug}`);
    const values = {
      name: product.name,
      companyId: company.id,
      category: product.category,
      categories: product.categories,
      purpose: product.purpose,
      summary: product.summary,
      status: product.status,
      technologies: product.technologies,
      features: product.features,
      keywords: product.keywords,
      visualLabel: product.visualLabel,
      verificationNote: product.verificationNote,
      featured: product.featured,
      publicationState: 'PUBLISHED' as const,
      // External URLs stay unconfigured — configure before launch, never invent.
      liveDemoUrl: '',
      repositoryUrl: '',
    };
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, product.slug));
    if (existing.length > 0) {
      await db.update(products).set(values).where(eq(products.slug, product.slug));
    } else {
      await db
        .insert(products)
        .values({ id: `product-${product.slug}`, slug: product.slug, ...values });
    }
  }

  const productRows = await db.select().from(products);
  const productBySlug = new Map(productRows.map((row) => [row.slug, row]));

  // Case studies
  for (const study of caseStudyContent) {
    const product = productBySlug.get(study.productSlug);
    if (!product) throw new Error(`Missing product ${study.productSlug}`);
    const values = {
      productId: product.id,
      title: study.title,
      problem: study.problem,
      users: study.users,
      constraints: study.constraints,
      solution: study.solution,
      workflow: study.workflow,
      architecture: study.architecture,
      dataModel: study.dataModel,
      engineeringDecisions: study.engineeringDecisions,
      testingNote: study.testing,
      securityPrivacy: study.securityPrivacy,
      walkthroughNote: study.walkthroughNote,
      verificationNote: study.verificationNote,
      limitations: study.limitations,
      futureImprovements: study.futureImprovements,
      publicationState: 'PUBLISHED' as const,
    };
    const existing = await db
      .select({ id: caseStudies.id })
      .from(caseStudies)
      .where(eq(caseStudies.slug, study.slug));
    if (existing.length > 0) {
      await db.update(caseStudies).set(values).where(eq(caseStudies.slug, study.slug));
    } else {
      await db
        .insert(caseStudies)
        .values({ id: `case-${study.slug}`, slug: study.slug, ...values });
    }
  }

  // Demo users + memberships + profiles (local only — see SeedOptions).
  for (const person of includeDemoAccounts ? content.demoPeople : []) {
    const passwordHash = await hashPassword(person.password);
    const userId = `user-${person.profile.slug}`;
    const userValues = {
      email: person.email,
      name: person.name,
      passwordHash,
      role: person.role,
    };
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, person.email));
    if (existing.length > 0) {
      await db.update(users).set(userValues).where(eq(users.email, person.email));
    } else {
      await db.insert(users).values({ id: userId, ...userValues });
    }

    for (const companySlug of person.companySlugs) {
      const company = companyBySlug.get(companySlug);
      if (!company) throw new Error(`Missing company ${companySlug}`);
      const membershipRole =
        person.role === 'EDITOR' || person.role === 'ADMIN' ? 'EDITOR' : 'MEMBER';
      const membership = await db
        .select({ id: companyMemberships.id })
        .from(companyMemberships)
        .where(eq(companyMemberships.userId, userId));
      if (membership.length === 0) {
        await db.insert(companyMemberships).values({
          id: `membership-${person.profile.slug}-${companySlug}`,
          userId,
          companyId: company.id,
          role: membershipRole,
        });
      }
    }

    const profileValues = {
      userId,
      slug: person.profile.slug,
      displayName: person.profile.displayName,
      pronouns: person.profile.pronouns,
      headline: person.profile.headline,
      shortBio: person.profile.shortBio,
      longBio: person.profile.longBio,
      technicalSkills: person.profile.technicalSkills,
      softSkills: person.profile.softSkills,
      domains: person.profile.domains,
      personalPortfolioUrl: person.profile.personalPortfolioUrl,
      githubUrl: person.profile.githubUrl,
      professionalProfileUrl: person.profile.professionalProfileUrl,
      contactVisible: person.profile.contactVisible,
      publicationState: person.profile.publicationState,
    };
    const existingProfile = await db
      .select({ id: personProfiles.id })
      .from(personProfiles)
      .where(eq(personProfiles.slug, person.profile.slug));
    let profileId: string;
    if (existingProfile.length > 0 && existingProfile[0]) {
      profileId = existingProfile[0].id;
      await db.update(personProfiles).set(profileValues).where(eq(personProfiles.id, profileId));
    } else {
      profileId = `profile-${person.profile.slug}`;
      await db.insert(personProfiles).values({ id: profileId, ...profileValues });
    }

    // Extras are inserted once (fresh profile only) to keep the seed idempotent.
    if (existingProfile.length === 0) {
      let position = 0;
      for (const entry of person.profile.education) {
        await db.insert(educationEntries).values({
          id: `edu-${person.profile.slug}-${position}`,
          personProfileId: profileId,
          position,
          ...entry,
        });
        position += 1;
      }
      position = 0;
      for (const entry of person.profile.experience) {
        await db.insert(experienceEntries).values({
          id: `exp-${person.profile.slug}-${position}`,
          personProfileId: profileId,
          position,
          ...entry,
        });
        position += 1;
      }
      position = 0;
      for (const entry of person.profile.certifications) {
        await db.insert(certifications).values({
          id: `cert-${person.profile.slug}-${position}`,
          personProfileId: profileId,
          position,
          ...entry,
        });
        position += 1;
      }
      position = 0;
      for (const entry of person.profile.links) {
        await db.insert(portfolioLinks).values({
          id: `link-${person.profile.slug}-${position}`,
          personProfileId: profileId,
          position,
          ...entry,
        });
        position += 1;
      }
    }
  }

}

/** What the seed put in, and the synthetic accounts it created. */
export function seedSummary(): string {
  return [
    'Seed complete:',
    `  companies: ${content.companies.length}`,
    `  solution areas: ${content.solutionAreas.length}`,
    `  products: ${content.products.length}`,
    `  case studies: ${caseStudyContent.length}`,
    `  demo people: ${content.demoPeople.length}`,
    '',
    'Demo accounts (SYNTHETIC — fictional demo data, demo-password-123):',
    ...content.demoPeople.map((person) => `  ${person.email} — ${person.role}`),
  ].join('\n');
}

// Only run when invoked directly (`npm run db:seed`), never when imported.
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log(seedSummary());
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
