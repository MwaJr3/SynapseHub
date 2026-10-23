# Project evidence map

Owner-supplied source links (supplied by Mwangala, 2026-10-23), verified as far
as this build environment allows. **Evidence of source code is not evidence of
deployment** — no product is claimed live.

## Supplied links and verification status

| Project (owner's framing) | Link | Verified here | What was found |
| --- | --- | --- | --- |
| TenantCore — Multi-Tenant SaaS Database | [CBU_Assignments#5](https://github.com/MwaJr3/CBU_Assignments/pull/5) | **No** — repository not accessible from this environment (private / integration not installed) | Recorded as owner-supplied; contents not independently inspected |
| Stock Price Analysis — comparative financial time-series analytics | [SynapseHub#4](https://github.com/MwaJr3/SynapseHub/pull/4) | **Yes** — MERGED 2026-10-19, 69 files | Notebook-based v1 (`stock-price-analysis/`) plus modular v2 (`stock-price-time-series-analysis/`) with retrieval, validation, preprocessing, resampling, metrics, visualization, reporting |
| VDownloader OS desktop video downloader | [CBU_Assignments#6](https://github.com/MwaJr3/CBU_Assignments/pull/6) | **No** — same access limitation | Recorded as owner-supplied; contents not independently inspected |
| The 60 challenge records | [SynapseHub#3](https://github.com/MwaJr3/SynapseHub/pull/3) | **Yes** — MERGED 2026-10-23, 100 files | React/TypeScript catalogue of all 60 supplied Frontend Mentor challenges with `/apps` routes and local-first interactions |
| The cybersecurity projects | [MySul#1](https://github.com/MwaJr3/MySul/pull/1) | **Yes** — MERGED 2026-10-23, 24 files | **7 working apps** (`mwangala/apps/<slug>/`) with case-study pages (`mwangala/projects/<slug>/`), plus Python circuit-math reference with tests |
| Mwangala React portfolio site (Vite + TypeScript) | [MySul#2](https://github.com/MwaJr3/MySul/pull/2) | **Yes** — MERGED 2026-10-23, 100 files | Vite/React/TS portfolio (`mwangala-portfolio/`) with **nine project case-study records**, Vitest suite, QA screenshots |

## How the evidence maps to the 25 catalogue products

All 25 products now carry a verified record of *something real*; seven carry
working application source. Source Code buttons appear only for the seven.

### Working apps — Source Code configured (7)

`sentinelcore`, `sentinellog`, `fileguard`, `dependsecure`, `chessscope`,
`circuitlab-calc`, `campusflow` — working implementations at
[MySul#1](https://github.com/MwaJr3/MySul/pull/1). Status stays **Built (not
publicly deployed)**: source exists and runs; no hosted deployment is claimed.

### Verified case-study records — Source Code hidden (9)

`assetwatch`, `hashsight`, `incidentflow`, `netscope`, `phishlens`,
`securecode-workbench`, `threatintel-desk`, `cyberaware-lab`,
`transcriptwise` — project case-study records verified at
[MySul#2](https://github.com/MwaJr3/MySul/pull/2). Product source is **not
linked**, so the Source Code button stays hidden.

### Portfolio project registry — Source Code hidden (9)

`learnbridge`, `classconnect`, `tutorspring`, `pathwise`, `teachcraft`,
`openlearn-commons`, `learnpulse`, `reachlearn`, `eduaccess` — linked
portfolio case-study records exist in this repository's personal portfolio
project registry (`src/data/projects/`). Product source is **not linked**.

## Projects outside the 25-product catalogue

These are real, evidenced projects that are not platform catalogue entries
(the catalogue is the specified 25):

- **TenantCore** and **VDownloader OS** — owner-supplied links only (private
  repository), suitable for the personal portfolio once that site links them.
- **Stock Price Analysis v1/v2** — lives in this repository
  (`stock-price-analysis/`, `stock-price-time-series-analysis/`).
- **60 challenge records** — the `/apps` catalogue merged into this
  repository's portfolio application.
- **WorkNiche** — complete full-stack job-marketplace app in this repository
  (`workniche/`), previously verified.

## Rules this map obeys

- Only URLs supplied verbatim by the owner are used; nothing is inferred.
- A merged PR evidences source code — never deployment, users, or metrics.
- Unverifiable links are labelled unverifiable, not quietly trusted.
- `tests/content-integrity.test.ts` enforces the URL allowlist.
