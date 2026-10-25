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
Every backend exposes `api/index.py` (ASGI entry) and its own `vercel.json`
(all paths → that function, 60 s max duration).

| Product | Vercel project | Root directory | Supabase schema |
| --- | --- | --- | --- |
| PhishLens | `synapsehub-phishlens-api` | `projects/phishlens/backend` | `phishlens` |
| NetScope | `synapsehub-netscope-api` | `projects/netscope/backend` | `netscope` |
| IncidentFlow | `synapsehub-incidentflow-api` | `projects/incidentflow/backend` | `incidentflow` |
| ThreatIntel Desk | `synapsehub-threatintel-api` | `projects/threatintel-desk/backend` | `threatintel_desk` |
| HashSight | *not yet created* | `projects/hashsight/backend` | `hashsight` (missing) |
| AssetWatch | *not yet created* | `projects/assetwatch/backend` | `assetwatch` (missing) |
| SecureCode Workbench | *not yet created* | `projects/securecode-workbench/backend` | `securecode` (missing) |
| CyberAware Lab | *not yet created* | `projects/cyberaware-lab/backend` | `cyberaware` (missing) |

### Required environment variables (every API project)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string (session pooler, port 5432) |
| `DB_SCHEMA` | Schema applied as the connection `search_path` — keeps the eight apps isolated in one database |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS (add the deployed frontends here) |
| `RESET_DELIVERY` | `dev` returns reset tokens in the response; `smtp` is the real deployment mode |

The four schemas marked *missing* have not been provisioned in Supabase yet, so
those projects must not be deployed until their schema exists — a backend
pointed at a nonexistent schema fails at first query rather than at boot.

### Serverless constraints (documented, not hidden)

- **NetScope** parses captures larger than 512 KB in a background thread. A
  serverless function is frozen once it responds, so that path must become
  synchronous or move to a queue before it is trustworthy in production.
- Uploads: request bodies are capped at **4.5 MB** on the Hobby plan, and only
  `/tmp` is writable — anything that persists files locally needs object storage.
- Cold starts on Python + SQLAlchemy are slower than a warm local server.
