# LearnPulse — Learning Analytics and Teacher Support Dashboard

Converts learning activity records into clear, privacy-conscious insights.
**Every dashboard value is computed from stored events** and every metric
ships with its definition — no static charts, no unsupported predictions. Part
of the portfolio education suite (Tamuzi Learning).

## What is implemented

- **CSV event import** with row-level validation: required columns, ISO dates,
  event-kind whitelist, numeric values. Rejected rows return line numbers and
  reasons; **re-importing is idempotent** (duplicate uids rejected, never
  double-counted) (tested).
- **Computed dashboards** with date-range filtering: events, learners, lesson
  completions, quiz attempts/average, assignment submissions/missing, help
  requests, events by topic (tested math).
- **Transparent support flags with exact evidence** (tested): missed
  assignments (≥2), repeated topic errors (quiz < 50% ×3 on one topic), help
  requests. Each flag shows the rule text and the event uids behind it.
  Teachers dismiss or mark actioned with notes and follow-ups.
- **Small-cohort protection:** groups under 3 learners are suppressed in
  comparisons (tested).
- **Exports** include date range, data sources, metric definitions, generation
  timestamp and data-quality notes (missing events are missing evidence;
  correlation is not causation).
- **Versioned metric definitions** (admin changes bump a version).

## Fairness rules (in-product, not just in docs)

Flags are supportive review signals — never labels of ability, never
predictions of failure. Staff review before acting. No automated analytics are
used for placement, discipline or eligibility decisions.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (8) + Vitest (2).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8011

cd ../frontend
npm install && npm run dev               # http://localhost:5184 → :8011
```

### Demo accounts (fictional, synthetic data)

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `demo.teacher@learnpulse.example` | `demo-password-123` |
| Admin | `demo.admin@learnpulse.example` | `demo-password-123` |

The seeded event set is synthetic (learners are refs like `learner-a`).

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
