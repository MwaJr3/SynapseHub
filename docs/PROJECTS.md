# Project inventory, ownership, and structure

**Status:** findings and proposal. Nothing was moved. This document exists so the
structure can be changed deliberately rather than by habit, and so the same slug
never means two things again.

Date: 2026-10-28. Branch `arena/eb2e33a1-synapsehub`, from `main` at `d0f7dc6`.

## The short version

- **71 product directories** in the tree, plus 4 directories that are not products
  (a test folder and three archives). **1,813 test cases are declared across those
  directories** — and the only suite CI runs is the root site's 705.
- The repository has **three populations living in two directory trees**:
  25 company products, 34 catalogue apps, 3 standalone products. `apps/` and
  `projects/` are not "one thing each" — both contain company products.
- **Four product slugs point at two different codebases each** (`phishlens`,
  `netscope`, `incidentflow`, `threatintel-desk`): a Python CLI in `apps/` and a
  React + FastAPI product in `projects/`. The company website publishes those four
  slugs, so today "phishlens" is ambiguous.
- **Three portfolio sites** exist, two of them with the same npm package name
  (`mwangala-portfolio`), and only one is deployed.
- **62 Python projects call their package `app`.** Only one can be imported in a
  process at a time.
- **Nine dev ports collide**, and the collision is systematic: `apps/` owns 5173–5197
  and `projects/` re-used 5173–5181.
- **CI covers one project.** No workflow mentions `apps/` or `projects/`.

None of this is a bug in any single project. It is what two years of adding
projects to two sibling folders produces, and it will get worse the moment stage 7
adds another surface to Tessera.

## 1. How the tree is organised today

```
SynapseHub/
├── src/, public/, index.html        the root portfolio site (60 Frontend Mentor
│                                    challenges + 60 prototypes) — package name
│                                    "mwangala-portfolio"
├── apps/                            54 directories, npm workspace "*/frontend"
│   ├── <product>/frontend           React (22 of them, workspace members)
│   ├── <product>/backend            FastAPI + SQLite
│   ├── <product>/app                CLI or FastAPI, package always named `app`
│   └── <product>/portfolio.json     45 of the 54 have this card
├── projects/                        11 directories, no workspace
│   ├── <product>/                   React + FastAPI + Alembic, deployed to Vercel
│   ├── cbu-assignments/             coursework
│   └── mysul/                       three portfolio sites (two React, one static)
├── company-platform/                Next.js, publishes 25 products for two companies
├── workniche/                       Next.js
├── vocal-separator/                 FastAPI + React
├── northstar-ux-engine/             the UX/UI fixer
└── docs/, e2e/, scripts/, tools/, prototypes/, stock-price-*
```

The split that matters is not `apps` versus `projects`. It is **ownership**:

| Population | Count | Where it lives |
| --- | ---: | --- |
| Velaqori Systems products | 13 | 10 in `apps/`, 7 in `projects/` (4 duplicated) |
| Tamuzi Learning products | 12 | 10 in `apps/`, 2 in `projects/` |
| Catalogue apps (not published by either company) | 34 | `apps/` only |
| Standalone products | 3 | repository root |
| Coursework and archives | 9 | `projects/cbu-assignments/`, `projects/mysul/` |
| Portfolio sites | 3 | root, `projects/mysul/mwangala-portfolio`, `projects/mysul/mwangala` |

Note the arithmetic on the company rows: 13 Velaqori products occupy 17
directories because four of them have two implementations. That is collision #1.

## 2. The company products

The catalogue is not a document — it is code, in
`company-platform/src/content/{velaqori,tamuzi}-{a,b}.ts`. Every product below has
a case-study route on the company site.

