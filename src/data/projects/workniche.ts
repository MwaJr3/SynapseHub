import type { PortfolioProject } from '@/types';

/**
 * WorkNiche — tenth portfolio project. A full-stack job marketplace built to
 * demonstrate hiring workflows with explicit data invariants, explainable
 * matching and candidate-data privacy. Every company and person in the
 * application's demo data is fictional and labelled as such inside the
 * product; nothing in this record claims real users or outcomes.
 */
export const workniche: PortfolioProject = {
  id: 'project-10-workniche',
  slug: 'workniche',
  name: 'WorkNiche',
  shortDescription:
    'A full-stack job marketplace for specialized technical work: one application per role enforced by the database, an auditable hiring pipeline, explainable recommendations and candidate data that stays private by construction.',
  longDescription:
    'WorkNiche is a complete job-marketplace application — accounts, organizations, job lifecycle, applications, pipelines, moderation and notifications — built to show how hiring workflows behave when their rules live in the data layer instead of the UI. A candidate can apply to a role exactly once, because a unique constraint says so. A hiring note is invisible to applicants because no applicant-facing query selects it. A recommendation lists the skills and preferences behind its score instead of inventing a confidence percentage. The demonstration dataset is fictional and labelled fictional everywhere it appears.',
  primaryCategory: 'job-marketplace',
  categories: ['job-marketplace', 'full-stack', 'assessment-analytics'],
  technologies: [
    'Next.js',
    'TypeScript',
    'PostgreSQL',
    'Drizzle ORM',
    'PGlite',
    'Next Auth.js',
    'Zod',
    'Tailwind CSS',
    'Vitest',
  ],
  featureTags: ['job search', 'hiring pipeline', 'RBAC', 'audit trail', 'explainable matching'],
  features: [
    {
      title: 'One application per role, enforced in the database',
      description:
        'The applications table carries a UNIQUE (job, applicant) constraint; duplicate submissions surface as a friendly message before the insert and are impossible after it.',
      importance:
        'Product rules that only live in forms break the moment a second client appears. Database constraints hold under retries, scripts and future API clients.',
    },
    {
      title: 'Explainable job recommendations',
      description:
        'Matches are scored from the seeker’s own profile — matched skills, keyword hits, preference fit — and every score ships with that breakdown in plain language.',
      importance:
        'Candidates can act on a match they understand, and the system never fabricates a confidence percentage it cannot justify.',
    },
    {
      title: 'Append-only application history',
      description:
        'Every status change writes a new history row with actor and note; the pipeline view is a projection of that log, never an overwritten field.',
      importance:
        'Both sides can see how an application moved and when — the audit trail is the record, not a best guess.',
    },
    {
      title: 'Candidate-data privacy by construction',
      description:
        'Private hiring notes are never selected by any applicant-facing query; contact details are dropped server-side whenever the viewer fails the profile’s visibility rule; résumés download only through a permission-checked endpoint.',
      importance:
        'Privacy rules enforced where data is fetched cannot be bypassed by a curious client.',
    },
    {
      title: 'Job lifecycle as a state machine',
      description:
        'Draft, published, paused, closed and archived states admit only documented transitions, enforced in one module and exercised by tests.',
      importance:
        'Publishing rules stay consistent across the employer UI, the public board and background workers.',
    },
    {
      title: 'Idempotent notification worker',
      description:
        'Alert matches and deadline reminders carry dedupe keys — one notification per (alert, job) and per (application, day) — so re-running the worker never duplicates messages.',
      importance:
        'Retries become safe by default; users are not punished for operational reliability work.',
    },
  ],
  visualLabel: 'Illustrative job-board and candidate-file preview',
  previews: [
    {
      id: 'workniche-board',
      view: 'primary',
      alt: 'Illustrative preview of the WorkNiche job board with four fictional listings and a plain-language search explanation.',
      caption:
        'Job board: verification labels and a search explanation that lists every active filter.',
      isIllustrative: true,
    },
    {
      id: 'workniche-candidate',
      view: 'detail',
      alt: 'Illustrative preview of a candidate file with status history and a private hiring note.',
      caption:
        'Candidate file: append-only status history, private notes and the one-application constraint.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'web',
      label: 'Next.js App Router UI (server components + typed client forms)',
      layer: 'client',
      connectsTo: ['actions'],
    },
    {
      id: 'actions',
      label: 'Zod-validated server actions (auth, jobs, applications, admin)',
      layer: 'api',
      connectsTo: ['domain'],
    },
    {
      id: 'domain',
      label: 'Domain modules: job lifecycle, authorization, search, recommendations',
      layer: 'domain',
      connectsTo: ['data', 'worker'],
    },
    {
      id: 'data',
      label: 'Drizzle ORM over PostgreSQL (PGlite embedded for local runs)',
      layer: 'data',
    },
    {
      id: 'worker',
      label: 'Notification worker with dedupe keys (alert and deadline ticks)',
      layer: 'worker',
      connectsTo: ['data'],
    },
    {
      id: 'storage',
      label: 'Private résumé storage: local directory or S3 adapter',
      layer: 'integration',
    },
  ],
  caseStudy: {
    problem:
      'Hiring workflows fail quietly: duplicate applications, overwritten statuses, notes that leak, matches with no explanation. WorkNiche treats each of these as a data-model problem and makes the rule visible.',
    users: [
      'Job seekers tracking multiple applications',
      'Small hiring teams running a real pipeline',
      'Platform administrators handling reports and verification',
    ],
    constraints: [
      'No invented metrics, outcomes or user figures anywhere in the product',
      'Every demo organization and person labelled fictional',
      'Candidate data readable only by the people the rules allow',
      'Runs with no external services (embedded PGlite) and scales to managed PostgreSQL',
    ],
    workflow: [
      {
        title: 'Discover',
        description:
          'Search and filter published jobs; the UI states in plain language which filters are active and why results appear.',
      },
      {
        title: 'Apply',
        description:
          'One application per role — cover letter, screening answers and an optional private résumé.',
      },
      {
        title: 'Review',
        description:
          'The hiring team moves the candidate through an append-only pipeline with private notes and assignment.',
      },
      {
        title: 'Decide',
        description:
          'Status changes notify the candidate with the actual state; closed roles notify applicants instead of going dark.',
      },
      {
        title: 'Moderate',
        description:
          'Anyone signed in can report a listing; administrators resolve, dismiss, remove jobs or suspend organizations.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Constraints over conventions',
        description:
          'One-application-per-job and notification dedupe are unique indexes, not form logic — the database is the last line of defence.',
      },
      {
        title: 'PGlite or PostgreSQL behind one facade',
        description:
          'Local development and tests run on embedded PostgreSQL; production points DATABASE_URL at a real server. Same schema, same SQL.',
      },
      {
        title: 'Authorization at the data layer',
        description:
          'Visibility rules run where rows are selected, so hidden fields are never transmitted rather than hidden in the browser.',
      },
      {
        title: 'Explainability as output, not decoration',
        description:
          'The recommendation scorer returns matched skills, keyword hits and preference fit alongside the score — the explanation is the product.',
      },
      {
        title: 'Idempotent background work',
        description:
          'Worker notifications carry deterministic dedupe keys, making retries and schedule overlaps harmless.',
      },
    ],
    testing: [
      '47 tests across 8 files cover: Zod boundaries, job lifecycle transitions, password hashing, the database-enforced single-application rule, append-only status history, candidate-note privacy, notification dedupe, alert-worker idempotency, search and filter behaviour with explanations, and the recommendation scorer.',
      'Type checking is strict (no implicit any); production build runs in the same check pipeline.',
      'Playwright end-to-end specs are written but not executed in this environment (no browsers installed) — stated plainly rather than claimed.',
      'Smoke checks against the production build verified the public routes, the empty-search state, sitemap and robots output, anonymous redirects to sign-in and a real credentials sign-in against the seeded demo data.',
    ],
    limitations: [
      'Email is never simulated: invitation and reset flows state that email is not configured instead of pretending to deliver.',
      'The profile form covers matching-critical fields; education and certification structures exist in the data model without dedicated form UI.',
      'PGlite is single-writer — multi-instance deployment requires managed PostgreSQL.',
      'The recommendation scorer is transparent weighting, not a trained model.',
    ],
    futureImprovements: [
      'Configured email delivery with verified templates',
      'Team roles for scheduling interviews inside the pipeline',
      'Saved searches as a first-class feature alongside alerts',
      'External identity providers beyond the optional Google/GitHub OAuth',
    ],
  },
  featured: false,
  status: 'completed',
  displayOrder: 10,
  relatedSlugs: ['pathwise', 'learnpulse', 'reachlearn'],
  demoRequirements:
    'Run locally with Node.js 20+: npm install, set AUTH_SECRET in .env.local, npm run db:migrate && npm run db:seed, then npm run dev. No external services needed — the database is embedded. Demo accounts are listed in workniche/README.md (all fictional, password demo-password-123).',
};
