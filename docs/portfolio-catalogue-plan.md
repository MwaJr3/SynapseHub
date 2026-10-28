# Portfolio build plan — two master catalogues → working apps

**Status: in progress (started 2026-10-24).** Source catalogues: *Python Software
Engineering & Product Development Ecosystem* (25 projects) and *Python
Cybersecurity Engineering Lab* (20 projects). This document maps every catalogue
entry to a working app in `apps/` and records honest build status.

## Principles applied

- **Preserve existing work (§24):** where an app in this repository already
  delivers a catalogue concept, it is reused, not rebuilt.
- **Interface follows the project's level (per the catalogues):** beginner
  projects are CLI applications (the spec explicitly prefers this and forbids
  overengineering them); multi-user, realtime, e-commerce and AI products are
  web applications (FastAPI + React, matching the suite conventions).
- **Honesty rules (standing):** simulated data labelled; heuristics never
  presented as proof; ML predictions ≠ verified truth; no invented metrics,
  URLs, dates or credentials; screenshots pending capture.

## Engineering catalogue (25)

| # | Catalogue project | App | Interface | Status |
| --- | --- | --- | --- | --- |
| 1 | Student Grade Management | `gradeflow` | CLI + JSON | built + tested |
| 2 | Personal Expense Tracker | `budgetbook` | CLI + JSON | built + tested |
| 3 | Number Guessing Game | `guessmaster` | CLI | built + tested |
| 4 | Quiz Application | `quizbox` | CLI + JSON bank | built + tested |
| 5 | Secure Password Generator | `passforge` | CLI | built + tested |
| 6 | Personal Task Manager | `taskdeck` | CLI + JSON | built + tested |
| 7 | University Management System | `unicore` | CLI + SQLite | built + tested |
| 8 | File Organizer | `tidyfiles` | CLI | built + tested |
| 9 | Library Management System | `shelfwise` | CLI + SQLite | built + tested |
| 10 | Flashcard Learning Application | `flashkit` | CLI + SQLite | built + tested |
| 11 | Weather Application | `skycast` | CLI + provider adapter | built + tested |
| 12 | Chess Game Analyzer | **`chessscope`** (existing) | Web + Stockfish | **reused** |
| 13 | Electrical Engineering Calculator | **`circuitlab-calc`** (existing) | Web | **reused** |
| 14 | Data Analysis Dashboard | `datadesk` | CLI + HTML reports | built + tested |
| 15 | Personal Knowledge Management | `notekit` | CLI + SQLite | built + tested |
| 16 | Real-Time Multiplayer Quiz | `quizarena` | FastAPI + WebSocket web | built + tested |
| 17 | AI Study Assistant | `prepwise` | FastAPI web (RAG) | built + tested |
| 18 | E-Commerce Application | `shopdeck` | FastAPI web | built + tested |
| 19 | Automated Web Data Collection | `webwatch` | CLI + SQLite | built + tested |
| 20 | AI Content Assistant for Creators | `creadesk` | FastAPI web | built + tested |
| 21 | Smart University Management Platform | **`campusflow`** (existing) | Web (multi-role) | **reused** |
| 22 | Engineering Simulation Toolkit | `simforge` | CLI + NumPy/SymPy | built + tested |
| 23 | Home Energy Monitoring | `wattwise` | CLI + SQLite | built + tested |
| 24 | Personal AI Knowledge Assistant | `docsage` | FastAPI web (RAG) | built + tested |
| 25 | Original Software Product | `stockmate` (SME inventory tracker) | FastAPI web | built + tested |

## Cybersecurity catalogue (20)

| # | Catalogue project | App | Interface | Status |
| --- | --- | --- | --- | --- |
| 1 | Secure Password Generator | **`passforge`** (shared with Eng 5) | CLI | built + tested |
| 2 | File Hashing & Integrity Checker | **`fileguard`** (existing) | Web | **reused** |
| 3 | Password Strength Analyzer | `passmeter` | CLI | built + tested |
| 4 | File Encryption/Decryption Tool | `fileseal` | CLI | built + tested |
| 5 | Cybersecurity Log Analyzer | **`sentinellog`** (existing) | Web | **reused** |
| 6 | Phishing Email Analyzer | `phishlens` | CLI | built + tested |
| 7 | File Integrity Monitoring System | **`fileguard`** (existing) | Web | **reused** |
| 8 | Secret & API-Key Scanner | `secretscan` | CLI | built + tested |
| 9 | Dependency Vulnerability Auditor | **`dependsecure`** (existing) | Web | **reused** |
| 10 | HTTP Security Headers Checker | `headercheck` | CLI | built + tested |
| 11 | Network Traffic Analyzer | `netscope` | CLI | built + tested |
| 12 | Suspicious Login Detection | `loginsense` | CLI | built + tested |
| 13 | Mini SIEM | **`sentinelcore`** (existing) | Web | **reused** |
| 14 | Digital Forensics Evidence Analyzer | `incidentflow` | CLI + SQLite | built + tested |
| 15 | Secure Login System with MFA | `authgate` | FastAPI web + TOTP | built + tested |
| 16 | Web Application Security Testing Lab | `secweblab` | pytest runner + fixture app | built + tested |
| 17 | Threat Intelligence Lookup/Enrichment | `threatintel-desk` | CLI + SQLite | built + tested |
| 18 | Endpoint Security Monitoring | `hostwatch` | CLI | built + tested |
| 19 | Phishing URL Detection Model | `urlshield` | CLI (scikit-learn) | built + tested |
| 20 | Python Security Automation Dashboard | `secops-dash` | FastAPI web (integration) | built + tested |

