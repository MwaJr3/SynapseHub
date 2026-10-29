# LearnBridge — Offline-First E-Learning Platform

Delivers structured, affordable digital learning with reliable offline access:
courses → modules → lessons with mixed content blocks, quizzes with graded
attempts and explanations, progress states driven by **configured lesson
requirements** (not page views), bookmarks, notes, downloadable course packs,
and an offline sync queue with **explicit conflict resolution** (nothing is
discarded silently). Built for learners with unreliable internet access.

Part of the portfolio education suite (Tamuzi Learning).

## What is implemented

- **Study loop:** catalogue → enroll → lesson reader (text/example/practice/audio
  link blocks) → quiz attempt (mcq / multi-select / true-false / short answer)
  with per-question explanations per course settings.
- **Progress states:** Not Started / In Progress / Completed / Needs Review.
  Completion requires configured requirements (e.g. quiz ≥ threshold) — a page
  view alone never completes a lesson (tested).
- **Offline-first mechanics:** course-pack JSON export (text + quiz data; media
  links open only online — never claimed offline), sync endpoint that applies a
  queued change or records a **conflict** with both versions preserved, and
  keep-mine / keep-server / merge resolution (tested).
- **Roles:** learner / instructor / admin with server-side enforcement; notes
  and bookmarks are per-user private (tested).
- **Catalogue metadata:** subject, level, language, estimated time,
  accessibility notes, license + attribution; search/filter; archival instead
  of destructive deletion.

## What is simulated or out of scope (documented, not hidden)

- The PWA service worker / IndexedDB client cache is represented by the course
  pack + sync API in this implementation; the full service-worker shell is a
  documented next step.
- Audio/video: demo content stores placeholder links; media is never claimed to
  be available offline.
- Object storage (S3) for uploads is not configured in this MVP.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (15) + Vitest (2).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8007

cd ../frontend
npm install && npm run dev               # http://localhost:5180 → :8007
```

Copy `.env.example` to configure; secrets never live in source.

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo.learner@learnbridge.example` | `demo-password-123` |
| Instructor | `demo.teacher@learnbridge.example` | `demo-password-123` |
| Admin | `demo.admin@learnbridge.example` | `demo-password-123` |

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 15 tests
cd ../frontend && npm test                   # 2 tests
```

Covered: quiz grading for all four question types, attempt scoring/pass rules,
progress state machine (page views never complete), requirement gates, sync
apply/conflict/reject paths, conflict resolution preserves both versions,
enroll→lesson→quiz→completion journey, note privacy, course-pack versioning.

## Portfolio

See `portfolio.json` for the machine-readable case-study metadata. Screenshots
pending capture in a browser environment (not fabricated).
