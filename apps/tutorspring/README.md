# TutorSpring — AI Learning Companion

A supportive tutor grounded in **approved learning material**: explanations,
hints, practice and reasoning checks with visible source citations. When the
approved material does not cover a question, the tutor says so and points the
learner to a teacher — it never guesses with false confidence. Part of the
portfolio education suite (Tamuzi Learning).

## What is implemented

- **Tutor modes:** Explain, Give Me a Hint, Practice With Me, Check My
  Reasoning, Summarize This Lesson.
- **Grounded answering:** deterministic retrieval over approved sources;
  every answer shows its citations and a "responses can be wrong" disclaimer.
  Unsupported questions get an explicit refusal to guess (tested).
- **Demo mode by default:** prepared example responses, labelled
  `[DEMO MODE — prepared example response, not live model output]` in every
  reply (tested). Live models require explicit server-side configuration
  (`TUTORSPRING_LLM_BASE_URL/API_KEY/MODEL`) through a provider adapter —
  model choice is configuration, not business logic.
- **Review workflow:** learners flag confusing/incorrect explanations; flags
  route to a private teacher review queue (approve/hide with notes). Other
  learners never see flagged conversations (tested).
- **Practice attempts** tracked per topic; **teacher summaries are
  aggregate-only** (counts, no conversation text) (tested).
- **Privacy:** learners can delete their own conversation history (tested);
  per-user rate limiting; retrieved material is treated as untrusted data.

## What is simulated or out of scope (documented, not hidden)

- No live LLM is called in the demo configuration; responses are prepared
  examples. Text-to-speech is not included in this MVP.
- The retrieval layer is keyword-based (transparent); embeddings/pgvector are
  a documented future enhancement.

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (10) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8009

cd ../frontend
npm install && npm run dev               # http://localhost:5182 → :8009
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo.learner@tutorspring.example` | `demo-password-123` |
| Teacher | `demo.teacher@tutorspring.example` | `demo-password-123` |
| Admin | `demo.admin@tutorspring.example` | `demo-password-123` |

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 10 tests
cd ../frontend && npm test                   # 3 tests
```

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
