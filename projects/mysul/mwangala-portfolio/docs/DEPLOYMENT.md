# Deployment guide

This site builds to a **static SPA**: `npm run build` writes `dist/` containing
`index.html`, hashed assets under `dist/assets/`, plus `favicon.svg`,
`robots.txt` and `sitemap.xml`. There is no server runtime, no API and no
database — any static host will serve it.

The one thing every host must provide is an **SPA rewrite**: any path that is
not a real file must return `index.html`, so a hard reload or a shared link on
`/projects/netscope` still renders.

---

## 1. Build

```bash
# Recommended: set the real production origin so canonical/og:url and the
# sitemap use absolute URLs.
VITE_SITE_URL="https://your-domain.example" npm run build
```

Or put the values in `.env.production` (Vite loads it automatically for
production builds):

```bash
# .env.production
VITE_SITE_URL=https://your-domain.example
VITE_CONTACT_EMAIL=you@your-domain.example
VITE_CONTACT_ENDPOINT=https://your-endpoint.example/contact
VITE_REPO_OWNER=your-github-username
```

Then:

```bash
npm run build          # regenerates sitemap/robots, type-checks, builds dist/
npm run preview        # serve dist/ locally on http://localhost:4173 (SPA fallback included)
```

Verify before uploading:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/projects/netscope   # expect 200
curl -s http://localhost:4173/robots.txt                                            # expect the Sitemap: line
grep -o '<loc>[^<]*</loc>' public/sitemap.xml | head -3                             # expect absolute URLs
```

> `VITE_*` values are **compiled into the client bundle**. Never put a secret,
> API key or private token here. A contact-form backend that needs a key must
> keep it server-side.

### Environment variables

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_SITE_URL` | *(empty)* | Absolute origin. Enables `<link rel="canonical">`, `og:url`, absolute sitemap `<loc>` values and the `Sitemap:` line in robots.txt. Empty ⇒ those are omitted (no placeholder domain is invented). |
| `VITE_CONTACT_EMAIL` | *(empty)* | Display email on the contact page and in the footer, and the `mailto:` fallback target. Empty ⇒ a "not configured" state is shown. |
| `VITE_CONTACT_ENDPOINT` | *(empty)* | POST target for the contact form (JSON body `{ name, email, subject, message }`, `2xx` = success). Empty ⇒ the form hands off to `mailto:` and reports the message as *drafted*, never as delivered. |
| `VITE_REPO_OWNER` | *(empty)* | GitHub account used to build `https://github.com/<owner>/<repo>` links for all nine projects. Empty ⇒ no repository links are rendered. |
| `VITE_BASE_PATH` | `/` | Public base path for assets. Set to `/your-repo/` for sub-path deploys (GitHub Pages project sites). |

## 2. Host recipes

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA fallback — must come last.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Set the `VITE_*` values under *Site configuration → Environment variables*,
then redeploy. (Alternatively use a file-based redirect: a `_redirects` file in
`public/` containing `/* /index.html 200`.)

### Vercel

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel usually detects Vite and adds the rewrite itself; keeping it explicit
avoids surprises. Add environment variables under *Project → Settings →
Environment Variables*.

**This repository ships that file** as `vercel.json` (rewrite, SPA fallback,
safe security headers, immutable caching for hashed assets). Verified live: the
first deployment without it returned Vercel's `404: NOT_FOUND` for
`/projects` and `/earlier-work`; with it, deep links serve `index.html` and the
client router renders the right page.

### Live deployment (current)

| Item | Value |
| --- | --- |
| Production URL | https://mwangala-portfolio.vercel.app |
| Vercel project | `mwangala-portfolio` (team `m-corp2`) |
| Source | `MwaJr3/SynapseHub` → `main`, root directory `projects/mysul/mwangala-portfolio` |
| Build / install / output | `npm run build` / `npm install --legacy-peer-deps` / `dist` |
| Env var | `VITE_SITE_URL=https://mwangala-portfolio.vercel.app` (production + preview) |
| Auto-deploy | enabled: every push to `main` that touches the project rebuilds it |

`VITE_SITE_URL` is a **build-time** value: it is read by both the app
(canonical / `og:url`) and `scripts/generate-seo.mjs` (absolute sitemap `<loc>`
and the `robots.txt` `Sitemap:` line). The committed `public/sitemap.xml` stays
relative on purpose so `npm run sitemap:check` passes in a checkout with no
`.env`; the deployed file is regenerated during the Vercel build with the
variable present.

### Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: set `NODE_VERSION = 20` (build variable)
- SPA fallback: Cloudflare Pages serves `index.html` for unmatched paths
  automatically when `404.html` is absent. If you add a custom `404.html`,
  add a `/* → /index.html (200)` redirect rule under *Settings → Bulk redirects*
  or a `_redirects` file in `public/`.

### GitHub Pages (project site → sub-path)

A project site is served from `https://<user>.github.io/<repo>/`, so the base
path must be set:

```bash
VITE_SITE_URL="https://<user>.github.io/<repo>" \
VITE_BASE_PATH="/<repo>/" \
npm run build
```

