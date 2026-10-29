# TeachCraft — Teacher Content and Assessment Studio

Genuine authoring and publishing workflow for educators: courses, units,
lessons with structured content blocks and templates, a validated question
bank, **draft → review → published → archived** with immutable version
history and restore, reviewer comments, and safe static HTML export. Part of
the portfolio education suite (Tamuzi Learning).

## What is implemented

- **Lesson studio:** templates (lesson plan, worked example, revision sheet,
  quiz, assignment brief), structured blocks (heading/text/list/table/link/
  image-alt/example), objectives, estimated time.
- **Workflow (tested):** illegal transitions rejected; publishing requires the
  reviewer/admin role (server-enforced); published/archived lessons are locked
  for in-place editing.
- **Version history (tested):** every save snapshots a version; restore creates
  a NEW version — history is never rewritten.
- **Question bank (tested validation):** single/multi/true-false/numeric/
  ordering/matching/rubric kinds with structural validation of choices and
  answers.
- **Export:** static HTML with all text escaped (XSS-safe, tested) and an
  explicit statement that interactive question behaviour does not survive
  export.
- Reviewer comments + resolve; audit log of publication and review actions.

## What is simulated or out of scope (documented, not hidden)

- Rich-text editing is structured-block JSON in this MVP (a maintained editor
  like TipTap is a documented integration step).
- Image blocks carry alt text; binary asset upload is not in this MVP.
- AI-assisted drafting is intentionally absent (optional AI is behind explicit
  configuration per the product prompt — not enabled here).

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (9) + Vitest (2).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8010

cd ../frontend
npm install && npm run dev               # http://localhost:5183 → :8010
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `demo.teacher@teachcraft.example` | `demo-password-123` |
| Reviewer | `demo.reviewer@teachcraft.example` | `demo-password-123` |
| Admin | `demo.admin@teachcraft.example` | `demo-password-123` |

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
