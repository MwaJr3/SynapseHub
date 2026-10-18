# Mwangala — Frontend Development Portfolio

A responsive portfolio built with React, TypeScript, Vite, Tailwind CSS and React Router. The site presents 60 challenge records from the links supplied for the portfolio, with a searchable challenge library, 60 local-first interactive prototype routes, individual challenge records, and a hybrid light/dark identity.

> **Content integrity note:** this repository now includes 60 interactive, local-first prototype routes in addition to the portfolio and challenge catalogue. They are working browser-side starting points, not 60 production-ready/full-stack applications: several still need official starter assets, backend services, complete prompt acceptance coverage, independent QA, and deployment. All 60 records remain unverified as completed challenge solutions. This is an independent portfolio, not endorsed by Frontend Mentor.

## Included

- `/` — editorial homepage, featured collection, working-process overview, and project discovery CTAs.
- `/about` — authentic developer positioning without invented biography or credentials.
- `/projects` — all 60 records; immediate search; combinable category, challenge type and difficulty filters; featured/name/difficulty/collection sorting; 12-item pagination; URL-backed discovery state.
- `/projects/:slug` — individual challenge records, source attribution, brief context, prototype link, and explicit verification status. Demo/source links appear only when configured.
- `/apps` and `/apps/:slug` — an interactive browser-first prototype for each of the 60 records, with domain-specific controls, local persistence where appropriate, named public API integrations for select tools, and visible limits.
- `/skills` — capability areas tied to project categories as a roadmap for practice rather than demonstrated project evidence.
- `/journey` — thematic groupings, not an invented chronology.
- `/contact` — configured email/profile links only; no fake contact form.
- Custom 404, accessible responsive navigation, persisted Light/Dark/System switcher, page metadata, Open Graph tags, canonical URL support when configured, robots.txt, SPA fallback and sitemap generator.
- Representative CSS-built interface illustrations labelled as illustrations—not project screenshots.

## Run locally

```bash
npm ci
npm run dev
```

The Vite server binds to `0.0.0.0` for preview environments. Useful scripts:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check       # typecheck → lint → test → production build
npm run sitemap     # only writes public/sitemap.xml when VITE_SITE_URL is configured
```

## Challenge manifest and content maintenance

The central source is `src/data/challengeManifest.ts`.

Each record includes the challenge title, unique slug, source URL, type, access tier, difficulty, collection category, challenge brief summary, a false-by-default completion flag, and optional implementation fields. Runtime validation and tests enforce 60 records, unique slugs/URLs, non-empty titles and valid Frontend Mentor source URLs.

When independently building and documenting a challenge, update its record with evidence rather than inference:

1. Add the actual `technologies`, implemented `features`, `engineeringHighlights`, `lessonsLearned` and accessibility/testing notes.
2. Add real captures under `public/screenshots/<slug>/` and put their source/alt/caption details in `screenshots`.
3. Add only confirmed project links as `liveDemoUrl` and `repositoryUrl`.
4. Update the case-study component if richer project-specific sections are being added. Do not claim a test, feature or technology unless it was used/verified.
5. Run `npm run check`.

The project library renders from this manifest. It defaults to 12 cards per page, updates search immediately, reflects filters in query parameters, and clamps the current page when the result set changes. Difficulty/type filters are shown because source-catalogue values are recorded; no technology filter is shown while implementation stacks remain unconfigured.

## Optional 60-project build prompt collection

`docs/CHALLENGE_BUILD_PROMPTS.md` contains the user-supplied planning prompts for all 60 challenges. Their 60 official source URLs match the catalogue manifest exactly. The detailed feature lists and suggested stacks are planning guidance, not verified official acceptance criteria; inspect each official brief and any licensed starter assets before building. The prompts are planning guidance, not a substitute for the application code in `/apps`, nor proof that every prompt requirement has been met. All records remain unverified until each prototype is checked against the official brief and any licensed starter assets.

## Configure profile and links

Copy `.env.example` to `.env.local` and fill only actual values:

- `VITE_SITE_URL` — production origin for canonical metadata and sitemap.
- `VITE_CONTACT_EMAIL` — email link.
- `VITE_GITHUB_URL`, `VITE_LINKEDIN_URL` — profile links.

Project destinations live on individual records in `src/data/challengeManifest.ts`, not in an inferred URL convention. Set the actual HTTPS `liveDemoUrl` and/or `repositoryUrl`; external buttons remain hidden otherwise. Validate links before publishing. Never put credentials in the client-side manifest or environment variables prefixed with `VITE_`.

## Deployment

Build with `npm run build` and deploy `dist/` to a static host. Configure SPA rewrites to `index.html` so direct refreshes on `/projects/:slug` and `/apps/:slug` work. `public/_redirects` includes the Netlify fallback. Set `VITE_SITE_URL` at build time before generating the sitemap. No backend is required unless a genuine contact endpoint is configured.

## Current content/configuration gaps

- Demo and source repository URLs have not been supplied; those actions are hidden.
- Twelve user-supplied Reel screenshots are included only as design-reference material in the downloadable handoff ZIP. They are not connected to project records or presented as Mwangala implementations. The website’s representative illustrations are separately labelled and are not app captures.
- The 60 routes currently host local-first prototype experiences in this shared React app; they are not 60 separately packaged or deployed services. Multi-user authentication, shared databases, payments, email delivery, and backend workflows need real service infrastructure and are not simulated as production behavior.
- Full per-project acceptance coverage, licensed challenge assets, feature-specific tests, genuine screenshots, and deployment URLs remain to be added before any challenge record is marked complete.
- Challenge records document the official challenge source and concise paraphrased brief context only. They do not imply paid access, completion, approval or endorsement; some source challenges are marked Premium by Frontend Mentor.
- Profile links, contact details and the production domain are unconfigured by default.
- Automated unit/component tests and lint/type/build checks are provided; visual regression, Lighthouse measurement and manual assistive-technology checks are not claimed as completed.
