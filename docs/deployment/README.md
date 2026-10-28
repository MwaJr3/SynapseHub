# Deployment is paused — no project in this repository deploys

**State as of 2026-10-28: nothing in this repository deploys.** The nine project-level
Vercel configurations were removed on the owner's instruction — *"Remove them from Vercel
first, we'll redeploy them later."* A root configuration added by the connected-workspace
work was removed on the same reasoning. The code, tests and folder layout are untouched;
what is gone is the deployment wiring that made any of it look shippable.

## What was removed

| Removed | Count | Why |
| --- | ---: | --- |
| `projects/*/backend/vercel.json` | 8 | The Vercel Python runtime config for each product API |
| `projects/mysul/mwangala-portfolio/vercel.json` | 1 | SPA fallback + rewrite for the site |
| `docs/DEPLOYMENT_TARGETS.md` | 1 | Vercel project names, root directories, Supabase schemas, env table |
| `vercel.json` (repository root) | 1 | Whole-repository deploy: `api/index.py` function, SPA rewrites, `/api` no-store |
| `.vercelignore` | 1 | Upload exclusions for that deploy; its anchor bug once dropped site sources |
| `scripts/check-vercel-sources.mjs` | 1 | CI guard that the above kept required sources in the payload |

Private data, no secrets, and no credentials were removed by this — the `.env.example`
files never named a deployment target, and no key was ever committed. What is lost is
only the machine-readable link between a folder and a hosted project.

> Removing the config is **also what makes the restructure safe.** A Vercel project
> builds from a *Root Directory* recorded in its dashboard settings. While those
> settings pointed at `projects/…`, any move broke a live build silently. With nothing
> deployed, folders can be reorganised and each project repointed once, deliberately,
> when it is redeployed.

## The root config that came and went

The connected-workspace work added a `vercel.json` at the repository root. It was kept
through the restructure merge on the argument that it deployed the root site and its
API as one unit rather than reinstating a paused project. **It has since been removed
too**, on the owner's instruction, along with `.vercelignore` and the
`scripts/check-vercel-sources.mjs` guard that existed only to protect that payload.

The distinction that survived: a root config deploys *the whole repository* as one
project, which is a larger claim than any single project's wiring, not a smaller one.
`src/registry.test.ts` checks every registered project **and the repository root**, so
re-adding one anywhere fails a test rather than being discovered on a bill.

What the removal did not touch: `api/index.py` (the ASGI entry point),
`backend/synapsehub/`, `packages/synapse-client/`, the `/synapsehub` route, or any
test. The deployment attempt recorded in `docs/SYNAPSEHUB_RELEASE.md` is history; the
code it packaged still runs locally, which is where it is exercised.

## What still exists, deliberately

- **The application code.** Every `index.py` ASGI entry point, every `api/` function,
  every route and every test is where it was.
- **`docs/DEPLOYMENT.md`** — Tessera's container build. It is Docker and PostgreSQL, not
  Vercel, Tessera was never deployed, and the document already states that no image was
  ever built here. It is the only runnable end-to-end packaging in the repository.
- **Provider-neutral notes.** `projects/mysul/mwangala-portfolio/START_HERE.md` still
  lists *recipes* for Netlify, Cloudflare Pages, GitHub Pages, S3 and nginx. Those are
  instructions, not configuration: nothing in the tree acts on them.
- **`vocal-separator`, `workniche`, TranscriptWise and TenantCore deployment docs**, which
  describe Docker/compose and a local reverse proxy.

## What to do when a project is redeployed

1. Create the hosting project and record its **Root Directory** against the folder's
   current path — not the path it had before the restructure.
2. Re-add the platform's config file to that folder only. Do not add one to the
   repository root; a root config applies to every project at once.
3. Set the environment variables in the host's dashboard, never in a committed file.
4. Update `projects.json`: move the entry from `pausedDeployment` to `deploys`. The
   registry test asserts that `deploys` is empty while deployment is paused, so it will
   fail until the registry is updated — that is intentional, and it keeps the record and
   the tree from disagreeing.

## Former targets, for reference only

These are the nine projects that were configured before the removal. Nothing below is
active, and no file in the repository configures them.

