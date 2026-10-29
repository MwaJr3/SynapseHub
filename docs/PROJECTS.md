# Project inventory, ownership, and structure

**Status: the move happened.** This document began on 2026-10-28 as a survey of a
repository whose products lived in two sibling folders, `apps/` and `projects/`,
with ownership recorded nowhere. On 2026-10-29 the tree was restructured — every
registered product is now filed under the company that publishes it — and §9
records what changed. The findings in §7 are kept because they are why the move
was made, and because most of them are still open.

Originally written 2026-10-28 on branch `arena/eb2e33a1-synapsehub`, from `main` at
`d0f7dc6`. Restructured 2026-10-29 on `arena/d6bfd8ef-synapsehub`.

## The short version

- **71 project directories**, plus 4 directories that are not projects (a shared
  test folder and three archives). **1,813 test cases are declared across those
  directories** — and the only suite CI runs is the root site's 731.
- Every project is now filed under the company that publishes it, or under
  `sites/` / `coursework/` if no company publishes it. Ownership is a property of
  the path, so it cannot disagree with the tree.
- **Four product slugs still point at two directories each** (`phishlens`,
  `netscope`, `incidentflow`, `threatintel-desk`): a Python CLI and a React +
  FastAPI product. The CLI takes the `-cli` suffix and the registry records
  `variantOf`, so a slug names exactly one directory.
- **One portfolio site.** The two `mwangala-portfolio` packages became one on
  2026-10-28; the static archive is content inside it, not a third site.
- **62 Python projects call their package `app`.** Only one can be imported in a
  process at a time.
- **Nine dev ports collided**, systematically: `apps/` claimed 5173–5197 and
  `projects/` re-used 5173–5181. **Fixed in S2**, and re-blocked on 2026-10-29:
  company products own 5300–5399, sites 5400–5499, standalone products 5500–5599,
  coursework 5600–5699.
- **CI covers one project.** No workflow runs any product's own suite.

None of this is a bug in any single project. It is what two years of adding
projects to two sibling folders produces.

## 1. How the tree is organised

```
SynapseHub/
├── src/, public/, index.html        the root portfolio site (60 Frontend Mentor
│                                    challenges + 60 prototypes) — package name
│                                    "mwangala-portfolio"
├── companies/
│   ├── velaqori/                    40 directories: 13 products (17 dirs, four
│   │                                with a CLI twin) + 26 catalogue builds
│   ├── tamuzi/                      20 directories: 12 products + 8 catalogue
│   │                                builds
│   ├── package.json                 npm workspace "*/*/frontend"
│   ├── package-lock.json            one lockfile for every company frontend
│   └── README.md                    why the catalogue builds sit under a company
├── sites/portfolio/                 the personal portfolio, published by neither
│                                    company; package name "mwangala-portfolio"
├── sites/archive/                   Cpp Projects, WebstormProjects — scratch
├── coursework/cbu-assignments/       four assignments, incl. TenantCore
├── company-platform/                Next.js, publishes 25 products for two companies
├── workniche/                       Next.js
├── vocal-separator/                 FastAPI + React
├── tools/northstar/                 the UX/UI engine: audit, scan, fix, plugin
└── docs/, e2e/, scripts/, tools/, prototypes/, challenges/, stock-price-*
```

The split that matters is **ownership**, and it is now the first path segment:

| Population | Count | Where it lives |
| --- | ---: | --- |
| Velaqori Systems products | 13 | `companies/velaqori/` — 17 directories |
| Tamuzi Learning products | 12 | `companies/tamuzi/` — 12 directories |
| Catalogue builds | 34 | split by subject: 26 under `companies/velaqori/`, 8 under `companies/tamuzi/` |
| Standalone products | 3 | repository root |
| Coursework and archives | 4 | `coursework/cbu-assignments/` (plus 3 excluded archives) |
| Portfolio site | 1 | `sites/portfolio/` |

Note the arithmetic on the company rows: 13 Velaqori products occupy 17
directories because four of them have two implementations. That is collision #1.

## 2. The company products

The catalogue is not a document — it is code, in
`company-platform/src/content/{velaqori,tamuzi}-{a,b}.ts`. Every product below has
a case-study route on the company site.

