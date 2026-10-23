# CampusFlow — Student Information System

Full-stack student records system: enrollment, course sections, grades,
attendance and computed transcripts, with server-enforced role-based access
and an administrative audit log. Part of the portfolio product **CampusFlow**
(Tamuzi Learning).

> **Stack note (documented deviation).** The original product prompt named
> Django. This implementation uses **FastAPI + React** so the whole application
> suite shares one stack and one test harness. The functionality, validation
> rules and test coverage follow the prompt.

## Features (working)

- Accounts with roles: **admin/registrar, teacher, student, parent** (cookie
  sessions, scrypt password hashing).
- **Students** CRUD (admin), with active/graduated/transferred status.
- **Courses & sections** with teachers, terms and capacity.
- **Enrollment rules** (tested): no duplicates, capacity enforced, active
  students only, drop + re-enroll.
- **Grade validation** (tested): 0–100 scores, one grade per assessment
  (upsert), draft vs final status; only the section's teacher or an admin may
  write grades.
- **Attendance validation** (tested): present/absent/late/excused, one record
  per date per enrollment (upsert).
- **Transcripts** computed from **final grades only** (drafts excluded), with
  letter bands and GPA weighted by credit hours.
- **Audit log** (admin): administrative changes recorded with actor and target.
- Role/ownership enforced **server-side** (tested): students see only their own
  records, parents only linked children, teachers only their sections for
  writes.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (19) + Vitest (2).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed                      # simulated demo data
python3 -m uvicorn app.main:app --port 8003

cd ../frontend
npm install && npm run dev               # http://localhost:5176 → :8003
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `demo.admin@campusflow.example` | `demo-password-123` |
| Teacher | `demo.teacher@campusflow.example` | `demo-password-123` |
| Student | `demo.student@campusflow.example` | `demo-password-123` |
| Parent | `demo.parent@campusflow.example` | `demo-password-123` |

The seed dataset is labelled simulated in-product: fictional students ("Demo
Zulu", "Demo Banda", "Demo Phiri"), fictional results and attendance.

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 19 tests
cd ../frontend && npm test                   # 2 tests
```

## Known limitations (also in-app)

- No PDF transcript renderer (JSON transcript endpoint in this MVP).
- No integration with external student-record systems; this MVP validates its
  own inputs and logs administrative changes.
- Screenshots pending capture in a browser environment (not fabricated).
