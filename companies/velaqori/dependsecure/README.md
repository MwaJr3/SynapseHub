# DependSecure — Python Dependency Vulnerability Auditor

A full-stack application for auditing Python dependency manifests
(`requirements.txt`, `pyproject.toml`): run **reproducible pip-audit scans**,
track findings, and manage remediation separately from scanner output. Part of
the portfolio product **DependSecure** (Velaqori Systems).

> **Honesty statements.** Findings are scanner output — not proof of
> exploitability. **No findings does not prove a dependency is safe.** A failed
> scan is reported as a failure, never as "zero findings". Uploaded manifests
> are read as text and never executed or installed. Demo findings come from a
> real reproducible pip-audit scan of deliberately old pins; any illustrative
> fallback records are explicitly labelled non-real.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready),
  stdlib `tomllib` manifest parsing, `pip-audit` behind a safe subprocess
  adapter (argument list, `--no-deps`, hard timeout, no shell).
- **Frontend:** React 19, TypeScript (strict), Tailwind CSS 4, Vite.
- **Tests:** pytest (20) + Vitest (2).

## Safety model

- Uploaded projects are **never installed**; only the manifest text is read.
- The scanner runs with an argument list (no shell interpolation), a hard
  timeout, and `--no-deps`.
- Advisory IDs come only from the scanner's real output. Illustrative demo
  records use `ILLUSTRATIVE-*` identifiers explicitly marked as not real.
- Scanner output (immutable) and remediation workflow (status, assignee,
  notes, risk-exception reason) are stored in separate models.
- `Accepted Risk` requires a recorded exception reason (enforced server-side).
- Per-user project isolation on every endpoint (tested).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt          # includes pip-audit
export PATH="$PATH:$HOME/.local/bin"
python3 -m app.seed                      # reproducible demo scan
python3 -m uvicorn app.main:app --port 8002

cd ../frontend
npm install && npm run dev               # http://localhost:5175 → :8002
```

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.dev@dependsecure.example` | `demo-password-123` |

The demo project pins old versions (`requests==2.19.0`, `pyyaml==5.3.1`,
`jinja2==2.10`) so a scan returns real advisory identifiers at seed time; the
raw scanner payload is preserved on the scan record.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 20 tests
cd ../frontend && npm test                   # 2 tests
```

Covered: requirements/pyproject parsing incl. malformed input, upload
validation, scanner adapter (findings parse + dedupe, zero-findings ≠ failure,
timeout, unreachable source, resolution conflicts, unparseable output),
remediation status transitions, accepted-risk exception enforcement,
scanner/workflow separation, per-user isolation, JSON/CSV reports.

## Known scanner limitations (also in-app)

- Results depend on pip-audit's vulnerability sources (availability + coverage).
- Conflicting pins can make a manifest unresolvable — surfaced as a failed scan.
- `--no-deps` audits exactly what is pinned; unpinned transitive drift is out of
  scope in this MVP.
- Screenshots pending capture in a browser environment (not fabricated).