### Velaqori Systems (13 products, 17 directories)

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `apps/chessscope` | ChessScope | Velaqori | React + FastAPI | 19 | yes | — | 5178 | — |
| `apps/circuitlab-calc` | CircuitLab Calc | Velaqori | React + FastAPI | 19 | **no** | — | 5177 | — |
| `apps/dependsecure` | DependSecure | Velaqori | React + FastAPI | 22 | **no** | — | 5175 | — |
| `apps/fileguard` | FileGuard | Velaqori | React + FastAPI | 19 | **no** | — | 5174 | — |
| `apps/incidentflow` | IncidentFlow | Velaqori | CLI | 6 | yes | — | — | — |
| `apps/netscope` | NetScope | Velaqori | CLI | 7 | yes | — | — | — |
| `apps/phishlens` | PhishLens | Velaqori | CLI | 5 | yes | — | — | — |
| `apps/sentinelcore` | SentinelCore | Velaqori | React + FastAPI | 20 | **no** | — | 5179 | — |
| `apps/sentinellog` | SentinelLog | Velaqori | React + FastAPI | 34 | **no** | — | 5173 | — |
| `apps/threatintel-desk` | ThreatIntel Desk | Velaqori | CLI | 6 | yes | — | — | — |
| `projects/assetwatch` | AssetWatch | Velaqori | React + FastAPI | 21 | yes | 1 | 5175 | Vercel API |
| `projects/hashsight` | HashSight | Velaqori | React + FastAPI | 24 | yes | 1 | 5174 | Vercel API |
| `projects/incidentflow` | IncidentFlow | Velaqori | React + FastAPI | 14 | yes | 1 | 5180 | Vercel API |
| `projects/netscope` | NetScope | Velaqori | React + FastAPI | 16 | yes | 1 | 5179 | Vercel API |
| `projects/phishlens` | PhishLens | Velaqori | React + FastAPI | 17 | yes | 1 | 5178 | Vercel API |
| `projects/securecode-workbench` | SecureCode Workbench | Velaqori | React + FastAPI | 23 | yes | 1 | 5176 | Vercel API |
| `projects/threatintel-desk` | ThreatIntel Desk | Velaqori | React + FastAPI | 15 | yes | 1 | 5181 | Vercel API |

### Tamuzi Learning (12 products, 12 directories)

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `apps/campusflow` | CampusFlow | Tamuzi | React + FastAPI | 25 | **no** | — | 5176 | — |
| `apps/classconnect` | ClassConnect | Tamuzi | React + FastAPI | 12 | yes | — | 5185 | — |
| `apps/eduaccess` | EduAccess | Tamuzi | React + FastAPI | 12 | yes | — | 5188 | — |
| `apps/learnbridge` | LearnBridge | Tamuzi | React + FastAPI | 17 | yes | — | 5180 | — |
| `apps/learnpulse` | LearnPulse | Tamuzi | React + FastAPI | 10 | yes | — | 5184 | — |
| `apps/openlearn-commons` | OpenLearn Commons | Tamuzi | React + FastAPI | 13 | yes | — | 5186 | — |
| `apps/pathwise` | PathWise | Tamuzi | React + FastAPI | 14 | yes | — | 5181 | — |
| `apps/reachlearn` | ReachLearn | Tamuzi | React + FastAPI | 14 | yes | — | 5187 | — |
| `apps/teachcraft` | TeachCraft | Tamuzi | React + FastAPI | 11 | yes | — | 5183 | — |
| `apps/tutorspring` | TutorSpring | Tamuzi | React + FastAPI | 13 | yes | — | 5182 | — |
| `projects/cyberaware-lab` | CyberAware Lab | Tamuzi | React + FastAPI | 20 | yes | 1 | 5177 | Vercel API |
| `projects/transcriptwise` | TranscriptWise | Tamuzi | React + FastAPI | 77 | yes | 2 | 5173 | — |

**Tessera is not in this catalogue.** It is the largest product in the repository
(30k lines, 524 test cases, 7 migrations), it says "a Tamuzi Learning product" on
screen, and the company site does not list it. Either it should be added, or the
omission should be deliberate and written down.

## 3. The catalogue apps — 34 directories, no company

