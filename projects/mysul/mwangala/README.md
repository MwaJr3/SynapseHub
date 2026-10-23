# MWANGALA — Python, Cybersecurity & Engineering Portfolio

Premium portfolio website for **Mwangala** (Python Developer | Cybersecurity | Software Engineering)
plus **7 fully working demo applications** that open from the portfolio.

> Build → Secure → Integrate. The projects are real, functional applications — not mockups.
> All demo data is synthetic and clearly labelled as simulated.

## Contents

```
mwangala/
├── index.html                  # Portfolio home
├── css/styles.css              # Portfolio light + dark design system
├── css/app-shared.css          # Shared dashboard styles for the 7 apps
├── js/projects.js              # CENTRAL PROJECT CONFIG (edit URLs here — never hardcode in UI)
├── js/main.js                  # Theme, nav, hero viz, filters, reveals
├── js/case-study.js            # Reusable case-study renderer
├── projects/<slug>/index.html  # 7 case-study pages (clean URLs: /projects/sentinelcore/)
├── apps/<slug>/index.html      # 7 working demo applications (open from portfolio)
├── python-reference/           # Tested Python calculation core (CircuitLab) + pytest suite
├── tests/                      # Automated tests for the Python reference core
└── server.py                   # Zero-dependency static server with security headers
```

## Quickstart

```bash
cd mwangala
python3 server.py            # serves on http://localhost:8000
```

Then open:

- Portfolio: `http://localhost:8000/`
- Case study example: `http://localhost:8000/projects/sentinelcore/`
- Live demo example: `http://localhost:8000/apps/sentinelcore/`

No build step. No external dependencies. No network calls. Works offline.

## The 7 applications

| # | App | URL | Theme |
|---|-----|-----|-------|
| 1 | SentinelLog — Security Log Analyzer | `/apps/sentinellog/` | dark |
| 2 | FileGuard — File Integrity Monitoring | `/apps/fileguard/` | dark |
| 3 | DependSecure — Dependency Vulnerability Auditor | `/apps/dependsecure/` | dark |
| 4 | CampusFlow — University Management System | `/apps/campusflow/` | light |
| 5 | CircuitLab Calc — Electrical Engineering Calculator | `/apps/circuitlab-calc/` | light |
| 6 | ChessScope — Chess Game Analyzer | `/apps/chessscope/` | light |
| 7 | **SentinelCore — Mini-SIEM (FLAGSHIP)** | `/apps/sentinelcore/` | dark |

Each app is a **working application**: import/upload, search, filter, CRUD, detection
logic, history, reports, JSON/CSV export, authentication with per-user data isolation
(demo-grade, localStorage-backed), empty/loading/error states, and responsive layouts.

Demo logins are shown on each app's sign-in screen (e.g. CampusFlow
`admin@campusflow.demo / admin123`). All seeded records are labelled **Simulated**.

## Configuration (important)

All portfolio URLs live in **`js/projects.js`**:

```js
const SITE = { github: "", linkedin: "", email: "" };
```

- `liveDemoUrl` points at the real local demos (`apps/<slug>/`) — these work now.
- `githubUrl` is intentionally **empty** because no real repository URLs were supplied.
  The UI renders honest **"Source Unavailable"** states instead of fake links (per spec §35).
- Add your real GitHub profile, repository URLs, LinkedIn, and email there when ready —
  every card, case study, navbar, and footer updates automatically. Never invent URLs.

## Python reference core + tests

The browser demos keep every app zero-dependency, but the engineering-calculation core
ships as tested Python to prove the FastAPI migration path:

```bash
cd mwangala
pip install pytest            # only test dependency
python -m pytest tests/ -q
```

- `python-reference/circuit_math.py` — Ohm's law, power, series/parallel,
  voltage divider, 2-mesh Kirchhoff solver, unit conversion (units + assumptions documented).
- `tests/test_circuit_math.py` — independently checked examples, edge cases
  (division by zero, negative/zero/implausible inputs), invalid-circuit handling.

Production path per app: keep the validated core logic, mount it behind FastAPI
routers + SQLAlchemy (SQLite → PostgreSQL), React + TypeScript + Tailwind frontend,
pytest for API/auth/rules coverage. Data models in the demos mirror that schema.

## Security notes

- Portfolio is fully static: no secrets, no inline credentials, external links use
  `rel="noopener"`, contact form validates client-side and never exfiltrates.
- Demos treat every upload as untrusted: extension + size validation, never executed,
  per-user namespaced storage, server-side authorization clearly documented as required
  before any production multi-user deployment (see each app's Settings → Security note).
- `server.py` sends `Content-Security-Policy`, `X-Content-Type-Options`,
  `Referrer-Policy`, and `X-Frame-Options` headers.

## Honesty rules followed

No fabricated users, revenue, certifications, employment, metrics, advisories,
GitHub stars, testimonials, or "confirmed attacks". Suspicious patterns are always
labelled **patterns under investigation**, never proof of compromise. Scanner output
is always separated from analyst conclusions. Hash matches are described as
**integrity vs. baseline**, never proof of safety.
