# Deployment — live targets

Two things are deployed from this repository: the **website** (one Vercel
project) and the **product APIs** (one Vercel project per backend).

## Website (company site + portfolio)

| Item | Value |
| --- | --- |
| URL | https://mwangala-portfolio.vercel.app |
| Vercel project | `mwangala-portfolio` |
| Root directory | `projects/mysul/mwangala-portfolio` |
| Source | `MwaJr3/SynapseHub` → `main` |
| Build / install / output | `npm run build` / `npm install --legacy-peer-deps` / `dist` |
| Env | `VITE_SITE_URL`, `VITE_REPO_OWNER`, `VITE_CONTACT_ENDPOINT=/api/contact` |

Routes: the **company site is `/`**; the portfolio is served under `/portfolio`
(the router mounts with that basename). Old unprefixed URLs 307-redirect.
`vercel.json` supplies the SPA fallback used by both sections.

The contact form posts to `POST /api/contact`, a Python function in the same
project (`api/contact.py`) that delivers to both nominated inboxes. It answers
`503 not_configured` until an email transport is set:

| Transport | Variables |
| --- | --- |
| Resend | `RESEND_API_KEY`, `CONTACT_FROM` (a verified sender) |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `CONTACT_FROM` |
| Override recipients | `CONTACT_TO` (comma-separated; defaults to the two nominated inboxes) |

## Product APIs

One Vercel project per backend, each rooted at its own `backend/` directory.
Every backend exposes `index.py` in the backend root: Vercel detects the FastAPI
`app` export and serves routing itself, so `vercel.json` holds nothing but the
schema declaration. An earlier `api/index.py` + `rewrites` layout was abandoned —
inside a backend-framework project those rewrites route on the rewritten
destination path and never reach the application.

Each backend also answers `GET /health`: liveness plus a real `SELECT 1`, with a
credential-scrubbed message on failure. All eight were verified beyond that with
a temporary `/health/write` probe (insert, count, delete, plus the resolved
domain table) which has since been removed from the code.

| Product | Vercel project | Root directory | Supabase schema |
| --- | --- | --- | --- |
| PhishLens | `synapsehub-phishlens-api` | `projects/phishlens/backend` | `phishlens` |
| NetScope | `synapsehub-netscope-api` | `projects/netscope/backend` | `netscope` |
| IncidentFlow | `synapsehub-incidentflow-api` | `projects/incidentflow/backend` | `incidentflow` |
| ThreatIntel Desk | `synapsehub-threatintel-api` | `projects/threatintel-desk/backend` | `threatintel_desk` |
| HashSight | `synapsehub-hashsight-api` | `projects/hashsight/backend` | `hashsight` |
| AssetWatch | `synapsehub-assetwatch-api` | `projects/assetwatch/backend` | `assetwatch` |
| SecureCode Workbench | `synapsehub-securecode-workbench-api` | `projects/securecode-workbench/backend` | `securecode` |
| CyberAware Lab | `synapsehub-cyberaware-lab-api` | `projects/cyberaware-lab/backend` | `cyberaware` |

### Required environment variables (every API project)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string (session pooler, port 5432) |
| `DB_SCHEMA` | Schema that qualifies every table — keeps the eight apps isolated in one database |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS (add the deployed frontends here) |
| `RESET_DELIVERY` | `dev` returns reset tokens in the response; `smtp` is the real deployment mode |

All eight schemas exist, each stamped to its Alembic head revision.

### Two production findings worth keeping

**Driver mismatch.** Supabase connection strings can name psycopg 3
(`postgresql+psycopg://`) while the requirements install psycopg2-binary. Because
`create_engine` runs at import, that mismatch killed every route with an opaque
`FUNCTION_INVOCATION_FAILED` before any handler ran. `app/db.py` now normalises
every Postgres spelling to `+psycopg2`.

**search_path is not applied by the pooler.** The pooler
(`...pooler.supabase.com`) does not forward libpq's `options` parameter, so a
connection-level `search_path` was silently ignored and queries ran against
`public` — where none of the apps have tables. Tables are therefore qualified
through `Base.metadata.schema`, which travels with each statement.

**Diagnostics.** A bare ASGI callable is not accepted as the entry point, so an
import failure inside a hand-rolled fallback produces the same opaque 500 it was
meant to explain. The fallback must be a real FastAPI app.

### Serverless constraints (documented, not hidden)

- **NetScope** parses captures larger than 512 KB in a background thread. A
  serverless function is frozen once it responds, so that path must become
  synchronous or move to a queue before it is trustworthy in production.
- Uploads: request bodies are capped at **4.5 MB** on the Hobby plan, and only
  `/tmp` is writable — anything that persists files locally needs object storage.
- Cold starts on Python + SQLAlchemy are slower than a warm local server.
