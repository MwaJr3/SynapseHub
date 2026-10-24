# IncidentFlow — Incident Lifecycle & Response Record

**Keep the response moving — and keep the record honest.** A working
React/TypeScript + FastAPI application: lifecycle state machine, role-based
rights, append-only audit trail, tasks, evidence intake (hashing engine reused
from `apps/incidentflow`), and reports that state their limitations.

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Lifecycle | new → triaged → contained → resolved → closed (+ reopened); illegal transitions refused with 409 (tested) | State machine enforced server-side, never client-side only |
| RBAC | observer (read-only) / responder / lead; closing is lead-only (tested) | Role rights enforced on every route |
| Audit | Append-style audit log of every mutation (create/transition/task/evidence/assign) | "Entries are recorded, never edited or removed" — no mutation endpoints exist |
| Timeline | Recorded sequence of responder entries + transitions | "Not proof of chronology or fact" — stated in-product |
| Evidence | Streamed SHA-256 intake, content-based duplicate refusal (409), custody entries | "Integrity since collection only — not authenticity" (tested) |
| Tasks | Create + status (todo/in_progress/done) per incident | — |
| Reports | Per-incident JSON export with timeline/evidence/tasks + limitations | "Not a forensic/legal admissibility tool" |
| Accounts | Gold auth: PBKDF2 sessions, password reset (dev-token delivery), TOTP MFA, session revocation | Generic sign-in errors |

## Screens
Board (filter by status + create), Incident detail (lifecycle transitions with
notes, assignee, timeline, tasks, evidence, export), Audit trail, Login with
role selection. Loading, empty, error and success states throughout.

## Run

```bash
cd backend
pip install -r requirements-dev.txt
cp ../.env.example ../.env
alembic upgrade head
uvicorn app.main:app --reload --port 8017

cd ../frontend
npm install --legacy-peer-deps
npm run dev                          # http://localhost:5180
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 9 tests: state machine legality, role
                                              # rights, lifecycle flow + audit,
                                              # evidence dedup + hashing caveat, migrations
cd frontend && npm run typecheck && npm test  # 2 tests
```
E2E + screenshots: `scripts/run-e2e.sh incidentflow` (needs Playwright browsers).

## Known limitations
- Evidence is pasted text in this build (the CLI's file-based intake path is
  reused for hashing semantics); filesystem journaling is out of scope.
- Not a forensic/legal admissibility tool (stated in-product).
- Screenshots via `scripts/run-e2e.sh incidentflow`; pending in the build sandbox.