### Velaqori Systems (13 products, 17 directories)

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `companies/velaqori/chessscope` | ChessScope | Velaqori | React + FastAPI | 19 | yes | — | 5311 | — |
| `companies/velaqori/circuitlab-calc` | CircuitLab Calc | Velaqori | React + FastAPI | 19 | **no** | — | 5312 | — |
| `companies/velaqori/dependsecure` | DependSecure | Velaqori | React + FastAPI | 22 | **no** | — | 5314 | — |
| `companies/velaqori/fileguard` | FileGuard | Velaqori | React + FastAPI | 19 | **no** | — | 5316 | — |
| `companies/velaqori/incidentflow-cli` | IncidentFlow | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/netscope-cli` | NetScope | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/phishlens-cli` | PhishLens | Velaqori | CLI | 5 | yes | — | — | — |
| `companies/velaqori/sentinelcore` | SentinelCore | Velaqori | React + FastAPI | 20 | **no** | — | 5323 | — |
| `companies/velaqori/sentinellog` | SentinelLog | Velaqori | React + FastAPI | 34 | **no** | — | 5324 | — |
| `companies/velaqori/threatintel-desk-cli` | ThreatIntel Desk | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/assetwatch` | AssetWatch | Velaqori | React + FastAPI | 21 | yes | 1 | 5300 | Vercel API |
| `companies/velaqori/hashsight` | HashSight | Velaqori | React + FastAPI | 24 | yes | 1 | 5302 | Vercel API |
| `companies/velaqori/incidentflow` | IncidentFlow | Velaqori | React + FastAPI | 14 | yes | 1 | 5303 | Vercel API |
| `companies/velaqori/netscope` | NetScope | Velaqori | React + FastAPI | 16 | yes | 1 | 5304 | Vercel API |
| `companies/velaqori/phishlens` | PhishLens | Velaqori | React + FastAPI | 17 | yes | 1 | 5305 | Vercel API |
| `companies/velaqori/securecode-workbench` | SecureCode Workbench | Velaqori | React + FastAPI | 23 | yes | 1 | 5306 | Vercel API |
| `companies/velaqori/threatintel-desk` | ThreatIntel Desk | Velaqori | React + FastAPI | 15 | yes | 1 | 5307 | Vercel API |

### Tamuzi Learning (12 products, 12 directories)

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `companies/tamuzi/campusflow` | CampusFlow | Tamuzi | React + FastAPI | 25 | **no** | — | 5310 | — |
| `companies/tamuzi/classconnect` | ClassConnect | Tamuzi | React + FastAPI | 12 | yes | — | 5313 | — |
| `companies/tamuzi/eduaccess` | EduAccess | Tamuzi | React + FastAPI | 12 | yes | — | 5315 | — |
| `companies/tamuzi/learnbridge` | LearnBridge | Tamuzi | React + FastAPI | 17 | yes | — | 5318 | — |
| `companies/tamuzi/learnpulse` | LearnPulse | Tamuzi | React + FastAPI | 10 | yes | — | 5319 | — |
| `companies/tamuzi/openlearn-commons` | OpenLearn Commons | Tamuzi | React + FastAPI | 13 | yes | — | 5320 | — |
| `companies/tamuzi/pathwise` | PathWise | Tamuzi | React + FastAPI | 14 | yes | — | 5321 | — |
| `companies/tamuzi/reachlearn` | ReachLearn | Tamuzi | React + FastAPI | 14 | yes | — | 5322 | — |
| `companies/tamuzi/teachcraft` | TeachCraft | Tamuzi | React + FastAPI | 11 | yes | — | 5325 | — |
| `companies/tamuzi/tutorspring` | TutorSpring | Tamuzi | React + FastAPI | 13 | yes | — | 5327 | — |
| `companies/tamuzi/cyberaware-lab` | CyberAware Lab | Tamuzi | React + FastAPI | 20 | yes | 1 | 5301 | Vercel API |
| `companies/tamuzi/transcriptwise` | TranscriptWise | Tamuzi | React + FastAPI | 77 | yes | 2 | 5308 | — |

**Tessera is filed under Tamuzi but is deliberately not in the published
catalogue.** It is the largest product in the repository (30k lines, 7
migrations), it says "a Tamuzi Learning product" on screen, and the company site
does not list it. That omission is now deliberate and written down: the owner's
instruction is that it stays out of the catalogue until it is fully built. In the
registry it is therefore `kind: project`, `deployment: separate`, owned by Tamuzi,
under `companies/tamuzi/tessera`.

## 3. The catalogue builds — 34 directories, split by company

These are the two master catalogues mapped to working code (`docs/portfolio-catalogue-plan.md`).
They carry a `portfolio.json` card instead of a company case study, so they are
published as catalogue entries rather than case studies.

They were unowned until 2026-10-29, when the owner split them by subject: the
seven builds whose primary user is a learner, a teacher or an institution went to
Tamuzi; security tooling and general utilities went to Velaqori. `companies/README.md`
lists the judgement calls worth re-checking.

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `companies/velaqori/authgate` | AuthGate | Velaqori | FastAPI + HTML | 8 | yes | — | — | — |
| `companies/velaqori/budgetbook` | BudgetBook | Velaqori | CLI | 14 | yes | — | — | — |
| `companies/velaqori/creadesk` | CreateDesk | Velaqori | FastAPI + HTML | 5 | yes | — | — | — |
| `companies/velaqori/datadesk` | DataDesk | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/velaqori/docsage` | DocSage | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/velaqori/fileseal` | FileSeal | Velaqori | CLI | 9 | yes | — | — | — |
| `companies/tamuzi/flashkit` | FlashKit | Tamuzi | CLI | 9 | yes | — | — | — |
| `companies/velaqori/frontpage` | Frontpage | Velaqori | React + FastAPI | 66 | **no** | — | 5317 | — |
| `companies/tamuzi/gradeflow` | GradeFlow | Tamuzi | CLI | 16 | yes | — | — | — |
| `companies/velaqori/guessmaster` | GuessMaster | Velaqori | CLI | 11 | yes | — | — | — |
| `companies/velaqori/headercheck` | HeaderCheck | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/hostwatch` | HostWatch | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/loginsense` | LoginSense | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/notekit` | NoteKit | Velaqori | CLI | 10 | yes | — | — | — |
| `companies/velaqori/passforge` | PassForge | Velaqori | CLI | 13 | yes | — | — | — |
| `companies/velaqori/passmeter` | PassMeter | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/tamuzi/prepwise` | PrepWise | Tamuzi | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/tamuzi/quizarena` | QuizArena | Tamuzi | FastAPI + HTML | 7 | yes | — | — | — |
| `companies/tamuzi/quizbox` | QuizBox | Tamuzi | CLI | 10 | yes | — | — | — |
| `companies/velaqori/secops-dash` | SecOps Dash | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/velaqori/secretscan` | SecretScan | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/secweblab` | SecWebLab | Velaqori | CLI | 4 | yes | — | — | — |
| `companies/tamuzi/shelfwise` | ShelfWise | Tamuzi | CLI | 12 | yes | — | — | — |
| `companies/velaqori/shopdeck` | ShopDeck | Velaqori | FastAPI + HTML | 5 | yes | — | — | — |
| `companies/velaqori/simforge` | SimForge | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/skycast` | SkyCast | Velaqori | CLI | 9 | yes | — | — | — |
| `companies/velaqori/stockmate` | StockMate | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/velaqori/taskdeck` | TaskDeck | Velaqori | CLI | 11 | yes | — | — | — |
| `companies/tamuzi/tessera` | Tessera | Tamuzi | React + FastAPI | 524 | yes | 7 | 5326 | — |
| `companies/velaqori/tidyfiles` | TidyFiles | Velaqori | CLI | 12 | yes | — | — | — |
| `companies/tamuzi/unicore` | UniCore | Tamuzi | CLI | 10 | yes | — | — | — |
| `companies/velaqori/urlshield` | URLShield | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/wattwise` | WattWise | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/velaqori/webwatch` | WebWatch | Velaqori | CLI | 6 | yes | — | — | — |

