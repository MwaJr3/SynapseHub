# Project evidence map

Two evidence classes, per owner instructions of 2026-10-23:

1. **Provenance links** — six pull-request URLs supplied verbatim by the owner,
   each merged and inspected (CBU_Assignments became public the same day).
2. **In-repository source locations** — all project code was consolidated into
   this repository (owner instruction: every project lives in SynapseHub, not
   in other repositories) so the company website, hosted on Vercel from this
   repository, has every project physically within it. See
   [`docs/PROJECTS.md`](../../docs/PROJECTS.md) for the full map.

**Evidence of source code is not evidence of deployment** — no product is
claimed live.

## Provenance links and verification status

| Project (owner's framing) | Provenance link | Verified here | Where it lives now |
| --- | --- | --- | --- |
| TenantCore — Multi-Tenant SaaS Database | [CBU_Assignments#5](https://github.com/MwaJr3/CBU_Assignments/pull/5) | **Yes** — MERGED 2026-10-22 (`ee58d11`), inspected after the repo became public | `coursework/cbu-assignments/tenantcore/` |
| VDownloader OS desktop video downloader | [CBU_Assignments#6](https://github.com/MwaJr3/CBU_Assignments/pull/6) | **Yes** — MERGED 2026-10-23 (`ccc9700`), inspected after the repo became public | `coursework/cbu-assignments/video_downloader_app/` |
| Stock Price Analysis — comparative financial time-series analytics | [SynapseHub#4](https://github.com/MwaJr3/SynapseHub/pull/4) | **Yes** — MERGED 2026-10-19, 69 files | `stock-price-analysis/`, `stock-price-time-series-analysis/` |
| The 60 challenge records | [SynapseHub#3](https://github.com/MwaJr3/SynapseHub/pull/3) | **Yes** — MERGED 2026-10-23, 100 files | this repository's portfolio app (`src/apps`, `/apps` routes) |
| The cybersecurity projects | [MySul#1](https://github.com/MwaJr3/MySul/pull/1) | **Yes** — MERGED 2026-10-23 (`be39a9e`), 24 files | `sites/portfolio/` |
| Mwangala React portfolio site (Vite + TypeScript) | [MySul#2](https://github.com/MwaJr3/MySul/pull/2) | **Yes** — MERGED 2026-10-23 (`7a01e8b`), 100 files | `sites/portfolio/` |

## How the evidence maps to the 25 catalogue products

All 25 products now carry a verified source location and an internal
Source Code link. The nine cybersecurity/learning projects that previously had
only case-study records now have dedicated full-stack implementations under
`companies/`, with frontend, backend, automated tests, setup instructions and
local demonstration workflows. Source-code evidence is not evidence of a
public hosted demo.

### Original working portfolio applications (7)

`sentinelcore`, `sentinellog`, `fileguard`, `dependsecure`, `chessscope`,
`circuitlab-calc`, and `campusflow` — full applications with backend,
frontend and tests, filed under `companies/<company>/<slug>/`. Their source
links point into this repository.

### Completed cybersecurity applications (9)

| Product | Company | Source path | Verification scope |
| --- | --- | --- | --- |
| HashSight | Velaqori | `companies/velaqori/hashsight/` | Frontend, FastAPI backend, hashing/provider/casework tests, README and local demo |
| IncidentFlow | Velaqori | `companies/velaqori/incidentflow/` | Frontend, FastAPI backend, lifecycle/RBAC/audit/evidence tests, README and local demo |
| NetScope | Velaqori | `companies/velaqori/netscope/` | Frontend, FastAPI backend, PCAP parsing/redaction/API tests, README and local demo |
| PhishLens | Velaqori | `companies/velaqori/phishlens/` | Frontend, FastAPI backend, parser/rules/auth/workflow tests, README and local demo |
| SecureCode Workbench | Velaqori | `companies/velaqori/securecode-workbench/` | Frontend, FastAPI backend, archive-guard/rules/redaction/parser tests, README and local demo |
| ThreatIntel Desk | Velaqori | `companies/velaqori/threatintel-desk/` | Frontend, FastAPI backend, feed/indicator/dedup/triage tests, README and local demo |
| AssetWatch | Velaqori | `companies/velaqori/assetwatch/` | Frontend, FastAPI backend, authorization/scan/diff/migration tests, README and local demo |
| CyberAware Lab | Tamuzi | `companies/tamuzi/cyberaware-lab/` | Frontend, FastAPI backend, lesson/scenario/auth/API tests, README and local demo |
| TranscriptWise | Tamuzi | `companies/tamuzi/transcriptwise/` | Existing standalone frontend/backend; API/core/integration tests, browser workflows, deployment and security documentation |

All nine now have source links in the catalogue. Their status is **Built
(not publicly deployed)**. TranscriptWise is an existing implementation and
was audited as part of this pass rather than duplicated. Its own security
documentation explicitly records remaining identity limitations: no email
verification, password reset/change, MFA, SSO, or session-management dashboard.
Its current test report records executed SQLite and PostgreSQL backend suites,
frontend tests, and desktop/mobile browser workflows; those are repository
reports, not a fresh execution in this review environment.

### Education suite (9)

`learnbridge`, `classconnect`, `tutorspring`, `pathwise`, `teachcraft`,
`openlearn-commons`, `learnpulse`, `reachlearn`, and `eduaccess` — full
applications with backend, frontend, tests, seeded demo data and local setup
instructions under `companies/tamuzi/<slug>/`.

The 25 product source links all point to existing folders in this repository.
The nine applications above have no hosted demo URLs configured; no live
service or production capability is implied by a successful source build.

**Correction:** this replaces the earlier case-study-only classification for
the nine named products. Their current source directories, frontend/backend
code, tests and local run instructions supersede that earlier status.

## Projects outside the 25-product catalogue

Real, evidenced projects that are not platform catalogue entries (the
catalogue is the specified 25):

- **TenantCore** — `coursework/cbu-assignments/tenantcore/`. FastAPI + SQLAlchemy
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
- **VDownloader OS** — `coursework/cbu-assignments/video_downloader_app/`.
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
