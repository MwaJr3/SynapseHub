> **SynapseHub connected beta:** open `/synapsehub` for local knowledge-to-action
> workflows plus managed-auth, PDF library, selected-source retrieval, opt-in Ollama
> generation and explicit cloud sync. Expo mobile and Tauri desktop client projects
> are included. See [setup, verification status, native build limits and security](docs/SYNAPSEHUB_CONNECTED.md).
> Cloud API connectivity and email redirects require deployment configuration;
> native bundle exports are not signed or device-tested applications.
> [Release execution log and remaining setup](docs/SYNAPSEHUB_RELEASE.md): high-severity
> mobile audit findings remediated; corrected deployment awaits Vercel quota reset.

# Mwangala — Education Technology Portfolio

A React, TypeScript and Vite portfolio featuring 60 Frontend Mentor challenge briefs and 60 local-first interactive prototypes. The source challenge names and links are attributed to Frontend Mentor; the prototypes are independent explorations and are not presented as verified completions or endorsed work.

The repository also retains separate stock-analysis, WorkNiche and AI Music & Vocal Part Separator applications, a private browser-local Personal Operating System, and an operations-specification page. Each feature is documented with its real scope and limitations; no unconfigured external links or measured outcomes are claimed.

## Challenge collection and prototypes

- `/projects` lists the 60 sourced challenge records with URL-backed search, filters, sorting and pagination.
- `/projects/:slug` presents the sourced brief, attribution and current verification status.
- `/apps` and `/apps/:slug` expose one interactive, browser-first prototype per challenge. These are independent implementations, not certification that every original brief is complete.
- Challenge metadata and implementation status are kept distinct in `src/data/challengeManifest.ts` and `src/apps/appRegistry.ts`.
- Most flows store data only in the visitor's browser. A small number of tools request public APIs on submission; errors and service limits are surfaced in the UI.
- Reference screenshots, when present, are supplied visual references—not claims of completed or tested builds. See `docs/CHALLENGE_BUILD_PROMPTS.md` for the prompt set and source context.

---

## Stock analysis portfolio projects

Two editions are retained side by side:

- **[Version 1 — guided notebook](stock-price-analysis/README.md):** a self-contained, executed introduction to
  `yfinance`, Pandas date indexes, weekly/monthly `.resample()`, moving averages and volume comparison.
- **[Version 2 — comparative analytics workflow](stock-price-time-series-analysis/README.md):** the expanded,
  configurable project with reusable Python modules, strict validation, caching and provenance, returns/volatility/
  drawdown/correlation analysis, exportable reports, genuine generated visuals and 39 deterministic pytest tests.

Both versions document their archived samples and never invent observations. Version 1 reports when it uses its
fallback; Version 2 requires the data mode explicitly and never substitutes a failed live request.

---

## The WorkNiche application

`workniche/` is a complete full-stack job-marketplace application — the tenth
portfolio project, presented in the catalogue as [WorkNiche](src/data/projects/workniche.ts).
Next.js 15 + TypeScript + Drizzle (PostgreSQL, with an embedded PGlite mode for
local runs), credentials Auth.js, Zod at every boundary, database-enforced
product rules (one application per candidate per role, notification dedupe),
an append-only hiring pipeline, private candidate data and résumé storage, an
explainable recommendation scorer, an idempotent notification worker and an
admin moderation console.

Every organization, person and listing in its demo data is fictional and
labelled fictional inside the product. See [workniche/README.md](workniche/README.md)
for setup, demo accounts, its honesty statement and the values required before
treating it as a real product, and [workniche/docs/DEPLOYMENT.md](workniche/docs/DEPLOYMENT.md)
for deployment.

---

## The AI Music & Vocal Part Separator application

`vocal-separator/` is a standalone full-stack audio workspace — catalogued as
[AI Music & Vocal Part Separator](src/data/projects/vocal-separator.ts) without
changing the separate 60-record Frontend Mentor challenge manifest. It combines
a React/TypeScript practice workspace with a FastAPI backend, owner-scoped
projects, staged separation jobs, synchronized stem playback, estimated pitch
tracks, confidence-gated experimental voice-part reconstruction, signed media
downloads and ZIP exports.

