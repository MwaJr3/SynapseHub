/**
 * Catalogue integrity: the seed must match the specification exactly — 25
 * products (13 Velaqori + 12 Tamuzi), one case study each, complete case-study
 * sections, and no invented external URLs anywhere.
 */
import { describe, expect, it } from 'vitest';

import {
  EXPECTED_PRODUCT_COUNT,
  TAMUZI_PRODUCT_COUNT,
  VELAQORI_PRODUCT_COUNT,
  caseStudies,
  companies,
  demoPeople,
  products,
  solutionAreas,
  ALLOWED_SEED_URLS,
  PRODUCT_EVIDENCE,
  SUPPLIED_EVIDENCE_LINKS,
  appSourceUrl,
} from '@/content';

describe('seed catalogue integrity', () => {
  it('contains exactly the specified product counts', () => {
    expect(products.length).toBe(EXPECTED_PRODUCT_COUNT);
    expect(products.length).toBe(25);
    const velaqori = products.filter((p) => p.companySlug === 'velaqori-systems');
    const tamuzi = products.filter((p) => p.companySlug === 'tamuzi-learning');
    expect(velaqori.length).toBe(VELAQORI_PRODUCT_COUNT);
    expect(velaqori.length).toBe(13);
    expect(tamuzi.length).toBe(TAMUZI_PRODUCT_COUNT);
    expect(tamuzi.length).toBe(12);
  });

  it('has unique, kebab-case product slugs', () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('has exactly one case study per product', () => {
    expect(caseStudies.length).toBe(products.length);
    const productSlugs = new Set(products.map((p) => p.slug));
    for (const study of caseStudies) {
      expect(productSlugs.has(study.productSlug)).toBe(true);
      expect(study.slug).toBe(`${study.productSlug}-case-study`);
    }
  });

  it('every case study fills every required section', () => {
    for (const study of caseStudies) {
      expect(study.title.length).toBeGreaterThan(10);
      expect(study.problem.length).toBeGreaterThan(50);
      expect(study.users.length).toBeGreaterThan(0);
      expect(study.constraints.length).toBeGreaterThan(0);
      expect(study.solution.length).toBeGreaterThan(50);
      expect(study.workflow.length).toBeGreaterThanOrEqual(3);
      expect(study.featureEvidence.length).toBeGreaterThan(0);
      expect(study.architecture.length).toBeGreaterThan(50);
      expect(study.dataModel.length).toBeGreaterThan(10);
      expect(study.engineeringDecisions.length).toBeGreaterThanOrEqual(2);
      expect(study.testing.length).toBeGreaterThan(50);
      expect(study.securityPrivacy.length).toBeGreaterThan(20);
      expect(study.walkthroughNote.length).toBeGreaterThan(10);
      expect(study.limitations.length).toBeGreaterThan(0);
      expect(study.futureImprovements.length).toBeGreaterThan(0);
      expect(study.verificationNote.length).toBeGreaterThan(20);
    }
  });

  it('case studies are project-specific, not copy-pasted', () => {
    // Each problem/solution/architecture must be unique across the catalogue.
    const problems = new Set(caseStudies.map((s) => s.problem));
    const solutions = new Set(caseStudies.map((s) => s.solution));
    const architectures = new Set(caseStudies.map((s) => s.architecture));
    expect(problems.size).toBe(caseStudies.length);
    expect(solutions.size).toBe(caseStudies.length);
    expect(architectures.size).toBe(caseStudies.length);
  });

  it('declares the two independent companies with working-name notices', () => {
    expect(companies.length).toBe(2);
    for (const company of companies) {
      expect(company.workingNameNotice.toLowerCase()).toContain('working name');
      // Legal details are never invented — they stay empty/configurable.
      expect(company.legalName ?? '').toBe('');
    }
  });

  it('every product belongs to one company and uses only required categories', () => {
    const requiredCategories = [
      'Cybersecurity',
      'Software Engineering',
      'Education Technology',
      'AI and Intelligent Applications',
      'Engineering and Scientific Computing',
      'Data Analysis',
      'Learning and Accessibility',
    ];
    const companySlugs = new Set(companies.map((c) => c.slug));
    for (const product of products) {
      expect(companySlugs.has(product.companySlug)).toBe(true);
      expect(requiredCategories).toContain(product.category);
      for (const category of product.categories) {
        expect(requiredCategories).toContain(category);
      }
    }
  });

  it('never claims live deployment and labels all status notes', () => {
    for (const product of products) {
      // The seed catalogue contains no deployment claims.
      expect(product.status).not.toBe('LIVE');
      expect(product.statusNote.length).toBeGreaterThan(10);
    }
  });

  it('contains no invented external URLs — only owner-supplied evidence', () => {
    for (const product of products) {
      expect(product.liveDemoUrl ?? '').toBe('');
      // Repository URLs may only be owner-supplied evidence links.
      const repo = product.repositoryUrl ?? '';
      expect(repo === '' || ALLOWED_SEED_URLS.includes(repo)).toBe(true);
    }
    for (const company of companies) {
      expect(company.contactEmail ?? '').toBe('');
    }
    // Content prose embeds owner-supplied evidence links only — every URL
    // found in prose must be in the allowlist.
    const prose = [
      ...products.map((p) => `${p.purpose} ${p.summary} ${p.verificationNote}`),
      ...caseStudies.map((s) => `${s.problem} ${s.solution} ${s.architecture}`),
    ].join(' ');
    const found = prose.match(/https?:\/\/[^\s,)]+/g) ?? [];
    for (const url of found) {
      expect(ALLOWED_SEED_URLS.some((allowed) => url.startsWith(allowed))).toBe(true);
    }
  });

  it('configures source links for exactly the sixteen products with working apps', () => {
    const withSource = products.filter((p) => (p.repositoryUrl ?? '') !== '');
    expect(withSource.map((p) => p.slug).sort()).toEqual([
      'campusflow',
      'chessscope',
      'circuitlab-calc',
      'classconnect',
      'dependsecure',
      'eduaccess',
      'fileguard',
      'learnbridge',
      'learnpulse',
      'openlearn-commons',
      'pathwise',
      'reachlearn',
      'sentinelcore',
      'sentinellog',
      'teachcraft',
      'tutorspring',
    ]);
    for (const product of withSource) {
      // Source links point into THIS repository — all project code is vendored
      // in projects/ (owner instruction, 2026-10-23); none points at another
      // repository's code.
      expect(product.repositoryUrl).toBe(appSourceUrl(product.slug));
      expect(product.repositoryUrl?.startsWith(
        'https://github.com/MwaJr3/SynapseHub/tree/main/apps/',
      )).toBe(true);
    }
    // Every one of the 25 carries its evidence record.
    for (const product of products) {
      expect(PRODUCT_EVIDENCE[product.slug]).toBeDefined();
      expect(product.verificationNote.toLowerCase()).toContain('verified');
    }
  });

  it('keeps case-study verification notes honest', () => {
    for (const study of caseStudies) {
      expect(study.verificationNote.toLowerCase()).toMatch(
        /verif|unvalidated|not claimed|brief/,
      );
    }
  });

  it('records every supplied evidence link as verified with an in-repo location', () => {
    // All six origin PRs were merged and inspected (CBU_Assignments became
    // public on 2026-10-23), and every project now resides in this repository.
    for (const link of Object.values(SUPPLIED_EVIDENCE_LINKS)) {
      expect(link.verification).toBe('verified-merged-inspected');
      expect(link.inRepoPath ?? '').not.toBe('');
    }
    expect(Object.values(SUPPLIED_EVIDENCE_LINKS).length).toBe(6);
  });

  it('has solution areas owned by exactly one company each', () => {
    const companySlugs = new Set(companies.map((c) => c.slug));
    for (const solution of solutionAreas) {
      expect(companySlugs.has(solution.companySlug)).toBe(true);
    }
    expect(solutionAreas.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps Mwangala’s portfolio link unconfigured in the seed', () => {
    // Never invented: the button stays hidden until he supplies the URL.
    const mwangala = demoPeople.find((p) => p.profile.slug === 'mwangala-chisuse');
    expect(mwangala).toBeDefined();
    expect(mwangala?.profile.personalPortfolioUrl).toBe('');
    expect(mwangala?.profile.githubUrl).toBe('');
  });
});
