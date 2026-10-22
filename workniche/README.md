# WorkNiche

A demonstration job marketplace for specialized technical work: honest job
listings, one application per candidate per job, an auditable hiring pipeline,
explainable recommendations and privacy-respecting candidate data.

**Honesty statement.** Every organization, person, résumé and listing in the
seed data is fictional sample data, labelled as such in the product itself.
The platform makes no claims about real hiring outcomes, response times,
uptime, user counts or matching accuracy. Analytics are raw database counts
only. Employer marketing copy is written as job descriptions, not as
performance claims.

## Quick start

```bash
npm install
cp .env.example .env.local   # then set at least AUTH_SECRET
npm run db:migrate
npm run db:seed              # fictional demo data, password demo-password-123
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL` the app runs on **PGlite** (embedded PostgreSQL) in
`./data/` — no services required. With `DATABASE_URL` set to PostgreSQL 14+,
the same schema and SQL run on the server.

## Demo accounts (all fictional)

Password for every account: `demo-password-123`

| Account | Role |
| --- | --- |
| `admin@workniche.example` | Platform administrator |
| `amara@example.com` … `kefilwe@example.com` | Job seekers |
| `hiring@novastack.example` | Employer (owner, NovaStack — fictional) |
| `recruiter@novastack.example` | Employer (recruiter, NovaStack — fictional) |
| `talent@cybershield.example`, `careers@cloudforge.example`, `jobs@datasphere.example`, `join@opengrid.example` | Employer owners (fictional companies) |

## What is implemented

- **Accounts & roles** — credentials sign-in (node scrypt hashing), optional
  Google/GitHub OAuth when env vars are set; JOB_SEEKER / EMPLOYER / RECRUITER
  / ADMIN; suspended accounts are cut off at the session layer.
- **Organizations** — memberships (OWNER / ADMIN / RECRUITER) decide internal
  permissions; verification states (UNVERIFIED / UNDER_REVIEW / VERIFIED /
  SUSPENDED) are stored and displayed exactly, set only by administrators.
- **Jobs** — full lifecycle (DRAFT → PUBLISHED / ARCHIVED, PUBLISHED →
  PAUSED / CLOSED, PAUSED → PUBLISHED / CLOSED, CLOSED → ARCHIVED) enforced
  in `src/lib/job-lifecycle.ts`; skills, screening questions, salary ranges,
  deadlines; internal applications or an external careers-page handoff.
- **Search & filters** — keyword (title/description/company/skill), category,
  employment type, workplace type, experience level, location, skill, salary
  floor, recency, four sort orders, pagination; every non-default filter is
  echoed back in plain language (`describeQuery`).
- **Applications** — one per candidate per job (database `UNIQUE`), cover
  letter + screening answers + optional résumé; append-only status history;
  candidate notes that are never selected by any applicant-facing query.
- **Recommendations** — scored from the seeker's own profile (matched skills,
  keyword hits, preference fit). Every score ships with its explanation; all
  skills matching is stated as such, and no confidence percentages are
  invented.
- **Alerts & notifications** — worker (`npm run worker`) matches alerts to new
  published jobs and sends deadline reminders, with per-(alert, job) and
  per-(application, day) dedupe keys so re-runs never duplicate.
- **Résumé storage** — local directory or S3 via one adapter; the only
  download path is `GET /api/files/[id]`, which authorizes the owner, an
  admin, or hiring-team members of jobs the résumé was attached to.
- **Administration** — moderation queue (resolve / dismiss / remove job /
  suspend org), organization verification, user suspension, platform counts
  that are raw database totals.
- **SEO** — `sitemap.xml` lists published jobs only; `robots.txt` keeps
  dashboards out; published jobs carry `JobPosting` JSON-LD.

## Checks

```bash
npm run check        # tsc --noEmit + vitest run + next build
npm run test         # 47 tests across 8 files
npm run test:e2e     # Playwright — requires browsers (npx playwright install)
```

The unit/integration suite covers: Zod boundaries, job lifecycle transitions,
password hashing, application uniqueness (database-enforced), append-only
status history, candidate-note privacy, notification dedupe, alert-worker
idempotency, search/filter/explain behavior and the recommendation scorer.
Playwright specs exist for the public flows; they run where browsers are
installed and are not part of `npm run check`.

## Environment variables

See `.env.example`. Required before publication: `AUTH_SECRET`. Optional:
OAuth credentials, `DATABASE_URL` (PostgreSQL), S3 storage settings, email
provider settings. **Email is not sent by this build** — password reset and
invitations that would require email state plainly that email is not
configured instead of pretending to deliver.

## Values required before treating this as a real product

1. A real company name and identity (replace the fictional demo orgs).
2. A real email provider (invitation and reset flows currently only state
   that email is not configured).
3. A real `AUTH_SECRET` and production `NEXT_PUBLIC_APP_URL`.
4. Legal pages: terms of service, privacy policy, acceptable-use policy.
5. A moderation policy and staffing commitment for the report queue.
6. A data-retention policy for applications and résumés.
7. An accessibility audit against the deployed build (the code targets WCAG
   2.2 AA; no external audit has been conducted).
8. Performance and uptime measurement before any availability claims — this
   build makes none.

## Known limitations

- Profile education/certification entries and résumé file upload UI are
  covered by the data model and server actions; the profile form in this
  build focuses on the fields that drive matching and hiring views.
- No real email delivery (deliberate — never simulate sends).
- Playwright end-to-end tests are provided but not executed in this
  environment (no browsers installed).
- PGlite is single-writer; use PostgreSQL for multi-instance deployment.
- The recommendation scorer is transparent weighting, not a trained model.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
