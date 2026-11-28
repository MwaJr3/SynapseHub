/**
 * Project evidence: the owner-supplied PR links (supplied verbatim by Mwangala,
 * 2026-10-23) plus the in-repository source locations established the same day
 * when all project code was consolidated into this repository (owner
 * instruction: everything lives in SynapseHub, not in other repositories).
 *
 * Exactly two URL classes are permitted in the seed catalogue and nothing
 * else:
 *   1. the six PR links supplied verbatim by the owner (provenance — the merge
 *      records that evidence the work), and
 *   2. GitHub tree links into THIS repository, constructed only from paths
 *      that verifiably exist in this checkout (see
 *      docs/PROJECTS.md for the full map).
 * Neither is inferred from names, usernames, companies, or hosting
 * conventions. Verification status per link is recorded honestly in
 * docs/PROJECT_EVIDENCE.md and rendered into product `verificationNote` text —
 * evidence of source code is not evidence of deployment.
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
  /** Path in THIS repository where the subject now resides (consolidated 2026-10-23). */
  inRepoPath?: string;
  detail: string;
}

export const SUPPLIED_EVIDENCE_LINKS = {
  mySulWorkingApps: {
    label: 'MySul PR #1 — Mwangala portfolio: 7 working apps + case studies',
    url: 'https://github.com/MwaJr3/MySul/pull/1',
    subject: 'The cybersecurity projects (working apps)',
    verification: 'verified-merged-inspected',
    inRepoPath: 'sites/portfolio',
    detail:
      'MERGED 2026-10-23 (be39a9e). Contains working apps for sentinelcore, sentinellog, fileguard, dependsecure, chessscope, circuitlab-calc, and campusflow (apps/<slug>/, since 2026-10-29 under companies/<company>/), with case-study pages, plus a Python circuit-math reference with tests. Merged 2026-10-28 into the single portfolio site at sites/portfolio/ (apps served from public/demos/<slug>/).',
  },
  mySulReactPortfolio: {
    label: 'MySul PR #2 — Mwangala React portfolio site (Vite + TypeScript)',
    url: 'https://github.com/MwaJr3/MySul/pull/2',
    subject: 'Mwangala React portfolio site (Vite + TypeScript)',
    verification: 'verified-merged-inspected',
    inRepoPath: 'sites/portfolio',
    detail:
      'MERGED 2026-10-23 (7a01e8b). Vite/React/TypeScript portfolio with nine project case-study records (assetwatch, hashsight, incidentflow, netscope, phishlens, securecode-workbench, threatintel-desk, cyberaware-lab, transcriptwise), Vitest suite, and QA screenshots. Source now resides in this repository at sites/portfolio/.',
  },
  sixtyChallenges: {
    label: 'SynapseHub PR #3 — 60 interactive prototypes',
    url: 'https://github.com/MwaJr3/SynapseHub/pull/3',
    subject: 'The 60 challenge records',
    verification: 'verified-merged-inspected',
    inRepoPath: 'challenges',
    detail:
      'MERGED 2026-10-23. Adds the React/TypeScript catalogue for all 60 supplied Frontend Mentor challenges, with /apps routes and local-first interactions. Lives in this repository at challenges/ (moved from src/apps and src/data/challengeManifest.ts on 2026-10-28, unchanged in behaviour).',
  },
  stockPriceAnalysis: {
    label: 'SynapseHub PR #4 — stock time-series analysis v1 and v2',
    url: 'https://github.com/MwaJr3/SynapseHub/pull/4',
    subject: 'Stock Price Analysis — comparative financial time-series analytics',
    verification: 'verified-merged-inspected',
    inRepoPath: 'stock-price-analysis',
    detail:
      'MERGED 2026-10-19 (69 files). Notebook-based v1 plus modular v2 with retrieval, validation, preprocessing, resampling, metrics, visualization, and reporting. Lives in this repository under stock-price-analysis/ and stock-price-time-series-analysis/.',
  },
  tenantCore: {
    label: 'CBU_Assignments PR #5 — TenantCore multi-tenant SaaS database',
    url: 'https://github.com/MwaJr3/CBU_Assignments/pull/5',
    subject: 'TenantCore — Multi-Tenant SaaS Database',
    verification: 'verified-merged-inspected',
    inRepoPath: 'coursework/cbu-assignments/tenantcore',
    detail:
      'MERGED 2026-10-22 (ee58d11). Inspected via the public origin repository and now vendored here: tenantcore/ ships a FastAPI + SQLAlchemy + Alembic backend with a React/TypeScript/Tailwind dashboard; PostgreSQL Row-Level Security tenant isolation behind a restricted runtime role, composite tenant-safe foreign keys and immutable audit events; tenant lifecycle, memberships/roles, rotating sessions, invitations, API-key auth, usage metrics, tenant-aware Celery jobs and observability; Docker/Compose stack, deterministic demo tenants (Acme/Globex/NovaTech), an isolation lab and schema-per-tenant tooling. PR-reported checks: 36 backend tests including adversarial RLS checks, 5 frontend tests, Alembic downgrade/re-upgrade/reseed, typecheck/lint/build and dependency audits. Docker Compose, Playwright and live Redis/Celery were not run in the PR environment. Source now resides in this repository at coursework/cbu-assignments/tenantcore/.',
  },
  vdownloader: {
    label: 'CBU_Assignments PR #6 — VDownloader OS desktop video downloader',
    url: 'https://github.com/MwaJr3/CBU_Assignments/pull/6',
    subject: 'VDownloader OS desktop video downloader',
    verification: 'verified-merged-inspected',
    inRepoPath: 'coursework/cbu-assignments/video_downloader_app',
    detail:
      'MERGED 2026-10-23 (ccc9700). Inspected via the public origin repository and now vendored here: video_downloader_app/ is a Python 3.10+ / PyQt6 / yt-dlp / FFmpeg / WebSockets desktop suite — downloader (144p–8K video, MP3 320k/M4A audio, queued jobs with retry backoff), Instant Transcript Studio (VTT/SRT parse, dedupe, timestamps), IDM-style mini taskbar with Chrome/Edge MV3 and Firefox MV2 extension bridges over a local WebSocket, clipboard monitor, tray alerts, six analytical dashboards (PyQt6 + aiohttp web control centre), six engineering docs and PyInstaller packaging. PR-reported checks: 21/21 tests including a real FFmpeg subtitle burn, WebSocket roundtrip and extension-manifest integrity; build dry-run verified. Source now resides in this repository at coursework/cbu-assignments/video_downloader_app/.',
  },
} as const satisfies Record<string, SuppliedEvidenceLink>;