## 4. Standalone products

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `company-platform` | Company Platform | — | Next.js | 138 | yes | — | — | — |
| `workniche` | WorkNiche | — | Next.js | 47 | yes | — | — | — |
| `vocal-separator` | AI Music & Vocal Part Separator | — | React + FastAPI | 8 | yes | — | 5500 | — |

## 5. Coursework and archives

`coursework/cbu-assignments/` is coursework, not product. It contains its own pytest
suite at the top level, which is why the folder "has tests" but no single project
owns them.

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `coursework/cbu-assignments/bank_system` | bank_system | — | other | — | **no** | — | — | — |
| `coursework/cbu-assignments/library_management` | library_management | — | other | — | **no** | — | — | — |
| `coursework/cbu-assignments/tenantcore` | TenantCore | — | React + FastAPI | 43 | yes | — | 5600 | — |
| `coursework/cbu-assignments/tests` | tests | — | other | 13 | **no** | — | — | — |
| `coursework/cbu-assignments/video_downloader_app` | VDownloader OS | — | other | 21 | **no** | — | — | — |

`sites/` holds what neither company publishes: the portfolio and two scratch
folders from the old MySul tree. The static portfolio that used to sit beside these
was merged into `sites/portfolio` on 2026-10-28 and is its "Earlier work" section,
not a third site.

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `sites/portfolio` | Mwangala | — | React (static) | 149 | yes | — | 5401 | — |
| `sites/archive/Cpp Projects` | Cpp Projects | — | other | — | **no** | — | — | — |
| `sites/archive/WebstormProjects` | WebstormProjects | — | other | — | **no** | — | — | — |

