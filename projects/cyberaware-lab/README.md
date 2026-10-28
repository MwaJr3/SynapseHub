# CyberAware Lab — Fictional Simulation Training Platform

**Practice the decision. Not the mistake.** A working React/TypeScript +
FastAPI platform where instructors build fictional security-awareness
simulations and learners practice recognizing them — with hard safety rails
enforced server-side.

## What is implemented

| Area | Working functionality | Important boundary |
|---|---|---|
| Simulations | Templates for phishing emails, incident briefings, and quizzes; scenario-safe content editor with validation feedback | Every simulation carries a **mandatory visible training banner** (added server-side, tested) |
| Safety guard | Server-side validation of all scenario content before save/assign | **Password fields are rejected** — simulations never collect passwords; real-organization names are refused; all domains must be fictional (.example/.invalid/.test) |
| Roles | Learner vs instructor RBAC across every route | Learners cannot manage groups/templates/assignments/reports (tested) |
| Groups & assignments | Learning groups, membership, assignments with due dates | Instructor-managed |
| Checkpoints | Awareness quizzes with server-side scoring; answer keys never sent to clients (tested) | A score is a learning signal, not a verdict |
| Progress | Participation and average-score reporting per assignment, plus instructor after-action notes | "Completion is not proof of lasting awareness" is stated in the report itself |
| Casework | Learner reflections recorded with completions | Demonstration data only |

## Screens
Learner home (assignment list with status), Simulation viewer (prominent
banner + fictional content + checkpoint + reflection), Instructor console
(scenario editor with safety validation, groups/members, assignment flow,
progress report + notes). Loading, empty, error and success states throughout.

## Architecture
```
backend/app/
  scenario_guard.py   # banner / password-field / real-org / domain validation
  quiz.py             # deterministic scoring; keys stay server-side
  models.py           # users, groups, templates, assignments,
                      # completions, quiz attempts, notes
  main.py             # FastAPI routes with learner/instructor RBAC
frontend/src/
  pages/              # Login, LearnerHome, Simulation, Instructor
```

## Run

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8014

# frontend
cd frontend
npm install --legacy-peer-deps
npm run dev                        # http://localhost:5301 (proxies /api to 8014)
```

## Test
```bash
cd backend && python3 -m pytest tests/ -q     # 11 tests: scenario safety (password fields,
                                              # real orgs, real domains, size), quiz scoring +
                                              # key secrecy, RBAC, learner flow, reports
cd frontend && npm run typecheck && npm test  # 2 tests: login UI + banner requirement
```

## Security posture
- Simulations are **fictional** and labelled with visible banners — enforced
  server-side, not just in the UI.
- The platform **never collects real passwords** (password-style fields reject
  the template) and **never impersonates real organizations** (banned-token
  check covers common brands).
- Only reserved fictional domains are permitted in scenario content.
- RBAC keeps management surfaces instructor-only; quiz answer keys never reach
  the client.

## Known limitations
- Scenario content is stored as plain text/HTML fragments and displayed with
  basic formatting — there is no full WYSIWYG editor.
- Progress figures reflect recorded lab activity; no claim is made about
  durable behavior change.
- Demonstration data only; no external email is sent by this platform.
- Screenshots and Playwright e2e specs ship ready to run: `scripts/run-e2e.sh <project>` boots backend + frontend, runs the core-flow spec, and writes documentation screenshots to `docs/screenshots/<project>/`. They are **pending in this build environment** (browser downloads are network-blocked here); run the script once on any normal machine to capture them.
