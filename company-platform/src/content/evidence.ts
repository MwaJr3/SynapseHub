/**
 * Owner-supplied project evidence (links supplied by Mwangala, 2026-10-23).
 *
 * These are the ONLY external URLs the seed catalogue is allowed to carry.
 * Every one was supplied verbatim by the owner; none is inferred from names,
 * usernames, or hosting conventions. Verification status per link is recorded
 * honestly in docs/PROJECT_EVIDENCE.md and rendered into product
 * `verificationNote` text — evidence of source code is not evidence of
 * deployment.
 */

export interface SuppliedEvidenceLink {
  label: string;
  url: string;
  /** What this link evidences, per the owner's framing. */
  subject: string;
  /** Verification status from this build environment. */
  verification:
    | 'verified-merged-inspected'
    | 'owner-supplied-not-inspectable';
  detail: string;
}

export const SUPPLIED_EVIDENCE_LINKS = {
  mySulWorkingApps: {
    label: 'MySul PR #1 — Mwangala portfolio: 7 working apps + case studies',
    url: 'https://github.com/MwaJr3/MySul/pull/1',
    subject: 'The cybersecurity projects (working apps)',
    verification: 'verified-merged-inspected',
    detail:
      'MERGED 2026-10-23. Contains working apps for sentinelcore, sentinellog, fileguard, dependsecure, chessscope, circuitlab-calc, and campusflow (apps/<slug>/), each with case-study pages (projects/<slug>/), plus a Python circuit-math reference with tests.',
  },
  mySulReactPortfolio: {
    label: 'MySul PR #2 — Mwangala React portfolio site (Vite + TypeScript)',
    url: 'https://github.com/MwaJr3/MySul/pull/2',
    subject: 'Mwangala React portfolio site (Vite + TypeScript)',
    verification: 'verified-merged-inspected',
    detail:
      'MERGED 2026-10-23. Vite/React/TypeScript portfolio with nine project case-study records (assetwatch, hashsight, incidentflow, netscope, phishlens, securecode-workbench, threatintel-desk, cyberaware-lab, transcriptwise), Vitest suite, and QA screenshots.',
  },
  sixtyChallenges: {
    label: 'SynapseHub PR #3 — 60 interactive prototypes',
    url: 'https://github.com/MwaJr3/SynapseHub/pull/3',
    subject: 'The 60 challenge records',
    verification: 'verified-merged-inspected',
    detail:
      'MERGED 2026-10-23. Adds the React/TypeScript portfolio catalogue for all 60 supplied Frontend Mentor challenges with /apps routes and local-first interactions.',
  },
  stockPriceAnalysis: {
    label: 'SynapseHub PR #4 — stock time-series analysis v1 and v2',
    url: 'https://github.com/MwaJr3/SynapseHub/pull/4',
    subject: 'Stock Price Analysis — comparative financial time-series analytics',
    verification: 'verified-merged-inspected',
    detail:
      'MERGED 2026-10-19 (69 files). Notebook-based v1 plus modular v2 with retrieval, validation, preprocessing, resampling, metrics, visualization, and reporting.',
  },
  tenantCore: {
    label: 'CBU_Assignments PR #5 — TenantCore multi-tenant SaaS database',
    url: 'https://github.com/MwaJr3/CBU_Assignments/pull/5',
    subject: 'TenantCore — Multi-Tenant SaaS Database',
    verification: 'owner-supplied-not-inspectable',
    detail:
      'Owner-supplied link. The CBU_Assignments repository is not accessible from this build environment (private repository / integration not installed), so its contents could not be independently inspected here.',
  },
  vdownloader: {
    label: 'CBU_Assignments PR #6 — VDownloader OS desktop video downloader',
    url: 'https://github.com/MwaJr3/CBU_Assignments/pull/6',
    subject: 'VDownloader OS desktop video downloader',
    verification: 'owner-supplied-not-inspectable',
    detail:
      'Owner-supplied link. Same access limitation as PR #5 — recorded, not independently verified here.',
  },
} as const satisfies Record<string, SuppliedEvidenceLink>;

export interface ProductEvidence {
  /** Configured only where real source exists — renders the Source Code button. */
  repositoryUrl?: string;
  /** Appended to the product's verificationNote. */
  verificationAddendum: string;
}

const APP_ADDENDUM =
  'Working application and case-study pages verified in the owner-supplied MySul source (' +
  'https://github.com/MwaJr3/MySul/pull/1, merged 2026-10-23). Not publicly deployed; no hosted demo is claimed.';

const CASE_STUDY_ADDENDUM =
  'Project case-study record verified in the owner-supplied Mwangala React portfolio (' +
  'https://github.com/MwaJr3/MySul/pull/2, merged 2026-10-23). Product source code is not linked yet — the Source Code button stays hidden.';

const REGISTRY_ADDENDUM =
  'A linked portfolio case-study record exists in the personal portfolio project registry in this repository (src/data/projects/) — record location verified. Product source code is not linked yet — the Source Code button stays hidden.';

function appEvidence(): ProductEvidence {
  return {
    repositoryUrl: SUPPLIED_EVIDENCE_LINKS.mySulWorkingApps.url,
    verificationAddendum: APP_ADDENDUM,
  };
}

function caseStudyEvidence(): ProductEvidence {
  return { verificationAddendum: CASE_STUDY_ADDENDUM };
}

function registryEvidence(): ProductEvidence {
  return { verificationAddendum: REGISTRY_ADDENDUM };
}

/**
 * Per-product evidence, keyed by product slug. The 25 catalogue products are
 * covered by exactly one of three verified record sets; source links exist
 * only for the seven with working apps.
 */
export const PRODUCT_EVIDENCE: Record<string, ProductEvidence> = {
  // Working apps (MySul PR #1) — Source Code configured.
  sentinelcore: appEvidence(),
  sentinellog: appEvidence(),
  fileguard: appEvidence(),
  dependsecure: appEvidence(),
  chessscope: appEvidence(),
  'circuitlab-calc': appEvidence(),
  campusflow: appEvidence(),
  // Case-study records (MySul PR #2) — no product source linked.
  assetwatch: caseStudyEvidence(),
  hashsight: caseStudyEvidence(),
  incidentflow: caseStudyEvidence(),
  netscope: caseStudyEvidence(),
  phishlens: caseStudyEvidence(),
  'securecode-workbench': caseStudyEvidence(),
  'threatintel-desk': caseStudyEvidence(),
  'cyberaware-lab': caseStudyEvidence(),
  transcriptwise: caseStudyEvidence(),
  // Portfolio project registry (this repository) — no product source linked.
  learnbridge: registryEvidence(),
  classconnect: registryEvidence(),
  tutorspring: registryEvidence(),
  pathwise: registryEvidence(),
  teachcraft: registryEvidence(),
  'openlearn-commons': registryEvidence(),
  learnpulse: registryEvidence(),
  reachlearn: registryEvidence(),
  eduaccess: registryEvidence(),
};

/** The only external URLs permitted in the seed catalogue. */
export const ALLOWED_SEED_URLS: string[] = [
  ...new Set<string>([
    ...Object.values(SUPPLIED_EVIDENCE_LINKS).map((link) => link.url as string),
    ...Object.values(PRODUCT_EVIDENCE).map((e) => e.repositoryUrl ?? ''),
  ]),
].filter((url) => url !== '');
