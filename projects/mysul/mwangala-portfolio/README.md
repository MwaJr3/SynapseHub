# Mwangala — Portfolio & Project Case Studies

A production-ready, fully client-routed portfolio site for **Mwangala**
(Python Developer · Cybersecurity · Full-Stack Software Engineering), built
around a single typed project registry and nine written case studies.

> **Building Software. Understanding Security. Solving Real Problems.**

Everything you see is real code and real content structure. Nothing is a
mock-up: routing, filtering, search, sorting, theming, animations, the contact
hand-off and the SEO artefacts all work, and the test suite asserts the
invariants that matter (nine projects, no excluded projects, honest link
behaviour, theme persistence, 404 handling).

---

## Table of contents

1. [What's in the site](#whats-in-the-site)
2. [Tech stack](#tech-stack)
3. [Quick start](#quick-start)
4. [Scripts](#scripts)
5. [Project structure](#project-structure)
6. [How content works: the registry is the single source of truth](#how-content-works)
7. [Editing project data](#editing-project-data)
8. [Adding or removing a project](#adding-or-removing-a-project)
9. [Configuring repository and live-demo URLs](#configuring-repository-and-live-demo-urls)
10. [Replacing drawn previews with real screenshots](#replacing-drawn-previews-with-real-screenshots)
11. [Updating contact details and profile links](#updating-contact-details-and-profile-links)
12. [Theme and design tokens](#theme-and-design-tokens)
13. [SEO](#seo)
14. [Accessibility and motion](#accessibility-and-motion)
15. [Tests](#tests)
16. [Deployment](#deployment)
17. [Honest state and known limitations](#honest-state-and-known-limitations)

---

## What's in the site

| Route | Page |
| --- | --- |
| `/` | Editorial hero, five featured projects, intro, technical focus areas, engineering-approach summary, closing CTA |
| `/about` | "Curious by Nature. Systems-Oriented by Design.", interests, values, learning philosophy |
| `/projects` | Directory of all nine projects: category filters, live search, sorting, shareable URL state |
| `/projects/:slug` | Nine full case studies (introduction → problem → objectives → solution → features → technology & architecture → engineering decisions → testing → challenges → demonstration → next/previous) |
| `/skills` | Grouped skills tied to projects — deliberately **no** proficiency bars or percentages |
| `/approach` | Engineering approach: Understand → Design → Build → Test → Improve (aliases: `/engineering-approach`, `/engineering`) |
| `/contact` | Contact routes plus a form that only claims success when a message was actually accepted |
| `*` | 404 page that links back to every real project |

### The nine projects

| # | Slug | Name | Positioning |
| --- | --- | --- | --- |
| 1 | `phishlens` | PhishLens | Understand the warning signs. Investigate before you trust. |
| 2 | `netscope` | NetScope | Turn raw network traffic into understandable evidence. |
| 3 | `threatintel-desk` | ThreatIntel Desk | Connect indicators. Preserve context. Investigate intelligently. |
| 4 | `incidentflow` | IncidentFlow | From first alert to documented resolution. |
| 5 | `hashsight` | HashSight | Identify files. Examine reputation. Understand the evidence. |
| 6 | `assetwatch` | AssetWatch | Know your assets. Understand their exposure. Track changes. |
| 7 | `securecode-workbench` | SecureCode Workbench | Make security findings understandable and actionable. |
| 8 | `cyberaware-lab` | CyberAware Lab | Learn to recognize risks. Practice making safer decisions. |
| 9 | `transcriptwise` | TranscriptWise | Turn video transcripts into knowledge you can use. |

Featured on the homepage: PhishLens, NetScope, IncidentFlow, SecureCode
Workbench and TranscriptWise.

Projects from an earlier portfolio iteration — SentinelLog, FileGuard,
DependSecure, CampusFlow, CircuitLab Calc, ChessScope and SentinelCore — are
**permanently excluded**. `validateRegistry()` runs at module load and the
registry tests scan the serialised data, the slugs, the search index and the
route table, so they cannot come back by accident.

## Tech stack

- **React 19** + **TypeScript 5.9** (strict, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`)
- **Vite 7** — dev server, build, preview (with an SPA-fallback plugin so deep links work under `vite preview`)
- **Tailwind CSS 4** via `@tailwindcss/vite`, with a hand-written token layer in `src/styles/tokens.css` (no Tailwind config file needed)
- **react-router-dom 7** — `BrowserRouter`, lazy route chunks, scroll restoration
- **Vitest 3** + **Testing Library** + **jsdom** — 261 tests across 10 files
- **ESLint 9** with `typescript-eslint`, `react-hooks`, `react-refresh`
- Fonts: Inter Variable + JetBrains Mono Variable, self-hosted through `@fontsource-variable/*` (no third-party font requests)

No UI kit, no animation library, no CMS, no analytics, no tracking.

## Quick start

```bash
npm install          # install dependencies
npm run dev          # start the dev server on http://localhost:5401
```

Optional but recommended before deploying:

```bash
cp .env.example .env # then fill in only what you actually have
```

System and dependency requirements (Node >= 20, npm >= 10, the full dependency
inventory with lockfile-resolved versions, optional tooling and environment
variables) are documented in **[REQUIREMENTS.md](REQUIREMENTS.md)**. The
machine-readable manifests are `package.json` + `package-lock.json`; `npm ci`
reproduces the verified tree exactly.

Every environment variable is optional. With none set, the site still runs —
it hides unconfigured links and says plainly what is missing instead of
inventing values.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (host `0.0.0.0`, port 5401) |
| `npm run build` | Regenerates `sitemap.xml`/`robots.txt`, type-checks (`tsc -b`) and builds to `dist/` |
| `npm run preview` | Serves `dist/` on port 4173, including SPA fallback for deep links |
| `npm run typecheck` | `tsc -b --pretty` |
| `npm run lint` | ESLint over the whole repo |
| `npm test` | Vitest, single run (10 files, 261 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run sitemap` | Writes `public/sitemap.xml` + `public/robots.txt` from the real route table |
| `npm run sitemap:check` | Fails if those committed files are stale |
| `npm run check` | Everything: typecheck → lint → sitemap:check → test → build |
| `node scripts/visual-smoke.mjs` | Optional headless-browser sweep: 18 routes × 4 viewports, overflow/console checks, theme end-to-end, screenshots (needs `playwright-core` + a Chromium install; see the file header) |

`npm run check` is the command to run before a deploy or a commit.

> On a small machine (2 vCPU / 2 GB) run these sequentially rather than in
> parallel; the full suite takes roughly 30–40 s.

## Project structure

```
mwangala-portfolio/
├── index.html                  # shell: fonts, meta, #root, no-JS fallback
├── vite.config.ts              # base path, aliases, chunking, preview SPA fallback
├── vitest.config.ts            # jsdom + setup file (kept separate from vite.config.ts)
├── eslint.config.js
├── tsconfig*.json              # strict app + node configs
├── .env.example                # documented, secret-free environment template
├── REQUIREMENTS.md             # system/deps/optional-tooling requirements, resolved versions
├── public/
│   ├── favicon.svg
│   ├── robots.txt              # generated
│   └── sitemap.xml             # generated
├── scripts/
│   └── generate-seo.mjs        # sitemap/robots generator + --check mode
├── docs/
│   └── DEPLOYMENT.md           # host-by-host deploy guide and rewrite rules
└── src/
    ├── main.tsx                # entry
    ├── App.tsx                 # AppShell (router-agnostic) + App (providers + BrowserRouter)
    ├── styles/tokens.css       # design tokens, themes, project accents, utilities, motion
    ├── types/project.ts        # the Project / CaseStudy contract
    ├── config/
    │   ├── site.ts             # name, titles, description, VITE_SITE_URL, contact endpoint
    │   ├── profile.ts          # bio, values, learning, email, links, education, certifications
    │   ├── nav.ts              # primary nav + filter facet definitions (id, label, hint)
    │   ├── projectLinks.ts     # per-project live/repo URLs (env-driven, never fabricated)
    │   └── routes.ts           # the complete route table (used by sitemap + tests)
    ├── data/
    │   ├── projects/           # one file per project + index.ts (registry, validation, queries)
    │   └── skills.ts           # grouped skills, each tied to real projects
    ├── lib/                    # cn, links, theme, format, seo, contact (pure, unit-tested)
    ├── hooks/                  # useTheme, useReveal, useUi, useProjectQuery
    ├── components/
    │   ├── layout/             # SiteHeader, SiteFooter, ThemeControl, PageHeader, Wordmark…
    │   ├── ui/                 # Button, Panel, Badge, Icon, CopyButton, StateBlock, Layout…
    │   ├── project/            # ProjectCard, ProjectVisual, ProjectFilters, AccentScope, FlowDiagram
    │   ├── previews/           # the nine hand-drawn preview artworks + shared primitives
    │   └── home/HeroDiagram.tsx
    ├── pages/                  # Home, About, Projects, ProjectDetail, Skills, Approach, Contact, NotFound
    └── test/                   # setup.ts, testUtils.tsx, routing.test.tsx, seo.test.ts
```

## How content works

`src/data/projects/index.ts` is **the** single source of truth. It:

1. imports the nine project modules and assembles `registry`;
2. runs `validateRegistry(registry)` at module load — the app refuses to start
   with thin, malformed or excluded data;
3. exports derived values and queries used everywhere else:
   `projects` (sorted by `order`), `projectSlugs`, `featuredProjects`,
   `getProject()`, `getProjectOrThrow()`, `getAdjacentProjects()`,
   `projectsByFilter()`, `projectSearchText()`, `searchProjects()`,
   `technologyIndex()`, `excludedProjectNames`, `expectedProjectCount`.

The homepage highlights, directory cards, filters, search index, case-study
routes, prev/next navigation, footer project list, sitemap and tests all read
from it. **No component contains its own copy of project content.**

### Registry invariants enforced by `validateRegistry()`

- exactly **9** projects (`expectedProjectCount`)
- unique kebab-case `slug` and `id`, unique `order`, unique `accent`
- non-empty `name`, `tagline`, `summary`; ≥ 2 `description` paragraphs
- ≥ 1 category, ≥ 1 non-`all` filter, and every filter id must exist in `nav.ts`
- ≥ 4 features, ≥ 4 `demonstrates`, ≥ 1 capability, ≥ 4 technologies
- ≥ 2 engineering decisions, ≥ 2 challenges, ≥ 3 limitations, ≥ 3 testing items, ≥ 4 workflow steps
- `liveUrl` / `repoUrl` must be empty or start with `https://`
- **3–5** featured projects
- none of the seven excluded project names anywhere in the data

If you change the shape of the portfolio (say, ten projects), update
`expectedProjectCount`, the featured-count range in `validateRegistry()`, and
the matching assertions in `src/data/projects/registry.test.ts` in the same
commit — the tests are deliberately strict so drift is caught immediately.

## Editing project data

Each project lives in its own file, e.g. `src/data/projects/phishLens.ts`, and
exports a single typed object (`Project` from `src/types/project.ts`).
TypeScript will tell you when a field is missing or mis-typed.

The important fields:

| Field | Purpose |
| --- | --- |
| `id`, `slug` | Identity and URL (`/projects/<slug>`); kebab-case, unique |
| `name`, `tagline`, `summary` | Card + hero copy. `summary` is also the search snippet |
| `description[]` | Intro paragraphs on the case-study page |
| `categories[]` | Display labels from the `ProjectCategory` union in `types/project.ts` |
| `filters[]` | Facet ids from `FilterId` — these drive the directory filters |
| `tech[]`, `keyTech[]` | Full stack list vs. the chips shown on cards |
| `featured`, `order` | Homepage highlight and curated sort position |
| `status`, `year`, `role` | Header metadata |
| `accent` | The project's hue; must be unique and exist in `tokens.css` |
| `capabilities[]` | One or two lines shown on cards |
| `features[]`, `demonstrates[]` | Key-features grid and "what it demonstrates" list |
| `preview` | `{ visual, alt, screenshot?, screenshotNote? }` — see below |
| `liveUrl`, `repoUrl` | Empty string = not configured; the UI hides the action |
| `caseStudy` | `problem`, `whoBenefits`, `objectives`, `solution`, `workflow`, `architecture`, `decisions`, `testing`, `challenges`, `demonstration`, `limitations` |
| `needsAuthorReview[]` | Notes rendered on the case-study page listing what you must verify before publishing |

### Writing rules this repo follows (keep them)

- **No fabricated history.** Employment, certifications, degrees, testimonials,
  awards, star counts, commit counts, language percentages and performance
  metrics are never invented. Where a real number is not available, the copy
  stays qualitative or the field stays empty.
- **Challenges and lessons are editable placeholders.** Each project's
  `needsAuthorReview` lists the sections whose wording you should confirm
  against your own implementation history. That note renders at the bottom of
  the Challenges section — remove the entries (or the field) once verified.
- **Sample data inside previews is labelled.** Every artwork carries a
  "Representative preview" label; nothing is presented as a screenshot of a
  deployed app or as live scan output.

## Adding or removing a project

**Add:**

1. Create `src/data/projects/myProject.ts` exporting a fully populated
   `Project` object (copy an existing file as a template — the type checker
   will flag anything missing).
2. Import it in `src/data/projects/index.ts` and add it to the `registry` array.
3. Give it a unique `order`, `accent` and `slug`.
4. Draw its preview artwork in `src/components/previews/` and register the
   component in `src/components/previews/index.ts` under a key equal to
   `preview.visual`. The module throws at load time if a project has no
   artwork or if artwork is orphaned.
5. Update `expectedProjectCount` in `src/data/projects/index.ts` and the count
   assertions in `registry.test.ts` / `routing.test.tsx`.
6. Run `npm run sitemap` — the new route is picked up automatically from the
   registry, then `npm run check`.

**Remove:** delete the file, drop the import and the `registry` entry, remove
its artwork registration, lower `expectedProjectCount`, and re-run
`npm run sitemap`. Consider adding the name to `excludedProjectNames` if it must
never return.

Routes, filters, search, prev/next navigation, the footer list and the sitemap
all follow the registry — there is no other place to update.

## Configuring repository and live-demo URLs

Two mechanisms, in `src/config/projectLinks.ts`:

**1. GitHub owner for every project (recommended default)**

```bash
# .env
VITE_REPO_OWNER=your-github-username
```

Repository links are then built as `https://github.com/<owner>/<repo>`, where
`<repo>` comes from the `repoNames` map in that file (defaults to the slug).
With `VITE_REPO_OWNER` empty, **no** repository link is rendered anywhere — the
action is hidden rather than pointed at a placeholder.

**2. Explicit per-project overrides** (for a live demo, or a repo under a
different owner/name):

```ts
const explicit: Record<string, Partial<ProjectLinks>> = {
  phishlens: {
    live: 'https://phishlens.example.com',
    repo: 'https://github.com/your-username/phishlens',
  },
};
```

Only real, working URLs belong here. Links must start with `https://`
(asserted by `validateRegistry()` and by `isUsableLink()`), and every external
link is rendered with `target="_blank" rel="noopener noreferrer"`.

## Updating contact details and profile links

`src/config/profile.ts` holds the bio, areas of interest, engineering values,
learning philosophy, availability, location, email, profile links, education
and certifications.

- `email` reads `VITE_CONTACT_EMAIL` (empty by default). Set it in `.env` or
  replace the value directly.
- `links[]` entries with an empty `url` are filtered out by
  `configuredLinks()` — the UI never renders a stub link. Fill in your real
  GitHub/LinkedIn/website URLs there.
- `education` and `certifications` are empty arrays on purpose. Add real
  entries or leave them empty; the About page renders an honest
  "nothing listed yet" state either way.
- `location` currently reads `Lusaka, Zambia` and is marked with a
  `// TODO: confirm before publishing` comment.

### The contact form

Delivery behaviour is deliberately honest (`src/lib/contact.ts`,
`src/pages/ContactPage.tsx`):

- If `VITE_CONTACT_ENDPOINT` is set, the form POSTs JSON
  (`{ name, email, subject, message }`) and only reports success on a `2xx`
  response; a failure shows the real HTTP status.
- If it is not set but an email address exists, the form composes a `mailto:`
  draft and reports it as **"drafted"**, stating that the site cannot confirm
  it was sent.
- If neither exists, the form is disabled and a configuration notice explains
  what to set.
- A `company` honeypot field silently drops bot submissions.
- Validation: message 20–4000 characters, real email format, name/subject
  length limits.

`VITE_CONTACT_ENDPOINT` must point at a service you control (a serverless
function, Formspree-style endpoint, your own API). **Never** put an API key in
this repo — anything prefixed `VITE_` ships to the browser.

## Theme and design tokens

The design system is a deliberate **hybrid** composition: light surfaces for
the hero, about, long-form copy and skills; dark technical panels for project
previews, diagrams, code and the footer.

- `src/styles/tokens.css` — all colour, spacing, typography and shadow tokens.
  `@theme` registers them with Tailwind; `:root` is the light palette,
  `[data-theme='dark']` the dark palette, `[data-panel='dark']` /
  `[data-panel='light']` the hybrid overrides, and `[data-accent='…']` the nine
  per-project hues (retuned for dark surfaces).
- `src/lib/theme.ts` — pure logic: modes `light | dark | system | hybrid`
  (default **hybrid**), storage key `mw-theme`, `applyTheme()` contract
  (`data-theme-mode` always, `data-theme` only for explicit modes,
  `color-scheme` kept in sync).
- `src/hooks/useTheme.tsx` — `ThemeProvider` + `useTheme()`.
- `src/components/layout/ThemeControl.tsx` — the accessible switcher
  (`menuitemradio` group, arrow-key cycling, Escape closes, focus restored).

**To change the palette:** edit tokens only. Components never hardcode hex
values — a test walks every preview artwork's presentation attributes and
fails the build if a literal colour appears.

**To change the default mode:** edit `DEFAULT_THEME_MODE` in
`src/lib/theme.ts`, and the matching fallback in the pre-paint script inside
`index.html` (that script runs before any module loads, so it cannot import the
constant). Update `src/lib/theme.test.ts` if it asserts the old default.

**To add a project accent:** add the hue to `AccentName` in
`src/types/project.ts`, define `--prj*` custom properties for light and dark in
`tokens.css`, and keep accents unique across the registry (validated).

## SEO

- Per-route titles, meta descriptions, Open Graph and Twitter tags via the
  `usePageMeta()` hook in `src/lib/seo.ts`, called by every page (the same
  module also exports `useScrollRestoration()`).
- `<link rel="canonical">` and `og:url` are emitted **only** when
  `VITE_SITE_URL` is set to a real domain — otherwise they are omitted rather
  than filled with a placeholder.
- `public/sitemap.xml` and `public/robots.txt` are generated from
  `src/config/routes.ts` + the registry by `scripts/generate-seo.mjs`. Run
  `npm run sitemap` after adding/removing a page; `npm run sitemap:check`
  (part of `npm run check`) fails if the committed files are stale.
- Without `VITE_SITE_URL`, the sitemap keeps relative `<loc>` values with an
  explanatory comment and robots.txt keeps the `Sitemap:` line commented out.
- `src/test/seo.test.ts` asserts the sitemap matches the route table exactly,
  includes all nine case studies, and never lists an excluded project.

## Accessibility and motion

- Skip link, semantic landmarks, one `<h1>` per page, logical heading order.
- Visible focus rings everywhere; the theme switcher is a proper ARIA menu.
- Result counters are `role="status"` live regions; copy buttons announce
  success only after the clipboard write resolves, and report failure honestly.
- Preview artwork is `role="img"` with a descriptive `aria-label` taken from
  the project record, and states that it is representative.
- All motion honours `prefers-reduced-motion: reduce` (reveal-on-scroll
  degrades to fully visible, transitions are disabled).
- Responsive from 360 px up with no horizontal overflow; the mobile nav traps
  focus, closes on Escape and on navigation, and locks body scroll.

## Tests

```bash
npm test          # 261 tests, 10 files
npm run test:watch
```

| File | Covers |
| --- | --- |
| `src/data/projects/registry.test.ts` | exactly nine projects, excluded names absent everywhere, slug/order/accent uniqueness, per-project content depth, featured set, https-only links, preview registration, prev/next wrap-around |
| `src/data/projects/queries.test.ts` | filter facets, curated order, search (case-insensitive, multi-term AND, empty results), search index fields, technology index |
| `src/lib/theme.test.ts` | mode parsing, resolution (incl. `system` via `matchMedia`), attribute contract, persistence, storage-failure fallbacks |
| `src/lib/contact.test.ts` | link/email validation, URL display, form validation, message + `mailto:` composition, submission payload |
| `src/components/layout/ThemeControl.test.tsx` | menu semantics, apply + persist per mode, keyboard cycling, Escape/focus restore |
| `src/components/previews/previews.test.tsx` | artwork accessibility, accent, "representative" labelling, content density, no hardcoded colours, distinctness, `ProjectVisual` screenshot preference, `ProjectCard` content and conditional external actions |
| `src/pages/ProjectsPage.test.tsx` | default list, every filter, chip counts, `aria-pressed`, URL state, unknown filter ignored, clear filters, typed search, empty state, live region, sorting, card links |
| `src/test/routing.test.tsx` | every route renders and sets a title, 404s (including excluded slugs), `/engineering` alias, homepage content and "no GitHub link until configured", case-study sections, prev/next, back links, copy-stack behaviour, about/skills/approach/contact honesty, nav shell, mobile nav |
| `src/test/seo.test.ts` | sitemap ↔ route table parity, nine case studies present, excluded slugs absent, XML well-formedness, no invented domain, robots.txt |
| `src/test/app.test.tsx` | the real `App` composition (providers + router) renders, deep URL renders its case study, and `main.tsx` never adds a second router |

Tests mount `AppShell` (exported from `src/App.tsx`) inside a `MemoryRouter` —
never `App`, which contains its own `BrowserRouter`.

## Deployment

Full host-by-host instructions, rewrite rules and the sub-path/base-path
discussion live in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Short version:

```bash
VITE_SITE_URL=https://your-domain.example npm run build   # -> dist/
```

`dist/` is a static SPA: serve it from any static host, but configure a rewrite
so every unknown path returns `index.html` (otherwise deep links such as
`/projects/netscope` 404 on a hard reload). `vite.config.ts` already does this
for `npm run preview`, and `vercel.json` (shipped here) does it for Vercel.

**Live:** https://mwangala-portfolio.vercel.app — deployed from
`MwaJr3/SynapseHub` (`main`, root `projects/mysul/mwangala-portfolio`) with
`VITE_SITE_URL` set, so canonical URLs and the sitemap are absolute in
production. Pushes to `main` redeploy automatically.

Set `VITE_BASE_PATH=/your-repo/` when deploying under a sub-path (GitHub Pages
project sites, for example).

## Honest state and known limitations

Reported as-is, so nothing here surprises you:

- **No contact email, profile URLs, repo owner or production domain are
  configured.** Those fields are empty on purpose; the UI hides the affected
  links and shows explicit "not configured yet" states. Until you fill them in,
  the contact form cannot deliver a message and says so.
- **`profile.location` is set to `Lusaka, Zambia` with a TODO to confirm.**
- **Education and certifications are empty** — nothing was invented.
- **Challenges/lessons and testing sections contain editable, generic
  engineering narrative**, flagged per project via `needsAuthorReview` and
  rendered as a small note on the page. Replace them with your own verified
  history and delete the notes before publishing.
- **Project visuals are hand-drawn, representative SVG previews**, not
  screenshots of running applications. Add real screenshots via
  `preview.screenshot` when you have them.
- **All numbers shown inside preview artwork are illustrative sample data**,
  labelled as such, and are not measurements from a live system.
- **The committed sitemap uses relative URLs** until `VITE_SITE_URL` is set,
  which most search engines ignore. The deployed build sets the variable, so
  the live sitemap is absolute; a local `npm run build` without it is not.
- **Unknown routes return HTTP 200 with a client-rendered 404** (unavoidable
  for a static SPA). If you need a real 404 status, configure it at the host.
- **No analytics, forms backend, CMS or auth** are included.

### Verification log (last run on this machine)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | pass, 0 errors |
| Lint | `npm run lint` | pass, 0 errors / 0 warnings |
| SEO files | `npm run sitemap:check` | pass (15 routes) |
| Tests | `npm test` | 271 passed, 0 failed |
| Build | `npm run build` | pass (measured 2026-10-24): entry 34.8 kB (11.9 kB gzip), content 204.2 kB (65.5 kB gzip), react 261.2 kB (83.0 kB gzip), artwork 45.0 kB (12.0 kB gzip), CSS 47.0 kB (9.5 kB gzip) + vendor CSS 6.6 kB (2.8 kB gzip) |
| Deep links | `npm run preview` + `curl` on `/projects/netscope`, `/nope`, `/robots.txt`, `/sitemap.xml` | all 200; deep links serve `index.html` with correct absolute asset URLs |
| Dev server | `npm run dev` + `curl` sweep of the module graph | 200 on every module; Tailwind utilities present in the compiled CSS |

| Browser sweep | `node scripts/visual-smoke.mjs` (headless Chromium) | 72/72 route×viewport combinations clean (no horizontal overflow, no console errors, branded title + `h1` everywhere); theme switch + persistence and mobile nav verified end-to-end |
| Visual review | Screenshots in `docs/qa/screenshots/` | Hybrid / dark / light at desktop, tablet and mobile — see `docs/qa/QA-REPORT.md` |

**Known QA gaps:** no real-device testing, no Lighthouse/performance profiling,
contrast reviewed by eye only, and the contact form's HTTP path has never been
exercised against a live endpoint (none is configured). Full details in
[`docs/qa/QA-REPORT.md`](docs/qa/QA-REPORT.md).
