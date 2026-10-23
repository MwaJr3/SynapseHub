# FileGuard — File Integrity Monitoring System

A full-stack application for monitoring files you explicitly register: create
trusted **SHA-256 baselines**, run **integrity scans**, and investigate
changed / missing / new files with explainable findings. Part of the portfolio
product **FileGuard** (Velaqori Systems).

> **Honesty statements.** This workspace compares files uploaded to the
> application — it **cannot inspect your computer's filesystem**. A matching
> hash proves byte-identity with the baseline record only; it does **not**
> prove a file is safe or free of malware. A baseline is trusted only if its
> integrity and origin are protected. All demo content is simulated.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready),
  stdlib `hashlib` SHA-256 (no custom cryptography), scrypt auth, cookie sessions.
- **Frontend:** React 19, TypeScript (strict), Tailwind CSS 4, Vite.
- **Tests:** pytest (16) + Vitest (3).

## Layout

```
backend/
  app/
    integrity.py   # hashing, baseline manifests, comparison (explains each finding)
    reporting.py   # JSON/CSV integrity reports
    routes.py      # API: auth, workspaces, files, baselines, scans, findings, reports
    seed.py        # simulated demo workspace (matched/changed/missing/new)
  tests/           # hashing vectors, comparison, workflow, id-reuse regression, authz, reports
frontend/          # React dashboard (dark UI)
```

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed                    # optional demo workspace
python3 -m uvicorn app.main:app --port 8001

cd ../frontend
npm install && npm run dev             # http://localhost:5174 (proxies /api → :8001)
```

Production-style: `npm run build`, then `uvicorn app.main:app` serves API + UI
from one origin.

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.admin@fileguard.example` | `demo-password-123` |

The demo workspace contains four simulated files, baseline v1 and a scan
showing all four outcomes: 2 matched, 1 changed, 1 missing, 1 new.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 16 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: known SHA-256 test vector, baseline/scan workflow, in-place change
detection, missing/new detection, **row-id reuse regression** (identity is an
immutable UUID, so SQLite id reuse cannot misclassify files), upload type
validation, per-user isolation of workspaces/files/baselines/scans/findings,
JSON/CSV reports.

## Security model

- Uploads are untrusted: type allowlist, size limit, generated internal
  storage names (user input never becomes a path), content never executed.
- Passwords: scrypt. Sessions: httpOnly cookies. Authorization: server-side on
  every operation (tested).
- The baseline manifest is exportable so its integrity can be protected
  externally; the app says plainly that baseline trust depends on that.

## Limitations

- Text-like files only in this MVP (`.conf`, `.txt`, `.json`, `.py`, …); binary
  executables are deliberately not accepted.
- One comparison model: whole-file SHA-256. No per-block or Merkle trees.
- Screenshots pending capture in a browser environment (not fabricated).
