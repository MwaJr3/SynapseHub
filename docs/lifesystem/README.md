# Project LIFESYSTEM — inside Tessera

The master prompt (`Project_LIFESYSTEM_Master_Prompt.pdf`, v1.0, 15 October 2026)
describes a personal learning operating system: a learner model with evidence, a
retrieval engine, and a Solo Leveling-inspired progression layer. This document is
the **build record and stage plan** for it inside Tessera, so the state of the work
is legible without asking.

## The one rule that changed

The master prompt opens with a non-negotiable sequencing rule:

> Build the learner first. Build the learning system second. Integrate gamification
> third. Engineer and verify the application only after the preceding stages are
> complete.

**That order is inverted for this build, at the project owner's direction:** build
the software first, then develop the learner, then design the learning system. This
is recorded rather than quietly ignored, because it has a real consequence:

- The intake, the ten axes, and the session/retrieval loop get a working home
  before anyone is asked to fill them in. Nothing is measured before it can be
  stored.
- The risk is that the interface encodes an assumption that learner development or
  system design later revises. The mitigation is deliberate: **no derived ability
  score is computed or stored.** Scores are kept as reported, with the instrument
  and date attached, and every axis can be replaced by a newer assessment. A later
  phase can change what the product *says* about the numbers without a migration of
  history.

Everything else in the document is kept: one coherent slice per stage, a practical
exercise with stated assessment criteria, and an explicit stop for acknowledgement
before the next major phase.

## Stages

