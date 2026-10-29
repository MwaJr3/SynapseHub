# ClassConnect — Low-Bandwidth Virtual Classroom

Scheduling, hosting and following up on virtual lessons that stay usable on
weak connections: class management, session lifecycle, attendance, moderated
chat and question queues, polls, and an asynchronous follow-up space. Part of
the portfolio education suite (Tamuzi Learning).

## What is implemented

- **Classes & sessions:** teacher-owned classes, learner join flow, session
  scheduling with **conflict detection** (tested), local-time display.
- **Session lifecycle (tested):** scheduled → starting → live → ended, plus
  cancelled and failed (with reschedule path). Illegal transitions rejected.
- **Room access (tested):** short-lived HMAC-signed room tokens issued by the
  backend for members only, valid only for starting/live sessions. Provider
  secrets never reach the browser.
- **WebRTC provider adapter with honest degradation:** with no provider
  credentials configured the integration reports **unavailable** and
  asynchronous workflows (materials, chat, follow-up) remain fully usable —
  a real call is **never faked** (tested; stated in-product).
- **Low-bandwidth policy:** video off by default on constrained connections,
  audio/text prioritised, async fallback documented.
- **Attendance, moderated chat / question queue** (hide preserves history),
  **polls** with validated options, **assignments + submissions + teacher
  responses** as the async follow-up space.
- **Recording is off by default** and requires explicit per-session consent.

## What is simulated or out of scope (documented, not hidden)

- No LiveKit (or other WebRTC) credentials ship with the demo; the adapter is
  ready for `CLASSCONNECT_WEBRTC_URL/KEY` configuration.
- Connection-quality indicators depend on the configured provider; the demo
  shows the integration status instead.
- Retention/deletion for recordings is a deployment policy step (no recordings
  are made without consent).

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (9) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8012

cd ../frontend
npm install && npm run dev               # http://localhost:5185 → :8012
```

### Demo accounts (fictional, simulated data)

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `demo.teacher@classconnect.example` | `demo-password-123` |
| Learner | `demo.learner@classconnect.example` | `demo-password-123` |
| Learner 2 | `demo.learner2@classconnect.example` | `demo-password-123` |
| Admin | `demo.admin@classconnect.example` | `demo-password-123` |

## Portfolio

See `portfolio.json`. Screenshots pending capture (not fabricated).
