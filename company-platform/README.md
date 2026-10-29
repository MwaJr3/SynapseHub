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
| Flow | The declared steps, executed and traced; settings read from the nodes. | `src/content/flows.ts`, `src/lib/assistant/flow.ts` |
| Streaming | `POST /api/assistant/<name>` returns SSE: `step`, then `citations`, then `delta` frames, then `done` — or `error` with `retryable`. | `src/lib/assistant/stream.ts` |
| Handoff | Confirmed requests only, company from the assistant, triaged in `/admin/support`. | `src/lib/support/requests.ts`, `src/app/api/assistant/[assistant]/handoff/route.ts` |
| UI | `AssistantChat` — streaming transcript, what the answer used, stop button, honest switched-off state. | `src/components/assistant-chat.tsx` |

Rules the tests pin: the two corpora share no entries; the guardrails forbid
promising response times, prices, breaches, mastery or enrolment; a client cannot
inject a system turn; the token is sent as a bearer header and never appears in
the request body; a provider outage produces an error and never a `done`; and
with no configuration the route answers 503 with the reason instead of serving a
chat box that cannot answer.

### Flows, traces and the support inbox

Each assistant is declared as an ordered flow (`src/content/flows.ts`):
`retrieve → guard → policy → compose → structure`. The route runs that flow, so
the settings used in a request are the ones the page displays — the diagram cannot
drift from the behaviour. If the `guard` node finds no material, no model is
called and the visitor is told the site does not cover it.

Every answer carries a trace ("How this answer was produced") and the material it
used. `POST /api/assistant/<name>` emits `step` frames before the text.

"Hand this to a person" creates a **support request**: a reference to quote, the
transcript, the contact details and a status. Nothing is created until the visitor
confirms — the server rejects an unconfirmed request with 409 and writes nothing.
The company is resolved from the assistant, so a visitor cannot file into the
other company's queue. Staff triage these at `/admin/support`, scoped to the
companies they hold a role in, and each status change is written to the audit log.

## The umbrella page

`/ecosystem` is where the Tamuzi learning systems are explained together: Tessera
(the learner model), ReachLearn (delivery), OpenLearn Commons (open-licensed
catalogue) and EduAccess (access). Each card states what that system does that its
neighbours do not, because the products are only worth keeping separate if the
difference is real.

Every link there is configuration (`NEXT_PUBLIC_TESSERA_URL` and friends). An
unconfigured system is still listed and says **"Not deployed yet"** — it is not
given a `#` and it is not quietly hidden. `src/content/ecosystem.ts` is the only
place a URL is resolved, and `safeUrl()` refuses anything that is not absolute
http(s), so a `javascript:` value in an environment variable cannot become a link.

The reverse direction exists too: Tessera's header links back here when
`VITE_COMPANY_SITE_URL` is set, and otherwise reads "A Tamuzi Learning product"
with no anchor.

## Answers that must meet a declared shape

Each assistant flow declares what its finished answer should look like
(`minChars`, `maxChars`, and must end on an action), and the stream checks the
answer against that declaration. `done` carries `{ ok, problems[] }`; when a check
fails, the interface says **"This answer is incomplete"** and lists why, instead of
presenting a truncated answer as a considered one. The idea is CrewAI's task model:
a task states its expected output and the work is checked before it is accepted.

## Named AI providers

`ASSISTANT_PROVIDER` supplies the endpoint and a default model, so a deployment
needs a name and a key rather than a URL and a model id:

| `ASSISTANT_PROVIDER` | Endpoint | Default model |
| --- | --- | --- |
| `huggingface` | `https://router.huggingface.co/v1` | `meta-llama/Llama-3.3-70B-Instruct` |
| `ollama-cloud` | `https://ollama.com/v1` | `nemotron-3-nano:30b` |
| `ollama-local` | `http://127.0.0.1:11434/v1` | `qwen2.5:3b` (no key) |
| `groq` | `https://api.groq.com/openai/v1` | `openai/gpt-oss-20b` |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-flash-latest` |
| `openrouter` | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat-v3:free` |
| `openai` | (default) | `gpt-4o-mini` (no free tier) |