Level-1 separation uses a Demucs adapter only when that engine and its weights
are genuinely available; otherwise Auto mode visibly falls back to a real
exact-sum DSP engine. Individual soprano/alto/tenor/bass-style outputs are
labelled as reconstructions, probabilities remain visible, and insufficient
evidence yields Unknown or a withheld part instead of a fabricated stem. See
[vocal-separator/README.md](vocal-separator/README.md) for setup and honesty
limits, [vocal-separator/docs/ARCHITECTURE.md](vocal-separator/docs/ARCHITECTURE.md)
for the system design, and
[vocal-separator/docs/DEPLOYMENT.md](vocal-separator/docs/DEPLOYMENT.md) for
Docker/PostgreSQL/Redis deployment.

---

## The operations layer

`src/data/operations.ts` and the console at [/operations](src/pages/OperationsPage.tsx)
adapt seven common product-dashboard concepts — status page, changelog,
analytics, waitlist counter, revenue dashboard, backend health, frontend
performance — for education-technology programmes under this portfolio's
honesty rules. Each module ships **explicit states**, **metric definitions**
(how a value would be computed and from which records) and one **integrity
rule**, and the source series is named openly on the page.

The SaaS demonstration figures those dashboards show — uptime percentages,
MRR, churn, waitlist totals, active-user counts — appear **nowhere**: this
layer is a specification for honest operations reporting, not a fake live
dashboard. Tests enforce the contract, including a figure guard that fails
the build if percentages, currency amounts or vanity totals ever enter the
data.

---

## What is implemented

| Area               | Detail                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes             | `/`, `/system`, `/about`, `/projects`, `/projects/:slug` (60 challenge records), `/apps`, `/apps/:slug` (60 prototypes), `/skills`, `/journey`, `/approach`, `/operations`, `/contact`, custom 404                                      |
| Personal OS        | Private local-first 90-day workspace for identity, Tier 1–3 goals, projects, weekly capacity and actions, decisions, energy, blocker interventions, meaning, reviews, learning, relationships, personal doctrine, a simple financial ledger, cycle archives, and validated JSON export/import |
| Catalogue          | 60 sourced Frontend Mentor challenge records plus 60 uniquely mapped local-first prototype definitions                                                                                                                           |
| Discovery          | Search over challenge metadata; category, type and difficulty filters; sorting and shareable URL state; 12-item pagination and clear-filter state                                                                                  |
| Case studies       | Challenge-source context, attribution, prototype link and explicit verification status                                                                                                                                            |
| Links and attribution | Official challenge source URLs remain separate from prototypes; no unconfigured demo, repository or profile links are shown                                                                                                              |
| Theming            | Light / Dark / System with persistence, an OS listener, pre-paint initialisation (no wrong-theme flash) and a hybrid tone system (light surfaces + intentional dark panels)                                                        |
| Visuals            | Representative interface visuals are clearly labeled; supplied reference images are not presented as verified prototype screenshots                                                                                                      |
| Accessibility      | Semantic landmarks, skip link, keyboard-accessible mobile menu with Escape handling, visible focus states, live regions for search results and copy feedback, `prefers-reduced-motion` support, text equivalents for every diagram |
| SEO                | Per-page titles and descriptions, Open Graph metadata, canonical URLs only when a site origin is configured, `robots.txt` and an optional sitemap generator                                                                       |
| Quality            | TypeScript strict mode, unit/component/routing tests, ESLint, data-integrity checks, and production build (see the verification run below)                                                                                   |

### Honesty rules the code enforces

- No invented external URLs, screenshots, learner statistics, accuracy figures, coverage percentages, testimonials
  or partnerships — the catalogue is validated for placeholder domains and unfinished markers.
- A missing or malformed URL (including `javascript:`, `data:` and plain `http:` outside localhost) is **dropped**,
  and the related button disappears. A repository URL is never substituted into a demo slot, or the reverse.
- Interface previews are illustrations drawn from the site's own design system, labelled as such in the frame and
  in the caption. Real screenshots take precedence automatically once supplied.
- Availability wording, contact channels and external profiles appear only when configured.

---

## Stack

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 4 with a token-based theme system · React Router 7 ·
Vitest + Testing Library · ESLint 9 · Prettier · self-hosted Inter and JetBrains Mono (no external font requests).
No backend is required to display the portfolio; a contact form activates only when a real submission endpoint is
configured.

---

## Personal Operating System

