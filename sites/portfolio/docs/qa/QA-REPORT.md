# QA report

**Scope:** the whole site, as built on this machine.
**Date of run:** 2026-10-16.
**Tooling:** headless Chromium 131 (Playwright `chromium_headless_shell`) driven by
[`scripts/visual-smoke.mjs`](../../scripts/visual-smoke.mjs), plus the unit suite
(`npm test`), `npm run typecheck`, `npm run lint`, `npm run sitemap:check` and
`npm run build`.

Screenshots from the run are in [`screenshots/`](screenshots/).

---

## 1. Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | pass, 0 errors |
| Lint | `npm run lint` | pass, 0 errors, 0 warnings |
| SEO artefacts | `npm run sitemap:check` | pass (15 routes) |
| Unit + integration tests | `npm test` | 261 passed, 0 failed (10 files) |
| Production build | `npm run build` | pass |
| Deep links on the built site | `npm run preview` + `curl` | `/projects/netscope`, `/nope`, `/robots.txt`, `/sitemap.xml` all 200 |

## 2. Browser sweep (layout, console, semantics)

`scripts/visual-smoke.mjs` visited **18 routes** at **4 viewports**
(1440×900 desktop, 834×1000 tablet, 390×844 mobile, 360×740 small):

`/`, `/about`, `/projects`, all nine `/projects/:slug` case studies, `/skills`,
`/approach`, `/engineering` (alias), `/contact`, and an unknown route.

For each route × viewport it asserts:

- `document.documentElement.scrollWidth` ≤ viewport width (no horizontal page
  scrolling), and no element rendered outside the viewport — intentionally
  off-canvas visually-hidden content (the contact honeypot at `-9999px`,
  `sr-only` text) is excluded;
- zero `console.error` and zero uncaught page errors;
- a `<title>` containing the brand and a rendered `<h1>`.

**Result: 72/72 route×viewport combinations clean.**

### Bugs found and fixed by this sweep

The browser pass caught three defects that the DOM-level unit tests could not:

1. **Blank page (severe).** `src/main.tsx` wrapped `<App />` in a second
   `BrowserRouter`; `App` already provides one, so React Router threw
   *"You cannot render a `<Router>` inside another `<Router>`"* and `#root`
   stayed empty. Fixed by removing the wrapper; regression-guarded by
   `src/test/app.test.tsx`, which mounts the real `App` and also asserts the
   entry module contains no router import.
2. **Horizontal overflow on every case-study page below 1024 px** (page width
   ≈ 1437 px at an 834 px viewport). The "On this page" rail is a grid item
   whose horizontally scrollable list of `whitespace-nowrap` links contributed
   its full min-content width to the grid track. Fixed with `min-w-0` on the
   `<aside>`.
3. **6 px overflow on every page at ≤ 390 px.** The header action row could not
   shrink. Fixed by making the theme trigger icon-only below `sm` (its label is
   kept in the accessibility tree via `sr-only`, because `aria-labelledby`
   points at it), hiding the header "Explore projects" button below `sm` with a
   wrapper element (a bare `hidden sm:inline-flex` on the component loses to
   the component's own `inline-flex` utility), and letting the wordmark
   truncate instead of forcing width.

## 3. Interaction checks (same script)

- Theme switcher via the real UI: selecting **Dark** sets
  `data-theme="dark"` + `data-theme-mode="dark"` and stores `mw-theme=dark`;
  selecting **Light** does the equivalent; the choice **survives a reload**.
- Mobile navigation: opens from the toggle, closes on `Escape`, and body scroll
  lock is released afterwards.
- Contact form: with no `VITE_CONTACT_ENDPOINT` configured the submit control
  stays disabled and the page explains why (asserted in the unit suite as well).

## 4. Visual review (screenshots)

Reviewed at desktop, tablet and mobile in hybrid, dark and light themes:

- Hero: headline, supporting copy, both CTAs, the pipeline diagram (inputs →
  validate/parse/analyse/verify → outputs) and its "illustrative — not a live
  scan" footnote render correctly; output labels fit their nodes.
- Directory: filter chips with counts, nine distinct representative previews,
  each labelled "Representative preview"; no live/source buttons appear while
  no URL is configured.
- Case studies: breadcrumb, category chips, honest "hand-drawn representative
  preview… set `preview.screenshot` to replace it" caption, dark panel styling
  intact in dark mode, unconfigured-link notice present.
- Skills / About / Approach / Contact / 404: layout and copy as designed;
  skills page states plainly that there are no proficiency bars.
- Mobile nav: all six primary links (active state marked), nine project links
  with their accent dots, two CTAs.

See `screenshots/` — `home-top`, `home-featured`, `home-dark`, `home-light`,
`directory-cards`, `study-intro`, `study-dark`, `study-light`,
`study-solution`, `study-decisions`, `skills-top`, `about-top`,
`approach-top`, `contact-top`, `notfound`, `mobile-home`,
`mobile-directory`, `mobile-study`, `tablet-study`, `home-footer`.

## 5. Residual / not covered

- **No real-device testing** (only emulated viewports); pointer/hover and
  focus-visible behaviour were not exercised on physical hardware.
- **No performance profiling in a throttled browser.** Bundle sizes from the
  build: entry 34.5 kB (11.8 kB gzip), content 178.9 kB (57.6 kB gzip),
  react 261.2 kB (83.0 kB gzip), artwork 45.0 kB (12.0 kB gzip),
  CSS 46.2 kB (9.5 kB gzip).
- **Contrast was reviewed by eye only**, not measured programmatically.
- **The contact form's HTTP path was never exercised against a live endpoint**
  (none exists); only the disabled/unconfigured and `mailto:` paths are
  implemented and tested.
- Unknown routes return HTTP 200 with a client-rendered 404 (inherent to a
  static SPA rewrite).
- Lighthouse was not run.
