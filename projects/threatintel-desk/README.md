# ThreatIntel Desk — Indicator Ingestion, Dedup & Triage

**Collect the observations. Keep the doubt. Make the call yourself.** A
working React/TypeScript + FastAPI application wrapping the tested
ThreatIntel Desk indicator engine (reused from `apps/threatintel-desk`).

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Ingestion | Feeds (manual / file-import / simulated), operator-triggered runs + per-feed intervals (scheduler-target endpoint), run history with fetched/new/merged/error counts | Simulated feeds produce **labelled fictional demo data** (deterministic) |
| Parsing | IP/domain/URL/hash validation via the reused engine; bad lines rejected with counts, never crashes | — |
| Dedup | Canonicalization (case/trailing-dot/hash-case) then source merge: one record, every source listed | Dedup happens before triage — merged records keep full provenance |
| Framing | Source count + framing text on every indicator | "Appearing in one feed is **NOT proof of maliciousness**; absence is NOT proof of safety" (tested) |
| Triage | unreviewed / suspicious / confirmed-malicious / false-positive / accepted-risk + case references + analyst notes | Triage is explicitly a human judgment |
| Reports | Per-indicator JSON export with provenance + disclaimers | "Provider responses are unverified third-party claims" |
| Accounts | Gold auth: PBKDF2 sessions, password reset (dev-token delivery), TOTP MFA, session revocation | Generic sign-in errors |

## Screens
Feeds (create/run/history + line import), Indicators (search/filter, detail
with triage + case linking + export), Login. Loading, empty, error and
success states throughout.

## Run

```bash
cd backend
pip install -r requirements-dev.txt
cp ../.env.example ../.env
alembic upgrade head
uvicorn app.main:app --reload --port 8018

cd ../frontend
npm install --legacy-peer-deps
npm run dev                          # http://localhost:5181
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 10 tests: indicator parsing/canonicalization,
                                              # single-feed framing, ingest dedup + source merge,
                                              # simulated labelling, triage validation, migrations
cd frontend && npm run typecheck && npm test  # 2 tests
```
E2E + screenshots: `scripts/run-e2e.sh threatintel-desk` (needs Playwright browsers).

## Known limitations
- The bundled dataset/simulated feeds are fictional demo data, labelled everywhere.
- External reputation lookups (the CLI's HTTP provider) stay opt-in server-side;
  this deployment runs offline-first and contacted no live feeds.
- Scheduled ingestion is interval-configured and triggered via the run endpoint —
  wire your scheduler (cron) to it in deployment.
- Screenshots via the e2e script; pending in the build sandbox.
