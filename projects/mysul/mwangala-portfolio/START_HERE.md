# Start here

Everything you need is in this folder. One-page orientation; the long form
lives in `README.md` and `docs/`.

## Run it

```bash
npm install        # or: npm ci
npm run dev        # http://localhost:5173
```

No environment variables are required. `.env.example` documents the four
optional ones (`VITE_SITE_URL`, `VITE_CONTACT_EMAIL`, `VITE_CONTACT_ENDPOINT`,
`VITE_REPO_OWNER`); with none set the site runs and honestly labels whatever is
unconfigured instead of inventing it.

## Verify it

```bash
npm run check      # typecheck -> lint -> sitemap:check -> 261 tests -> build
```

Optional headless-browser sweep (layout, console errors, theme end-to-end,
screenshots) — needs a one-off `npm i --no-save playwright-core` and
`npx playwright install chromium`:

```bash
node scripts/visual-smoke.mjs
```

## Ship it

```bash
VITE_SITE_URL=https://your-domain.example npm run build   # -> dist/
```

`dist/` is a static SPA. Your host must rewrite unknown paths to `index.html`
(recipes for Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3 and nginx are
in `docs/DEPLOYMENT.md`).

## Where things live

| You want to… | Go to |
| --- | --- |
| Edit a project's copy, stack, case study | `src/data/projects/<name>.ts` |
| Add / remove a project | `src/data/projects/index.ts` (+ `README.md` §8) |
| Set repo / live-demo links | `src/config/projectLinks.ts` |
| Edit bio, email, profile links | `src/config/profile.ts` |
| Change colours or themes | `src/styles/tokens.css`, `src/lib/theme.ts` |
| Replace a drawn preview with a screenshot | set `preview.screenshot` on the project |
| See what was tested and what was not | `docs/qa/QA-REPORT.md`, `README.md` §"Honest state" |
| Check system/dependency requirements | `REQUIREMENTS.md` (Node >= 20, npm >= 10, resolved versions) |

## Honest status at the time of bundling

- Nine case studies, directory, filters, search, sorting, theming, SEO files,
  404s and the contact hand-off all work and are test-covered (261 tests).
- Types, lint, sitemap parity and the production build are clean; a
  headless-Chromium sweep found no horizontal overflow or console errors on any
  route at 1440 / 834 / 390 / 360 px, and screenshots are in
  `docs/qa/screenshots/`.
- Not configured on purpose: contact email, profile URLs, repo owner,
  production domain. Not yet done by the author: real-device testing,
  Lighthouse profiling, and exercising the contact form against a live
  endpoint. Each project's `needsAuthorReview` note lists the sections to
  verify against your own history before publishing.