| # | Stage | What "done" means | Status |
| --- | --- | --- | --- |
| 0 | Repository and environment | Tessera inspected, toolchain and tests green, plan written | **done** |
| 1 | Software: learner profile foundation | Profile + diagnostic history persisted, validated, tested, on screen | **done** |
| 1.1 | Software: one profile per learner, on a real database | Migration history, PostgreSQL path, isolation tests, baseline gated | **done** |
| 2 | Software: knowledge and sessions | Subjects/topics/concepts with typed relations, session log, reference notes + search | next |
| 3 | Software: retrieval + review scheduling | Retrieval formats, attempt history, explainable due queue, missed-review recovery | |
| 4 | Software: competency and analytics | Evidence separated from mastery, reassessment, explainable gaps | |
| 5 | Software: quests, XP ledger, seasons | Idempotent XP, anti-farming, recovery mode, anti-obsession controls | |
| 6 | Software: hardening | Export/delete, accessibility pass, migrations, production build | |
| 7 | Learner development (the document's Phase I) | Learner model, dimensions, processes, technique groups A–I, personal protocol | after software |
| 8 | Learning-system design (the document's Phase II) | Lifecycle, priority heuristic, competence model, experiment protocol | |
| 9 | Gamification rules (the document's Phase III) | Operational definitions and safeguards, if stage 5 needs revising by them | |

Stages 1–6 are the software. The document's own Phase IV–VI work is largely
supplied by the prompt, which is what makes building first possible at all.


## Stage 1.1 — one profile per learner, on a database that can hold them

Three corrections came out of review, and all three were right:

1. **Each learner has their own profile.** The first cut shipped a "load the
   baseline I supplied" button that filled *any* account with the project owner's
   diagnostic scores. That is someone else's data. The baseline is now **off unless
   `TESSERA_DEMO_BASELINE=1`** is set: a new account starts with all ten axes
   unscored, entry is by hand from the learner's own results, and the endpoint
   answers `403` with the reason rather than an empty `200` that could be mistaken
   for "already loaded".
2. **The scores only exist once the learner supplies them.** Nothing arrives by
   default. The two quizzes are linked as *configuration*
   (`TESSERA_QUIZ_LEARNER_TYPE_URL`, `TESSERA_QUIZ_DIAGNOSTIC_URL`); an unset URL is
   simply absent from the payload and no anchor is rendered. Nothing is fetched or
   scraped — the learner takes the quiz and types what it reported. A supplied `0`
   stays a `0`; an unsupplied score stays missing.
3. **PostgreSQL, and migrations to get there.** SQLite is one file and one machine;
   a product with learners needs PostgreSQL. `alembic/` now holds the schema
   history, `tests/test_migrations.py` proves it builds the models exactly and has
   not drifted, and `docker-compose.yml` stands up the server. A bare
   `postgresql://` URL is rewritten to `psycopg2` because SQLAlchemy 2.1 would
   otherwise look for a driver that is not installed.

The isolation guarantee is tested through the API rather than asserted:
`tests/test_isolation.py` creates two learners, fills one profile, and checks the
other can read none of it — including by guessing ids (404, not "empty").

### Still true, and still the reason this order is risky

No ability score is derived from anything. The profile stores what an instrument
reported, with its name, date and reporter attached, and no composite is computed
over the ten axes. Learner development (stage 7) can therefore change what the
product *says* about these numbers without a migration of history.

## Stage 1 — the learner profile (built)

The slice answers one question: *what was reported about this learner, by which
instrument, and what was never supplied?* Without it, every later stage has nowhere
to attach a learner.

### What works

- `learner_profiles`, `assessments`, `assessment_scores` — one row per learner,
  assessments append-only, scores nullable.
- `GET /api/profile` — the ten core axes (5 dimensions + 5 processes), each with
  its latest score or an explicit missing marker, plus the full history, the
  instrument catalogue, and the caveats.
- `PUT /api/profile` — free-text context (constraints, deadlines). Not scored.
- `POST /api/profile/assessments` — validated writes; 422 with a readable reason.
- `POST /api/profile/assessments/{id}/archive` — retire a row with a reason; it
  leaves the evidence and stays in the history.
- `POST /api/profile/baseline` — transcribe the baseline the learner already
  supplied (see `app/profile_baseline.py`), idempotent on instrument + date.
- A **Profile** screen in the Tessera app: the ten axes, what is missing, the
  history, a retire action, the context notes, and an add-assessment form built
  from the server's instrument catalogue.

### The rules, and the tests that hold them

| Rule | Why it matters | Test |
| --- | --- | --- |
| Missing is not zero | A supplied 0 (Reference, 0%) is a finding; an absent score is an absence. Collapsing them invents a deficit. | `test_supplied_zero_is_a_score_and_absent_score_is_missing` |
| A blank form field is not a 0 | The same bug, one layer earlier, in the browser. | `buildScores` → *keeps a supplied zero and drops a blank field* |
| Scores stay inside their instrument's scale | 140 on a 0–100 scale is a typo that would otherwise become evidence. | `test_invalid_assessments_are_rejected`, `test_instrument_catalogue_matches_what_the_server_accepts` |
| An axis cannot be filed under the wrong instrument | VARK cannot report a learning dimension. | same |
| Non-finite numbers are refused | `NaN`/`Infinity` are not scores. | `test_non_finite_value_is_rejected` |
| Categorical results are labels, not numbers | "INTJ" has no magnitude; a number would invent one. | same param list |
| History is append-only | A correction must be auditable, not invisible. | `test_archiving_retires_a_score_without_deleting_history` |
| Latest means taken-latest | Entering an older result later must not overwrite a newer one. | `test_latest_score_wins_by_when_it_was_taken` |
| One learner's record is not another's | A guessed id is a 404, not a read. | `test_one_learner_cannot_read_or_archive_another` |

### What this stage deliberately does not do

- **No ability score.** Nothing is summed, averaged or weighted. The document warns
  that equal weighting of subscales is unevidenced; rather than pick weights
  silently, none are picked.
- **No effect on mastery.** `concept_states` is untouched by this module. A
  questionnaire cannot make a learner look competent.
- **No inference from labels.** INTJ, Enneagram and "Spark" are stored as labels.
  No recommendation reads them yet, and none may treat them as a ceiling.
- **No scheduling, quests or XP.** Those are stages 2–5.

### Evidence

- Backend: `tests/test_profile.py`, 24 tests; the whole suite is **163 passed**.
- Frontend: `src/profile.test.ts` (9 tests, the form's blank-vs-zero logic) and
  `src/profile.ui.test.tsx` (10 tests, the screen rendered in jsdom); the whole
  suite is **43 passed**, and `npm run build` type-checks and bundles.
- Live, against a real SQLite database: baseline load, an invalid write rejected
  with a readable reason, an archived row leaving the evidence but staying in the
  history, and two accounts unable to see each other's records.

### Not verified

The Profile screen is rendered for real in jsdom (`src/profile.ui.test.tsx`), which
is enough to prove the zero-versus-missing distinction reaches the screen and that
a blank field never becomes a zero. It has **not been seen in a browser** — this
environment has none — so layout, focus order and contrast are reasoned about
rather than observed. Nothing here is asserted from a screenshot, because there
are none.

## Exercise for stage 1

**It does not need a deployment.** The whole exercise runs locally: two commands,
two ports on the same machine, no Vercel, no domain, no DNS.

```bash
cd apps/tessera/backend  && python3 -m pip install -r requirements-dev.txt \
  && python3 -m alembic upgrade head && python3 -m app.seed \
  && python3 -m uvicorn app.main:app --port 8024
cd apps/tessera/frontend && npm install && npm run dev     # http://localhost:5197
```

Register any address and password (12+ characters) — it is a local database.
To see the transcribed baseline as well, set `TESSERA_DEMO_BASELINE=1` before
starting the API and restart it; that is the demonstration path, not the default.

1. Sign in, open **Profile**. Every axis should read *no score* — a brand-new
   learner has nothing, which is the correct starting state.
2. If you enabled `TESSERA_DEMO_BASELINE=1`, press **Load the baseline I supplied**.
   Nine axes should show a score and **Self-management** should still read
   *no score*. Leave it disabled and skip to step 3: entering your own result must
   work just as well.
3. Find **Reference** in Learning processes. It must show `0 / 100` — a score —
   while Self-management shows an absence. If those two ever look the same, the
   build is wrong.
4. Add an assessment of *your own*: iCanStudy dimensions, Retrieval = `61`,
   dated today. The axis should read `61 / 100` with the older `43` still in the
   history. Then try an impossible value (`140`) and notice the field itself
   refuses it — it is bounded to the instrument's scale, so the browser catches it
   before a request is made. The server enforces the same rule independently, and
   says so in a sentence rather than a stack trace:

   ```bash
   curl -s -b cookies.txt -X POST http://127.0.0.1:8024/api/profile/assessments \
     -H 'content-type: application/json' \
     -d '{"instrument":"icanstudy-dimensions","scores":[{"axis":"dimension","name":"retrieval","value":140}]}'
   # {"detail":"Retrieval is 140, outside this instrument's scale of 0–100"}
   ```
5. Retire the `61` row with a reason. The axis must fall back to `43` — not to
   zero, and not to blank.

**How it is assessed:** pass means the ten axes are distinguishable as *scored*,
*supplied zero*, and *never supplied*; an out-of-scale value is refused with a
sentence a person can act on; and a retired assessment leaves the history intact
and the previous score in force. Report anything that looked wrong — a UI claim the
API does not back is a defect, not a nitpick.

**Next milestone (on your acknowledgement):** stage 2 — subjects, topics and
concepts with typed relationships, a session log with an objective and a stopping
condition, and reference notes with search. That is where the learner stops being a
profile and starts producing evidence.