The two archive folders are in `projects.json` under `excluded`, each with a reason,
rather than deleted: removing the owner's work is the owner's decision.

## 6. Every directory under `companies/`

For completeness, both companies as they stand. Since 2026-10-29 there is no
`apps/` or `projects/` folder; the two lists below are the same 57 directories,
split by owner.

### `companies/velaqori/`

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `companies/velaqori/authgate` | AuthGate | Velaqori | FastAPI + HTML | 8 | yes | — | — | — |
| `companies/velaqori/budgetbook` | BudgetBook | Velaqori | CLI | 14 | yes | — | — | — |
| `companies/tamuzi/campusflow` | CampusFlow | Tamuzi | React + FastAPI | 25 | **no** | — | 5310 | — |
| `companies/velaqori/chessscope` | ChessScope | Velaqori | React + FastAPI | 19 | yes | — | 5311 | — |
| `companies/velaqori/circuitlab-calc` | CircuitLab Calc | Velaqori | React + FastAPI | 19 | **no** | — | 5312 | — |
| `companies/tamuzi/classconnect` | ClassConnect | Tamuzi | React + FastAPI | 12 | yes | — | 5313 | — |
| `companies/velaqori/creadesk` | CreateDesk | Velaqori | FastAPI + HTML | 5 | yes | — | — | — |
| `companies/velaqori/datadesk` | DataDesk | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/velaqori/dependsecure` | DependSecure | Velaqori | React + FastAPI | 22 | **no** | — | 5314 | — |
| `companies/velaqori/docsage` | DocSage | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/tamuzi/eduaccess` | EduAccess | Tamuzi | React + FastAPI | 12 | yes | — | 5315 | — |
| `companies/velaqori/fileguard` | FileGuard | Velaqori | React + FastAPI | 19 | **no** | — | 5316 | — |
| `companies/velaqori/fileseal` | FileSeal | Velaqori | CLI | 9 | yes | — | — | — |
| `companies/tamuzi/flashkit` | FlashKit | Tamuzi | CLI | 9 | yes | — | — | — |
| `companies/velaqori/frontpage` | Frontpage | Velaqori | React + FastAPI | 66 | **no** | — | 5317 | — |
| `companies/tamuzi/gradeflow` | GradeFlow | Tamuzi | CLI | 16 | yes | — | — | — |
| `companies/velaqori/guessmaster` | GuessMaster | Velaqori | CLI | 11 | yes | — | — | — |
| `companies/velaqori/headercheck` | HeaderCheck | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/hostwatch` | HostWatch | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/incidentflow-cli` | IncidentFlow | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/tamuzi/learnbridge` | LearnBridge | Tamuzi | React + FastAPI | 17 | yes | — | 5318 | — |
| `companies/tamuzi/learnpulse` | LearnPulse | Tamuzi | React + FastAPI | 10 | yes | — | 5319 | — |
| `companies/velaqori/loginsense` | LoginSense | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/netscope-cli` | NetScope | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/notekit` | NoteKit | Velaqori | CLI | 10 | yes | — | — | — |
| `companies/tamuzi/openlearn-commons` | OpenLearn Commons | Tamuzi | React + FastAPI | 13 | yes | — | 5320 | — |
| `companies/velaqori/passforge` | PassForge | Velaqori | CLI | 13 | yes | — | — | — |
| `companies/velaqori/passmeter` | PassMeter | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/tamuzi/pathwise` | PathWise | Tamuzi | React + FastAPI | 14 | yes | — | 5321 | — |
| `companies/velaqori/phishlens-cli` | PhishLens | Velaqori | CLI | 5 | yes | — | — | — |
| `companies/tamuzi/prepwise` | PrepWise | Tamuzi | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/tamuzi/quizarena` | QuizArena | Tamuzi | FastAPI + HTML | 7 | yes | — | — | — |
| `companies/tamuzi/quizbox` | QuizBox | Tamuzi | CLI | 10 | yes | — | — | — |
| `companies/tamuzi/reachlearn` | ReachLearn | Tamuzi | React + FastAPI | 14 | yes | — | 5322 | — |
| `companies/velaqori/secops-dash` | SecOps Dash | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/velaqori/secretscan` | SecretScan | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/secweblab` | SecWebLab | Velaqori | CLI | 4 | yes | — | — | — |
| `companies/velaqori/sentinelcore` | SentinelCore | Velaqori | React + FastAPI | 20 | **no** | — | 5323 | — |
| `companies/velaqori/sentinellog` | SentinelLog | Velaqori | React + FastAPI | 34 | **no** | — | 5324 | — |
| `companies/tamuzi/shelfwise` | ShelfWise | Tamuzi | CLI | 12 | yes | — | — | — |
| `companies/velaqori/shopdeck` | ShopDeck | Velaqori | FastAPI + HTML | 5 | yes | — | — | — |
| `companies/velaqori/simforge` | SimForge | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/skycast` | SkyCast | Velaqori | CLI | 9 | yes | — | — | — |
| `companies/velaqori/stockmate` | StockMate | Velaqori | FastAPI + HTML | 6 | yes | — | — | — |
| `companies/velaqori/taskdeck` | TaskDeck | Velaqori | CLI | 11 | yes | — | — | — |
| `companies/tamuzi/teachcraft` | TeachCraft | Tamuzi | React + FastAPI | 11 | yes | — | 5325 | — |
| `companies/tamuzi/tessera` | Tessera | Tamuzi | React + FastAPI | 524 | yes | 7 | 5326 | — |
| `companies/velaqori/threatintel-desk-cli` | ThreatIntel Desk | Velaqori | CLI | 6 | yes | — | — | — |
| `companies/velaqori/tidyfiles` | TidyFiles | Velaqori | CLI | 12 | yes | — | — | — |
| `companies/tamuzi/tutorspring` | TutorSpring | Tamuzi | React + FastAPI | 13 | yes | — | 5327 | — |
| `companies/tamuzi/unicore` | UniCore | Tamuzi | CLI | 10 | yes | — | — | — |
| `companies/velaqori/urlshield` | URLShield | Velaqori | CLI | 7 | yes | — | — | — |
| `companies/velaqori/wattwise` | WattWise | Velaqori | CLI | 8 | yes | — | — | — |
| `companies/velaqori/webwatch` | WebWatch | Velaqori | CLI | 6 | yes | — | — | — |

