# HashSight — Malware File Hash Reputation Explorer

**Identify files. Examine reputation. Understand the evidence.** A working
React/TypeScript + FastAPI application. Files are hashed locally, reputation
providers are consulted only when explicitly configured and confirmed, and the
product refuses to call "no detections" the same thing as "safe".

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Hashing | SHA-256 + SHA-1 + MD5 computed locally from uploads or pasted bytes; streaming with hard size caps; temp files deleted reliably | MD5/SHA-1 are for indicator compatibility only — never for collision resistance (stated in API + UI) |
| Reputation | Modular provider adapters; deterministic **demo provider** (simulated data, labelled); opt-in external adapter (digest-only, never the file, only after explicit confirmation) | Demo results are simulated, not real intelligence. External lookups need `PROVIDER_MODE=external` + API key + user confirmation |
| Verdicts | KNOWN_MALICIOUS / NO_KNOWN_DETECTION / UNKNOWN / UNAVAILABLE / CONFLICTING with cross-provider consensus | "No known detection" never described as safe — `SAFE` is not even a valid verdict state |
| Casework | Personal scan history with search/filter, dispositions, investigation notes, cases, JSON report export with sources + timestamps, record deletion (retention) | Reports state they are not safety determinations |
| Accounts | Register/login with PBKDF2-SHA256 (200k), HttpOnly cookie sessions, generic sign-in errors (no enumeration) | Single-process demo; no password reset / MFA (documented) |

## Screens
Lookup (file → progress → digests + provider comparison), History (searchable,
filterable), Record detail (provider table, disposition, notes, export),
Cases (notes timeline), Login/Register. Loading, empty, error and success
states throughout.

## Architecture
```
backend/app/
  hashing.py        # local digests only; never executes or uploads
  providers/        # base (verdicts + consensus), demo, opt-in HTTP adapter
  services.py       # lookup orchestration, records, reports
  models.py         # users, sessions, hash_records, lookups, cases, notes
  main.py           # FastAPI routes
frontend/src/
  pages/            # Login, Lookup, History, Record, Cases
  lib/api.ts        # typed client
```

## Run

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env        # defaults: SQLite + demo provider
uvicorn app.main:app --reload --port 8011

# frontend
cd frontend
npm install --legacy-peer-deps
npm run dev                        # http://localhost:5174 (proxies /api to 8011)
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 15 tests: hashing vectors, verdicts, consensus, API, retention
cd frontend && npm run typecheck && npm test  # 2 tests: UI + verdict presentation
```

## Security posture
- Files are **never executed**; file contents are **never uploaded** anywhere —
  at most the digest, and only with explicit user confirmation plus configured
  external provider.
- API keys stay server-side (`.env`, never in frontend code).
- Upload size caps, safe temp-file handling with guaranteed deletion,
  ownership checks on every record/case/note route.
- Heuristic/provider results are presented as reports, never as proof of
  maliciousness or safety.

## Known limitations
- Demo provider results are simulated and deterministic — labelled in every
  response. No live reputation service was contacted during development.
- Single-process sessions (no horizontal scale), no password reset/MFA.
- Retention control is a per-record delete endpoint; no background sweeper yet.
- Screenshots pending capture.