| Project | Former Vercel project | Former root directory | Former database schema |
| --- | --- | --- | --- |
| PhishLens | `synapsehub-phishlens-api` | `projects/phishlens/backend` | `phishlens` |
| NetScope | `synapsehub-netscope-api` | `projects/netscope/backend` | `netscope` |
| IncidentFlow | `synapsehub-incidentflow-api` | `projects/incidentflow/backend` | `incidentflow` |
| ThreatIntel Desk | `synapsehub-threatintel-api` | `projects/threatintel-desk/backend` | `threatintel_desk` |
| HashSight | `synapsehub-hashsight-api` | `projects/hashsight/backend` | `hashsight` |
| AssetWatch | `synapsehub-assetwatch-api` | `projects/assetwatch/backend` | `assetwatch` |
| SecureCode Workbench | `synapsehub-securecode-workbench-api` | `projects/securecode-workbench/backend` | `securecode` |
| CyberAware Lab | `synapsehub-cyberaware-lab-api` | `projects/cyberaware-lab/backend` | `cyberaware` |
| Website (company site + portfolio) | `mwangala-portfolio` | `projects/mysul/mwangala-portfolio` | — |

The previous build settings — `npm run build`, `npm install --legacy-peer-deps`, output
`dist` — and the SPA rewrite are recorded in git history and in
`projects/mysul/mwangala-portfolio/docs/DEPLOYMENT.md` §Vercel. They are not repeated
here as instructions.

## Honest limits

- **Nothing was tested against a host after the removal**, because nothing is hosted.
  The claim made here is narrow: the files listed above are gone, the suites still pass,
  and no other file in the repository configures a deployment.
- **The nine hosted deployments were not deleted from the hosting account** — that is a
  dashboard action no repository change can make. They continue to serve their last
  successful build until the owner removes them.

---

## The hosting plan (decided 2026-10-28)

The question was whether to deploy the remaining projects **under the company
website** to stay inside the free tier, or to keep one hosting project each.

### What the free tier actually allows

Vercel Hobby, as published on <https://vercel.com/docs/limits> (read 2026-10-28):

| Limit | Hobby | Pro |
| --- | ---: | ---: |
| Projects | 200 | Unlimited |
| **Deployments created per day** | **100** | 6,000 |
| Builds per hour | 100 | — |
| Concurrent builds | **1** | 12+ |
| Build time per deployment | 45 min | 45 min |
| Cost | free, **personal and non-commercial use only** | $20/mo per seat |

Two mechanics matter more than the headline number:

1. **Every project connected to the repo builds on every push.** A push that
   touches nothing in project *B* still creates a deployment for *B* unless the
   build is skipped. Under the previous layout — one site plus eight API
   projects — a single push could create **nine deployments**, so the day's
   budget ran out after about eleven pushes. That is the rate limit this
   repository already hit, and it was recorded at the time as a billing message
   rather than a code defect.
2. **Billed builds are per deployment, not per file.** One project serving forty
   static apps costs one deployment. Forty projects cost forty.

### The decision

**One deployment unit per tier, not one per project.**

| Tier | What deploys | How | Deployments per push |
| --- | --- | --- | ---: |
| Umbrella | `company-platform/` (Next.js) — the company site and catalogue | one Vercel project | 1 |
| Catalogue apps | the 18 catalogue projects that have a React frontend | built into the umbrella at `public/apps/<slug>/` and served statically from it | 0 |
| Backends | only products that genuinely hold data | one API project mounting each backend under `/api/<slug>`, **not** nine projects | 1 |

So a push costs **two deployments, not nine** — and a push that only changes
documentation can cost zero if the umbrella's ignore step is configured.

This is the owner's instinct, and it is the right one for the frontends. It does
not extend to the Python backends unchanged, which is why that tier is separate.

### What this costs in the repository

- **18 catalogue frontends need a build base.** None sets one today, so every app
  expects its assets at `/assets/*`. Serving them under `/apps/<slug>/` requires
  `base: '/apps/<slug>/'` in each `vite.config.ts` — mechanical, but it changes
  18 build configs and the router basename in each.
- **36 of the 54 catalogue apps have no frontend at all.** They are Python
  CLIs. There is nothing to host and nothing to mount; they belong in the
  catalogue as source, with the local run command, not as live sites.
- **The nine backends are independent FastAPI apps** with their own Alembic
  migrations and app factories. Mounting them in one project is a real refactor,
  not a routing change, and it weakens the "each project stands alone" property
  the repository holds elsewhere. Recommendation: deploy **two** of them — the
  ones the company site actually calls — and leave the other seven as source.

### The alternative worth stating plainly

**Hobby is for personal, non-commercial use.** These projects are the products of
two named companies. If this is going to be a real business front door, $20/month
removes the deployment limit, the concurrency limit and the licence problem in one
step — and it is cheaper than the engineering time needed to contort eighteen
build configs and a router basename around a 100-per-day cap.

That is a decision for the owner, not for the repository. Nothing here has been
built to assume either answer: the hosting configuration is still removed, and
`projects.json` still records `deploys: []` for every project.