`/system` is a browser-local workspace that lives alongside the portfolio. It is built on the repository’s existing
React/TypeScript/Vite stack, not as a separate Python/Tkinter application. It deliberately begins with an empty
workspace rather than synthetic personal records.

- **Direction:** vision, identity, values, standards, measurable goals, project portfolio, and 12-week cycle details.
- **Execution:** a stated weekly capacity, actions with an estimate and cognitive demand, today’s priorities, an
  overcommitment warning, and a local time-block scheduler with ICS export (not calendar-account sync).
- **Diagnosis and adaptation:** energy checks, trigger/response maps, blocker occurrences, a three-minute activation
  timer, decisions, weekly reviews, meaning entries, post-mortems, and evidence-only monthly/quarterly trends.
- **Strategic growth:** learning paths, deliberately minimal relationship records, practical doctrine statements,
  and a simple multi-currency financial ledger.
- **Continuity:** v1 → v2 → v3 browser-data migration, corrupt-payload preservation, full/scoped/redacted exports,
  optional Web-Crypto encrypted transfer files, bounded local record history/restore, and immutable 12-week snapshots.
- **Optional desktop utility:** `tools/personal_os_companion` is a separate offline Python/Tkinter reviewer for
  user-selected backup shapes and manual CSV review; it has no browser-storage, bank, cloud-sync, or advice capability.

See [the Personal OS guide](docs/PERSONAL_OPERATING_SYSTEM.md) for workflows, privacy, data recovery, and the
implemented-versus-planned feature inventory. See [the implementation audit](docs/PERSONAL_OS_AUDIT.md) for the
actual repository architecture and deliberate scope boundaries.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command              | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `npm run dev`        | Development server (bound to `0.0.0.0` so container previews work) |
| `npm run build`      | Type check, then production build into `dist/`                     |
| `npm run preview`    | Serve the production build locally                                 |
| `npm run typecheck`  | `tsc --noEmit`                                                     |
| `npm run lint`       | ESLint over the repository                                         |
| `npm test`           | Vitest run (unit, component and routing tests)                     |
| `npm run test:watch` | Vitest in watch mode                                               |
| `npm run check`      | Type check → lint → tests → build                                  |
| `npm run sitemap`    | Generate `public/sitemap.xml` (requires `VITE_SITE_URL`)           |

---

## Project structure

```text
src/
  apps/                 Unique registry and shared game logic for all 60 prototypes
  components/apps/      Local-first interactive app families
  components/navigation/Responsive site header/footer and shared layout
  data/challengeManifest.ts   Sourced challenge metadata and completion-status flags
  features/personal-os/ Private browser-local personal workspace
  pages/                Portfolio, challenge, prototype, operations and personal-system routes
  styles/               Portfolio and prototype styling
workniche/              Separate Next.js job-marketplace application
vocal-separator/        Separate FastAPI + React AI music/vocal-part separator
company-platform/       Separate Next.js company-discovery application
projects/               All other projects, consolidated here (mysul/, cbu-assignments/) — see projects/README.md
stock-price-analysis/   Guided stock-analysis notebook edition
docs/                   Build prompts, implementation notes and project documentation
scripts/                Sitemap and asset utilities
tools/personal_os_companion/  Optional offline Python review utility
```

### Design system in one paragraph

Three tones share one token set: `surface` (light surfaces by default, deep surfaces in dark mode), `contrast`
(the intentional dark panels used by the hero, featured work and closing CTAs) and `quiet` (a subtly raised band).
Because a tone is a CSS custom-property scope rather than a second template, cards, borders, code blocks, focus
rings and diagrams all adapt together in Light, Dark and System modes while the section hierarchy stays intact.

---

## Configuration before publication

Copy `.env.example` to `.env.local` and supply what you own. Everything is optional; empty values simply hide the
corresponding UI.

