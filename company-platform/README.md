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

## Deploying on Vercel

This repository holds **every** project: the company website
(`company-platform/`) plus all consolidated project source (`projects/`,
`workniche/`, `stock-price-*/`, the root portfolio). The company website is
the Next.js app in `company-platform/` — import this repository into Vercel
and set:

| Setting | Value |
| --- | --- |
| Root Directory | `company-platform` |
| Framework preset | Next.js (auto-detected) |
| Build / Install command | defaults (`next build`, `npm install`) |

Environment variables (set in Vercel → Project → Settings → Environment
Variables; the same names as `.env.example`):

| Variable | What to supply |
| --- | --- |
| `AUTH_SECRET` | A long random secret (e.g. `openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` |
| `DATABASE_URL` | PostgreSQL 14+ connection string (e.g. a Supabase project). Unset in development falls back to embedded PGlite (`./data/`) — PGlite is development-only |
| `NEXT_PUBLIC_SITE_URL` | The public origin once it exists (Vercel URL or custom domain) — drives canonical URLs and the sitemap |
| Storage / contact variables | Optional; stay empty until supplied (see `.env.example`) |

Only `company-platform/` is built and served — `projects/` ships the
consolidated project source in the repository but is not part of the
deployment. Before public launch, complete `docs/LAUNCH_CHECKLIST.md`.

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
Source Code buttons appear only for the seven products with working apps —
vendored in this repository at `projects/mysul/mwangala/apps/<slug>/`, with the
buttons linking to those in-repo folders
(`docs/PROJECT_EVIDENCE.md` records every provenance link and its verification
status). No metrics, dates, user
counts, testimonials, or educational impact are claimed. E2E browser tests
(Playwright) are documented as future work because no browser runtime exists
in this build environment.
