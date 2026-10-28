# Repository status — SynapseHub, 27 October 2026

A status and structure report for the whole repository: what is merged, what is open,
every project and its shape, and the numbers that were actually measured. Written at
the end of stage 6 of the LIFESYSTEM work in Tessera, on request.

## Where the repository stands

| | |
| --- | --- |
| Repository | `MwaJr3/SynapseHub` |
| Default branch | `main` at `89bdb7b` (merge commit of PR #39, stage 5) |
| Working branch | `arena/d3d0a242-synapsehub` at `994773b` |
| Pull requests | **#40** — stage 6 (export/delete, accessibility pass, production build). Open at the time of writing; this is the PR that carries stage 6. The one failing status at that moment was a Vercel *build-rate-limit* on `synapsehub-phishlens-api`, an account limit rather than a failure in this change |
| Sequence | 39 merged PRs; stage 6 is the 40th, waiting for acknowledgement before stage 7 |
| Size | **71 project directories**: 54 in `apps/`, 14 under `projects/`, 3 standalone — plus the Northstar UX engine and this documentation set |

**Nothing below is a claim about a deployment.** Two deployments exist and are
recorded in `docs/DEPLOYMENT_TARGETS.md`; what was executed in this session is in the
"Measured" section.

## Structure

```
SynapseHub/
├── apps/                  54 applications, one folder each: frontend/ + backend/, or app/ + tests/
│   └── tessera/           the LIFESYSTEM product: frontend/ (React), backend/ (FastAPI), alembic/
├── projects/              9 security/data products (frontend + backend + migrations each)
│   ├── cbu-assignments/   coursework: tenantcore, bank_system, library_management, video_downloader_app
│   └── mysul/             the portfolio site (mwangala-portfolio)
├── company-platform/      Next.js — Velaqori Systems & Tamuzi Learning
├── workniche/             Next.js
├── vocal-separator/       AI music/vocal separation
├── tools/northstar/       the UX/UI engine: audit, scan, fix, watch, hooks
├── docs/                  stage records, deployment, audits, a11y report, feature matrix
├── prototypes/, tools/, scripts/, public/, src/   the root portfolio site and its build
└── stock-price-*          two analysis notebooks/experiments
```

Counts of the project directories, with the declared test cases found in their source:

| Group | Directories | Test cases declared | Lines (py/ts/tsx) | Without `.env.example` |
| --- | ---: | ---: | ---: | ---: |
| `apps/` | 54 | 1,157 | 83,012 | 7 |
| `projects/` | 9 | 213 | 25,374 | 0 |
| `projects/cbu-assignments/` | 4 | 26 | 15,567 | 3 |
| Portfolio site (`projects/mysul/mwangala-portfolio`) | 1 | 149 | 14,802 | 0 |
| Standalone (`company-platform`, `workniche`, `vocal-separator`) | 3 | 193 | 31,093 | 0 |
| **Total** | **71** | **1,738** | **169,848** | **10** |

*Test cases declared* is a static count of `def test_…`, `it(…)` and `test(…)` in each
project's source — **not** an execution result. What ran is in "Measured" below; the
distinction matters, because a declared test that has never been executed proves
nothing.

## Every project

Each row is one folder that contains a project. "Kind" is derived from what is in the
folder: `react-spa` (Vite + React frontend, FastAPI backend where marked), `python-api`
(FastAPI + SQLite), `python-cli` (standard-library CLI with SQLite/JSON), `next-app`.

### `apps/` — 54 portfolio applications

| Project | What it is | Path | Kind | Test cases declared | `.env.example` | Migrations |
| --- | --- | --- | --- | ---: | :---: | :---: |
| AuthGate | authentication & authorization dashboard (FastAPI + SQLite) | `apps/authgate` | python-api | 8 | yes | — |
| BudgetBook | personal expense tracker (CLI) | `apps/budgetbook` | python-cli | 14 | yes | — |
| CampusFlow | Student Information System | `apps/campusflow` | react-spa | 25 | — | — |
| ChessScope | Chess Game Analysis | `apps/chessscope` | react-spa | 19 | yes | — |
| CircuitLab Calc | Electronics Calculator | `apps/circuitlab-calc` | react-spa | 19 | — | — |
| ClassConnect | Low-Bandwidth Virtual Classroom | `apps/classconnect` | react-spa | 12 | yes | — |
| CreateDesk | content pipeline (FastAPI + SQLite) | `apps/creadesk` | python-api | 5 | yes | — |
| DataDesk | data analysis dashboard (CLI + HTML reports) | `apps/datadesk` | python-cli | 8 | yes | — |
| DependSecure | Python Dependency Vulnerability Auditor | `apps/dependsecure` | react-spa | 22 | — | — |
| DocSage | team knowledge base (FastAPI + SQLite) | `apps/docsage` | python-api | 6 | yes | — |
| EduAccess | Affordable Learning, Scholarships and Sponsored Seats | `apps/eduaccess` | react-spa | 12 | yes | — |
| FileGuard | File Integrity Monitoring System | `apps/fileguard` | react-spa | 19 | — | — |
| FileSeal | file encryption & decryption (CLI) | `apps/fileseal` | python-cli | 9 | yes | — |
| FlashKit | flashcard learning application (CLI + SQLite) | `apps/flashkit` | python-cli | 9 | yes | — |
| Frontpage | RSS / Atom Feed Reader | `apps/frontpage` | react-spa | 66 | — | — |
| GradeFlow | student grade management (CLI) | `apps/gradeflow` | python-cli | 16 | yes | — |
| GuessMaster | number guessing game (CLI) | `apps/guessmaster` | python-cli | 11 | yes | — |
| HeaderCheck | HTTP security headers checker (CLI) | `apps/headercheck` | python-cli | 7 | yes | — |
| HostWatch | endpoint security monitoring (CLI) | `apps/hostwatch` | python-cli | 6 | yes | — |
| IncidentFlow | digital forensics evidence analyzer (CLI + SQLite) | `apps/incidentflow-cli` | python-cli | 6 | yes | — |
| LearnBridge | Offline-First E-Learning Platform | `apps/learnbridge` | react-spa | 17 | yes | — |
| LearnPulse | Learning Analytics and Teacher Support Dashboard | `apps/learnpulse` | react-spa | 10 | yes | — |
| LoginSense | suspicious login detection (CLI) | `apps/loginsense` | python-cli | 7 | yes | — |
| NetScope | network traffic analyzer (CLI) | `apps/netscope-cli` | python-cli | 7 | yes | — |
| NoteKit | personal knowledge management (CLI + SQLite) | `apps/notekit` | python-cli | 10 | yes | — |
| OpenLearn Commons | Open Educational Resource and Localization Hub | `apps/openlearn-commons` | react-spa | 13 | yes | — |
| PassForge | secure password & passphrase generator (CLI) | `apps/passforge` | python-cli | 13 | yes | — |
| PassMeter | password strength analyzer (CLI) | `apps/passmeter` | python-cli | 8 | yes | — |
| PathWise | Diagnostic Assessment and Adaptive Learning Paths | `apps/pathwise` | react-spa | 14 | yes | — |
| PhishLens | phishing email analyzer (CLI) | `apps/phishlens-cli` | python-cli | 5 | yes | — |
| PrepWise | interview preparation platform (FastAPI + SQLite) | `apps/prepwise` | python-api | 6 | yes | — |
| QuizArena | collaborative quiz platform (FastAPI + SQLite) | `apps/quizarena` | python-api | 7 | yes | — |
| QuizBox | quiz application (CLI) | `apps/quizbox` | python-cli | 10 | yes | — |
| ReachLearn | SMS, USSD and IVR Microlearning Gateway | `apps/reachlearn` | react-spa | 14 | yes | — |
| SecOps Dash | security-operations triage dashboard (FastAPI) | `apps/secops-dash` | python-api | 6 | yes | — |
| SecretScan | secret & API-key scanner (CLI) | `apps/secretscan` | python-cli | 6 | yes | — |
| SecWebLab | security code-review lab (CLI) | `apps/secweblab` | python-cli | 4 | yes | — |
| SentinelCore | Security Operations Platform | `apps/sentinelcore` | react-spa | 20 | — | — |
| SentinelLog | Security Log Analyzer | `apps/sentinellog` | react-spa | 34 | — | — |
| ShelfWise | library management system (CLI + SQLite) | `apps/shelfwise` | python-cli | 12 | yes | — |
| ShopDeck | e-commerce operations admin (FastAPI + SQLite) | `apps/shopdeck` | python-api | 5 | yes | — |
| SimForge | engineering simulation toolkit (CLI) | `apps/simforge` | python-cli | 7 | yes | — |
| SkyCast | weather application (CLI) | `apps/skycast` | python-cli | 9 | yes | — |
| StockMate | inventory management (FastAPI + SQLite) | `apps/stockmate` | python-api | 6 | yes | — |
| TaskDeck | personal task manager (CLI) | `apps/taskdeck` | python-cli | 11 | yes | — |
| TeachCraft | Teacher Content and Assessment Studio | `apps/teachcraft` | react-spa | 11 | yes | — |
| Tessera | adaptive learning engine | `apps/tessera` | react-spa | 524 | yes | 7 |
| ThreatIntel Desk | threat intelligence lookup & enrichment (CLI) | `apps/threatintel-desk-cli` | python-cli | 6 | yes | — |
| TidyFiles | file organizer (CLI) | `apps/tidyfiles` | python-cli | 12 | yes | — |
| TutorSpring | AI Learning Companion | `apps/tutorspring` | react-spa | 13 | yes | — |
| UniCore | university management system (CLI + SQLite) | `apps/unicore` | python-cli | 10 | yes | — |
| URLShield | phishing URL detection model (CLI) | `apps/urlshield` | python-cli | 7 | yes | — |
| WattWise | home energy monitoring & analysis (CLI + SQLite) | `apps/wattwise` | python-cli | 8 | yes | — |
| WebWatch | automated web data collection (CLI + SQLite) | `apps/webwatch` | python-cli | 6 | yes | — |

### `projects/` — 9 security and data-analysis products

| Project | What it is | Path | Kind | Test cases declared | `.env.example` | Migrations |
| --- | --- | --- | --- | ---: | :---: | :---: |
| AssetWatch | Authorized Asset Inventory & Exposure Monitor | `projects/assetwatch` | react-spa | 20 | yes | 1 |
| CyberAware Lab | Fictional Simulation Training Platform | `projects/cyberaware-lab` | react-spa | 19 | yes | 1 |
| HashSight | Malware File Hash Reputation Explorer | `projects/hashsight` | react-spa | 23 | yes | 1 |
| IncidentFlow | Incident Lifecycle & Response Record | `projects/incidentflow` | react-spa | 13 | yes | 1 |
| NetScope | Offline Packet-Capture Analysis | `projects/netscope` | react-spa | 15 | yes | 1 |
| PhishLens | Email Phishing Indicator Analysis | `projects/phishlens` | react-spa | 16 | yes | 1 |
| SecureCode Workbench | SAST Orchestration & Triage | `projects/securecode-workbench` | react-spa | 22 | yes | 1 |
| ThreatIntel Desk | Indicator Ingestion, Dedup & Triage | `projects/threatintel-desk` | react-spa | 14 | yes | 1 |
| TranscriptWise | — | `projects/transcriptwise` | react-spa | 71 | yes | 2 |

### `projects/cbu-assignments/` — coursework

| Project | What it is | Path | Kind | Test cases declared | `.env.example` | Migrations |
| --- | --- | --- | --- | ---: | :---: | :---: |
| bank_system | — | `projects/cbu-assignments/bank_system` | other | 0 | — | — |
| library_management | — | `projects/cbu-assignments/library_management` | other | 0 | — | — |
| TenantCore | — | `projects/cbu-assignments/tenantcore` | react-spa | 5 | yes | — |
| VDownloader OS | Universal Video Downloader, Transcript Studio & Analytical Suite | `projects/cbu-assignments/video_downloader_app` | python | 21 | — | — |

### Portfolio site

| Project | What it is | Path | Kind | Test cases declared | `.env.example` | Migrations |
| --- | --- | --- | --- | ---: | :---: | :---: |
| Mwangala | Portfolio & Project Case Studies | `projects/mysul/mwangala-portfolio` | static | 149 | yes | — |

### Standalone products

| Project | What it is | Path | Kind | Test cases declared | `.env.example` | Migrations |
| --- | --- | --- | --- | ---: | :---: | :---: |
| Company Platform | Velaqori Systems & Tamuzi Learning | `company-platform` | next-app | 138 | yes | — |
| WorkNiche | — | `workniche` | next-app | 47 | yes | — |
| AI Music & Vocal Part Separator | — | `vocal-separator` | other | 8 | yes | — |

## Measured — what was executed in this session

| Check | Command | Result |
| --- | --- | --- |
| Tessera backend, SQLite | `pytest -q` in `apps/tessera/backend` | **399 passed, 7 skipped** |
| Tessera backend, PostgreSQL 16 (real server, via `pgserver`) | `pytest -q` with `DATABASE_URL=postgresql+psycopg2://…` | **405 passed, 1 skipped** |
| Migrations | `alembic upgrade head`, `alembic check`, `downgrade -1` → `upgrade head` | 7 revisions to head `b7d3e14f2c80`; **no new upgrade operations** on either dialect; round-trip clean |
| Seeder | `python -m app.seed` | idempotent-safe: 10 concepts, 7 edges, 10 lessons, 20 questions, 3 puzzles, 10 openings, 9 sources, 8 catalogue rows |
| Tessera frontend | `npm test` (incl. axe sweep + contrast) | **144 passed**; `tsc --noEmit` clean; `npm run build` ok (360 kB JS / 106 kB gzip) |
| Root portfolio site | `npm test` | **696 passed** across 25 files |
| Lint | `npm run lint` (root, all workspaces) | **0 errors**, 2 pre-existing `react-hooks/exhaustive-deps` warnings in `apps/frontpage` |
| UX gate | `northstar check .` | **0 defects at P1 or above across 41 projects** |
| UX audit (Northstar) | `northstar audit . --out docs/ux/audit-repository.md` | 41 projects · **22 defects · 99 occurrences** — all P3 (0 P0/P1/P2) |
| UX scan (`ux-quality` CI step) | `npm run ux:scan -- --strict` | 22 frontends · 457 source files · **75 findings**, all minor `TOKEN-SPACING-01` in `vocal-separator`; 0 critical, 0 major |

The five projects with their own suites were run where they have one: `apps/tessera`,
the root site, and the engine (`node --test` — 54/54 in the last recorded run). The
other 68 projects' test cases were **not** executed in this session; their suites are
recorded as declared, and running each of the 72 individually is the honest next
verification step if their state matters.

## The 22 P3 findings

None blocks a task, violates WCAG 2.2 AA from source, or loses data. From
`docs/ux/audit-repository.md` (the Northstar audit — a different tool from the
`ux-quality` scan in `docs/UX_ENGINE_REPO_AUDIT.md`, which reports 75 minor
spacing-token findings in `vocal-separator` only):

| Pattern | Count | What it is |
| --- | ---: | --- |
| `table-semantics` | 11 | `<th>` without `scope`, so a screen reader cannot say which column a cell belongs to |
| `numeric-cells` | 4 | Numbers not right-aligned / not tabular, so columns do not line up |
| `small-target` | 4 | Controls below the comfortable 44 px target |
| `radius-off-scale` | 2 | Literal radii outside the named scale |
| `raw-colour-in-class` | 1 | `bg-[#f5f7fb]` instead of a semantic token |

Most sit in `apps/campusflow`, `apps/dependsecure`, `apps/fileguard`,
`apps/sentinelcore`, `apps/pathwise` and `projects/cbu-assignments/tenantcore`.

## Open items

| Item | State | Owner / next step |
| --- | --- | --- |
| **PR #40 (stage 6)** | Open at the time of writing | Merge on acknowledgement; stage 7 does not start before that |
| Stage 7 — learner development | Not started | Document's Phase I, after this stage is accepted |
| 68 projects' test suites | Never run in this session | Run per project; `pytest`/`npm test` in each |
| 10 projects without `.env.example` | Listed in the group table above | Add one where the project reads configuration |
| Docker image and `docker compose up` | Written, **not built** — no daemon here | Build and run once on a machine with Docker |
| Visual / assistive-technology accessibility | **Not performed** — no browser, no screen reader | Manual pass with NVDA/VoiceOver on the flows named in `docs/a11y/tessera-2026-10.md` |
| `TESSERA_*` secrets | Brevo key compromised and the Ollama key appeared in a transcript earlier in this work; **neither rotated** | Rotate both in the provider dashboards |
| Live deployments | `mwangala-portfolio` on Vercel; one Vercel project per product API | `docs/DEPLOYMENT_TARGETS.md` |
| Backups, metrics, edge rate limiting | Not implemented anywhere in the repository | Deployment concern, not product code |

## How this report was produced

- Directory inventory, kinds, line counts and `.env.example` presence: a scan of the
  working tree at `994773b`.
- Declared test counts: regex over each project's `tests/` and `src/**/*.test.*`
  files. A test case is counted once per `def test_`, `it(` or `test(`.
- Executed results: the commands in the "Measured" table, run in this session.
- The UX numbers: Northstar `audit` / `check` over the repository, recorded in
  `docs/ux/audit-repository.md`; and the separate `npm run ux:scan -- --strict` output in
  `docs/UX_ENGINE_REPO_AUDIT.md`, which is the file the CI gate regenerates and diffs.
- Nothing here is inferred from a screenshot, a deployment, or a previous summary.