### `companies/tamuzi/`, second table — the products that used to live in `projects/`

| Path | Name | Owner | Interface | Tests | `.env.example` | Migrations | Dev port | Deployed |
| --- | --- | --- | --- | ---: | :---: | :---: | ---: | --- |
| `companies/velaqori/assetwatch` | AssetWatch | Velaqori | React + FastAPI | 21 | yes | 1 | 5300 | Vercel API |
| `companies/tamuzi/cyberaware-lab` | CyberAware Lab | Tamuzi | React + FastAPI | 20 | yes | 1 | 5301 | Vercel API |
| `companies/velaqori/hashsight` | HashSight | Velaqori | React + FastAPI | 24 | yes | 1 | 5302 | Vercel API |
| `companies/velaqori/incidentflow` | IncidentFlow | Velaqori | React + FastAPI | 14 | yes | 1 | 5303 | Vercel API |
| `companies/velaqori/netscope` | NetScope | Velaqori | React + FastAPI | 16 | yes | 1 | 5304 | Vercel API |
| `companies/velaqori/phishlens` | PhishLens | Velaqori | React + FastAPI | 17 | yes | 1 | 5305 | Vercel API |
| `companies/velaqori/securecode-workbench` | SecureCode Workbench | Velaqori | React + FastAPI | 23 | yes | 1 | 5306 | Vercel API |
| `companies/velaqori/threatintel-desk` | ThreatIntel Desk | Velaqori | React + FastAPI | 15 | yes | 1 | 5307 | Vercel API |
| `companies/tamuzi/transcriptwise` | TranscriptWise | Tamuzi | React + FastAPI | 77 | yes | 2 | 5308 | — |

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
| `mwangala-portfolio` | `sites/portfolio` | `mwangala-portfolio.vercel.app` |

