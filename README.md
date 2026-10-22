# Mwangala — Education Technology Portfolio

A production-ready portfolio website for nine education-technology projects, built catalogue-first: every
project is fully documented as a case study now, and each one is connected to its live application and source
repository later, from a single configuration file — without touching any component.

The site's message: **software that explores how technology can make learning more accessible, personalized and
useful** — offline-first study, grounded AI tutoring, evidence-based assessment, teacher workflows, open resources,
learning analytics, phone-based delivery and affordable access.

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

## What is implemented

| Area               | Detail                                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes             | `/`, `/system`, `/about`, `/projects`, `/projects/:slug` (9), `/skills`, `/journey`, `/approach`, `/contact`, custom 404                                                                                                             |
| Personal OS        | Private local-first 90-day workspace for identity, Tier 1–3 goals, projects, weekly capacity and actions, decisions, energy, blocker interventions, meaning, reviews, learning, relationships, personal doctrine, a simple financial ledger, cycle archives, and validated JSON export/import |
| Catalogue          | 9 typed project records in `src/data/projects/`, one file per project, rendered from a single source of truth                                                                                                                      |
| Discovery          | Working search (name, description, category, technology, feature, problem, users), 10 combinable filters, sorting, active-filter list, clear-all, empty state, shareable `?q=&category=&sort=` URLs                                |
| Case studies       | Problem and users → workflow → features → architecture → engineering decisions → testing → interface previews → limits and roadmap → related projects                                                                              |
| Deployment linking | `src/config/deployment.ts` registry drives _Live demo_ and _Source code_ everywhere; unconfigured links are hidden, never faked                                                                                                    |
| Theming            | Light / Dark / System with persistence, an OS listener, pre-paint initialisation (no wrong-theme flash) and a hybrid tone system (light surfaces + intentional dark panels)                                                        |
| Visuals            | Nine distinct illustrative SVG compositions (lesson library, session schedule, grounded tutor, skill map, authoring studio, resource catalogue, analytics, SMS/USSD delivery, access plans), each labelled _Illustrative preview_  |
| Accessibility      | Semantic landmarks, skip link, keyboard-accessible mobile menu with Escape handling, visible focus states, live regions for search results and copy feedback, `prefers-reduced-motion` support, text equivalents for every diagram |
| SEO                | Per-page titles and descriptions, Open Graph and Twitter metadata, canonical URLs only when a domain is configured, JSON-LD (`Person`, `SoftwareApplication`), `robots.txt`, optional sitemap generator                            |
| Quality            | TypeScript strict mode, 76 unit/component/integration tests, ESLint (TypeScript + hooks + jsx-a11y), data-integrity validation, production build                                                                                   |

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

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 3 with a token-based theme system · React Router 6 ·
Vitest + Testing Library · ESLint 9 · Prettier · self-hosted Inter and JetBrains Mono (no external font requests).
No backend is required to display the portfolio; a contact form activates only when a real submission endpoint is
configured.

---

## Personal Operating System

`/system` is a browser-local workspace that lives alongside the portfolio. It is built on the repository’s existing
React/TypeScript/Vite stack, not as a separate Python/Tkinter application. It deliberately begins with an empty
workspace rather than synthetic personal records.

- **Direction:** vision, identity, values, standards, measurable goals, project portfolio, and 12-week cycle details.
- **Execution:** a stated weekly capacity, actions with an estimate and cognitive demand, today’s priorities, and
  an overcommitment warning.
- **Diagnosis and adaptation:** energy checks, trigger/response maps, blocker occurrences, a three-minute activation
  timer, decisions, weekly reviews, meaning entries, and post-mortems.
- **Strategic growth:** learning paths, deliberately minimal relationship records, practical doctrine statements,
  and a simple multi-currency financial ledger.
- **Continuity:** versioned browser storage, a v1 → v2 migration, corrupt-payload preservation, JSON export/import,
  and immutable 12-week cycle snapshots before a new cycle starts.

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
  components/
    home/          Hero + conceptual portfolio map, focus areas, featured projects, principles, CTA
    layout/        PageHeader (shared page intro)
    navigation/    SiteHeader, mobile menu, ThemeSwitcher, SiteFooter, RootLayout
    projects/      ProjectCard, filters, workflow, features, architecture, preview gallery,
                   related projects, deployment panel, copy-link, external actions
    ui/            Button, Section, TagList, Callout, EmptyState, Reveal
    visuals/       VisualFrame primitives + nine project compositions + ProjectVisual switch
  config/          site.ts (profile, contact, URL validation) · deployment.ts (project links)
  data/            projects/ (nine records + index/merge) · categories · skills · journey ·
                   approach · focus-areas · principles
  hooks/           usePageMeta · useCopyLink · useReveal
  lib/             filters · validate · theme · clipboard · format · cn
  pages/           HomePage, AboutPage, ProjectsPage, ProjectDetailPage, SkillsPage, JourneyPage,
                   ApproachPage, ContactPage, NotFoundPage
  providers/       ThemeProvider
  styles/          index.css (design tokens + tone scopes + component layer)
  test/            Vitest setup and render helpers
