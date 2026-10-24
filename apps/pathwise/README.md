# PathWise — Diagnostic Assessment and Adaptive Learning Paths

Diagnoses learner understanding through assessments and builds **explainable**
learning paths from demonstrated mastery. Implements real assessment and
recommendation logic — not arbitrary progress percentages. Part of the
portfolio education suite (Tamuzi Learning).

## What is implemented

- **Skills graph** with prerequisite edges; questions mapped to skills.
- **Assessment types:** diagnostic, formative, practice, post-test — with
  question kinds mcq / multi-select (partial credit) / numeric / true-false /
  short response (rubric notes for manual review).
- **Transparent mastery model** (documented, versioned rules — explicitly NOT
  machine learning): recency-weighted evidence blending, minimum-evidence
  rules, confidence derived from evidence count. Thin evidence is never
  labelled "mastered"; uncertainty is shown (tested).
- **Recommendations with plain-language rationale** — prerequisite gaps,
  no-evidence diagnostics, or score-gap practice — plus machine-readable
  evidence (tested).
- **Spaced review scheduling** (1/3/7-day intervals by mastery level).
- **Pre/post comparison** separating participation from proficiency; missing
  data reported as missing (tested).
- **Teacher overrides** with mandatory recorded reasons (tested); targeted
  assignments.

## What is simulated or out of scope (documented, not hidden)

- Item-response theory / psychometric models are intentionally NOT claimed;
  the modular core is ready for one to be added later with proper evaluation.
- Rubric-scored short responses store credit rules for manual review rather
  than auto-grading essays.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (11) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8008

cd ../frontend
npm install && npm run dev               # http://localhost:5181 → :8008
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo.learner@pathwise.example` | `demo-password-123` |
| Teacher | `demo.teacher@pathwise.example` | `demo-password-123` |
| Admin | `demo.admin@pathwise.example` | `demo-password-123` |

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 11 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: all scoring kinds incl. multi-select partial credit, mastery
recency/blending math, confidence thresholds, status logic with thin-evidence
uncertainty, recommendation rationale + prerequisite gating, spaced-review
intervals, pre/post reporting, authoring permissions, learner journey,
override-requires-reason.

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
