# SentinelCore — Security Operations Platform

The flagship full-stack application: security event intake, rule-based alert
generation, **incident workflow management** with role-based access
(admin / analyst / viewer), an administrative audit log, and reports. Part of
the portfolio product **SentinelCore** (Velaqori Systems).

> **Honesty statements (also in-product).** A suspicious pattern is **not
> proof of an attack** — alerts, statuses and flags reflect triage judgement,
> not certainty. Rule matches are labelled triage suggestions. Demo data is
> simulated and fictional (clearly marked in the UI).

## Features (working)

- **Roles, enforced server-side** (tested): `admin` (full control incl. users,
  rules, audit), `analyst` (events, alerts, incidents), `viewer` (read-only).
  Self-registration creates viewers; admins promote.
- **Events**: ingest + search/filter (category, severity, free text).
- **Rules → alerts**: category/substring rules evaluated over events; matches
  create alerts labelled "triage suggestion for review; not proof of malicious
  activity". Duplicate suppression on re-evaluation.
- **Incident workflow** (tested): `new → triaged → contained → resolved →
  closed`, with reopen (`→ triaged`) from resolved/closed. Illegal transitions
  rejected with the allowed set; resolving requires a resolution note.
- **Alerts → incidents** conversion preserves the matched event and records
  the "not proof of an attack" caveat in the incident description.
- **Audit log** (admin): every mutation recorded (actor, action, target, detail).
- **Reports**: portfolio incidents CSV + per-incident JSON with disclaimers.
- **Dashboard**: counts by status/severity, open alerts, demo-data banner.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (17) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed                      # simulated demo dataset
python3 -m uvicorn app.main:app --port 8006

cd ../frontend
npm install && npm run dev               # http://localhost:5179 → :8006
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `demo.admin@sentinelcore.example` | `demo-password-123` |
| Analyst | `demo.analyst@sentinelcore.example` | `demo-password-123` |
| Viewer | `demo.viewer@sentinelcore.example` | `demo-password-123` |

The seeded dataset (7 events, 3 rules, matching alerts, one triaged incident)
is labelled simulated in-product and is exercised end-to-end by the test suite
(`test_demo_seed_works_end_to_end`) to keep the flagship reliable with its
included demonstration data.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 17 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: workflow transition matrix + resolution-note requirement (unit and
API), rule-matching semantics, duplicate alert suppression, alert→incident
conversion, dismiss flow, role enforcement matrix (viewer read-only, analyst
limits, admin-only audit/roles), self-registration role, audit presence,
and demo-seed end-to-end reliability.

## Known limitations

- Rule matching is intentionally simple (category + substring); it is a
  demonstration of the alert workflow, not a detection-quality claim.
- Single-node SQLite deployment by default; set `DATABASE_URL` for PostgreSQL.
- Screenshots pending capture in a browser environment (not fabricated).
