# SentinelLog — Security Log Analyzer

A full-stack web application for analyzing authentication and application
logs: import datasets, investigate events, run configurable detection rules,
and export reports. Part of the portfolio product **SentinelLog** (Tamuzi
Learning).

> **Honesty statement.** Detections are *suspicious patterns* produced by
> transparent rules — a pattern is **not proof of an attack**. All bundled log
> data is simulated. Nothing here claims a live deployment.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy (SQLite by default, PostgreSQL-ready
  via `DATABASE_URL`), stdlib `csv`/`re` parsing, scrypt password hashing,
  cookie sessions.
- **Frontend:** React 19, TypeScript (strict), Tailwind CSS 4, Vite, Recharts.
- **Tests:** pytest (parsing, detection, authorization, reporting) + Vitest
  (frontend utilities).

## Layout

```
backend/
  app/
    parsing.py     # untrusted .log/.txt/.csv → structured events (+ parse errors)
    detection.py   # rule engine (repeated failures, spray, success-after-failures, error spikes)
    reporting.py   # summaries + CSV export
    security.py    # scrypt hashing, session cookies
    routes.py      # API: auth, datasets, events, rules, findings, reports
    seed.py        # clearly-labelled simulated demo data
  tests/           # 29 pytest tests
  examples/        # sample_auth.log, sample_events.csv, malformed_records.log
docs/DETECTION_LOGIC.md
frontend/          # React dashboard (dark UI)
```

## Run it

```bash
# backend
cd backend
python3 -m venv .venv && . .venv/bin/activate     # or use your own environment
pip install -r requirements.txt
python3 -m app.seed                                # optional demo data
python3 -m uvicorn app.main:app --reload           # http://127.0.0.1:8000

# frontend (dev)
cd ../frontend
npm install
npm run dev                                        # http://localhost:5173 (proxies /api)
```

Production-style single origin: build the frontend (`npm run build`), then
`uvicorn app.main:app` serves the API **and** the built UI from `frontend/dist`.

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.analyst@sentinellog.example` | `demo-password-123` |

The demo workspace includes a simulated `auth.log` dataset that demonstrates
all four detection rules, plus a generated report.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 29 tests
cd ../frontend && npm test                   # 5 tests
```

Covered: syslog/CSV parsing, malformed-input handling, upload validation
(type/size/filename sanitisation), all four detection rules incl. window and
threshold boundaries, per-user data isolation on every protected endpoint,
report persistence and JSON/CSV export.

## Security model

- Uploaded files are **untrusted input**: parsed as data, never executed;
  filenames sanitised; type (`.log`/`.txt`/`.csv`) and size (5 MB default)
  enforced server-side.
- Passwords hashed with **scrypt** (stdlib); sessions are httpOnly cookies with
  a TTL.
- **Server-side authorization on every protected operation** — another user
  cannot read, edit or delete your datasets, events, rules, findings or
  reports (tested).
- Private logs never leave the workspace; demo data is synthetic and labelled.

## Configuration

Environment variables (all optional): `DATABASE_URL` (SQLite path or
PostgreSQL URL), `SENTINELLOG_DATA_DIR`, `SENTINELLOG_UPLOAD_DIR`,
`SENTINELLOG_MAX_UPLOAD_BYTES`. No secrets are committed.

## Limitations

- Syslog timestamps without a year are assumed to be the current UTC year.
- Detection rules are heuristics with documented blind spots — see
  `docs/DETECTION_LOGIC.md`.
- Screenshots are pending capture in a browser environment (not fabricated
  here).
- Not a replacement for a commercial SIEM; it analyzes supplied files only.
