# ReachLearn — SMS, USSD and IVR Microlearning Gateway

Delivers structured micro-lessons and quizzes through **channel-neutral
content** that renders for web preview, SMS, USSD menus and IVR scripts —
with real learner-state workflows, consent and opt-out handling. Part of the
portfolio education suite (Tamuzi Learning).

> **Delivery honesty (in-product).** With no messaging provider configured the
> system runs a **local simulator** and says so everywhere: simulator sends are
> recorded locally and are **never real carrier delivery** (tested).

## What is implemented

- **Channel-neutral lessons** with real renderers (tested): SMS segmentation
  with correct GSM-7 (160/153) vs UCS-2 (70/67) rules; USSD menus with
  depth/length limits (7 levels / 182 chars); IVR scripts with explicit
  `[PAUSE]` / `[PRESS n]` markers and a spoken STOP instruction.
- **Learner state machine (tested):** new → active → paused/completed, STOP →
  opted_out; re-subscribing after STOP requires fresh recorded consent.
- **Inbound keywords:** STOP/unsubscribe/cancel/quit always win (tested).
- **Consent & scheduling (tested):** non-essential sends require recorded
  consent; quiet hours (wrapping-midnight aware) and daily frequency caps per
  subscription; blocked sends are recorded with their exact reason.
- **Delivery jobs** with queued/sent/delivered/failed/unknown states and
  simulator badges; **provider callbacks are validated and idempotent** —
  duplicate webhook retries never double-apply (tested).
- **Completion reports** note that unrecorded offline study is missing evidence.

## What is simulated or out of scope (documented, not hidden)

- No real SMS/USSD/IVR provider credentials ship with the demo; the adapter is
  ready for `REACHLEARN_PROVIDER_URL/KEY` configuration (provider admin roles
  reserved for that).
- Scheduling is exposed as an explicit `local_hour` parameter in the MVP (a
  job runner with tz-aware timers is a documented deployment step).
- Web learner access shares the same learner state (API), and the demo UI is
  the educator console.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (11) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8014

cd ../frontend
npm install && npm run dev               # http://localhost:5187 → :8014
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Educator | `demo.educator@reachlearn.example` | `demo-password-123` |
| Learner | `demo.learner@reachlearn.example` | `demo-password-123` |
| Admin | `demo.admin@reachlearn.example` | `demo-password-123` |

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
