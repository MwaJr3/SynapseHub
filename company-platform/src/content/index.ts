/** Assembles the seed catalogue: two companies, solutions, 25 products + case studies. */
import { velaqoriCompany, velaqoriSolutions, velaqoriProducts } from './velaqori-a';
import { velaqoriProductsB } from './velaqori-b';
import { tamuziCompany, tamuziSolutions, tamuziProducts } from './tamuzi-a';
import { tamuziProductsB } from './tamuzi-b';
import type { ProductContent } from './types';
import { SEED_DATA_NOTICE } from './types';

export { SEED_DATA_NOTICE };
export type { ProductContent };
export { demoPeople, type DemoPersonSeed } from './people';

export const companies = [velaqoriCompany, tamuziCompany];

export const solutionAreas = [...velaqoriSolutions, ...tamuziSolutions];

export const products: ProductContent[] = [
  ...velaqoriProducts,
  ...velaqoriProductsB,
  ...tamuziProducts,
  ...tamuziProductsB,
];

export interface CaseStudyContent {
  slug: string;
  productSlug: string;
  title: string;
  problem: string;
  users: string[];
  constraints: string[];
  solution: string;
  workflow: Array<{ step: string; description: string }>;
  featureEvidence: Array<{ feature: string; evidence: string }>;
  architecture: string;
  dataModel: string;
  engineeringDecisions: Array<{ decision: string; rationale: string }>;
  testing: string;
  securityPrivacy: string;
  walkthroughNote: string;
  limitations: string[];
  futureImprovements: string[];
  verificationNote: string;
}

/** Every product carries its own case-study brief — one per product, all 25. */
export const caseStudies: CaseStudyContent[] = products.map((product) => ({
  slug: `${product.slug}-case-study`,
  productSlug: product.slug,
  ...product.caseStudy,
  // Feature evidence documents each feature from the brief's feature list.
  featureEvidence: product.features.map((feature) => ({
    feature: feature.title,
    evidence: feature.description,
  })),
  verificationNote: product.verificationNote,
}));

/** Integrity checks run by tests before any seed is trusted. */
export const EXPECTED_PRODUCT_COUNT = 25;
export const VELAQORI_PRODUCT_COUNT = 13;
export const TAMUZI_PRODUCT_COUNT = 12;