/** Base for links into this repository's own source tree. */
const IN_REPO_BASE = 'https://github.com/MwaJr3/SynapseHub/tree/HEAD/';

/** GitHub tree link for a path that exists in this repository. */
export function inRepoUrl(inRepoPath: string): string {
  return `${IN_REPO_BASE}${inRepoPath}`;
}

/**
 * Source location of one full working app, built 2026-10-23. Apps moved on
 * 2026-10-29: each one is filed under the company that publishes it, so the
 * company is part of the path and there is no single `apps/` folder any more.
 */
export function appSourceUrl(company: 'velaqori' | 'tamuzi', slug: string): string {
  return inRepoUrl(`companies/${company}/${slug}`);
}

/** The in-repo directory a source link points at, for tests that check it exists. */
export function appSourcePath(company: 'velaqori' | 'tamuzi', slug: string): string {
  return `companies/${company}/${slug}`;
}

export interface ProductEvidence {
  /** Configured only where real source exists — renders the Source Code button. */
  repositoryUrl?: string;
  /** Appended to the product's verificationNote. */
  verificationAddendum: string;
}

function appAddendum(company: 'velaqori' | 'tamuzi', slug: string): string {
  return (
    `Working full-stack application built and verified in this repository at companies/${company}/${slug} (backend + frontend + tests), ` +
    'with demo and case-study pages vendored from the owner-supplied MySul source ' +
    '(https://github.com/MwaJr3/MySul/pull/1, merged 2026-10-23) at ' +
    `sites/portfolio/public/demos/${slug}/ and sites/portfolio/src/data/earlierWork.ts. ` +
    'Not publicly deployed; no hosted demo is claimed.'
  );
}

