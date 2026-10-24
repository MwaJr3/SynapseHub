# Project Directory

Full-stack applications developed as dedicated projects inside the SynapseHub
monorepo. Each project has its own backend (FastAPI), frontend (React +
TypeScript + Tailwind), test suites, `.env.example`, and README with setup
instructions and known limitations.

| Project | Directory | Backend port | Frontend port | State |
|---|---|---|---|---|
| HashSight — file-hash reputation explorer | `projects/hashsight/` | 8011 | 5174 | Built + tested (15 backend / 2 frontend) |
| AssetWatch — authorized asset & exposure monitor | `projects/assetwatch/` | 8012 | 5175 | Built + tested (11 backend / 2 frontend) |
| SecureCode Workbench — SAST orchestration & triage | `projects/securecode-workbench/` | 8013 | 5176 | Built + tested (14 backend / 2 frontend) |
| CyberAware Lab — fictional simulation training | `projects/cyberaware-lab/` | 8014 | 5177 | Built + tested (11 backend / 2 frontend) |
| TranscriptWise — transcript-to-study-guide platform | `projects/transcriptwise/` | 8000 | 5173 | Built + tested (merged via PR #16) |

Also here: `projects/mysul/` — the MySul portfolio properties (React portfolio
in `mwangala-portfolio/`, earlier static portfolio in `mwangala/`).

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

Security posture per product is documented in each README (allowlists,
untrusted-archive limits, fictional-simulation banners, digest-only lookups),
and every project's UI and reports state their limitations — simulated data is
labelled, and no product claims proof of safety or security.