`docs/DEPLOYMENT_TARGETS.md` records the Vercel project's root directory as
`sites/portfolio`. The root of the repository is also a complete,
different portfolio site with its own build, its own 705 tests, its own Playwright
suite and its own UX engine. Running `npm ci` at the root installs *that*; nothing
tells a newcomer which of the two is the live site.

### 7.3 Three portfolio sites

| Site | Path | Stack | Tests |
| --- | --- | --- | ---: |
| Portfolio (current) | `/` | React + Vite, 60 challenges | 705 |
| Portfolio + case studies | `sites/portfolio` | React + Vite, 9 case studies | 149 |
| Earliest portfolio | *(removed 2026-10-28 — merged into `mwangala-portfolio`)* | static HTML/JS + `server.py` | 10 |

Three generations of the same idea. Two are still present; the earliest was merged
into the second on 2026-10-28 (demos to `public/demos/`, case studies already in
`earlierWork.ts`). Nothing yet says which of the two that remain is canonical.

### 7.4 `app` is the package name in 62 projects

Every backend and CLI uses `app/` as its importable package: `companies/velaqori/phishlens-cli/app`,
`companies/velaqori/assetwatch/backend/app`, `companies/tamuzi/tessera/backend/app`, and so on. Sixty-two
of the 75 directories contain one.

**Consequence:** `import app` resolves to whichever directory happens to be first on
`sys.path`. Each project's `conftest.py` compensates with
`sys.path.insert(0, parents[1])`, which works for one project at a time and breaks
for anything that wants to touch two: a repository-wide test runner, a shared lint
config, or an import in a tool. It also makes stack traces ambiguous — `app/models.py`
appears 30+ times in this repository.

### 7.5 Dev ports: collided, now allocated in blocks

**Resolved in S2.** The collision was exact: `apps/` was allocated 5173–5197 and
`projects/` re-used 5173–5181, so four apps claimed 5173 and five more pairs collided.
Because Vite silently picks the next free port unless `strictPort` is set, the symptom
was a second app starting on `:5182` and a proxy or CORS rule pointing at the wrong one.
Seven of the nine `projects/` apps set `strictPort: true`, so they failed outright.

Ports are now allocated once, by target location, and never reused:

| Block | Range | Held by |
| --- | --- | --- |
| `catalogue/` | 5173–5299 | the 18 catalogue apps already on 5173–5197 (grandfathered; new ones take 5200+) |
| `companies/` | 5300–5399 | the nine deployed company products + TenantCore |
| `sites/` | 5400–5499 | the root portfolio (5400), `mwangala-portfolio` (5401) |
| `products/` | 5500–5599 | `vocal-separator` (5500) |

| Directory | Was | Now |
| --- | ---: | ---: |
| `companies/velaqori/assetwatch` | 5175 | 5300 |
| `companies/tamuzi/cyberaware-lab` | 5177 | 5301 |
| `companies/velaqori/hashsight` | 5174 | 5302 |
| `companies/velaqori/incidentflow` | 5180 | 5303 |
| `companies/velaqori/netscope` | 5179 | 5304 |
| `companies/velaqori/phishlens` | 5178 | 5305 |
| `companies/velaqori/securecode-workbench` | 5176 | 5306 |
| `companies/velaqori/threatintel-desk` | 5181 | 5307 |
| `companies/tamuzi/transcriptwise` | 5173 | 5308 |
| `coursework/cbu-assignments/tenantcore` | 5173 | 5309 |
| `sites/portfolio` | 5173 | 5401 |
| `vocal-separator/web` | 5174 | 5500 |
| repository root (portfolio site) | 5173 | 5400 |

Each move updated the Vite dev **and** preview port, the backend CORS origins, the
Playwright `baseURL`, `.env.example`, compose files and the README. TranscriptWise's
dedicated e2e port moved off 5174 to 5311 for the same reason. **Preview ports used only
by the root e2e gate (4173, 4174) were left alone** — CI spawns one at a time and they
are not app allocations.

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
with a backend, `companies/velaqori/authgate`, `vocal-separator` and Tessera. Password hashing,
session cookies, CORS setup and the same six security headers are reimplemented in
each. That is defensible for teaching projects, which should stand alone — and
questionable where twenty of them are products of the same two companies, because a
fix to one does not reach the other nineteen.

