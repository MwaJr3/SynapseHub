/**
 * Content model for the seed catalogue. Product and case-study copy comes
 * from the project briefs; anything a brief does not support (deployment
 * status, real users, metrics, dates) is flagged via `verificationNote` and
 * never invented.
 */

export interface ProductFeature {
  title: string;
  description: string;
}

export type ProductStatus =
  | 'PROTOTYPE'
  | 'BUILT'
  | 'PILOT'
  | 'LIVE'
  | 'MAINTENANCE'
  | 'ARCHIVED';

export interface ProductContent {
  slug: string;
  name: string;
  companySlug: 'velaqori-systems' | 'tamuzi-learning';
  category: string;
  categories: string[];
  purpose: string;
  summary: string;
  status: ProductStatus;
  statusNote: string;
  technologies: string[];
  features: ProductFeature[];
  keywords: string[];
  visualLabel: string;
  verificationNote: string;
  featured: boolean;
  /** Optional external configuration — hidden when absent, never invented. */
  liveDemoUrl?: string;
  repositoryUrl?: string;
  /** Case-study brief. Sections follow the required case-study template. */
  caseStudy: {
    title: string;
    problem: string;
    users: string[];
    constraints: string[];
    solution: string;
    workflow: Array<{ step: string; description: string }>;
    architecture: string;
    dataModel: string;
    engineeringDecisions: Array<{ decision: string; rationale: string }>;
    testing: string;
    securityPrivacy: string;
    walkthroughNote: string;
    limitations: string[];
    futureImprovements: string[];
  };
}

export interface SolutionContent {
  slug: string;
  title: string;
  companySlug: 'velaqori-systems' | 'tamuzi-learning';
  problem: string;
  approach: string;
  audiences: string[];
}

export interface CompanyContent {
  slug: string;
  name: string;
  workingNameNotice: string;
  tagline: string;
  overview: string;
  focusAreas: string[];
  aboutStory: string;
  values: string[];
  approach: string[];
  accentToken: 'vela' | 'tamuzi';
  featuredProductSlugs: string[];
  featuredCaseStudySlugs: string[];
  /** Legal/contact configuration — empty until officially supplied. */
  legalName?: string;
  contactEmail?: string;
}

/** Shared honesty note attached to every case study in the seed. */
export const SEED_DATA_NOTICE =
  'Seed/demo content derived from project briefs. All names, products and case studies in this seed are illustrative working records (fictional demo data) pending client-supplied verification. Metrics, user counts, dates and deployment status are not claimed.';