docs/
  CONNECTING_PROJECTS.md   How to wire a case study to its app and repository
scripts/
  generate-sitemap.mjs
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

Project application/repository links are **not** environment variables — they live in
`src/config/deployment.ts`. See [docs/CONNECTING_PROJECTS.md](docs/CONNECTING_PROJECTS.md).

---

## Updating project information

1. **Edit one file.** Each project is one record: `src/data/projects/<slug>.ts`. Descriptions, features, workflow,
   architecture, engineering decisions, testing, limitations and roadmap all live there, typed by
   `PortfolioProject` in `src/types/index.ts`.
2. **Catalogue-wide lists** live in `src/data/`: `categories.ts` (library filters), `skills.ts`, `journey.ts`,
   `approach.ts`, `focus-areas.ts` (home-page domains and responsible-technology principles).
3. **Validate.** `npm run check` runs `src/lib/validate.ts` over the catalogue: exactly nine projects, unique slugs
   and ids, categories that exist, related slugs that exist and are reciprocated, unique short descriptions,
   architecture nodes that connect only to real neighbours, previews that never claim to be screenshots, and no
   placeholder domains. Development builds also log issues to the console.
4. **Add real screenshots.** Put files in `public/screenshots/<slug>/` and set `screenshotSrc` on the preview you
   are replacing. The gallery then renders the captured image instead of the illustrative composition and labels it
   as a capture.

---

## Connecting a project to its application and repository

See [docs/CONNECTING_PROJECTS.md](docs/CONNECTING_PROJECTS.md) for the full walkthrough. The short version:

```ts
// src/config/deployment.ts
export const deploymentRegistry: DeploymentRegistry = {
  learnbridge: {
    liveDemoUrl: 'https://learnbridge.your-domain.org',
    repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
    demoNote: 'Seeded demo learner; synthetic, resettable data only.',
  },
};
```

That single entry makes the _Live demo_ and _Source code_ buttons appear on the project card, the case-study
header, the deployment panel and the footer status counters — everywhere at once.

---

## Deployment

The build output is a static SPA in `dist/`.

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
| Type check | `npx tsc --noEmit` | Passed (strict mode, no `any`)                                                         |
| Lint       | `npx eslint .`     | Passed, no errors or warnings                                                          |
| Tests      | `npx vitest run`   | 6 files, 76 tests, all passing                                                         |
| Build      | `npm run build`    | Succeeded; main bundle ≈ 288 kB (≈ 90 kB gzip) plus route-level chunks                 |
| Dev server | `npm run dev`      | Serves `/`, `/projects`, `/projects/:slug` and unknown routes through the SPA fallback |

The test suite covers: catalogue integrity (all nine projects, unique slugs, valid categories, reciprocal related
links, architecture edges, preview honesty, no placeholder domains or invented metrics), URL validation (scheme and
host rules, field-swap protection, registry merge behaviour), search/filter/sort logic and query-string round trips,
theme resolution and persistence, and rendered routing — every case study route, the unknown-slug state, the 404
page, library search and filter combinations, the theme switcher and the mobile menu's Escape behaviour.

Automated accessibility checks (axe) and end-to-end browser runs are **not** included; the accessibility work here
is semantic markup, focus management, live regions, contrast-reviewed tokens and reduced-motion handling, reviewed
by hand rather than by a tool. No Lighthouse or performance score is published because none was measured in this
environment.

---

## Known limitations

- The nine applications are documented as case studies; no deployment or repository exists yet, so the project-link
  panels currently state "not yet connected" by design.
- Interface previews are illustrative compositions, not screenshots of running software.
- No learning-outcome, AI-accuracy, adoption or performance metrics are claimed anywhere, because none have been
  measured.
- The contact form needs an external endpoint; email delivery and spam protection are the endpoint's responsibility.
- `public/og-image.png` is not included: supply a genuine social image or the Open Graph image tag will 404 once a
  site origin is configured.
- Automated visual regression testing is not set up.
