# Project Directory

Full-stack applications developed as dedicated projects inside the SynapseHub
monorepo. Each project has its own backend (FastAPI + SQLAlchemy + Alembic),
frontend (React + TypeScript + Tailwind), test suites, `.env.example`, and
README with setup instructions and known limitations.

Test counts below are verified by running each suite (pytest / vitest) on
2026-10-24. Coverage is statement coverage of the backend `app` package
(`pytest --cov=app`), measured the same day — not a target or an estimate.

| Project | Directory | Backend port | Frontend port | Tests (BE / FE) | BE coverage | State |
|---|---|---|---|---|---|---|
| PhishLens — email phishing-risk analyser | `projects/phishlens/` | 8015 | 5178 | 12 / 2 | 90 % | Built + tested |
| NetScope — offline PCAP network analyser | `projects/netscope/` | 8016 | 5179 | 11 / 2 | 79 % | Built + tested |
| IncidentFlow — incident lifecycle workspace | `projects/incidentflow/` | 8017 | 5180 | 9 / 2 | 76 % | Built + tested |
| ThreatIntel Desk — indicator workspace | `projects/threatintel-desk/` | 8018 | 5181 | 10 / 2 | 65 % | Built + tested |
| HashSight — file-hash reputation explorer | `projects/hashsight/` | 8011 | 5174 | 19 / 2 | 93 % | Built + tested |
| AssetWatch — authorized asset & exposure monitor | `projects/assetwatch/` | 8012 | 5175 | 15 (1 skipped: live nmap) / 2 | 96 % | Built + tested |
| SecureCode Workbench — SAST orchestration & triage | `projects/securecode-workbench/` | 8013 | 5176 | 18 / 2 | 92 % | Built + tested |
| CyberAware Lab — fictional simulation training | `projects/cyberaware-lab/` | 8014 | 5177 | 15 / 2 | 95 % | Built + tested |
| TranscriptWise — transcript-to-study-guide platform | `projects/transcriptwise/` | 8000 | 5173 | merged via PR #16 (not re-measured above) | — | Built + tested |

Also here: `projects/mysul/` — the MySul portfolio properties (company website
portfolio in `mwangala-portfolio/`, which now also carries the seven archived
case studies from the earlier static portfolio in `mwangala/` under its
“Earlier work” section).

## Running any project

Each project follows the same shape:

```bash
cd projects/<name>/backend
pip install -r requirements-dev.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port <backend port>

cd projects/<name>/frontend
npm install --legacy-peer-deps
npm run dev          # proxies /api to the backend port above
```

Database schema is managed with Alembic in every backend:

```bash
cd projects/<name>/backend
alembic upgrade head   # works against DATABASE_URL (sqlite by default, PostgreSQL in production)
```

Playwright end-to-end specs (which also capture documentation screenshots)
can be run on a machine with Playwright browsers installed via:

```bash
scripts/run-e2e.sh <name>     # writes docs/screenshots/<name>/
```

Security posture per product is documented in each README (allowlists,
untrusted-archive limits, fictional-simulation banners, digest-only lookups),
and every project's UI and reports state their limitations — simulated data is
labelled, and no product claims proof of safety or security.