function educationAppEvidence(slug: string): ProductEvidence {
  return {
    repositoryUrl: appSourceUrl('tamuzi', slug),
    verificationAddendum:
      `Working full-stack application built and verified in this repository at companies/tamuzi/${slug} ` +
      '(backend + frontend + tests, including seeded demo data and documented limitations). ' +
      'Not publicly deployed; no hosted demo is claimed.',
  };
}

function appEvidence(company: 'velaqori' | 'tamuzi', slug: string): ProductEvidence {
  return {
    repositoryUrl: appSourceUrl(company, slug),
    verificationAddendum: appAddendum(company, slug),
  };
}

/**
 * Per-product evidence, keyed by product slug. The 25 catalogue products are
 * covered by exactly one of three verified record sets; source links exist
 * only for products with working apps — pointing into this repository, where
 * the code now lives (sixteen portfolio and cybersecurity apps plus nine education-suite apps,
 * each filed under its company since 2026-10-29).
 */
export const PRODUCT_EVIDENCE: Record<string, ProductEvidence> = {
  // Working apps (vendored from MySul PR #1) — Source Code configured.
  sentinelcore: appEvidence('velaqori', 'sentinelcore'),
  sentinellog: appEvidence('velaqori', 'sentinellog'),
  fileguard: appEvidence('velaqori', 'fileguard'),
  dependsecure: appEvidence('velaqori', 'dependsecure'),
  chessscope: appEvidence('velaqori', 'chessscope'),
  'circuitlab-calc': appEvidence('velaqori', 'circuitlab-calc'),
  campusflow: appEvidence('tamuzi', 'campusflow'),
  // Completed cybersecurity applications — local source, tests and demos verified in-repository.
  assetwatch: appEvidence('velaqori', 'assetwatch'),
  hashsight: appEvidence('velaqori', 'hashsight'),
  incidentflow: appEvidence('velaqori', 'incidentflow'),
  netscope: appEvidence('velaqori', 'netscope'),
  phishlens: appEvidence('velaqori', 'phishlens'),
  'securecode-workbench': appEvidence('velaqori', 'securecode-workbench'),
  'threatintel-desk': appEvidence('velaqori', 'threatintel-desk'),
  'cyberaware-lab': appEvidence('tamuzi', 'cyberaware-lab'),
  transcriptwise: appEvidence('tamuzi', 'transcriptwise'),
  // Education suite (built in this workspace, companies/tamuzi/<slug>) — Source Code configured.
  learnbridge: educationAppEvidence('learnbridge'),
  classconnect: educationAppEvidence('classconnect'),
  tutorspring: educationAppEvidence('tutorspring'),
  pathwise: educationAppEvidence('pathwise'),
  teachcraft: educationAppEvidence('teachcraft'),
  'openlearn-commons': educationAppEvidence('openlearn-commons'),
  learnpulse: educationAppEvidence('learnpulse'),
  reachlearn: educationAppEvidence('reachlearn'),
  eduaccess: educationAppEvidence('eduaccess'),
};

/** The only external URLs permitted in the seed catalogue. */
export const ALLOWED_SEED_URLS: string[] = [
  ...new Set<string>([
    ...Object.values(SUPPLIED_EVIDENCE_LINKS).map((link) => link.url as string),
    ...Object.values(SUPPLIED_EVIDENCE_LINKS)
      .map((link) => (link.inRepoPath === undefined ? '' : inRepoUrl(link.inRepoPath)))
      .filter((url) => url !== ''),
    ...Object.values(PRODUCT_EVIDENCE).map((e) => e.repositoryUrl ?? ''),
  ]),
].filter((url) => url !== '');
