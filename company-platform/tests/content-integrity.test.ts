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

  it('contains no invented external URLs', () => {
    const urlPattern = /https?:\/\//i;
    for (const product of products) {
      expect(product.liveDemoUrl ?? '').toBe('');
      expect(product.repositoryUrl ?? '').toBe('');
    }
    for (const company of companies) {
      expect(company.contactEmail ?? '').toBe('');
    }
    // Content prose never embeds made-up links either.
    const prose = [
      ...products.map((p) => `${p.purpose} ${p.summary} ${p.verificationNote}`),
      ...caseStudies.map((s) => `${s.problem} ${s.solution} ${s.architecture}`),
    ].join(' ');
    expect(prose).not.toMatch(urlPattern);
  });

  it('keeps case-study verification notes honest', () => {
    for (const study of caseStudies) {
      expect(study.verificationNote.toLowerCase()).toMatch(
        /verif|unvalidated|not claimed|brief/,
      );
    }
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
