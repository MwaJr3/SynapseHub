# projects/ — all other projects, consolidated into this repository

Per owner instruction (2026-10-23), every project that previously lived in
separate GitHub repositories now lives **inside this repository** so that the
company website (hosted on Vercel from this repository) and all project code
share one home. These folders are complete working snapshots of their origin
repositories; the origins remain on GitHub, but this copy is the one the
company platform links to.

Nothing here is re-implemented or summarised — each folder is the project as it
was merged in its origin repository.

## Map

| Folder | Origin repository | Snapshot | Projects inside |
| --- | --- | --- | --- |
| `cbu-assignments/` | [MwaJr3/CBU_Assignments](https://github.com/MwaJr3/CBU_Assignments) | `main` @ `ccc9700` (2026-10-23) | `tenantcore/` (TenantCore multi-tenant SaaS platform), `video_downloader_app/` (VDownloader OS), plus coursework retained as merged: `bank_system/`, `library_management/`, `tests/`, `main.py`, `PROJECT_REPORT.md` |
| `mysul/` | [MwaJr3/MySul](https://github.com/MwaJr3/MySul) | `main` @ `7a01e8b` (2026-10-23) | `mwangala/` (7 working apps + case-study pages), `mwangala-portfolio/` (React portfolio with 9 case-study records), plus practice work retained as merged: `Cpp Projects/`, `WebstormProjects/` |

Already in this repository before the consolidation (unchanged): the
`company-platform/` company website, the root portfolio with the 60 challenge
prototypes, `stock-price-analysis/` + `stock-price-time-series-analysis/`,
`workniche/`, and `tools/`.

## Where each evidenced project came from

| Project | Merged in origin | Origin merge commit | Location in this repository |
| --- | --- | --- | --- |
| 7 working apps (sentinelcore, sentinellog, fileguard, dependsecure, circuitlab-calc, chessscope, campusflow) | [MySul#1](https://github.com/MwaJr3/MySul/pull/1) — merged 2026-10-23 | `be39a9ee2729d359c8cc204ab3e46aca60576152` | `projects/mysul/mwangala/apps/<slug>/` (case-study pages: `projects/mysul/mwangala/projects/<slug>/`) |
| 9 case-study records (assetwatch, hashsight, incidentflow, netscope, phishlens, securecode-workbench, threatintel-desk, cyberaware-lab, transcriptwise) | [MySul#2](https://github.com/MwaJr3/MySul/pull/2) — merged 2026-10-23 | `7a01e8b27753e4032c6626a4a25f6a947c35e095` | `projects/mysul/mwangala-portfolio/src/data/projects/` |
| TenantCore — multi-tenant SaaS platform | [CBU_Assignments#5](https://github.com/MwaJr3/CBU_Assignments/pull/5) — merged 2026-10-22 | `ee58d1110e5b270f3dc8a2e9a0195aa744fbb3f3` | `projects/cbu-assignments/tenantcore/` |
| VDownloader OS — desktop video downloader + transcript suite | [CBU_Assignments#6](https://github.com/MwaJr3/CBU_Assignments/pull/6) — merged 2026-10-23 | `ccc9700d034da5ddbf41be1950b4691562c0a9f6` | `projects/cbu-assignments/video_downloader_app/` |

Each project keeps its own README (and, for TenantCore and VDownloader OS, its
full docs/ suite) describing how to run it. Nothing is deployed from this
folder automatically; the company website on Vercel builds only
`company-platform/`.

## Snapshot hygiene

The copies omit generated artifacts that were committed in the origins:
compiled C++ binaries (`.exe`, `.o`), a vendored `javascript-main.zip` archive
whose extracted folder is kept, `__pycache__`/`.pyc`, and `.git` histories.
All source, docs, tests, and configuration are included as merged.
