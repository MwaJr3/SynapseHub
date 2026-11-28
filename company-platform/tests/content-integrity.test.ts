/**
 * Catalogue integrity: the seed must match the specification exactly — 25
 * products (13 Velaqori + 12 Tamuzi), one case study each, complete case-study
 * sections, and no invented external URLs anywhere.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** Repository root, for the check that a source link resolves to a real folder. */
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The twelve products Tamuzi publishes. Every other product with a working app is
 * Velaqori's. Stated here rather than read off `companySlug`, so the test fails if
 * a slug is filed under the wrong company.
 */
const TAMUZI = new Set([
  'campusflow',
  'classconnect',
  'cyberaware-lab',
  'eduaccess',
  'learnbridge',
  'learnpulse',
  'openlearn-commons',
  'pathwise',
  'reachlearn',
  'teachcraft',
  'transcriptwise',
  'tutorspring',
]);

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

  it('marks the nine completed cybersecurity applications as built and source-linked', () => {
    const completed = [
      'assetwatch',
      'cyberaware-lab',
      'hashsight',
      'incidentflow',
      'netscope',
      'phishlens',
      'securecode-workbench',
      'threatintel-desk',
      'transcriptwise',
    ];
    for (const slug of completed) {
      const product = products.find((item) => item.slug === slug);
      expect(product, slug).toBeDefined();
      expect(product?.status).toBe('BUILT');
      expect(product?.repositoryUrl).toBeTruthy();
      expect(product?.repositoryUrl).toContain(`/companies/`);
      expect(product?.statusNote.toLowerCase()).toContain('not publicly deployed');
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

  it('configures source links for all twenty-five implemented products', () => {
    const withSource = products.filter((p) => (p.repositoryUrl ?? '') !== '');
    expect(withSource.map((p) => p.slug).sort()).toEqual([
      'assetwatch',
      'campusflow',
      'chessscope',
      'circuitlab-calc',
      'classconnect',
      'cyberaware-lab',
      'dependsecure',
      'eduaccess',
      'fileguard',
      'hashsight',
      'incidentflow',
      'learnbridge',
      'learnpulse',
      'netscope',
      'openlearn-commons',
      'pathwise',
      'phishlens',
      'reachlearn',
      'securecode-workbench',
      'sentinelcore',
      'sentinellog',
      'teachcraft',
      'threatintel-desk',
      'transcriptwise',
      'tutorspring',
    ]);
    for (const product of withSource) {
      // Source links point into THIS repository — all product code lives here,
      // filed under the company that publishes it (2026-10-29). None points at
      // another repository's code.
      expect(product.repositoryUrl).toBe(
        appSourceUrl(TAMUZI.has(product.slug) ? 'tamuzi' : 'velaqori', product.slug),
      );
      expect(product.repositoryUrl).toMatch(
        /^https:\/\/github\.com\/MwaJr3\/SynapseHub\/tree\/HEAD\/companies\/(velaqori|tamuzi)\//,
      );
      // The linked directory must exist in this checkout, so the Source Code
      // button never opens a 404.
      const inRepo = (product.repositoryUrl ?? '').replace(
        'https://github.com/MwaJr3/SynapseHub/tree/HEAD/',
        '',
      );
      expect(existsSync(join(REPO, inRepo))).toBe(true);
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