## 7.9 Status of these findings (2026-10-28)

Fixed in place since this inventory was written, without moving anything:

| Finding | State |
| --- | --- |
| §7.2 the four duplicate slugs | **Fixed.** The `apps/` builds are `phishlens-cli`, `netscope-cli`, `incidentflow-cli`, `threatintel-desk-cli`; the deployed projects keep their slug and path. |
| §7.3 the duplicate `mwangala-portfolio` package name | **Fixed.** The repository root is `synapsehub-portfolio`. |
| §7.5 nine colliding dev ports | **Fixed.** 31 apps, 31 distinct ports, allocated by block. |
| §7.4 62 `app` packages, 29 `security.py` | **Open.** Requires the S4 move and then shared code. |
| Collisions in general | **Guarded.** `projects.json` + 18 tests in `src/registry.test.ts` fail on a duplicate slug, port, package name, or a port outside its block. |

Two later changes that this document predates:

- **Deployment was removed (2026-10-28).** All nine hosting configurations are gone and
  nothing deploys; see `docs/deployment/README.md`. Moving folders no longer risks a live
  build, which is what makes S4 and S5 safe to perform.
- **The two UX engines were merged** into one standalone project, `tools/northstar/`
  (`tools/northstar/README.md`). No website embeds it any more.

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

**Done — S1.** `projects.json` is generated from the tree and committed: 75 entries
covering every directory under `apps/` and `projects/` plus the three root products,
with the four non-project directories listed under `excluded` and a reason each. The
guard is `src/registry.test.ts` (16 tests): it fails on a duplicate slug, a duplicate
`devPort`, a duplicate npm package name, a port outside the block recorded for that
project, a directory that is neither registered nor excluded, a registry path that no
longer exists, a CLI variant whose product slug is unknown, and a deployment without a
Vercel project name. The duplicate checks are pure functions, so the failure paths are
asserted on synthetic data instead of only being asserted absent.

The shape:

```json
{
  "slug": "phishlens",
  "name": "PhishLens",
  "path": "companies/velaqori/phishlens",
  "owner": "velaqori",
  "kind": "project",
  "block": "companies",
  "interface": ["react", "fastapi"],
  "deploys": [{ "target": "vercel-api", "project": "synapsehub-phishlens-api" }],
  "devPort": 5305,
  "package": "phishlens-frontend",
  "pythonPackage": "app"
}
```

The CLI counterpart is its own entry, and `variantOf` names the product it belongs to:

```json
{ "slug": "phishlens-cli", "path": "companies/velaqori/phishlens-cli", "kind": "catalogue",
  "block": "catalogue", "interface": ["python", "cli"], "variantOf": "phishlens" }
```

That test is what prevents every future collision of these kinds — including ones not
in this list.

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
| Merge each pair into one folder with two interfaces | `companies/velaqori/phishlens/` gains a `cli/` alongside `backend/` and `frontend/` | Largest change; breaks the Vercel root directory, so it needs dashboard edits |

### 8.3 The tree as built

This is what §8.3 originally proposed, and what was actually done on 2026-10-29.
The differences are noted because they were decisions, not slips.

```
SynapseHub/
├── companies/
│   ├── velaqori/               43 directories: 17 product directories (13 products,
│   │                           four with a CLI twin) + 26 catalogue builds
│   ├── tamuzi/                 20 directories: 12 products (Tessera among them) +
│   │                           8 catalogue builds
│   ├── package.json            workspace "*/*/frontend" (was apps/package.json)
│   ├── package-lock.json
│   └── README.md               why the catalogue builds sit under a company
├── sites/
│   ├── portfolio/              the single portfolio (the legacy one merged in
│   │                           2026-10-28); not published by either company
│   └── archive/                Cpp Projects, WebstormProjects — excluded, kept
├── coursework/
│   └── cbu-assignments/        also on split/cbu-assignments (docs/branch-splits.md)
├── company-platform/           the Next.js site that publishes the catalogue
├── workniche/
├── vocal-separator/
├── tools/northstar/
├── docs/
└── projects.json
```

The three decisions that differ from the proposal:

1. **No `catalogue/` folder.** The proposal put the 34 unowned builds in a third
   tree, which would have left them owned by nobody — the exact problem §1 names.
   They were split by subject and filed under the company that publishes them, so
   every directory has an owner and `projects.json` records `kind` for the ones
   presented as catalogue entries rather than case studies.
2. **No `products/` folder.** `company-platform`, `workniche` and
   `vocal-separator` stayed at the repository root. Moving them was not asked for,
   and `company-platform` publishes a live site whose Vercel root directory is a
   dashboard setting, not a file.
3. **The root site stayed at the root.** It is the site that serves the 60
   challenges and prototypes, its `npm run` scripts are the entry point for the
   repository's checks, and moving it changes nothing about ownership. The
   *personal portfolio* — a separate React app — moved to `sites/portfolio/`.

Port blocks, allocated once and never renumbered on a move:

| Block | Range | Used by |
| --- | --- | --- |
| `catalogue` | 5173–5299 | retired: nothing is filed here any more; kept so old numbers are never reused |
| `companies` | 5300–5399 | 5300–5308 (the eight API products), 5310–5327 (the twelve React apps), 5326 Tessera |
| `sites` | 5400–5499 | 5401 the portfolio |
| `products` | 5500–5599 | 5500 vocal-separator |
| `coursework` | 5600–5699 | 5600 TenantCore |

The frontend ports had to move, because a directory's *kind* no longer follows from
its path prefix and the block is what says which population a project belongs to.
Every React frontend that was in the catalogue block was renumbered into the
company block in the same commit as the move.

### 8.4 What the move actually cost

| Change | Knock-on work | How it was handled |
| --- | --- | --- |
| `apps/*` → `companies/*` | workspace `*/frontend` breaks; lockfile orphaned | `apps/package.json` → `companies/package.json` with `workspaces: ["*/*/frontend"]`; lockfile moved with it |
| Tessera's Docker context | `docs` and comments named `apps/` | context is now `companies/`; `docker build -f companies/tamuzi/tessera/Dockerfile companies/` |
| `apps/<product>` vs `projects/<product>` classification | `deploymentFor`, `blockFor`, `kindFor`, `ownerFor` all keyed off `path.startsWith('apps/')` | rewritten to key off `companies/`, an explicit `CATALOGUE_BUILDS` set, and the path segment for ownership |
| Root-level `.gitignore` for a hoisted workspace | ignored `frontpage/data/` exemption pointed at `apps/` | re-pointed inside `companies/.gitignore` |
| Source links in the company site | `appSourceUrl(slug)` built `apps/<slug>` | now takes the company; the integrity test also asserts the linked directory exists |
| Portfolio case-study statuses | prose named `apps/<slug>` and `projects/<slug>` | 9 paths repointed |
| UX engine | `discoverProjects` walked `apps/` and `projects/` | walks `companies/<company>/<product>`; the pinned scroll-cue baseline moved with `frontpage` |
| Branch-split script | `split/cbu-assignments:projects/cbu-assignments` | now `coursework/cbu-assignments` |

Two things the move did **not** do: it did not touch the Vercel dashboard, and it
did not renumber anything. No project is deployed by CI, so a path change cannot
break a deployment that no file describes.

### 8.5 The sequence, and where it got to

| Stage | Change | State |
| --- | --- | --- |
| **S1** | `projects.json` + the registry test. No files move. | **Done** (§7.9) |
| **S2** | Fix the collisions that need no move: `-cli` slugs, one portfolio package name, renumber `projects/` ports | **Done** |
| **S3** | CI matrix so each project's own suite runs | **Not done** — still the largest gap (§7.7) |
| **S4** | Move `apps/` into `companies/`, update workspaces, Docker context, docs | **Done 2026-10-29** |
| **S5** | Move `projects/` into `companies/` | **Done 2026-10-29** — and no dashboard edit was needed, because nothing in the tree describes a Vercel project any more |
| **S6** | Move the portfolio and the coursework | **Done 2026-10-29** |

## 9. What I need from you

Nothing from this document is unanswered any more. The four questions it ended
with were answered: the four duplicate slugs keep both variants with the CLI
suffixed; the restructure went the whole way (S1–S2, S4–S6); the three portfolio
sites became one; and Tessera stays out of the published catalogue until it is
fully built.

The open item is **S3**. Every one of these 71 directories has its own test suite,
and CI runs the root site's 731 tests plus the registry gate — nothing else. A
matrix that runs each project's suite is the change that keeps the rest of this
document true.
