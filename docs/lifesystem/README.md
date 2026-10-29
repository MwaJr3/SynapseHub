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
| 2 | Software: knowledge and sessions | Learner-authored concepts, typed relations, session log, notes + search | **done** |
| 3 | Software: retrieval + review scheduling | Four retrieval formats, append-only attempt history, explainable queue, recovery plan, measured scheduler | **done** |
| 4 | Software: competency and analytics | Evidence separated from mastery, reassessment, explainable gaps, PostgreSQL invariants executed | **done** |
| 5 | Software: quests, XP ledger, seasons | Idempotent XP, anti-farming, recovery mode, anti-obsession controls | **done** |
| 6 | Software: hardening | Export/delete, accessibility pass, migrations, production build | **done** |
| 7 | Learner development (the document's Phase I) | Learner model, dimensions, processes, technique groups A–I, personal protocol | **done** |
| 8 | Learning-system design (the document's Phase II) | Lifecycle, priority heuristic, competence model, experiment protocol | after acknowledgement |
| 9 | Gamification rules (the document's Phase III) | Operational definitions and safeguards, if stage 5 needs revising by them | |

Stages 1–6 are the software. The document's own Phase IV–VI work is largely
supplied by the prompt, which is what makes building first possible at all.


## Stage 6 — the exit door, the accessibility pass, and a build that can be deployed

Stages 1–5 all asked the learner to put something in. Stage 6 is about the two
questions that decide whether that was fair: *can I get it out?* and *can anyone use
this, or only someone like me?*

### Export and delete

**Derived, not listed.** The tables that hold a learner's rows are read from the
schema: every table with a foreign key to `users.id` (19 of them), plus rows reached
through a parent that always names a learner — `assessment_scores` names an
assessment, and nothing on it names a person. A hand-kept list would be right once.
Three tests keep it honest: every learner-owned table must cascade from `users`; every
table in the database must belong to one of three groups (owned, indirectly owned,
shared catalogue), so a new table cannot be silently outside the story; and after a
deletion no table in any group may still hold a row.

**What is withheld, and said out loud.** The export omits the password hash, the
digests of access tokens and authorization codes, and `session_tokens` entirely — a
file that can sign in as you is not an archive, it is a liability. The manifest lists
a row count per table so an empty table is visibly empty rather than missing, and
every omission is named with its reason inside the file.

**Deletion is hard, and checked afterwards.** Sessions go first, then the account;
the cascade removes the children; then the same schema-derived set is queried again
and the request fails loudly if anything survived. The confirmation is the account
email typed by hand plus the password — a checkbox is one misfired click away from
erasing a year of work.

### The accessibility pass

Recorded in full in `docs/a11y/tessera-2026-10.md`, including what could not be
checked. Eleven screens and the app shell are swept with axe (WCAG 2.2 A/AA plus
best-practice rules) in jsdom; contrast is computed from the tokens that ship, since
jsdom cannot composite colours. The pass found and fixed real defects: form borders at
1.29:1, no `h1` anywhere, a title that never changed between screens, focus left on
the navigation after a section change, board squares at 2.86:1, a move marker at
1.51:1 on the dark squares, and two custom properties that were read but never
declared — one of which made a bordered panel on the consent screen invisible.

**The limit is stated rather than papered over:** there is no browser and no screen
reader in this environment. No visual rendering, no assistive-technology run, no
200% zoom or 320 px reflow, no observed reduced-motion behaviour. Those are listed as
gaps.

### The production build

One image, one origin: Node compiles the frontend, Python runs the API and serves the
build, so the session cookie is first-party and CORS never applies in production. The
start command is `alembic upgrade head && python -m app.preflight && uvicorn` — the
preflight **refuses** an unsafe configuration (SQLite in production, a localhost
origin, a missing schema, an absent curriculum, a `SameSite=None` cookie without
`Secure`) and exits instead of serving. `docs/DEPLOYMENT.md` has the rest.

The schema stays the migration history's: stage 6 added no revision, `alembic check`
reports no drift on either dialect, and the suite runs green on both. The image and
`docker compose up` were **not** executed here — no Docker daemon — and the Dockerfile
is checked by tests that read it, not by a build.

### Exercise — stage 6

1. Sign in, do a review, write a note, then open **Profile → Your data** and download
   the file. Search it for your password, your session cookie's value, and any other
   learner's email. None should be there.
2. Compare the manifest with the "N records would be removed" line under the delete
   card: the numbers should agree, except for the session row, which is deleted and
   never exported.
3. Type your email with one character wrong and a wrong password. The button stays
   disabled for the email; with the right email and a wrong password the server
   refuses, and nothing is removed.
4. Delete the account. The sign-in screen says the account was erased. Sign in with
   the old password: refused. Register the same email again: allowed, and the new
   account starts empty while the curriculum is still there.
5. Run `python3 -m app.preflight` against a local database and read the failures on an
   empty file; then set `TESSERA_PRODUCTION=1` with SQLite and watch it refuse.

**How it is assessed:** pass means the file is complete and credential-free, the
counts agree with what is deleted, a refusal changes nothing, a deletion leaves no row
in any table the schema says is the learner's — directly or through a parent — and the
preflight stops a configuration that would be unsafe for real learners. Report
anything that looked wrong, especially anything the export claims to include that you
cannot find in it.

**Milestone after this:** stage 7 — learner development, the document's Phase I:
the learner model, the five dimensions, the five processes, the technique groups, and
a personal protocol built from them.

## Stage 7 — learner development, the document's Phase I

Stages 1–6 built a place to keep evidence. Stage 7 is the first stage about the
person producing it: what the diagnostic actually said, what is still unknown, and
what to do about the gaps. Everything here is under **Development** in the product.

Four rules decide the shape of it, and the tests exist because each one is easier to
break than to keep.

### A hypothesis is not a finding

The instrument reported scores. It did not report conclusions, and the page refuses
to present one as the other. Each of the ten areas — five dimensions, five
processes — carries either a recorded claim or an explicit statement that it is
unmeasured, and each claim shows:

- what the learner wrote, and why it was worth writing;
- what would **support** it and what would **contradict** it, fixed before evidence
  arrives;
- a confidence label that is *computed* from the evidence actually present —
  `none`, `low`, `moderate`, `high` — with the reason printed beside it.

The policy is a policy, not a psychometric result, and it says so: a supplied score
alone is `low`; a score plus one kind of recorded behaviour is `moderate`; a score
plus two, or three behavioural kinds without one, is `high`. When new evidence
arrives the label recomputes by itself. That is the document's *"update it after
practice"*, implemented literally rather than as an instruction to be obeyed.

Marking a claim `supported` requires a sentence saying what moved it. Without one it
is a conclusion nobody can review.

### Self-management gets a baseline, not a percentage

The diagnostic never scored it, and the document is explicit: establish a
behavioural baseline *"without inventing a percentage."* The product therefore asks
for nine statements on a four-point frequency scale and one **timed observation** —
planned minutes, actual minutes, minutes from intending to start to starting,
interruptions, re-entry time, and whether the objective was met.

What comes back is prose and counts:

> 3 of 9 statements were answered 'most days' or 'every day'; 1 was answered
> 'never'. … In the observed session you planned 40 minutes, worked 25, started 18
> minutes after intending to, and were interrupted 2 time(s) … The objective was not
> met. No score is calculated from these answers, by design.

There is no score column in the database, no percentage in the payload, and a test
asserts the `%` character never appears. A second baseline compares itself with the
first in words, which is the only comparison nine opinions can honestly support.

### The curriculum covers every topic, and proves it

Twenty-four lessons carry the document's fifty-eight topics — every one, exactly
once — across technique groups A–I, plus the five dimensions and five processes.
Each lesson has the eight things the document asks for: a plain-language model,
when to use it, when not to, a worked example, an exercise, how to judge the result,
the common traps, and a retrieval check for a later session.

The partition is a test, not a claim. `test_every_declared_topic_is_covered_exactly_once`
fails if a topic is dropped or claimed twice, so "all topics covered" survives the
next edit to the file.

### Nine names, no invented definitions

The source material names AIM, Bear Hunter System, VPReFRE criteria, GRINDE maps,
PEER-Peer, OFF-rest timing, the survive-and-thrive filter, order control and the
Huddle framework — and defines none of them. Each is listed as **undefined**, with
the learning problem it appears to address and an openly supported alternative that
can be used today. There is no field for a definition, so a fabricated one has
nowhere to live, and a test asserts the field stays absent.

### The protocol, and the plan to test it

The personal protocol takes the twelve components the document lists — preparation,
time-boxed priming, encoding, reference-note rules, retrieval and error correction,
review scheduling, overlearning criteria, attention and recovery, reflection, the
weekly audit, the monthly review, and how to compare techniques — plus one worked
example for each of the four material types: factual, conceptual, procedural and
application-heavy.

Nothing is prefilled. A protocol written by the assistant would be the assistant's.

Experiments carry the honesty rule into the interface: an outcome of `supported` or
`no_change` is refused below five comparable cases, with a message that says why.
Below that threshold the observation is still recorded — as `weak_signal`, because it
is worth keeping and it is not a conclusion.

### The Phase I gate

`GET /api/development/gate` reports the seven deliverables and what is outstanding
against each. It does not lock anything: work happens in any order, and a locked
screen would be a worse teacher than a list.

One requirement is deliberately hard to satisfy. *"Every supplied diagnostic score is
explained"* would be vacuously true for a learner who supplied none, so the gate also
requires that at least one score exists. A learner without diagnostic results has a
real gap, and the gate says so rather than passing them.

### Exercise — stage 7

1. Open **Development → Learner model**. Without a diagnostic loaded, every area
   reads *Not measured*. Record a claim for Retrieval; note that confidence is
   `none` and says why.
2. Record the self-management baseline. Search the response for a score. Then answer
   it a second time with different answers and read the comparison — it is prose,
   because nine opinions cannot support a number.
3. Open **Curriculum → Named methods** and confirm all nine read *undefined*. Try to
   find a definition anywhere in the payload; there is none.
4. Work through one lesson: mark it studied, then practised, then submit the retrieval
   check having ticked only some criteria. It should not pass. Tick the rest and
   submit again.
5. Design an experiment with a measure, then try to record the outcome as `supported`
   with a sample size of one. Read the refusal, then record it as `weak_signal`.

**How it is assessed:** pass means no area invents a score, self-management has no
number anywhere, every named method is still undefined, a retrieval check that misses
a criterion does not pass, and the gate reports outstanding work honestly. Report
anything that looked like a conclusion the evidence does not carry.

**Next milestone (on your acknowledgement):** stage 8 — the document's Phase II, a
learning-system design: the fourteen-step lifecycle, a priority heuristic, a
competence model and an experiment protocol.

## Stage 5 — quests, an idempotent XP ledger, seasons

Stage 4 made the evidence inspectable. Stage 5 is the first thing in the product that
gives a learner a number for it — and the first place where a badly built reward system
would do real harm, because a reward that can be farmed, or that punishes absence,
changes behaviour rather than describing it.

The document specifies the formula, the level curve and the invariants. Stage 5
implements the formula and the invariants and **stops there**: no levels, no badges, no
leaderboard, no streak.

### What was built

Seven quests, each naming the concepts whose recorded attempts are its evidence. A quest
has to be accepted, then its evidence has to arrive, then it can be completed, then it
can be claimed — and each of those steps is refused with a sentence that says which one
is missing:

```
POST /api/quests/{slug}/accept        take it on
POST /api/quests/{slug}/complete      409 until the evidence exists
POST /api/quests/{slug}/claim         Idempotency-Key header; awards once
GET  /api/quests                      state, evidence have/need, guardrails
GET  /api/xp                          totals, today's limits, the last five awards
GET  /api/xp/ledger                   append-only, with every factor
GET  /api/seasons/current             the derived window and what it has paid
```

### Two decisions the stage turns on

**Evidence is counted, not declared.** A claim re-counts the attempts recorded since the
quest was accepted, in the tables stage 3 already wrote. There is no `completed = true`
column a client can post. This costs a little performance on a claim and buys the one
property that matters: the ledger cannot say that practice happened when it did not.

**The anti-farming rule lives in the schema, not only in the handler.** A unique
constraint on `(user_id, quest_id, season_id)` and another on
`(user_id, idempotency_key)` mean that two concurrent claims — the case a state column
cannot cover, because both requests read the same state before either writes — fail at
the database. The API catches the violation and answers 409 instead of a 500.

### The design cost this stage paid

- **A cap can pay zero for real work.** Past `TESSERA_XP_DAILY_CAP` an entry is written
  with `xp = 0` and a reason. That is honest and auditable, and it is also a strange
  thing to see; the alternative — silently dropping the claim — would make the ledger
  disagree with the learner's memory of the day.
- **The formula is a product rule, not a measurement.** The factors come from the
  design document, not from data about what motivates anyone. Every award stores the
  factors that produced it, so a revision can be reasoned about against history instead
  of retroactively rewriting it.
- **Seasons partition, they do not reset.** An id derived from the clock means no
  scheduled job has to run at midnight, and a season that was never created on time
  still comes out right. The cost is that the anchor is a constant in the code rather
  than a table an operator edits.

### Exercise — stage 5

With the two servers running and an account that has done at least one review:

1. Open **Quests** and accept `exception-drill`. The claim button does not exist yet;
   "Mark complete" is disabled and says how many of the three pieces of evidence are
   missing.
2. Answer three prompts on `py.exceptions` from the **Review** screen, then press "Mark
   complete" — it succeeds now. Claim it, and read the "Why:" line: base, difficulty,
   challenge, strategic value and evidence, with the arithmetic.
3. Claim it again with the browser's network panel (resend the request). The response
   says `created: false` and the total does not move.
4. Claim a *second* quest that uses the same concept and check the reason says
   `diminishing return ×0.6`.
5. Run a session of more than 120 recorded minutes (or set
   `TESSERA_MAX_DAILY_MINUTES` low in the environment) and try to claim: 429, with a
   message that says nothing was lost.

**How it is assessed:** pass means a claim cannot precede its evidence, a retry cannot
duplicate an award, a second claim in the same season is refused by name, the ledger
explains every number it contains, and no route exists that can move a learner's XP
backwards or erase an entry. Report anything that looked wrong — a total that moves
when the reason says it should not is a defect, not a rounding difference.

## Stage 4 — competency, and a database that enforces what it says

The document asks for a competence model and for analytics a learner can act on.
The trap in both words is the same: a single number that sounds authoritative and
cannot be argued with. Stage 4 is built to avoid producing one.

### Evidence and mastery are two different things

| | What it answers | Where it lives | Can it be stale? |
| --- | --- | --- | --- |
| **Evidence** | what have I actually demonstrated, and how recently? | computed on read from `retrieval_attempts` + `attempts` | yes — it fades, by design |
| **Mastery** | what does the scheduler predict I can recall? | `concept_states.mastery` | yes — it only moves on graded evidence |

Both are shown on every row and neither is derived from the other in the display
layer. The rules are exported constants in `app/competency.py`, not magic numbers
buried in a component:

- **no evidence → `None`.** Not `0.0`. A concept nobody has answered is
  *unmeasured*; calling it weak is an invented claim, and including it in an
  average drags the average toward a value nothing supports. The API returns
  `score: null`, and the screen draws an em dash.
- **half-life of 30 days.** Each observation contributes
  `evidence_weight × 0.5^(age/30)`. Weight is 1.0 server-graded, 0.5 self-graded,
  so the stage 3 distinction survives into the analytics.
- **`secure` = 3.0 weighted observations at ≥ 0.80, with ≥ 1 server-graded.**
  `developing` = 1.5 at ≥ 0.60. Everything else with evidence is `emerging`.
  Four perfect self-graded recollections therefore reach `developing` and stop.
- **disagreement is shown, not averaged.** If the stored mastery is more than 0.25
  from the weighted score, the row says which way it points and by how much. The
  honest reading of "mastery 0.93, recent answers 0.40" is *the model is
  optimistic; the next review settles it*, not "competency 0.66".

### Gaps, in the only form a learner can use

"Retrieval: 43" is a grade. It tells a learner nothing to do. Every gap here is a
record with `kind`, `severity`, `reason` (containing the numbers), and `action`:

| kind | what it means |
| --- | --- |
| `no_evidence` | nothing practised — unmeasured, not weak |
| `thin_evidence` | some evidence, below the developing bar; self-graded only by construction |
| `weak` | weighted score below 0.60, with the count and the score named |
| `self_graded_only` | every observation was judged by the learner; nothing checked against the source |
| `stale` | newest observation older than 45 days |
| `optimistic_mastery` | stored mastery above the answers, with the gap |
| `unmeasured_axes` | baseline axes with no score — listed, with the instrument that would fill each |
| `stale_report` | a baseline older than 120 days: dated, not wrong |

The ten unscored axes of a fresh account are reported as **one** gap that lists
them, because ten identical rows would push every piece of practice evidence off
the screen. `gaps_total` still counts everything.

**Calibration** is computed from the confidence recorded before each
multiple-choice answer against what happened: accuracy, mean confidence, the signed
gap, and per-level buckets. Retrieval attempts have no confidence, so they cannot
contribute — the payload says that instead of returning an empty chart.

### Reassessment: a successor row with a diff, never an edit

The profile's append-only rule had a missing half: how do you record a *newer*
result for the same instrument? `POST /api/profile/assessments/{id}/reassess`
answers it:

- the new submission is a **successor**: `assessments.supersedes_id` points back,
  and the prior row is archived with the reason "Superseded by reassessment …";
- the response contains a per-axis **diff** (`previous`, `value`, `delta`,
  `direction`) and a summary;
- **missing stays missing**: a delta exists only where both sides supplied a
  number, so a blank axis is `missing` or `withdrawn` — never "0 → 43, +43";
- the chain is **linear by constraint**: `supersedes_id` is `UNIQUE`, so a second
  reassessment of the same row is a 409 that names the current row, while
  reassessing the successor works;
- the **instrument belongs to the prior row**; a reassessment cannot silently
  change what is measured.

`GET /api/profile/assessments/{id}/history` returns the whole chain with the diff
between each pair.

### The database rules, actually executed

The stage was requested with PostgreSQL as the target and the database rules taken
seriously, so this is where "PostgreSQL path" stopped being a claim about DDL:

| Before | Found by | Fixed |
| --- | --- | --- |
| five list columns were `json` | inspecting `information_schema` on a real server | `jsonb`, via `JSON().with_variant(JSONB(), "postgresql")` and `USING …::jsonb` |
| **zero** CHECK constraints | `select count(*) from pg_constraint where contype='c'` | 21 named checks: score ranges, relation vocabulary, status vocabulary, grader, `reported_by`, scale order, self-supersede |
| no composite indexes for the due queue or history | reading the queries the product runs | 5: `(user_id, next_review_at)`, `(user_id, created_at)` ×2, `(user_id, started_at)`, `(user_id, updated_at)` |

Executed against PostgreSQL **16.2** on a unix socket (`pgserver`, no Docker): all
four revisions applied in order, `alembic check` reported no new operations, the
seeder ran, the full backend suite passed (**315 tests**, live-server file
included), `downgrade -1` → `upgrade head` round-tripped, and a raw `INSERT` of
`score = 1.4` was refused by `ck_retrieval_score_range`.

`tests/test_schema_integrity.py` keeps that honest on both dialects without needing
a server: it writes a mastery of 1.5, a self-graded score of 1.4, a zero evidence
weight, an unknown relation, an unknown grader, a reversed scale, a
self-superseding assessment and a two-successor fork, and requires the database to
refuse every one. Deleting a concept must take its `concept_states` with it — which
on SQLite only works because `PRAGMA foreign_keys=ON` is set per connection.

### The design cost this stage paid

- **Two numbers on every row is more work to read.** A single blended score would
  be tidier and would answer neither question properly. The screen states what each
  number is for, and the policy sentence is served by the API so the client cannot
  drift from the rule.
- **No stored competency table.** Every verdict is recomputed from the
  append-only evidence. That costs a few queries and buys the guarantee that a
  verdict cannot disagree with the attempts it claims to summarise.
- **Thresholds are a policy, not a measurement.** They are exported, shown on the
  screen and marked as unvalidated against real learners in the README. Changing
  them changes every verdict, which is exactly why they are not scattered through
  the code.

### Exercise — stage 4

With both servers running (`python3 -m uvicorn app.main:app --port 8024` in
`backend`, `npm run dev` in `frontend`):

1. Sign in to a fresh account and open **Competency**. Every concept must read
   *Not measured* with an em dash, and the page must say that nine unmeasured
   concepts are not being averaged. There must be **no 0%** anywhere on the page.
2. Answer one question correctly, then reload. That concept becomes `emerging`
   (or `developing`): one observation is 1.0 weighted. Its *stored mastery* and its
   *weighted score* are two different numbers — check that they are labelled
   separately and that neither has been blended.
3. Practise the same concept with **Write it all out**, ticking nothing. The new
   observation must appear at weight **0.5** and say *you* graded it; the
   `self_graded_only` gap must appear.
4. Open **Profile**, load the supplied baseline, and reassess the dimensions
   instrument with retrieval `61` and everything else unchanged. The diff must show
   `retrieval 43 → 61 (+18)` and `self_management: still not supplied` — never a
   delta of 0 for the axis nobody scored. The old row must move to *Retired*,
   marked *reassessed*.
5. Reassess the row you just created, then try to reassess the **original** row
   again. The second attempt must be a 409 that names the current submission.

**How it is assessed:** pass means an unmeasured concept is never presented as a
weak one; the evidence and the model are both visible and separately sourced; a
missing score never becomes a zero in a diff; and the schema refuses bad data even
when the request bypasses the API. Report anything that looked wrong — an
interface claim the API does not back is a defect, not a nitpick.

**Next milestone (on your acknowledgement):** stage 5 — quests, an idempotent XP
ledger, seasons, and the anti-farming and anti-obsession rules the document
specifies before any reward exists.

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

## Stage 3 — retrieval practice and a schedule a learner can argue with

The diagnostic this product is built around puts retrieval at 43/100 and
reference — keeping notes to look things up later — at **0%**. Stage 2 built the
notes. This stage builds the thing the report says is missing, and the evidence to
go with it.

### Four ways to find out what someone can produce

| format | what the learner does | graded by | evidence weight |
| --- | --- | --- | --- |
| `multiple_choice` | picks an option | the server | 1.0 |
| `cloze` | fills one blank from a sentence in their material | the server | 1.0 |
| `cued_recall` | writes an answer to a cue, then ticks the source lines they produced | themselves | 0.5 |
| `free_recall` | writes everything they remember, then ticks what they produced | themselves | 0.5 |

Free recall is the format the diagnostic is actually about, and it is also the one
that cannot be graded automatically without a model — which would mean a model
deciding whether the learner was right. So the learner judges themselves **against
lines quoted from the source**, never against generated criteria, and that attempt
counts half. They can cheat their own schedule; they cannot make the system claim
they were tested.

Self-grading is not decoration: `srs.schedule` takes an `evidence_weight`, so a
self-graded success grows stability by **half** of what a server-graded success
would, and a self-graded failure still costs. The property is tested both
directions.

### The prompt is rebuilt, not stored

`prompt_id` encodes the concept, the format and a seed. The GET returns the
prompt; the POST rebuilds it from the same three values and grades against the
source. Nothing is held between the two requests, so a restart, a second worker or
a tab left open overnight all behave identically — and because the answer key is
never sent before the answer, the exercise cannot be done by reading it off the
screen.

### The queue explains itself

Every due item carries the numbers the ordering used — predicted recall, stability,
days overdue, lapses — and a sentence for each. `tests/test_practice.py` asserts
those sentences exist rather than trusting the UI to be nice.

Recovery after a gap is a **throughput policy, not a punishment**: past eight
overdue reviews, today's plan is six of them, most-forgotten first, and the rest
keep their real due dates and come back over the following days. Nothing is reset,
no mastery is taken, nothing is hidden — the full backlog stays in the response.
Measured live: 10 overdue → `today 6`, `remaining 4`, `spread 1`, with that
sentence attached.

### Is the schedule better than "review weekly"?

Not on faith. `python -m app.evals.recall_eval` simulates learners whose memory
follows a **different** model from the scheduler's (exponential decay with
per-item half-lives and noisy outcomes), gives every strategy the same review
allowance, and measures retention at probes:

```
strategy    recall  reviews  per item
tessera      0.756     2200      11.0
fixed_7      0.430     2200      11.0
fixed_30     0.121      600       3.0
never        0.073        0       0.0
broken       0.073      200       1.0
```

At equal cost, placement of reviews is worth about **1.76×** the retention of a
fixed weekly interval. `broken` (schedule ninety days regardless) is the control
and must stay below the threshold the real scheduler passes, at two different
seeds.

**The honest headline is not 0.9.** The scheduler targets 90% retention and reaches
76% under this simulated learner, because the two models disagree — which is the
point of using a different one. The number to trust is the comparison, not the
absolute; a real calibration needs real learners, and this product does not have
any yet.

### The design cost this stage paid

Storing attempts meant touching the learner model's one update path. Rather than
letting quiz answers and retrieval practice drift apart, `learner.record_attempt`
was split: the quiz path writes its row and calls `apply_evidence`; practice writes
a `RetrievalAttempt` and calls the same function. Two paths would have produced two
memories of the same concept, and the divergence would have been invisible until
someone noticed their interval growing at the wrong rate.

Sessions now report `evidence_summary` — how many attempts were made inside them,
and how they were graded — while still awarding nothing themselves. The container
and the evidence stay separate.

### Exercise — stage 3

With the servers from stage 1 running:

1. Open **Review** as an account that has answered at least one question.
2. Answer a cloze with a wrong word. Note that the expected term appears **after**
   you answer, and that the next review is six hours away, not tomorrow.
3. Answer the same prompt correctly. Note the interval, and the sentence in the
   answer saying it was server-graded.
4. Switch to **Write it all out**. The source lines are hidden until you say you
   have finished. Tick two of five. Note that the attempt is marked "you graded
   this" and that the interval grew less than the server-graded one did.
5. Compare two attempts on the same day: one server-graded success, one
   self-graded success. The reasons line in each response states the weight.

**Assessed on:** whether the answer key was genuinely absent before submitting,
whether a self-graded success produced a shorter interval than a server-graded one
from the same state, and whether an empty tick list was accepted as a real zero
instead of being blocked by the form.

## Stage 2 — what the learner adds themselves

Stage 1 held what an instrument said about a learner. Nothing yet held what the
learner *did*, so the knowledge graph was a fixed curriculum of ten seeded
concepts and every support for deliberate practice had nowhere to write.

**Concepts belong to someone.** `concepts.owner_id` is NULL for catalogue material
and a learner id for a concept they authored. That column is the whole visibility
model, and it is applied in one function (`app.library.visible_concepts`) called by
the knowledge bank, the map, recommendations, the daily plan, goals and the tutor's
retrieval. A private concept that surfaced in another learner's answer would be the
worst bug this product could have, so it is tested through HTTP: the second
learner's guessed ids are 404s, their note search returns nothing of the first's,
and their `map` has none of the first's nodes or edges.

**The catalogue is read-only.** Seeded concepts are shared; one learner's edit
would silently change everyone's curriculum, so editing or deleting one answers
403 and names the reason.

**Relations are typed, and only one of them changes behaviour.** Eight relations,
of which `prerequisite` gates recommendations; the rest describe how the learner
thinks about the ideas (`contrasts_with`, `example_of`, `evidence_for`…). A
learner-authored prerequisite cycle is refused with 409, because a cycle makes the
gate unsatisfiable — each concept would wait for another member of the loop. A
soft relation may loop freely. Repeating a relation is idempotent rather than a
duplicate arrow, and an existing catalogue relation is not copied.

**A note is not evidence.** Notes are tied to a concept, searchable, and cited as
*"Your own note"* when the tutor retrieves them. They never touch `concept_states`.
That separation is the reference gap made structural: writing things down feels
productive, changes nothing about what the system believes you can do, and the
interface says so in as many words.

**Sessions have a beginning and an end, and both matter.** A session requires an
objective and a stopping condition before it starts — time without them is not
practice — and a session you worked in requires one line of reflection before it
closes. An abandoned session does not, because the point is not to punish stopping.
One open session per concept, so work is resumed rather than duplicated after an
interruption; closed sessions are records and cannot be edited. No XP is awarded:
XP belongs to stage 5, where the anti-farming and idempotency rules live, and
inventing it now would mean inventing those rules now.

### Two database facts this stage forced into the open

1. **SQLite was not enforcing foreign keys.** `ON DELETE CASCADE` is a no-op there
   unless `PRAGMA foreign_keys=ON` runs per connection, so deleting a concept
   deleted nothing downstream — while the same delete in PostgreSQL would have
   cascaded. The pragma is now set for every SQLite connection and two fixtures
   that had relied on the lax behaviour were corrected.
2. **Alembic's SQLite batch mode cascaded into children.** Adding a column to
   `concepts` rebuilds the table (create copy, copy rows, drop original, rename),
   and with foreign keys enforced that `DROP` fired `ON DELETE CASCADE` into
   `concept_edges` *before* the copy into the rebuilt table — silently emptying the
   graph on any database that had one. Enforcement is now suspended for the
   duration of a SQLite migration and `PRAGMA foreign_key_check` confirms the
   result has no dangling references. PostgreSQL never rebuilds, so this bug was
   invisible on the deployment target and would have destroyed data at home first.
   Both facts have tests (`test_migrations.py`) that run the real history.

### Exercise — stage 2

Still local, no deployment. With the two servers from stage 1 running:

1. Open **Library**. Add a concept of your own — something you are actually
   learning now, not an example.
2. Write one note on it that you would genuinely want to look up in a month, with
   its source.
3. Search the note by a word from its body. The result should say which words
   matched, and a word only in the title should rank higher than one only in the
   body.
4. Start a session on it: an objective and a stopping condition. Record one
   activity, then try to finish it with no reflection — the server should refuse.
   Write a line, finish it.
5. Delete your concept. The first attempt should *refuse* and tell you how many
   notes and sessions would go with it; confirming should remove them.
6. Sign in as a second account and confirm none of it is visible — not the
   concept, not the notes, not the session, not the relation.

**Assessed on:** whether the first delete really refuses (nothing destroyed by a
stray click), whether a second account sees an empty library and gets 404s for the
first account's ids, and whether the session refused to close without a reflection.

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
cd companies/tamuzi/tessera/backend  && python3 -m pip install -r requirements-dev.txt \
  && python3 -m alembic upgrade head && python3 -m app.seed \
  && python3 -m uvicorn app.main:app --port 8024
cd companies/tamuzi/tessera/frontend && npm install && npm run dev     # http://localhost:5197
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

**Next milestone at the time (now built):** stage 2 — subjects, topics and
concepts with typed relationships, a session log with an objective and a stopping
condition, and reference notes with search. That is where the learner stops being a
profile and starts producing evidence.
