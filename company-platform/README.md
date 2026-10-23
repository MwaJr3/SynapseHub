# Company Platform — Velaqori Systems & Tamuzi Learning

One shared discovery platform for **two independent companies**:

- **Velaqori Systems** — software and cybersecurity (working name)
- **Tamuzi Learning** — education technology (working name)

The companies are separate businesses. No parent-subsidiary relationship,
shared staff, shared liability, shared data controllership, or certification
status is claimed anywhere. Both names are working names pending trademark
checks; legal details stay empty and configurable until officially supplied.

## What is here

- **25 products** in one typed catalogue (13 Velaqori + 12 Tamuzi), each with a
  permanent internal route and its own project-specific case study covering the
  required 16 sections (problem, constraints, workflow, architecture, data
  model, engineering decisions, testing, limitations, contributors, and more).
- **Public routes**: `/`, `/companies(/[slug]` + `/about)`, `/solutions(/[slug])`,
  `/products(/[slug])` with working search + composing filters + sorting,
  `/case-studies(/[slug])`, `/people(/[slug])`, `/about`, `/contact`,
  `/privacy/[companySlug]`, `/terms/[companySlug]`, 404.
- **Member area** (`/member/*`): sign in, dashboard, profile editor (education,
  experience, skills, certifications, links, resume), preview, resume management,
  portfolio links, publication status with draft → review → publish → withdraw.
- **Editorial admin** (`/admin/*`): companies, products, solutions, case studies,
  people, review queue, media, settings — company-scoped permissions throughout.
- **Honesty rules built in**: status labels (built ≠ deployed), demo/source
  buttons hidden unless configured, seed content labelled fictional,
  visuals labelled illustrative, contact delivery states reported truthfully.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Drizzle ORM ·
PostgreSQL (or embedded PGlite for development) · Auth.js credentials
(node scrypt) · Tailwind CSS · Zod · Vitest.

## Run it locally

```bash
npm install
npm run db:migrate   # applies drizzle/*.sql to PGlite (./data) or DATABASE_URL
npm run db:seed      # 2 companies, 25 products + case studies, demo accounts
npm run dev          # http://localhost:3000
```

Production-style:

```bash
npm run check        # typecheck + tests + production build
npm run start
```

### Demo accounts (SYNTHETIC — fictional demo data)

| Email | Role | Password |
| --- | --- | --- |
| `demo.member@example.com` | MEMBER | `demo-password-123` |
| `demo.editor.velaqori@example.com` | EDITOR (Velaqori) | `demo-password-123` |
| `demo.member.tamuzi@example.com` | MEMBER (Tamuzi) | `demo-password-123` |

These exist to exercise the workflows. Replace them with real accounts before
launch. A platform-operator account is created by whoever runs the deployment
(see `docs/LAUNCH_CHECKLIST.md`).

## Configuration

Copy `.env.example` to `.env.local`. Everything optional stays empty until
supplied — nothing is invented. See `docs/LAUNCH_CHECKLIST.md` for the full
pre-launch list and `DELIVERY_REPORT.md` for the final delivery report.

## Tests

```bash
npm test
```

Vitest suite: catalogue integrity (25/13/12 counts, case-study completeness,
no invented URLs), product search/filter/sort, external-link policy,
authorization (cross-company isolation, own-profile-only, suspended members,
platform boundaries, audit), draft privacy (unpublished content and private
resumes unreadable), and member workflow (draft → submit → review → publish →
withdraw, resume withdrawal kills downloads).

## Honesty statement

Seed products, case studies, and demo people are working records derived from
project briefs — illustrative and labelled as such. "Built" means an
implementation exists and was tested; it does **not** mean publicly deployed.
Source Code buttons appear only for the seven products whose working apps were
verified in the owner-supplied MySul source (`docs/PROJECT_EVIDENCE.md` records
every evidence link and its verification status). No metrics, dates, user
counts, testimonials, or educational impact are claimed. E2E browser tests
(Playwright) are documented as future work because no browser runtime exists
in this build environment.