These are the two master catalogues mapped to working code (`docs/portfolio-catalogue-plan.md`).
They are educational builds; they carry a `portfolio.json` card instead of a
company case study.

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `apps/authgate` | AuthGate | — | FastAPI + HTML | 8 | yes | — | — | — |
| `apps/budgetbook` | BudgetBook | — | CLI | 14 | yes | — | — | — |
| `apps/creadesk` | CreateDesk | — | FastAPI + HTML | 5 | yes | — | — | — |
| `apps/datadesk` | DataDesk | — | CLI | 8 | yes | — | — | — |
| `apps/docsage` | DocSage | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/fileseal` | FileSeal | — | CLI | 9 | yes | — | — | — |
| `apps/flashkit` | FlashKit | — | CLI | 9 | yes | — | — | — |
| `apps/frontpage` | Frontpage | — | React + FastAPI | 66 | **no** | — | 5189 | — |
| `apps/gradeflow` | GradeFlow | — | CLI | 16 | yes | — | — | — |
| `apps/guessmaster` | GuessMaster | — | CLI | 11 | yes | — | — | — |
| `apps/headercheck` | HeaderCheck | — | CLI | 7 | yes | — | — | — |
| `apps/hostwatch` | HostWatch | — | CLI | 6 | yes | — | — | — |
| `apps/loginsense` | LoginSense | — | CLI | 7 | yes | — | — | — |
| `apps/notekit` | NoteKit | — | CLI | 10 | yes | — | — | — |
| `apps/passforge` | PassForge | — | CLI | 13 | yes | — | — | — |
| `apps/passmeter` | PassMeter | — | CLI | 8 | yes | — | — | — |
| `apps/prepwise` | PrepWise | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/quizarena` | QuizArena | — | FastAPI + HTML | 7 | yes | — | — | — |
| `apps/quizbox` | QuizBox | — | CLI | 10 | yes | — | — | — |
| `apps/secops-dash` | SecOps Dash | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/secretscan` | SecretScan | — | CLI | 6 | yes | — | — | — |
| `apps/secweblab` | SecWebLab | — | CLI | 4 | yes | — | — | — |
| `apps/shelfwise` | ShelfWise | — | CLI | 12 | yes | — | — | — |
| `apps/shopdeck` | ShopDeck | — | FastAPI + HTML | 5 | yes | — | — | — |
| `apps/simforge` | SimForge | — | CLI | 7 | yes | — | — | — |
| `apps/skycast` | SkyCast | — | CLI | 9 | yes | — | — | — |
| `apps/stockmate` | StockMate | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/taskdeck` | TaskDeck | — | CLI | 11 | yes | — | — | — |
| `apps/tessera` | Tessera | — | React + FastAPI | 524 | yes | 7 | 5197 | — |
| `apps/tidyfiles` | TidyFiles | — | CLI | 12 | yes | — | — | — |
| `apps/unicore` | UniCore | — | CLI | 10 | yes | — | — | — |
| `apps/urlshield` | URLShield | — | CLI | 7 | yes | — | — | — |
| `apps/wattwise` | WattWise | — | CLI | 8 | yes | — | — | — |
| `apps/webwatch` | WebWatch | — | CLI | 6 | yes | — | — | — |

## 4. Standalone products

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `company-platform` | Company Platform | — | Next.js | 138 | yes | — | — | — |
| `workniche` | WorkNiche | — | Next.js | 47 | yes | — | — | — |
| `vocal-separator` | AI Music & Vocal Part Separator | — | React + FastAPI | 8 | yes | — | 5174 | — |

## 5. Coursework and archives

`projects/cbu-assignments/` is coursework, not product. It contains its own pytest
suite at the top level, which is why the folder "has tests" but no single project
owns them.

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `projects/cbu-assignments/bank_system` | bank_system | — | other | — | **no** | — | — | — |
| `projects/cbu-assignments/library_management` | library_management | — | other | — | **no** | — | — | — |
| `projects/cbu-assignments/tenantcore` | TenantCore | — | React + FastAPI | 43 | yes | — | 5173 | — |
| `projects/cbu-assignments/tests` | tests | — | other | 13 | **no** | — | — | — |
| `projects/cbu-assignments/video_downloader_app` | VDownloader OS | — | other | 21 | **no** | — | — | — |

