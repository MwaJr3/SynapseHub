# Final report — WorkNiche rebuild and publication (2026-10-22)

## Context

The WorkNiche application built in an earlier session existed only as local
commits on a session branch that was never pushed; when that environment was
replaced, the code was unrecoverable from GitHub (verified: no remote branch
or pull-request ref contained it). This report describes the rebuild of the
application on `arena/9c5ed9c9-synapsehub` and its publication to
`MwaJr3/SynapseHub`, from the recorded design blueprint.

## What was implemented

### The WorkNiche application (`workniche/`)

- **Data layer** — Drizzle schema of 18 tables with database-enforced
  invariants (UNIQUE one-application-per-candidate-per-job, notification
  dedupe keys, one membership per user per organization), SQL migrations
  applied through a recorded migration runner, and a fictional demo seed
  (11 users, 5 organizations, 14 jobs, 5 applications) whose companies and
  people are labelled fictional in the product itself.
- **One database facade** — embedded PGlite locally, PostgreSQL via
  `DATABASE_URL` in production; the same schema and SQL run on both.
- **Authentication** — credentials sign-in (node scrypt, per-user salt),
  optional Google/GitHub OAuth when configured, JWT sessions with role and
  id, suspended accounts cut off at the session layer.
- **Server actions (Zod-validated)** — registration, profiles, résumés,
  organizations and memberships, job create/update with the full lifecycle
  state machine, applications with append-only status history, private
  candidate notes, alerts, notifications, reporting, moderation,
  verification, suspension.
- **Search and recommendations** — server-side search across title,
  description, company and skills with nine combinable filters and four sort
  orders; every non-default filter is echoed back in plain language.
  Recommendations score matched skills, keyword hits and preference fit and
  ship with that explanation — no invented confidence percentages.
- **Notification worker** — alert matching and deadline reminders with
  deterministic dedupe keys, safe to re-run.
- **Privacy** — candidate contact data is dropped server-side whenever the
  viewer fails the profile visibility rule; hiring notes are never selected
  by any applicant-facing query; résumés download only through a
  permission-checked endpoint.
- **UI** — public job board and company pages, candidate dashboard
  (applications, saved jobs, alerts, notifications, profile, résumés),
  employer workspace (overview, job lifecycle, candidate pipeline, hiring
  team), admin console (moderation queue, verification, suspension,
  raw-count analytics), custom not-found and error pages.
- **SEO** — sitemap listing published jobs only, robots rules, `JobPosting`
  JSON-LD on published job pages only.

### Portfolio integration

- Tenth catalogue record `src/data/projects/workniche.ts` with distinct case
  study, architecture and honest testing/limitation notes; new
  `job-marketplace` category; reciprocal related-project links; illustrative
  visual labelled as illustrative; counts and copy updated to ten projects.

## How to run

```bash
cd workniche
npm install
cp .env.example .env.local    # set AUTH_SECRET
npm run db:migrate
npm run db:seed               # fictional demo data
npm run dev                   # http://localhost:3000
```

Demo password for every seeded account: `demo-password-123`
(see `workniche/README.md` for the account table).

## Checks executed

| Check | Result |
| --- | --- |
| `tsc --noEmit` (strict, no implicit any) | green |
| Vitest — WorkNiche suite (8 files, 47 tests) | all passing |
| `next build` production build | green (32 routes) |
| Smoke tests vs `next start` | home, jobs (+filters, empty state), job detail, companies, login/register, sitemap (18 URLs), robots, JSON-LD present, anonymous `/dashboard` `/employer` `/admin` → 307 to sign-in, credentials sign-in returns a real seeded session |
| Portfolio `npm run check` (typecheck, lint, 167 tests, build) | green |
| Playwright end-to-end specs | written, **not executed** — no browsers installed in this environment |

## Deployment steps

See `workniche/docs/DEPLOYMENT.md`: build, configure (`AUTH_SECRET`,
`NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, storage), `npm run db:migrate`, run the
web server and the worker; do not seed demo data in production.

## Remaining integrations and limitations

- No email delivery is configured; invitation/reset flows state that plainly
  instead of simulating sends. A provider must be wired before real use.
- Profile education/certification structures exist in the data model; the
  profile form in this build covers the fields that drive matching and hiring
  views.
- Playwright specs await an environment with browsers.
- The recommendation scorer is transparent weighting, not a trained model.
- OAuth providers activate only when their environment variables are set.
- The earlier session's **operations-layer module for the portfolio site**
  (`operations.ts` / OpsConsole) was lost with the unpushed branch and is
  **not** part of this rebuild; it can be re-created on request.

## Honesty statement

No user counts, outcomes, uptime figures, response times, matching accuracy
claims or benchmarks appear anywhere in the product or these documents.
Demo organizations and people are fictional and labelled fictional in the
product. Analytics are raw database counts only.