```yaml
# .github/workflows/deploy.yml (sketch)
name: Deploy
on:
  push: { branches: [main] }
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run check
      - run: npm run build
        env:
          VITE_SITE_URL: https://<user>.github.io/<repo>
          VITE_BASE_PATH: /<repo>/
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Limitation:** GitHub Pages has no SPA rewrite. Deep links such as
`/repo/projects/netscope` will 404 on a hard reload. Options: accept it
(in-app navigation still works), or add a `404.html` that copies the path into
a query string and redirects (the classic SPA-GH-Pages trick), or host
elsewhere. Note that `react-router`'s `BrowserRouter` needs real rewrites —
switch to `HashRouter` in `src/App.tsx` if you want guaranteed deep links on
GitHub Pages.

### S3 + CloudFront (or any object store + CDN)

1. Upload `dist/` to the bucket.
2. Static website hosting: index document `index.html`, error document
   `index.html` (this makes unknown paths render the client-side 404 page).
3. CloudFront custom error response: `404` and `403` → respond with
   `/index.html` and HTTP `200`.
4. Cache: long TTL for `/assets/*` (filenames are hashed), short TTL for
   `index.html`.

### nginx

```nginx
server {
  listen 80;
  server_name your-domain.example;
  root /var/www/mwangala-portfolio/dist;
  index index.html;

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location / {
    add_header Cache-Control "no-cache";
    try_files $uri $uri/ /index.html;
  }

  location = /robots.txt  { }
  location = /sitemap.xml { }
}
```

### Anywhere else

Serve `dist/` and configure the equivalent of `try_files $uri /index.html`.
`npm run preview` already does this locally (see the `spaFallback()` plugin in
`vite.config.ts`), which makes it a good pre-deploy smoke test.

## 3. Post-deploy verification

Run through this list once on the live URL:

- [ ] `/` loads with styles and fonts (no unstyled flash, no missing woff2)
- [ ] Hard reload on `/projects`, `/projects/transcriptwise`, `/skills`,
      `/approach`, `/contact`, `/about` → all render (not a blank page or host 404)
- [ ] An unknown path (e.g. `/nope`) shows the in-app 404 page with links to
      real projects
- [ ] `/projects?filter=network-analysis` and `/projects?q=pcap` restore the
      filtered state from the URL
- [ ] Theme switcher: Light / Dark / System / Hybrid all apply, and the choice
      survives a reload (it is stored in `localStorage` under `mw-theme`)
- [ ] No horizontal scrollbar at 360 px, 390 px, 768 px, 1024 px and 1440 px
- [ ] Keyboard: `Tab` reaches the skip link first, focus rings are visible,
      Escape closes the theme menu and the mobile nav
- [ ] `/robots.txt` and `/sitemap.xml` return 200 and list your real domain
- [ ] View source: `<title>`, `meta description`, `og:*` and `canonical` are
      present and correct per page
- [ ] Contact form: submit a real message end-to-end and confirm it arrives
      (the UI only claims success on a `2xx`, or says "drafted" for `mailto:`)
- [ ] External links (GitHub, live demos) open the right destinations with
      `rel="noopener noreferrer"`
- [ ] Lighthouse (mobile): aim for 100/100/100 on Performance / Accessibility /
      Best Practices / SEO

### Known hosting caveats

- **Unknown routes return HTTP 200** with the client-rendered 404 page. That is
  inherent to a static SPA rewrite. If you need a true `404` status for
  crawlers, add host-level rules for paths you know do not exist.
- **Relative sitemap URLs** are ignored by most search engines. Set
  `VITE_SITE_URL` and rebuild before submitting the sitemap to Search Console.
- **`base` must match the deployment path.** If assets 404 after deploy, you
  are serving from a sub-path without `VITE_BASE_PATH` (or vice versa).
- **Old assets after a redeploy:** filenames are content-hashed, so a stale
  `index.html` in cache is the usual cause of blank pages. Keep `index.html`
  on a short cache TTL.

## 4. Pre-publication content review

Deployment is the wrong moment to discover placeholder copy. Before you ship:

1. **Fill in the config.** `src/config/profile.ts` (bio, email, location —
   currently `Lusaka, Zambia` with a TODO, profile links, education,
   certifications) and `src/config/projectLinks.ts` (live demos, repos).
2. **Clear the author-review flags.** Each project carries
   `needsAuthorReview[]`, rendered as a small note at the end of its Challenges
   section. Replace those sections with your own verified history and delete
   the entries — otherwise the note stays visible to visitors.
3. **Check every number in the case studies.** Anything that reads as a metric
   (packet counts, timings, coverage) inside preview artwork is illustrative
   sample data and is labelled "Representative preview". Real metrics belong in
   the copy only if you actually measured them.
4. **Replace drawn previews with real screenshots** when they exist
   (`preview.screenshot` → a file in `public/screenshots/`). Until then the
   artwork stays, and stays labelled.
5. **Re-run the checks:** `npm run check` (typecheck → lint → sitemap:check →
   261 tests → build).
6. **Submit the sitemap** to search consoles once `VITE_SITE_URL` is live.

## 5. Continuous integration

`npm run check` is the single gate:

```yaml
- run: npm ci
- run: npm run check
```

It fails on a type error, a lint error, a stale `sitemap.xml`/`robots.txt`, any
of the 261 tests (including "exactly nine projects", "excluded projects appear
nowhere", "no hardcoded colours in preview artwork", "no external link without
a configured URL"), or a build error.