`projects/mysul/` is the personal archive. Three of the four directories are
earlier portfolio sites or class exercises:

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `projects/mysul/Cpp Projects` | Cpp Projects | — | other | — | **no** | — | — | — |
| `projects/mysul/WebstormProjects` | WebstormProjects | — | other | — | **no** | — | — | — |
| `projects/mysul/mwangala` | MWANGALA | — | other | 10 | **no** | — | — | — |
| `projects/mysul/mwangala-portfolio` | Mwangala | — | React (static) | 149 | yes | — | 5173 | — |

## 6. Every directory under `apps/` and `projects/`

For completeness, the two main trees as they stand.

### `apps/`

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `apps/authgate` | AuthGate | — | FastAPI + HTML | 8 | yes | — | — | — |
| `apps/budgetbook` | BudgetBook | — | CLI | 14 | yes | — | — | — |
| `apps/campusflow` | CampusFlow | Tamuzi | React + FastAPI | 25 | **no** | — | 5176 | — |
| `apps/chessscope` | ChessScope | Velaqori | React + FastAPI | 19 | yes | — | 5178 | — |
| `apps/circuitlab-calc` | CircuitLab Calc | Velaqori | React + FastAPI | 19 | **no** | — | 5177 | — |
| `apps/classconnect` | ClassConnect | Tamuzi | React + FastAPI | 12 | yes | — | 5185 | — |
| `apps/creadesk` | CreateDesk | — | FastAPI + HTML | 5 | yes | — | — | — |
| `apps/datadesk` | DataDesk | — | CLI | 8 | yes | — | — | — |
| `apps/dependsecure` | DependSecure | Velaqori | React + FastAPI | 22 | **no** | — | 5175 | — |
| `apps/docsage` | DocSage | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/eduaccess` | EduAccess | Tamuzi | React + FastAPI | 12 | yes | — | 5188 | — |
| `apps/fileguard` | FileGuard | Velaqori | React + FastAPI | 19 | **no** | — | 5174 | — |
| `apps/fileseal` | FileSeal | — | CLI | 9 | yes | — | — | — |
| `apps/flashkit` | FlashKit | — | CLI | 9 | yes | — | — | — |
| `apps/frontpage` | Frontpage | — | React + FastAPI | 66 | **no** | — | 5189 | — |
| `apps/gradeflow` | GradeFlow | — | CLI | 16 | yes | — | — | — |
| `apps/guessmaster` | GuessMaster | — | CLI | 11 | yes | — | — | — |
| `apps/headercheck` | HeaderCheck | — | CLI | 7 | yes | — | — | — |
| `apps/hostwatch` | HostWatch | — | CLI | 6 | yes | — | — | — |
| `apps/incidentflow` | IncidentFlow | Velaqori | CLI | 6 | yes | — | — | — |
| `apps/learnbridge` | LearnBridge | Tamuzi | React + FastAPI | 17 | yes | — | 5180 | — |
| `apps/learnpulse` | LearnPulse | Tamuzi | React + FastAPI | 10 | yes | — | 5184 | — |
| `apps/loginsense` | LoginSense | — | CLI | 7 | yes | — | — | — |
| `apps/netscope` | NetScope | Velaqori | CLI | 7 | yes | — | — | — |
| `apps/notekit` | NoteKit | — | CLI | 10 | yes | — | — | — |
| `apps/openlearn-commons` | OpenLearn Commons | Tamuzi | React + FastAPI | 13 | yes | — | 5186 | — |
| `apps/passforge` | PassForge | — | CLI | 13 | yes | — | — | — |
| `apps/passmeter` | PassMeter | — | CLI | 8 | yes | — | — | — |
| `apps/pathwise` | PathWise | Tamuzi | React + FastAPI | 14 | yes | — | 5181 | — |
| `apps/phishlens` | PhishLens | Velaqori | CLI | 5 | yes | — | — | — |
| `apps/prepwise` | PrepWise | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/quizarena` | QuizArena | — | FastAPI + HTML | 7 | yes | — | — | — |
| `apps/quizbox` | QuizBox | — | CLI | 10 | yes | — | — | — |
| `apps/reachlearn` | ReachLearn | Tamuzi | React + FastAPI | 14 | yes | — | 5187 | — |
| `apps/secops-dash` | SecOps Dash | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/secretscan` | SecretScan | — | CLI | 6 | yes | — | — | — |
| `apps/secweblab` | SecWebLab | — | CLI | 4 | yes | — | — | — |
| `apps/sentinelcore` | SentinelCore | Velaqori | React + FastAPI | 20 | **no** | — | 5179 | — |
| `apps/sentinellog` | SentinelLog | Velaqori | React + FastAPI | 34 | **no** | — | 5173 | — |
| `apps/shelfwise` | ShelfWise | — | CLI | 12 | yes | — | — | — |
| `apps/shopdeck` | ShopDeck | — | FastAPI + HTML | 5 | yes | — | — | — |
| `apps/simforge` | SimForge | — | CLI | 7 | yes | — | — | — |
| `apps/skycast` | SkyCast | — | CLI | 9 | yes | — | — | — |
| `apps/stockmate` | StockMate | — | FastAPI + HTML | 6 | yes | — | — | — |
| `apps/taskdeck` | TaskDeck | — | CLI | 11 | yes | — | — | — |
| `apps/teachcraft` | TeachCraft | Tamuzi | React + FastAPI | 11 | yes | — | 5183 | — |
| `apps/tessera` | Tessera | — | React + FastAPI | 524 | yes | 7 | 5197 | — |
| `apps/threatintel-desk` | ThreatIntel Desk | Velaqori | CLI | 6 | yes | — | — | — |
| `apps/tidyfiles` | TidyFiles | — | CLI | 12 | yes | — | — | — |
| `apps/tutorspring` | TutorSpring | Tamuzi | React + FastAPI | 13 | yes | — | 5182 | — |
| `apps/unicore` | UniCore | — | CLI | 10 | yes | — | — | — |
| `apps/urlshield` | URLShield | — | CLI | 7 | yes | — | — | — |
| `apps/wattwise` | WattWise | — | CLI | 8 | yes | — | — | — |
| `apps/webwatch` | WebWatch | — | CLI | 6 | yes | — | — | — |

### `projects/`

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `projects/assetwatch` | AssetWatch | Velaqori | React + FastAPI | 21 | yes | 1 | 5175 | Vercel API |
| `projects/cyberaware-lab` | CyberAware Lab | Tamuzi | React + FastAPI | 20 | yes | 1 | 5177 | Vercel API |
| `projects/hashsight` | HashSight | Velaqori | React + FastAPI | 24 | yes | 1 | 5174 | Vercel API |
| `projects/incidentflow` | IncidentFlow | Velaqori | React + FastAPI | 14 | yes | 1 | 5180 | Vercel API |
| `projects/netscope` | NetScope | Velaqori | React + FastAPI | 16 | yes | 1 | 5179 | Vercel API |
| `projects/phishlens` | PhishLens | Velaqori | React + FastAPI | 17 | yes | 1 | 5178 | Vercel API |
| `projects/securecode-workbench` | SecureCode Workbench | Velaqori | React + FastAPI | 23 | yes | 1 | 5176 | Vercel API |
| `projects/threatintel-desk` | ThreatIntel Desk | Velaqori | React + FastAPI | 15 | yes | 1 | 5181 | Vercel API |
| `projects/transcriptwise` | TranscriptWise | Tamuzi | React + FastAPI | 77 | yes | 2 | 5173 | — |

## 7. Collisions

Each of these is a place where two things claim one name, number, or slot. Ordered
by how soon they will bite.

### 7.1 Four slugs, two codebases each — already ambiguous

| Slug | In `apps/` | In `projects/` | Published as |
| --- | --- | --- | --- |
| `phishlens` | CLI, 5 tests | React + FastAPI, 17 tests, Vercel, migrated | Velaqori product |
| `netscope` | CLI, 7 tests | React + FastAPI, 16 tests, Vercel, migrated | Velaqori product |
| `incidentflow` | CLI, 6 tests | React + FastAPI, 14 tests, Vercel, migrated | Velaqori product |
| `threatintel-desk` | CLI, 6 tests | React + FastAPI, 15 tests, Vercel, migrated | Velaqori product |

The CLI versions are the legitimately-built catalogue entries ("Phishing Email
Analyzer", "Network Traffic Analyzer", "Digital Forensics Evidence Analyzer",
"Threat Intelligence Lookup"). The web versions are the products with a database, a
deployment, and a case study. Both are real work. The problem is that the company
site serves `/products/phishlens`, `portfolio.json` declares the same slug, and
`docs/portfolio-catalogue-plan.md` names the CLI — three documents agreeing on a
name that resolves to two programs.

**Consequence:** any future link, screenshot, or analytics event keyed by slug will
silently point at whichever implementation the tooling happened to read first.

### 7.2 One package name, two sites

| Package name | Path | Deployed |
| --- | --- | --- |
| `mwangala-portfolio` | `/` (repository root, `package.json`) | — |
| `mwangala-portfolio` | `projects/mysul/mwangala-portfolio` | `mwangala-portfolio.vercel.app` |

`docs/DEPLOYMENT_TARGETS.md` records the Vercel project's root directory as
`projects/mysul/mwangala-portfolio`. The root of the repository is also a complete,
different portfolio site with its own build, its own 705 tests, its own Playwright
suite and its own UX engine. Running `npm ci` at the root installs *that*; nothing
tells a newcomer which of the two is the live site.

### 7.3 Three portfolio sites

| Site | Path | Stack | Tests |
| --- | --- | --- | ---: |
| Portfolio (current) | `/` | React + Vite, 60 challenges | 705 |
| Portfolio + case studies | `projects/mysul/mwangala-portfolio` | React + Vite, 9 case studies | 149 |
| Earliest portfolio | `projects/mysul/mwangala` | static HTML/JS + `server.py` | 10 |

Three generations of the same idea, all still present, no note anywhere saying which
supersedes which.

### 7.4 `app` is the package name in 62 projects

Every backend and CLI uses `app/` as its importable package: `apps/phishlens/app`,
`projects/assetwatch/backend/app`, `apps/tessera/backend/app`, and so on. Sixty-two
of the 75 directories contain one.

**Consequence:** `import app` resolves to whichever directory happens to be first on
`sys.path`. Each project's `conftest.py` compensates with
`sys.path.insert(0, parents[1])`, which works for one project at a time and breaks
for anything that wants to touch two: a repository-wide test runner, a shared lint
config, or an import in a tool. It also makes stack traces ambiguous — `app/models.py`
appears 30+ times in this repository.

### 7.5 Nine colliding dev ports

| Port | Claimed by | |
| --- | --- | --- |
| 5173 | `apps/sentinellog`, `projects/transcriptwise`, `projects/cbu-assignments/tenantcore`, `projects/mysul/mwangala-portfolio` | **4** |
| 5174 | `apps/fileguard`, `projects/hashsight`, `vocal-separator` | 3 |
| 5175 | `apps/dependsecure`, `projects/assetwatch` | 2 |
| 5176 | `apps/campusflow`, `projects/securecode-workbench` | 2 |
| 5177 | `apps/circuitlab-calc`, `projects/cyberaware-lab` | 2 |
| 5178 | `apps/chessscope`, `projects/phishlens` | 2 |
| 5179 | `apps/sentinelcore`, `projects/netscope` | 2 |
| 5180 | `apps/learnbridge`, `projects/incidentflow` | 2 |
| 5181 | `apps/pathwise`, `projects/threatintel-desk` | 2 |

The pattern is exact: `apps/` was allocated 5173–5197 and `projects/` re-used
5173–5181. Because Vite silently picks the next free port unless `strictPort` is set,
the symptom is a second app starting on `:5182` and a proxy or CORS rule pointing at
the wrong one. Seven of the nine `projects/` apps set `strictPort: true`, so they fail
outright rather than drifting — which is better, but still a failure.

### 7.6 Three catalogues describing the same products

| Source | Entries | Used by |
| --- | ---: | --- |
| `apps/*/portfolio.json` | 45 | the root portfolio site |
| `company-platform/src/content/*.ts` | 25 | the company site |
| `src/data/challengeManifest.ts` + `src/apps/appRegistry.ts` | 60 challenges | the root portfolio site |

Nothing reconciles them. Nine `apps/` directories have no `portfolio.json` at all
(seven of them because they are company products), and the company catalogue and the
`portfolio.json` cards disagree about what a project *is* in the four duplicate
cases above.

### 7.7 CI covers one project

`.github/workflows/` has three files: `ux-quality.yml` (root site, lint, tests,
UX scan, build), `e2e.yml` (root site, Playwright) and `stock-analysis.yml`. **No
workflow names `apps/` or `projects/` in a path, and no workflow runs their tests.**
The only CI contact with `apps/` is the UX scan, which reads their frontends
statically.

Of the 1,813 declared test cases in those directories, CI executes none. Tessera's
524, the eight deployed APIs' 150, the catalogue apps' remainder — all of it is
green only if a person ran it on their own machine. That is not a naming problem,
but it is the reason a restructure is risky: nobody would notice a broken path
until release.

### 7.8 `security.py` exists 29 times

Twenty-nine projects ship an `app/security.py`: every deployed API, every React app
with a backend, `apps/authgate`, `vocal-separator` and Tessera. Password hashing,
session cookies, CORS setup and the same six security headers are reimplemented in
each. That is defensible for teaching projects, which should stand alone — and
questionable where twenty of them are products of the same two companies, because a
fix to one does not reach the other nineteen.

## 8. What I propose

The aim is not tidiness for its own sake. It is four properties:

1. **One slug, one project.** A slug resolves to exactly one directory, everywhere.
2. **Ownership is visible from the path**, so a Velaqori change never lands in a
   Tamuzi product by accident.
3. **A number is allocated once.** Ports, database schemas, Vercel projects and
   environment prefixes come from one place.
4. **Nothing can regress silently.** A test fails on a duplicate slug, port or
   package name.

### 8.1 The registry (do this regardless of everything else)

A single `projects.json` at the repository root, generated from the tree and
committed, listing every project:

```json
{
  "slug": "phishlens",
  "path": "projects/phishlens",
  "owner": "velaqori",
  "kind": "product",
  "interface": ["react", "fastapi"],
  "deploys": ["vercel-api"],
  "devPort": 5178,
  "package": "phishlens-frontend",
  "pythonPackage": "app",
  "variants": [{ "path": "apps/phishlens", "interface": ["cli"], "kind": "catalogue" }]
}
```

with a test that fails on: a duplicate slug, a duplicate `devPort`, a duplicate npm
package name, a directory under `apps/` or `projects/` that is missing from the
registry, or a registry entry whose path does not exist. That single test is what
prevents every future collision of these kinds — including ones not in this list.

### 8.2 The four duplicate slugs

Three options; the second is what I recommend, because it is the only one that makes
the slug unambiguous without touching a deployment. The CLI versions are catalogue
exercises (`docs/portfolio-catalogue-plan.md`, Cyber #6, #7, …); the web versions are
the products with a database and a case study. They should not share a name, and
they should not be forced into one folder either — a teaching CLI and a deployed API
have different audiences and different release cadence.

| Option | What it means | Cost |
| --- | --- | --- |
| Keep both, registry records both as variants | No move; the site keeps pointing at the web app, the CLI keeps its own docs | Cheapest, and honest — but the slug still names two programs in conversation |
| Rename the CLI projects (`phishlens-cli`, …) | The web product owns the slug; the CLI keeps the catalogue entry under a derived name | Touches 4 folders, 4 READMEs, 4 `portfolio.json`, `docs/portfolio-catalogue-plan.md`, and the UX audit paths |
| Merge each pair into one folder with two interfaces | `projects/phishlens/` gains a `cli/` alongside `backend/` and `frontend/` | Largest change; breaks the Vercel root directory, so it needs dashboard edits |

### 8.3 The target tree

```
SynapseHub/
├── companies/
│   ├── velaqori/               13 products, one folder each, deployed where applicable
│   └── tamuzi/                 12 products (+ Tessera, if it joins the catalogue)
├── catalogue/                  38 educational builds: the 34 unowned apps plus the
│                               four CLIs whose slug was taken by a web product
├── sites/
│   ├── portfolio/              the root React site (current)
│   ├── portfolio-case-studies/ projects/mysul/mwangala-portfolio
│   └── archive/                projects/mysul/mwangala, Cpp Projects, WebstormProjects
├── coursework/
│   └── cbu-assignments/
├── products/
│   ├── company-platform/       the Next.js site that publishes the catalogue
│   ├── workniche/
│   └── vocal-separator/
├── tools/
│   └── northstar-ux-engine/
├── docs/
└── projects.json
```

Port blocks, allocated once: `catalogue/` 5200–5299, `companies/` 5300–5399,
`sites/` 5400–5499, `products/` 5500–5599.

### 8.4 What that move costs

| Change | Knock-on work |
| --- | --- |
| `apps/*` → `catalogue/` or `companies/*` | `apps/package.json` workspaces `*/frontend` breaks; `apps/package-lock.json`; every `npm ci` in a Dockerfile or README; the Tessera image context (`apps/`) |
| `apps/<product>/backend` → `companies/<c>/<product>/` | Nothing at runtime, but Vercel root directories are **dashboard settings, not files** — moving a deployed project silently breaks its deploy |
| `projects/*` → `companies/*` | Same problem, eight times: the eight API projects in `docs/DEPLOYMENT_TARGETS.md` |
| Root site → `sites/portfolio/` | Root `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `playwright.config.ts`, `e2e/`, `northstar.config.json`, and the `ux:scan` target list |
| Anything → anywhere | Relative links (`apps/tessera/README.md` → `../../docs/…`), and 9 UX-audit paths in committed reports |

This is a two- to three-hour change with a real chance of breaking a deployment, and
it touches 71 directories that CI does not test. That is why I am proposing it as a
staged change with a gate at each step, not one commit.

### 8.5 Recommended sequence

| Stage | Change | Reversible? | Gate |
| --- | --- | --- | --- |
| **S1** | Add `projects.json` + the registry test. No files move. | Yes, delete one file | `npm test` green; duplicate detection demonstrated on a deliberate duplicate |
| **S2** | Fix the collisions that need no move: rename the four CLI slugs, disambiguate the two `mwangala-portfolio` packages, renumber `projects/` ports to 5300+ | Partly (renames are in history) | Every slug unique; every port unique; site still builds |
| **S3** | Add a CI matrix so each project's own suite runs | Yes | CI green, and a deliberately broken test in one project fails CI |
| **S4** | Move `apps/` → `catalogue/` + `companies/`; update workspaces, Docker context, docs | No, but mechanical | Every workspace `npm ci && npm test`; Tessera image context updated |
| **S5** | Move `projects/` → `companies/`, update the eight Vercel root directories in the dashboard | No | Each API redeploys and answers `/health` |
| **S6** | Move the three sites and the coursework | No | Root site builds and the Playwright suite passes |

S1–S3 make the repository safer and need no deployment changes. S4–S6 are the
physical restructure and need Vercel access at the time they run.

## 9. What I need from you

1. **Which option for the four duplicate slugs** (§8.2) — keep both as variants,
   rename the CLIs, or merge each pair into one folder.
2. **How far to go now** — S1 only, S1–S3, or the whole S1–S6.
3. **Whether the three portfolio sites all stay.** One is deployed, one is the
   current root site, one is an HTML archive. Keeping three is fine if it is
   deliberate; the registry can record which supersedes which.
4. **Whether Tessera joins the company catalogue** as a Tamuzi product.

Answer those and I will start at the stage you pick. Until then, nothing in this
document has been applied.