### Order of work, when deployment starts

1. Decide Hobby-with-one-project or Pro-with-several. Everything below is cheaper
   under Pro.
2. Deploy the umbrella first, alone, and confirm `/` answers.
3. Add the catalogue frontends to its build, one at a time, starting with one app
   to prove the base-path rewrite.
4. Add a single API project only for the products the site calls.
5. Move each entry in `projects.json` from `pausedDeployment` to `deploys` in the
   same change that makes it live — the registry test fails until it is correct.

---

## Would Netlify do the trick? (checked 2026-10-28)

Short answer: **for the 36 catalogue builds and the frontends, yes — and it is
better than Vercel on the licence. For the 32 full-stack projects, no: Netlify
cannot run the backends at all.**

### The two facts that decide it

**1. Netlify Functions have no Python runtime.** Netlify's own primitives map lists
request compute as *"Netlify Functions (JS/TS, Go) + Edge Functions (Deno)"*, and
the Functions docs state functions are written in JavaScript or TypeScript, with Go
supported through a Lambda-compatible API. Where a Python endpoint is needed, that
is a hard constraint, not a preference. Every one of this repository's backends is
FastAPI — 28 full-stack projects plus 8 standalone CLIs' worth of Python service
code. **Vercel does support a Python runtime; Netlify does not.**

**2. Netlify bills per deploy, and the new free plan is much tighter.** Since
September 2025 new accounts are credit-based: **300 credits a month, hard limit**,
with **15 credits per production deploy**, 20 per GB of bandwidth, and 1 concurrent
build. Vercel Hobby is **100 deployments a day** with a 45-minute build ceiling.
Both meter the thing that actually hurts here — *one deploy per project per push* —
but Netlify's budget is roughly **20 production deploys a month**, where Vercel's is
about 100 a day.

| | Vercel Hobby | Netlify Free | Cloudflare Pages |
| --- | --- | --- | --- |
| Cost | $0 | $0 | $0 |
| **Commercial use** | **not permitted** (personal only) | permitted | permitted |
| Deploy allowance | 100/day | ~20/month (300 credits ÷ 15) | 500 builds/month |
| Concurrent builds | 1 | 1 | 1 |
| Bandwidth | 100 GB | ~15 GB (20 credits/GB) | unmetered |
| **Python functions** | **yes** | **no** (JS/TS/Go only) | Workers: JS/WASM only |

### What that means for this repository

The owner's rule — *full-stack stays separate, CLI-only goes in the catalogue* —
leaves **32 separate deployments**. On **either** free host, connecting all 32 to
one repository is the same trap that was already hit here: a push that touches one
project rebuilds all of them. Two mitigations, and both are needed regardless of
host:

1. **Skip builds that cannot have changed.** Both hosts support it — Vercel through
   the monorepo ignore step, Netlify through an `ignore` command in `netlify.toml`
   that compares the changed paths. Without it, 32 projects × one push is 32 deploys
   and the day is gone on Vercel, the month on Netlify.
2. **Split the backends off the static host.** Netlify/Cloudflare serve the
   frontends; the FastAPI services need a Python host (Render, Fly.io, Railway, or
   Vercel Pro). That is a second platform to operate, and it is the price of the
   separation.

So the honest recommendation, in order of cost:

| Option | Monthly | What it gets |
| --- | ---: | --- |
| **Vercel Hobby + catalogue in the umbrella** | $0 | Works today. Non-commercial only. Needs build-skipping. Python runs. |
| **Netlify Free for the frontends + a Python host for the backends** | $0 | Commercial use allowed. Two platforms, tighter deploy budget, backend host to choose. |
| **Cloudflare Pages for the frontends + a Python host** | $0 | Unmetered bandwidth, 500 builds/month, commercial use allowed. Same two-platform cost. |
| **Vercel Pro** | $20 | Removes the licence limit, the deploy cap and the concurrency queue in one step. Python included. |

Nothing above is a claim about which is "best" in the abstract. If the sites must
carry a company's name and take money, **Hobby's licence is the blocker and $20 is
cheaper than any of the workarounds** — that was true before Netlify and Netlify
does not change it.

### What is actually built, pending that decision

- `projects.json` now records `deployment` for all 73 projects: **32 `separate`,
  36 `catalogue`, 5 `none`** (coursework and scratch folders with nothing to serve).
- The 36 catalogue builds are published on the company site at **`/catalogue`**,
  generated from the registry by `npm run catalogue`, with a test on each side that
  fails if the page and the registry disagree.
- Nothing is deployed. No hosting config has been re-added.
