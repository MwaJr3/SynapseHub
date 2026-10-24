# Project evidence map

Two evidence classes, per owner instructions of 2026-10-23:

1. **Provenance links** — six pull-request URLs supplied verbatim by the owner,
   each merged and inspected (CBU_Assignments became public the same day).
2. **In-repository source locations** — all project code was consolidated into
   this repository (owner instruction: every project lives in SynapseHub, not
   in other repositories) so the company website, hosted on Vercel from this
   repository, has every project physically within it. See
   [`projects/README.md`](../../projects/README.md) for the full map.

**Evidence of source code is not evidence of deployment** — no product is
claimed live.

## Provenance links and verification status

| Project (owner's framing) | Provenance link | Verified here | Where it lives now |
| --- | --- | --- | --- |
| TenantCore — Multi-Tenant SaaS Database | [CBU_Assignments#5](https://github.com/MwaJr3/CBU_Assignments/pull/5) | **Yes** — MERGED 2026-10-22 (`ee58d11`), inspected after the repo became public | `projects/cbu-assignments/tenantcore/` |
| VDownloader OS desktop video downloader | [CBU_Assignments#6](https://github.com/MwaJr3/CBU_Assignments/pull/6) | **Yes** — MERGED 2026-10-23 (`ccc9700`), inspected after the repo became public | `projects/cbu-assignments/video_downloader_app/` |
| Stock Price Analysis — comparative financial time-series analytics | [SynapseHub#4](https://github.com/MwaJr3/SynapseHub/pull/4) | **Yes** — MERGED 2026-10-19, 69 files | `stock-price-analysis/`, `stock-price-time-series-analysis/` |
| The 60 challenge records | [SynapseHub#3](https://github.com/MwaJr3/SynapseHub/pull/3) | **Yes** — MERGED 2026-10-23, 100 files | this repository's portfolio app (`src/apps`, `/apps` routes) |
| The cybersecurity projects | [MySul#1](https://github.com/MwaJr3/MySul/pull/1) | **Yes** — MERGED 2026-10-23 (`be39a9e`), 24 files | `projects/mysul/mwangala/` |
| Mwangala React portfolio site (Vite + TypeScript) | [MySul#2](https://github.com/MwaJr3/MySul/pull/2) | **Yes** — MERGED 2026-10-23 (`7a01e8b`), 100 files | `projects/mysul/mwangala-portfolio/` |

## How the evidence maps to the 25 catalogue products

All 25 products carry a verified record of *something real*; sixteen carry
working application source. Source Code buttons appear only for the sixteen.

### Working apps — Source Code configured (7)

`sentinelcore`, `sentinellog`, `fileguard`, `dependsecure`, `chessscope`,
`circuitlab-calc`, `campusflow` — **full working full-stack applications
built into this repository at `apps/<slug>/`** (backend + frontend + tests,
built 2026-10-23), with demo and case-study pages vendored at
`projects/mysul/mwangala/apps/<slug>/` and
`projects/mysul/mwangala/projects/<slug>/`, provenance
[MySul#1](https://github.com/MwaJr3/MySul/pull/1). Each product's Source Code
button links to its `apps/<slug>/` folder **inside this repository**. Status
stays **Built (not publicly deployed)**: source exists and runs; no hosted
deployment is claimed.

### Verified case-study records — Source Code hidden (9)

`assetwatch`, `hashsight`, `incidentflow`, `netscope`, `phishlens`,
`securecode-workbench`, `threatintel-desk`, `cyberaware-lab`,
`transcriptwise` — project case-study records vendored at
`projects/mysul/mwangala-portfolio/src/data/projects/`, provenance
[MySul#2](https://github.com/MwaJr3/MySul/pull/2). Product source is **not
linked**, so the Source Code button stays hidden.

### Education suite — Source Code configured (9)

`learnbridge`, `classconnect`, `tutorspring`, `pathwise`, `teachcraft`,
`openlearn-commons`, `learnpulse`, `reachlearn`, `eduaccess` — **full working
full-stack applications built into this repository at `apps/<slug>/`**
(backend + frontend + tests + seeded demo data, built 2026-10-24). Each
product's Source Code button links to its `apps/<slug>/` folder **inside this
repository**. Status: **Built (not publicly deployed)**.

**Correction (2026-10-23), preserved:** an earlier draft of this document
claimed verified registry records at the root path `src/data/projects/`; no
such records exist and that claim was withdrawn. Before 2026-10-24 these nine
were case-study-only; they now have verified working implementations as
described above.

## Projects outside the 25-product catalogue

Real, evidenced projects that are not platform catalogue entries (the
catalogue is the specified 25):

- **TenantCore** — `projects/cbu-assignments/tenantcore/`. FastAPI + SQLAlchemy
  + Alembic backend with a React/TypeScript/Tailwind dashboard: PostgreSQL
  Row-Level Security tenant isolation behind a restricted runtime role,
  composite tenant-safe foreign keys, immutable audit events; tenant lifecycle,
  memberships/roles, rotating sessions, invitations, API-key auth, usage
  metrics, tenant-aware Celery jobs, observability; Docker/Compose stack,
  deterministic demo tenants (Acme/Globex/NovaTech), isolation lab,
  schema-per-tenant tooling. PR-reported checks: 36 backend tests (incl.
  adversarial RLS) + 5 frontend tests, Alembic round-trip, typecheck/lint/
  build, dependency audits. Docker Compose, Playwright and live Redis/Celery
  were not run in the PR environment. *Not a catalogue product; case-study
  framing would require verification of details before publication.*
- **VDownloader OS** — `projects/cbu-assignments/video_downloader_app/`.
  Python 3.10+ / PyQt6 / yt-dlp / FFmpeg / WebSockets desktop suite: downloader
  (144p–8K, MP3 320k/M4A, queued jobs with retry backoff), Instant Transcript
  Studio (VTT/SRT parse, dedupe, timestamps), IDM-style mini taskbar with
  Chrome/Edge MV3 + Firefox MV2 extension bridges over a local WebSocket,
  clipboard monitor, tray alerts, six analytical dashboards (PyQt6 + aiohttp
  web control centre), six engineering docs, PyInstaller packaging.
  PR-reported checks: 21/21 tests (incl. real FFmpeg subtitle burn, WebSocket
  roundtrip, extension-manifest integrity), build dry-run. *Same caveat as
  above.*
- **Stock Price Analysis v1/v2** — `stock-price-analysis/`,
  `stock-price-time-series-analysis/` in this repository.
- **60 challenge records** — the `/apps` catalogue in this repository's
  portfolio application.
- **WorkNiche** — complete full-stack job-marketplace app in this repository
  (`workniche/`), previously verified.

## Rules this map obeys

- Only two URL classes are used: the owner's six verbatim PR URLs, and GitHub
  tree links into this repository whose paths verifiably exist here. Nothing is
  inferred from names, usernames, or hosting conventions.
- A merged PR evidences source code — never deployment, users, or metrics.
  PR-reported test counts are attributed to the PR, not claimed as re-run here.
- Unverifiable claims are labelled as such, not quietly trusted.
- `tests/content-integrity.test.ts` enforces the URL allowlist and that source
  links point into this repository.
