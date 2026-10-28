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