| Variable                               | Used for                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SITE_URL`                        | Canonical URLs, Open Graph URLs, sitemap. Without it no canonical URL is emitted (the copy-link control copies the visitor's own address instead).                         |
| `VITE_CONTACT_EMAIL`                   | Email link on the Contact page and footer                                                                                                                                  |
| `VITE_CONTACT_ENDPOINT`                | Enables the contact form. Must be an HTTPS endpoint accepting `{ name, email, subject, message }` JSON that performs its own validation, spam protection and rate limiting |
| `VITE_AVAILABILITY_STATEMENT`          | Optional availability sentence; leave empty to avoid implying paid availability                                                                                            |
| `VITE_GITHUB_URL`, `VITE_LINKEDIN_URL` | Profile links (hidden when unset)                                                                                                                                          |

Only configure destinations that are real and controlled. Challenge attribution lives in `src/data/challengeManifest.ts`; the prototype routes are local, and unconfigured external destinations are omitted.

---

## Updating the challenge collection

1. Challenge-source metadata and implementation status live in `src/data/challengeManifest.ts`.
2. Prototype route definitions are registered in `src/apps/appRegistry.ts`; shared interface implementations live in `src/components/apps/`.
3. Run `npm run check` after changes to verify types, lint, tests and the production build. The registry and tests guard against missing or duplicate prototype slugs.
4. Only add genuine captures when they exist. Supplied reference images must remain labelled as references and must not be represented as verified output from these prototypes.

---

## Maintaining challenge attribution

Challenge titles and source links are recorded in `src/data/challengeManifest.ts`. Keep the official source URL, access tier, difficulty and challenge category separate from implementation status. The portfolio is independent and is not affiliated with or endorsed by Frontend Mentor. Do not add deployment, repository or social links unless a real, configured destination exists.

---

## Deployment

The build output is a static SPA in `dist/`.

- **Company website:** `company-platform/` is a separate Next.js app, deployed
  on Vercel from this repository with Root Directory `company-platform/` —
  see `company-platform/README.md`. Every project's source is in this same
  repository (`projects/`, `workniche/`, `stock-price-*/`), so the hosted
  company site and all project code share one home.

- **Any static host / CDN:** upload `dist/`. Configure a single-page fallback to `index.html` so direct navigation
  and refresh work on `/projects/:slug`. `public/_redirects` already provides the Netlify form of this rule;
  Vercel needs a `vercel.json` rewrite, and Nginx/Apache need an equivalent `try_files`/`.htaccess` rule.
- **Sitemap:** set `VITE_SITE_URL` and run `npm run sitemap` before uploading (the file is generated, not committed).
- **Contact form:** point `VITE_CONTACT_ENDPOINT` at your form service or endpoint. Without it, no form is rendered.
- **Social preview image:** `public/og-image.png` is referenced through `VITE_SITE_URL`; add a genuine image before
  publishing if you want a rich preview card.

---

## Checks executed for this build

| Check      | Command            | Result                                                                                 |
| ---------- | ------------------ | -------------------------------------------------------------------------------------- |
| Type check | `npm run typecheck` | Passed                                                                                       |
| Lint       | `npm run lint`      | Passed                                                                                       |
| Tests      | `npm test`          | 13 files, 584 tests, all passing                                                            |
| Build      | `npm run build`     | Succeeded; route-level code splitting                                                       |
| Dev server | `npm run dev`       | Serves the portfolio routes and unknown routes through the SPA fallback                    |

The test suite covers the challenge manifest and all 60 app routes, interactive prototype flows, URL-backed discovery, the personal operating system, the operations layer and shared site controls. The standalone company-platform and WorkNiche applications have their own check scripts and are not part of this root `npm run check` run.

Automated accessibility checks (axe) and end-to-end browser runs are **not** included; the accessibility work here
is semantic markup, focus management, live regions, contrast-reviewed tokens and reduced-motion handling, reviewed
by hand rather than by a tool. No Lighthouse or performance score is published because none was measured in this
environment.

---

## Known limitations

- The 60 frontend prototypes are independent practice builds. They are not verified as complete against every original challenge acceptance criterion.
- Most prototype data is local to the current browser. These interactions are not connected to production accounts or backends.
- Public API-backed tools depend on their upstream services and may encounter rate limits or network failures.
- No learning-outcome, adoption or performance metrics are claimed because none have been measured.
- The contact form requires a configured real endpoint; email delivery and spam protection are that endpoint's responsibility.
- Automated visual regression and end-to-end browser testing are not configured for this portfolio.

### Ollama Cloud setup

The workspace now offers Ollama Cloud (`gemma4:31b`) alongside the existing local
adapter. See [server-only key setup, UI selection and real-request smoke command](docs/OLLAMA_CLOUD.md).
The live smoke attempt was network-blocked in this sandbox; no real model reply
has been received or fabricated.
