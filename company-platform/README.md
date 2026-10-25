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
  `/support` (Velaqori IT triage), `/study-plan` (Tamuzi study planning),
  `/privacy/[companySlug]`, `/terms/[companySlug]`, 404.
- **Member area** (`/member/*`): sign in, dashboard, profile editor (education,
  experience, skills, certifications, links, resume), preview, resume management,
  portfolio links, publication status with draft → review → publish → withdraw.
- **Editorial admin** (`/admin/*`): companies, products, solutions, case studies,
  people, review queue, media, settings — company-scoped permissions throughout.
- **Honesty rules built in**: status labels (built ≠ deployed), demo/source
  buttons hidden unless configured, seed content labelled fictional,
  visuals labelled illustrative, contact delivery states reported truthfully.
- **Two assistants, one per company**, each grounded in that company's own
  pages. See below.

## The two assistants

`/support` is Velaqori's IT and security triage helper; `/study-plan` is Tamuzi's
study planner. They share code and nothing else: a separate corpus, a separate
prompt, a separate conversation, and a separate company.

| Layer | What it does | Where |
| --- | --- | --- |
| Grounding | Token-overlap retrieval over that assistant's own corpus. Nothing scores → the model is told there is no material and must say so. | `src/lib/assistant/retrieve.ts` |
| Provider | Any OpenAI-compatible endpoint. Hugging Face's router is the intended default; Groq, OpenRouter and a local Ollama all work. | `src/lib/assistant/provider.ts` |
| Streaming | `POST /api/assistant/<name>` returns SSE: `citations`, then `delta` frames, then `done` — or `error` with `retryable`. | `src/lib/assistant/stream.ts` |
| UI | `AssistantChat` — streaming transcript, what the answer used, stop button, honest switched-off state. | `src/components/assistant-chat.tsx` |

Rules the tests pin: the two corpora share no entries; the guardrails forbid
promising response times, prices, breaches, mastery or enrolment; a client cannot
inject a system turn; the token is sent as a bearer header and never appears in
the request body; a provider outage produces an error and never a `done`; and
with no configuration the route answers 503 with the reason instead of serving a
chat box that cannot answer.

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
| `ASSISTANT_BASE_URL`, `ASSISTANT_MODEL`, `ASSISTANT_API_KEY` | Optional. Without them both assistants are switched off and say so. A Hugging Face token (`https://router.huggingface.co/v1`) is the intended default; `ASSISTANT_API_KEY` may also be `HUGGINGFACE_API_KEY` or `HF_TOKEN` |

Only `company-platform/` is built and served — `projects/` ships the
consolidated project source in the repository but is not part of the
deployment. Before public launch, complete `docs/LAUNCH_CHECKLIST.md`.

## Tests

```bash
npm test
```

Vitest suite (85 tests): assistant grounding, provider configuration, streaming
and event framing; catalogue integrity (25/13/12 counts, case-study completeness,
no invented URLs), product search/filter/sort, external-link policy,
authorization (cross-company isolation, own-profile-only, suspended members,
platform boundaries, audit), draft privacy (unpublished content and private
resumes unreadable), and member workflow (draft → submit → review → publish →
withdraw, resume withdrawal kills downloads).

## Honesty statement

Seed products, case studies, and demo people are working records derived from
project briefs — illustrative and labelled as such. "Built" means an
implementation exists and was tested; it does **not** mean publicly deployed.
The two assistants answer only from the company pages held in
`src/content/assistants.ts`; they do not know grades, service levels, prices or
security posture, and are instructed to say so. No model quality has been
verified in this environment — no provider is reachable from it, so the streaming
path is tested against a fake provider, not a live one. Source Code buttons appear
only for the seven products with working apps —
vendored in this repository at `projects/mysul/mwangala/apps/<slug>/`, with the
buttons linking to those in-repo folders
(`docs/PROJECT_EVIDENCE.md` records every provenance link and its verification
status). No metrics, dates, user
counts, testimonials, or educational impact are claimed. E2E browser tests
(Playwright) are documented as future work because no browser runtime exists
in this build environment.
