# Requirements

What you need to install, build, test and deploy this project — and, for every
dependency, the exact version the lockfile resolves to.

> **About "requirements files" in this project.** This is a Node/TypeScript
> application, so its dependency manifests are `package.json` (declared
> version ranges) plus `package-lock.json` (exact resolved versions and
> integrity hashes). Those two files *are* the npm equivalent of a Python
> `requirements.txt`, and `npm ci` reproduces the verified tree byte-for-byte.
> A literal `requirements.txt` is not included on purpose: **nothing in this
> site runs on Python** — the Python mentioned throughout the case studies is
> the subject matter of the portfolio projects, not a runtime dependency of
> the website. This document is the human-readable requirements overview; the
> machine-readable truth stays in the two manifest files.

---

## 1. System requirements

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | **>= 20** (also enforced via `engines` in `package.json`) | Developed and verified on **v20.20.2**. Vite 7 requires Node 20.19+ / 22.12+. |
| npm | **>= 10** | Verified on **10.8.2**. Any package manager that respects `package-lock.json` works (`npm ci` recommended for reproducibility). |
| RAM | ~1 GB free for dev/test, ~1.5 GB for `npm run build` | Verified on a 2 GB / 2 vCPU machine; run the checks sequentially there. |
| Disk | ~350 MB for `node_modules`, ~5 MB source, ~2 MB `dist/` | |
| OS | Linux / macOS / Windows | No native binaries or OS-specific tooling. |
| Network | Only for `npm install` | Dev server, build and tests are fully offline afterwards; fonts are self-hosted, no CDN. |

**Browser support (build target):** `es2022` — any evergreen browser from
roughly 2022 onwards (Chrome/Edge 94+, Firefox 93+, Safari 15.4+). CSS uses
custom properties, `:has()`-free selectors, `color-scheme` and
`prefers-reduced-motion`, all with graceful fallbacks.

## 2. Runtime dependencies (ship in the bundle)

| Package | Declared | Resolved (lockfile) | Why |
| --- | --- | --- | --- |
| `react` | `^19.2.0` | 19.3.1 | UI runtime |
| `react-dom` | `^19.2.0` | 19.3.1 | DOM renderer |
| `react-router-dom` | `^7.9.4` | 7.18.4 | Client-side routing, lazy routes, scroll restoration |
| `@fontsource-variable/inter` | `^5.3.0` | 5.3.0 | Self-hosted variable Inter (no third-party font requests) |
| `@fontsource-variable/jetbrains-mono` | `^5.3.0` | 5.3.0 | Self-hosted variable JetBrains Mono |
| `@types/node` | `^26.6.5` | 26.6.5 | Node typings for `vite.config.ts` / scripts |

## 3. Development dependencies (never shipped)

| Package | Declared | Resolved (lockfile) | Why |
| --- | --- | --- | --- |
| `vite` | `^7.1.9` | 7.3.7 | Dev server, build, preview (incl. SPA-fallback plugin) |
| `@vitejs/plugin-react` | `^5.0.4` | 5.2.0 | Fast Refresh / JSX transform |
| `tailwindcss` | `^4.1.14` | 4.3.3 | Utility CSS engine (config-less, token layer in `src/styles/tokens.css`) |
| `@tailwindcss/vite` | `^4.1.14` | 4.3.3 | Tailwind as a Vite plugin |
| `typescript` | `~5.9.3` | 5.9.3 | Type-checking (`tsc -b`, strict + `verbatimModuleSyntax` + `exactOptionalPropertyTypes`) |
| `vitest` | `^3.2.4` | 3.2.7 | Test runner (261 tests) |
| `jsdom` | `^27.0.0` | 27.4.0 | DOM environment for tests |
| `@testing-library/react` | `^16.3.0` | 16.3.3 | Component rendering in tests |
| `@testing-library/dom` | `^10.4.1` | 10.4.2 | Queries (peer of the above) |
| `@testing-library/jest-dom` | `^6.9.1` | 6.9.1 | DOM matchers (`toBeInTheDocument`, …) |
| `@testing-library/user-event` | `^14.6.1` | 14.6.8 | Realistic interaction simulation |
| `eslint` | `^9.37.0` | 9.39.5 | Linting (flat config) |
| `typescript-eslint` | `^8.46.0` | 8.71.2 | TS-aware ESLint rules |
| `eslint-plugin-react-hooks` | `^5.2.0` | 5.2.0 | Rules-of-hooks checks |
| `eslint-plugin-react-refresh` | `^0.4.24` | 0.4.26 | Fast-refresh export hygiene |
| `@types/react` | `^19.2.2` | 19.3.0 | React typings |
| `@types/react-dom` | `^19.2.1` | 19.3.0 | ReactDOM typings |

Resolved versions above were read from `package-lock.json` at bundle time; run
`npm ci` to reproduce exactly, or `npm outdated` / `npm update` to move within
the declared ranges.

## 4. Optional tooling (not required)

| Tool | Needed for | Install |
| --- | --- | --- |
| `playwright-core` + Chromium headless shell | `scripts/visual-smoke.mjs` (layout/console sweep, theme end-to-end, screenshots) | `npm i --no-save playwright-core && npx playwright install chromium` |
| Debian/Ubuntu libraries (`libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxdamage1 libxkbcommon0 libasound2 libatspi2.0-0`) | Running that Chromium on a bare Linux box | `sudo apt-get install -y …` |
| A static host with SPA rewrites | Deployment | see `docs/DEPLOYMENT.md` |
| `zip` | Re-bundling the project | OS package |

Nothing in §4 is installed by `npm install` and none of it is imported by the
app, the build or `npm test`.

## 5. Environment variables (all optional)

| Variable | Default | Effect when set |
| --- | --- | --- |
| `VITE_SITE_URL` | *(empty)* | Canonical/`og:url` tags, absolute sitemap `<loc>`, robots `Sitemap:` line |
| `VITE_CONTACT_EMAIL` | *(empty)* | Display email + `mailto:` fallback target |
| `VITE_CONTACT_ENDPOINT` | *(empty)* | POST target for the contact form (`2xx` = success) |
| `VITE_REPO_OWNER` | *(empty)* | Builds `https://github.com/<owner>/<repo>` links for all nine projects |
| `VITE_BASE_PATH` | `/` | Public base path for sub-path deployments |

The site runs with **none** of these set: unconfigured features hide
themselves or show an explicit "not configured yet" state. Template:
`.env.example`. Only `VITE_`-prefixed values reach the browser — never put a
secret in this project.

## 6. Verifying an environment

```bash
node --version        # >= 20
npm --version         # >= 10
npm ci                # exact dependency tree from package-lock.json
npm run check         # typecheck -> lint -> sitemap:check -> 261 tests -> build
```

All four commands passing on the versions in §1–§3 is the definition of a
working environment for this repository.
