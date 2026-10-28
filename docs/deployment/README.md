# Deployment is paused — nothing in this repository deploys

**State as of 2026-10-28: no project deploys.** The nine Vercel projects were removed
from the repository on the owner's instruction — *"Remove them from Vercel first, we'll
redeploy them later."* The code, tests and folder layout of every project are untouched.
What is gone is the deployment wiring that made them look shippable.

## What was removed

| Removed | Count | Why |
| --- | ---: | --- |
| `projects/*/backend/vercel.json` | 8 | The Vercel Python runtime config for each product API |
| `projects/mysul/mwangala-portfolio/vercel.json` | 1 | SPA fallback + rewrite for the site |
| `docs/DEPLOYMENT_TARGETS.md` | 1 | Vercel project names, root directories, Supabase schemas, env table |

Private data, no secrets, and no credentials were removed by this — the `.env.example`
files never named a deployment target, and no key was ever committed. What is lost is
only the machine-readable link between a folder and a hosted project.

> Removing the config is **also what makes the restructure safe.** A Vercel project
> builds from a *Root Directory* recorded in its dashboard settings. While those
> settings pointed at `projects/…`, any move broke a live build silently. With nothing
> deployed, folders can be reorganised and each project repointed once, deliberately,
> when it is redeployed.

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