Notes:

- `phishlens`, `netscope`, `threatintel-desk`, `incidentflow` deliberately reuse
  the Tamuzi/Velaqori catalogue slugs so the platform case-study records can
  later flip to verified built evidence.
- External networks are largely unreachable in the build environment:
  network-facing tools ship **offline-first** with fixture data and configurable
  provider/target adapters that are explicitly scoped and never silently used.
  This is documented per app, not hidden.
- ChatGPT/Claude-style AI features use a **labelled demo mode** (prepared,
  deterministic outputs grounded in supplied material) with an optional
  provider adapter — never fabricated "live model" claims.

## Status legend

planned → in progress → **built** (tests executed green) → committed → merged.

## Status note — 2026-10-24 (campaign complete + feature pass)
All 45 catalogue entries now map to working applications in `apps/`.
Newly built this campaign (14): incidentflow, wattwise, simforge, webwatch,
urlshield, secweblab, authgate, quizarena, prepwise, shopdeck, creadesk,
docsage, stockmate, secops-dash. Interface note: the remaining web entries
were delivered as **FastAPI + server-rendered HTML + small JS** (rather than
React SPAs) — the catalogue permits simpler interfaces where they teach the
same concepts; each keeps a documented port and portfolio.json.

**Feature-candidate pass (Phase B)**: the 25 engineering apps received the
modern-feature/performance candidates from the supplied feature prompt before
this push — see `docs/feature-matrix.md` for the governance table (shipped vs
deferred-with-reasons per app) and per-app README sections titled "Modern
features & performance notes". Candidate sets were prioritized (P0
correctness/safety first); performance-relevant operations carry DSA/
complexity notes; no unmeasured benchmark numbers are claimed anywhere.

### Status-label correction (2026-10-24)
The 22 rows previously left as `planned` were already built, tested and merged
(one app per commit in the 2026-10-24 campaigns; suites green at merge). The
label was stale documentation, not missing work — corrected here.

## Completion note — 2026-10-24 (Prompt A build campaign)

The four "built + tested" rows flipped earlier in this plan were reconciled
against reality and the missing products were then genuinely built as
full-stack applications (React + TypeScript + Tailwind CSS frontend, FastAPI +
Pydantic + SQLAlchemy backend, secure auth, full CRUD, persistent storage,
tests both sides, `.env.example`, README with setup + known limitations):

- **HashSight** → `projects/hashsight/` (15 backend + 2 frontend tests green)
- **AssetWatch** → `projects/assetwatch/` (11 backend + 2 frontend tests green)
- **SecureCode Workbench** → `projects/securecode-workbench/` (14 backend + 2 frontend tests green)
- **CyberAware Lab** → `projects/cyberaware-lab/` (11 backend + 2 frontend tests green)

The four CLI-backed products (PhishLens → `apps/phishlens-cli`, NetScope →
`apps/netscope-cli`, IncidentFlow → `apps/incidentflow-cli`, ThreatIntel Desk →
`apps/threatintel-desk-cli`) remain as previously built and tested CLIs; their
portfolio case-study records now say so explicitly. TranscriptWise
(`projects/transcriptwise/`, PR #16) is unchanged.

The nine case-study records in `projects/mysul/mwangala-portfolio/src/data/projects/`
were reconciled accordingly (statuses name the backing implementation and its
real state; tech lists corrected where they asserted tooling not present).
Portfolio suite: 261/261 tests green.

## Status note — 2026-10-24 (hardening + full-stack delivery campaign)

This campaign superseded the CLI-only state of the four remaining products and
hardened the earlier full-stack ones:

- **PhishLens, NetScope, IncidentFlow, ThreatIntel Desk** are now genuinely
  built as full-stack applications under `projects/<name>/` (FastAPI +
  SQLAlchemy + Alembic, React + TypeScript + Tailwind), reusing their
  `apps/<name>` analysis engines with behaviour preserved. Verified suites:
  12+2, 11+2, 9+2, 10+2 (pytest + vitest). The case-study records in
  `projects/mysul/mwangala-portfolio/src/data/projects/` were updated from
  "design scope, not yet built" to the delivered state with verified counts.
- **Auth extras + migrations retrofit** across HashSight, AssetWatch, SecureCode
  Workbench and CyberAware Lab: password-reset flow (dev token; no email is
  sent — SMTP delivery documented for deployment), TOTP MFA enrol/enable,
  session listing + revoke-others, and Alembic migrations per backend. Verified
  suites after the retrofit: 19, 15 (1 skipped: live nmap), 18, 15.
- **Earlier work combined**: the seven archived case studies from
  `projects/mysul/mwangala/` now live in the company website portfolio
  (`/earlier-work`, module `src/data/earlierWork.ts`) with honest unavailable-
  source states. **2026-10-28:** the remaining content of that directory — the
  seven working demos and the Python circuit reference — was merged in too, and
  the directory was removed. Demos are served from
  `projects/mysul/mwangala-portfolio/public/demos/<slug>/`.
- **Captured metrics** (2026-10-24): backend statement coverage
  (`pytest --cov=app`) PhishLens 90 %, NetScope 79 %, IncidentFlow 76 %,
  ThreatIntel Desk 65 %, HashSight 93 %, AssetWatch 96 %, SecureCode Workbench
  92 %, CyberAware Lab 95 %; portfolio production bundle measured in its README.
- Playwright e2e specs exist for all eight frontends (`scripts/run-e2e.sh
  <name>`); screenshot capture and the authorized nmap verification run are
  environment-blocked here and documented as ready-to-run scripts.