Explicit `ASSISTANT_BASE_URL` / `ASSISTANT_MODEL` still override the preset. An
unknown provider name does not fall back to anything: the assistant reports itself
unconfigured and names the variable, so a typo is visible rather than billed.

## Connecting to Tessera (optional, read-only)

The study planner works without this. When a learner connects a Tessera account, the
page can show their objectives, what is due, and where the evidence is strong or
thin — and nothing else.

The connection is a standard delegated-authorization flow, not a shared login:

1. `GET /api/tessera/connect` (signed-in learners only) creates a PKCE verifier and a
   `state`, stores them in an httpOnly cookie, and sends the browser to Tessera's own
   consent screen.
2. Tessera shows the exact scope, purpose and revocation terms; the learner chooses
   **Connect** or **Not now**.
3. Tessera redirects back with a single-use code; `/api/tessera/callback` checks the
   state and exchanges the code server-side. The verifier never appears in a URL.
4. The access token lives in an httpOnly cookie for one hour and is sent only in an
   `Authorization` header. `/api/tessera/summary` proxies the read.
5. `POST /api/tessera/disconnect` revokes the token at Tessera, then clears the cookie.

Failures are values, not pages: unconfigured, not connected, expired, unavailable.
In every case the planner keeps planning and the panel says which of the four it is.
There is no cached summary, so "last refreshed" is always true.

Configuration is three variables in `.env.example`; all or none. Contract, consent
model and acceptance tests: `docs/integration/study-planner-tessera.md`.

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

## Deploying

**Nothing is deployed at the time of writing.** The hosting configuration was
removed on 2026-10-28 so this repository can be restructured and redeployed
deliberately; see `docs/deployment/README.md`. This section describes what a
future deployment of the company website would need — it is not currently
wired up, and no file in the repository configures it.

This repository holds **every** project: the company website
(`company-platform/`) plus all consolidated project source. The company
website is the Next.js app in `company-platform/`, and it is the umbrella:
visitors enter here and reach the other applications through it.

A host needs: the root directory `company-platform`, the Next.js preset, and
the default build commands. Environment variables (same names as
`.env.example`):

| Variable | What to supply |
| --- | --- |
| `AUTH_SECRET` | A long random secret (e.g. `openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` |
| `DATABASE_URL` | PostgreSQL 14+ connection string. Unset in development falls back to embedded PGlite (`./data/`) — PGlite is development-only |
| `NEXT_PUBLIC_SITE_URL` | The public origin once it exists — drives canonical URLs and the sitemap |
| Storage / contact variables | Optional; stay empty until supplied (see `.env.example`) |
| `ASSISTANT_BASE_URL`, `ASSISTANT_MODEL`, `ASSISTANT_API_KEY` | Optional. Without them both assistants are switched off and say so. A Hugging Face token (`https://router.huggingface.co/v1`) is the intended default; `ASSISTANT_API_KEY` may also be `HUGGINGFACE_API_KEY` or `HF_TOKEN` |

Only `company-platform/` is built and served — the individual projects ship
as source in this repository but are not part of that deployment. Before
public launch, complete `docs/LAUNCH_CHECKLIST.md`.

## Tests

```bash
npm test
```

Vitest suite (122 tests): assistant grounding, provider configuration, flows and
traces, streaming and event framing, answer expectations (a truncated or
question-ending answer is reported, not accepted), the confirmed-only handoff and
inbox scoping, the ecosystem links (configured-only, no placeholders); catalogue integrity (25/13/12 counts, case-study completeness,
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
vendored in this repository at `sites/portfolio/public/demos/<slug>/`, with the
buttons linking to those in-repo folders
(`docs/PROJECT_EVIDENCE.md` records every provenance link and its verification
status). No metrics, dates, user
counts, testimonials, or educational impact are claimed. E2E browser tests
(Playwright) are documented as future work because no browser runtime exists
in this build environment.
