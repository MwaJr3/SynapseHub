# Tessera — adaptive learning engine

A Tamuzi Learning product. Tessera is built around one abstraction the rest of
the product hangs off: **a knowledge graph plus a learner model**. Lessons,
questions, reviews and chess puzzles are all just evidence feeding that model.

It is not a course catalogue with a progress bar. A learner is never told "you
completed this"; they are told what they are likely to still remember, what is
decaying, what is weak, and — with a reason attached — what to do next.

> **Status: built and tested locally. Not deployed.** Nothing here is presented
> as a live service. Screenshots are pending capture rather than fabricated.

## What actually works

| Area | Behaviour |
| --- | --- |
| Accounts | Register / sign in / sign out. scrypt password hashing, DB-backed cookie sessions with expiry, per-learner data isolation (tested). |
| Learner profile | Diagnostic results are stored as reported, with instrument, reporter and date. A score that was never supplied stays missing and is never shown as zero; a supplied 0 stays a 0. Assessments are append-only, can be retired with a reason, and can be **reassessed**: the new submission becomes a successor row, the old one is archived, and the difference between them is shown with the provenance of both. Nothing here touches mastery. |
| Competency | Per concept, the evidence (graded attempts, faded by age) and the scheduler's mastery are computed and shown **side by side, never merged**. A concept with no attempt is `no_evidence` with a `null` score — not zero. Every gap states its reason, its numbers and the action that closes it. |
| Knowledge graph | 10 concepts across Python, Chess and Security, with typed `prerequisite` edges. Two endpoints expose it: a flat map and a per-concept view. |
| Learner model | Per-concept mastery, memory stability, difficulty, review count and lapse count, updated only on graded evidence. |
| Scheduling | A stability-based memory model (see below), not "correct → tomorrow". |
| Recommendations | Ranked, prerequisite-gated, and **every recommendation carries its reasons**. |
| Daily session | One new concept, due reviews, a weak area — composed from real state, adapting to the minutes you say you have. Empty state is honest. |
| Practice | Multiple choice with server-side grading, explanation and the specific misconception a wrong answer reveals. |
| Knowledge bank | Mastery per concept, decayed by what is likely to still be recalled, grouped by subject. |
| Chess | Click-to-move board with **real legal-move validation** via `python-chess`; the solution line is never sent to the client. Solving a puzzle is graded evidence and feeds tactics mastery. |
| Chess openings | A 10-line ECO reference with **position-based matching**, so transpositions resolve to the same opening. Every note is original. |
| Puzzle import | The Lichess puzzle database (CC0) can be imported with `python3 -m app.lichess_import`; provenance and licence travel with each puzzle. |
| Content catalogue | MIT OCW and OpenStax material is **catalogued and linked, never copied**, because their licences (and terms) do not permit redistribution here. |
| AI tutor | Grounded retrieval works with no model at all. The streamed conversation appears only when a model is configured, and says so honestly when it is not. |
| Provenance | Every piece of material records source, author, licence, attribution and retrieval date; a licence gate decides full use / reference only / refuse. |
| Quests and XP | Seven quests whose evidence is real recorded work; an append-only ledger that stores the factors behind each award; seasons derived from the clock; diminishing returns, a daily cap and a rest pause instead of a streak. |

## The learner profile (Project LIFESYSTEM)

Tessera is also the home of PROJECT LIFESYSTEM — the learner's own profile,
evidence and (in later stages) sessions, retrieval and progression. The build
orders the job software-first, which is a deliberate inversion of the master
prompt's own sequencing rule; the reasoning and the stage plan are recorded in
[`docs/lifesystem/README.md`](../../docs/lifesystem/README.md).

The first slice is the profile, and its whole point is a distinction most learning
products blur:

```
Reference (learning process)   =  0 / 100    a supplied score, kept as a score
Self-management (dimension)    =  —          never supplied, so never a number
```

A missing score is stored as `NULL` and reported as missing. It is never coerced to
zero to fill a table, and no average, composite or "learning quotient" is computed
over the ten axes — the source material warns that equal weighting of subscales is
unevidenced, so no weights are invented. Categorical results (MBTI, Enneagram,
learner archetype) are stored as labels, never as magnitudes, and none of them
affects what the system believes the learner can do.

Assessments are append-only: a wrong row is **retired with a reason** and stays in
the history, so a later review can see what the system believed and why. The
instrument registry (`backend/app/profile.py`) is the only door scores can come
through — an unknown instrument, an axis belonging to a different instrument, a
value outside the scale, or a non-finite number is a 422 with a readable message
rather than a stored mistake.

The baseline supplied with the project brief is transcribed verbatim in
`backend/app/profile_baseline.py` and loaded by an explicit button, not on sign-up.

## The memory model

`stability` is the interval in days at which the learner has a 90% chance of
recall. Recall probability follows a power curve:

```
R(t) = (1 + FACTOR * t / stability) ^ DECAY      FACTOR = 19/81, DECAY = -0.5
```

That pair is chosen so `R(stability) = 0.9`, which makes stability directly
interpretable and lets the retention target be configurable:

```
interval(R_target) = (stability / FACTOR) * (R_target ^ (1/DECAY) - 1)
```

A successful review grows stability more when recall had decayed (recalling
something you nearly forgot is stronger evidence than reciting something fresh);
a failed review contracts it and retries the same day with the same six-hour
step rather than pretending a lapse means "see you next week".

This is a simplified stability model **in the spirit of FSRS**, documented as
such rather than presented as a published algorithm. Every constant is named and
the properties that matter are pinned by tests.

## The recommendation score

```
score = goal_relevance·w1 + prerequisite_importance·w2 + forgetting_risk·w3
      + weakness_severity·w4 + learning_value·w5 − difficulty_mismatch·w6
```

Weights live in `app/recommend.py` (`Weights`) and are returned by the API so a
client can explain itself. Prerequisite gating is **not** part of the score: a
blocked concept is withheld and reports `blocked_by`, so the learner sees the
path instead of an unexplained absence.

## The licence gate

Free to read is not free to copy. `app/content.py` decides between `full`,
`reference_only` and `refused` from the recorded licence class. An unknown
licence is a **refusal**, not a maybe; a non-commercial licence (e.g. CC BY-NC-SA)
downgrades to reference-only when the deployment is marked commercial.

## The opening reference

Ten catalogued lines across six families, each with an ECO code, the move line in
both SAN and coordinates, and a one-paragraph idea written for this project. Two
lookups are supported:

- **By move line** — the longest exact prefix, plus the continuations that share it
  (e.g. a Classical Sicilian position also matches the Najdorf, and says so).
- **By position** — FEN, with move counters dropped, which is what makes
  transpositions collapse: `1.d4 d5 2.c4` and `1.c4 d5 2.d4` identify the same
  opening. This is proven by test, not asserted in prose.

Names and move lines are reference data. The Lichess opening explorer is recorded
as `LINK_ONLY` in the sources list: it is linked, never scraped.

## Importing content

Nothing external is bundled. Two importers exist for an operator who has obtained
the files legally:

```bash
# Lichess puzzles, CC0 — commercial use permitted
python3 -m app.lichess_import --puzzles lichess_db_puzzle.csv.zst --limit 500

# A catalogue of OpenStax / MIT OCW titles, as JSON supplied by the operator
python3 -m app.lichess_import --openings openings.json
```

The Lichess CSV stores the position *before* the opponent's setup move, so the
importer applies that move and gives the solver only the remainder. Puzzle rating
is mapped to a 1–5 difficulty and clamped. Imports are idempotent: re-running
reports `skipped_existing` instead of duplicating rows.

Licences that forbid this are not bypassed, and **rights are not the same as
possession**. Every catalogue entry records its real licence and also whether this
deployment actually holds a copy of the material. It does not: a catalogue entry is
a title, a publisher and a link. The gate therefore returns `reference_only` with a
reason that says the licence would permit reuse *if the material were obtained*,
and `assert_ingestible` raises for anything that is not `full`, so a link can never
be quietly promoted into content.

That matters because the licences differ. MIT OCW courses are CC BY-NC-SA by
default and vary per course; OpenStax titles are mostly CC BY, but their *site
terms* do not permit bulk harvesting. Khan Academy is deliberately absent: its
terms forbid building a competing service from its content. Only the Lichess puzzle
database — CC0, an explicit public-domain dedication — is actually imported.

## The AI tutor

The tutor is one shared module (`backend/app/ai/`) rather than a per-feature
chatbot, and it is built so that it cannot bluff:

- **Grounded retrieval** (`POST /api/tutor/search`) needs **no API key**. It scores
  curriculum text by token overlap, returns the passages with a citation, source
  URL and licence, and reports `generated: false`. It is presented as retrieval,
  not as an answer.
- **The conversation** (`POST /api/tutor/chat`) streams Server-Sent Events:
  `step`, then `citations`, then `delta` frames, then `done` — or `error` with
  `retryable`. The trace is bounded by a step budget (`MAX_TURNS`), so a looping
  turn is cut and reported rather than left to run. If
  no model is configured it returns **503** with
  `{"error": "tutor_not_configured", "missing": [...]}` and the interface does not
  render a chat box at all. An empty box that cannot answer would be a fake
  integration.
- **Instructions** constrain the model to retrieved material only, require a
  `(Concept: <title>)` citation for claims, forbid inventing mastery or progress,
  and refuse to hand over exam answers.
- **An ungrounded answer is flagged.** If the model answers without calling the
  retrieval tool, the turn reports `grounded: false` and the interface says the
  answer is unverified. A confident answer with no source is the failure this
  tutor exists to prevent, so it is surfaced rather than styled away.
- **Provider failure is reported, not hidden** — a failure mid-stream emits an
  error event with `retryable`, nothing is stored, and nothing is generated.
- **Threads are per learner.** Every read and write is scoped to the owner in the
  database; another learner's thread is a 404, never a read.

### Running the tutor for free

The tutor is **not tied to OpenAI**. Anything that speaks the OpenAI
chat-completions format can drive it, which means an operator can start today with
no card:

| Provider | `TESSERA_TUTOR_BASE_URL` | Example `TESSERA_TUTOR_MODEL` | Notes |
| --- | --- | --- | --- |
| **Hugging Face** | `https://router.huggingface.co/v1` | `meta-llama/Llama-3.3-70B-Instruct` | One token, many open-weight models; the same weights can be served locally later. Free monthly credits, then per-token. |
| **Groq** | `https://api.groq.com/openai/v1` | `openai/gpt-oss-20b` | Free tier, no card, very fast. Limits are per organisation. |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-flash-latest` | Free tier. The free tier may use prompts for training outside the EU/UK — a real problem for learner data. |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat-v3:free` | Only ids ending `:free` are free; modest daily cap; free providers may log prompts. |
| **Ollama (local)** | `http://127.0.0.1:11434/v1` | `qwen2.5:3b` | No account, no quota, no data leaving the machine. Needs the RAM. |
| **Ollama Cloud** | `https://ollama.com/v1` | a model your account can run | OpenAI-compatible, so only the two variables and an API key are needed. **Unverified here** — the build environment cannot reach `ollama.com`, so endpoint, model ids and account limits are unconfirmed. |
| **OpenAI** | *(unset)* | `gpt-4o-mini` (default) | No free tier. |

Then set `TESSERA_TUTOR_API_KEY` (any value for a local endpoint — it is ignored)
and restart. `GET /api/tutor/status` reports which provider is live; the
credential itself is never returned.

Quotas and terms change; the table is a starting point, not a contract. For a
commercial deployment handling learner data, the free tiers that train on prompts
are a licensing and privacy decision, not just a cost one.

### What is actually verified

The wiring is tested end to end **without any account**: `tests/stub_provider.py`
serves the same chat-completions wire format these providers use, and
`tests/test_chat_stream.py` drives a real streaming request through the real
route, store and agent. It asserts that the retrieved curriculum text reaches the
provider before an answer is produced, that citations arrive before the text,
that both turns are persisted for that learner only, and that a follow-up
replays the history. `tests/test_agent_loop.py` checks the same loop through the Agents SDK
directly, plus that an unreachable provider produces an error event and no
assistant text.

What is **not** verified is model quality: the stub's replies are scripted. That
part needs a real key on a machine with outbound HTTPS — the preview sandbox this
was built in can reach GitHub, npm and PyPI only, and every model provider is
blocked from it.

## Run it

```bash
cd backend
python3 -m pip install -r requirements-dev.txt
python3 -m alembic upgrade head     # the schema, from the migration history
python3 -m app.seed                 # idempotent: 10 concepts, 7 edges, 10 lessons, 20 questions, 3 puzzles, 10 openings, 9 sources
python3 -m uvicorn app.main:app --reload --port 8024

cd ../frontend
npm install
npm run dev                    # http://localhost:5197, proxies /api to :8024
```

Tests:

```bash
cd backend  && python3 -m pytest -q     # 399 tests, 7 skipped (the live-PostgreSQL file)
cd frontend && npm test && npm run build   # 144 tests, then typecheck + bundle
```

## Retrieval practice, and a scheduler you can check

The **Review** screen is where the product does the one thing the diagnosis says
is missing. Four formats, in order of how strong the evidence is:

| format | what the learner does | graded by | weight |
| --- | --- | --- | --- |
| Recognise it | picks an option | the server | 1.0 |
| Fill the blank | one word missing from a sentence in their material | the server | 1.0 |
| Answer from a cue | writes, then ticks the source lines produced | themselves | 0.5 |
| Write it all out | everything they remember, then ticks what they produced | themselves | 0.5 |

A **prompt is rebuilt from `(concept, format, seed)`**, never stored, so the answer
key does not exist in the response until the learner has answered. Free recall
hides its criteria until the learner says they have finished writing — otherwise
the exercise is copying with extra steps.

Self-graded attempts are weaker evidence and the scheduler says so: `evidence_weight`
halves how much a success grows stability, while a failure still costs. The
attempts table is append-only; there is no route that edits or deletes one.

The **queue explains itself**: every item carries predicted recall, stability, days
overdue, lapse count, and a sentence per number. After a gap, recovery mode caps
today at six reviews and leaves the rest on their real due dates — it changes the
plan, never the schedule. See `docs/lifesystem/README.md` for the measured results.

### The schedule is evaluated, not asserted

```bash
cd backend && python3 -m app.evals.recall_eval
```

200 simulated learners' worth of items, 90 days, the same review allowance for
every strategy, and a ground-truth memory model deliberately different from the
scheduler's own. Measured here:

```text
strategy    recall  reviews  per item
tessera      0.756     2200      11.0
fixed_7      0.430     2200      11.0
broken       0.073      200       1.0
```

At equal cost, placement is worth roughly 1.76x the retention of a fixed weekly
interval. `broken` is the control and must fail the threshold the real scheduler
passes. The absolute number is **not** the 90% the scheduler targets — the two
memory models disagree, and pretending otherwise would be the dishonest part.

## Competency: evidence you can inspect, kept apart from mastery

The **Competency** screen answers two questions that are easy to conflate and
expensive to conflate wrongly:

| | What it is | Where it comes from |
| --- | --- | --- |
| **Evidence** | how many graded answers there are, how good they were, how recent | computed on read from `retrieval_attempts` and `attempts` |
| **Mastery** | the scheduler's stored estimate of what will be recalled | `concept_states`, which only moves on graded evidence |

They are reported next to each other and never averaged. A single "competency
score" would hide both facts a learner needs: that an unmeasured concept is
*unknown* rather than weak, and that stored mastery is a prediction rather than a
result.

The rules are explicit, exported as constants and tested:

- **no evidence → `None`, never `0.0`.** An unmeasured concept is not scored, is
  not averaged into anything, and is drawn as an em dash with the words "not
  measured". Nine unmeasured concepts do not drag one measured concept down.
- **Evidence fades.** Each observation is weighted by `evidence_weight` (1.0
  server-graded, 0.5 self-graded) and by a 30-day half-life. A correct answer from
  four months ago says less about now than yesterday's does.
- **`secure` needs quantity, quality and a checked answer**: 3.0 recency-weighted
  observations at 0.80 or better, including at least one the server graded. Four
  perfect self-graded recollections reach `developing` and stop there.
- **Disagreement is reported, not smoothed.** When the stored mastery is more than
  0.25 away from the weighted score of the answers, the row says so, with the
  direction and the size. A learner who has not practised for months can hold a
  high mastery and little evidence; the screen says that instead of averaging it away.

**Gaps are computed from the evidence, not from a target.** Each one carries the
kind, a severity, the numbers it was derived from, the reason, and the action that
would close it — `no_evidence`, `thin_evidence`, `weak`, `self_graded_only`,
`stale`, `optimistic_mastery`, plus two about the *reported* baseline
(`unmeasured_axes`, `stale_report`). A missing axis is a missing input, never a
competence of zero, and a baseline older than 120 days is "dated, not wrong".

**Calibration** compares the confidence a learner recorded before answering
(1–5) with what actually happened, and reports the signed gap and the per-level
buckets. It is computed only from multiple-choice answers, because retrieval
attempts carry no confidence — said in the response rather than left as an
empty chart.

```bash
curl -s -b cookies.txt http://127.0.0.1:8024/api/competency | python3 -m json.tool | head -40
curl -s -b cookies.txt http://127.0.0.1:8024/api/competency/py.variables   # the observation log
```

### Reassessment: a successor row, not an edit

`POST /api/profile/assessments/{id}/reassess` records the same instrument again.
The new row points back with `supersedes_id`, the prior row is archived with the
reason, and the response carries a diff of the two submissions:

```json
{"axis": "dimension", "name": "retrieval", "previous": 43.0, "value": 61.0,
 "delta": 18.0, "direction": "up"}
```

Three properties are enforced rather than intended:

- **missing stays missing.** A delta is only computed where both sides supplied a
  number; an axis missing from both is `direction: "missing"` with `delta: null`,
  and a newly supplied axis is `new`, not a gain. "0 → 43" would be a fabricated
  43-point improvement.
- **the chain is linear.** `assessments.supersedes_id` is `UNIQUE`, so a
  submission is superseded once; a second attempt returns **409** naming the
  current row, while reassessing the successor is allowed.
- **the instrument belongs to the prior row.** A reassessment cannot quietly
  change what is being measured; a different instrument is a 422.

`GET /api/profile/assessments/{id}/history` returns the whole chain, oldest first,
with the diff between each pair, and the note that earlier rows are archived
because they were superseded rather than because they were wrong.

## Your material: concepts, relations, notes, sessions

The **Library** is where a learner stops consuming a fixed curriculum and starts
building their own. Four things live there:

| | What it is | What it changes |
| --- | --- | --- |
| **Concepts** | Ideas they name, with a subject and a 1–5 difficulty | Appear in the knowledge bank, the map, the daily plan and the tutor's retrieval — for them only |
| **Relations** | Eight typed links between two concepts | Only `prerequisite` gates recommendations; the rest describe their thinking |
| **Notes** | Material worth looking up again, with an optional source | Nothing. A note is not evidence and never touches mastery |
| **Sessions** | An objective, a stopping condition, what happened, one line of reflection | A finished sitting is the evidence for the reflection quest and counts toward the day's minute limit; the sitting itself still awards nothing |

Three rules are enforced by the API rather than left to the interface:

- **The catalogue is read-only.** Seeded concepts are shared by every learner, so
  editing or deleting one answers 403 and says why.
- **Deleting your concept needs two requests.** The first is refused with a count
  of the notes, sessions and relations that would go with it; only
  `confirm=true` removes anything. The interface shows that number before asking.
- **A session you worked in needs a reflection to close**, while abandoning one
  needs nothing. Closed sessions are records and cannot be edited afterwards.

Isolation is the load-bearing property, so it has its own tests: a second learner
gets 404 for the first learner's concept, notes, sessions and relations, does not
see them on the map, and cannot retrieve the first learner's notes as tutor
evidence. The visibility rule lives in exactly one place
(`app.library.visible_concepts`) because a leak here would surface one person's
private notes inside another person's answer.

## Quests, XP and seasons

A quest is a thing worth doing. XP is paid for evidence that it happened — never for
opening a page, signing in, or spending time.

Seven quests ship in the catalogue, each naming the concepts whose attempts count as
its evidence: `first-recall`, `exception-drill`, `files-by-hand`, `hash-basics`,
`threat-model-sketch`, `chess-vision`, and `sit-and-reflect` (the only one that is
answered by finishing a sitting rather than by answering a prompt). The seeder inserts
what is missing and never overwrites an existing row, so an operator can retune a value
without a code change and without the next restart undoing it.

| | |
| --- | --- |
| **The award** | `floor(base_xp × difficulty × challenge × strategic × evidence + 0.5)`, then diminishing returns, then whatever is left of the daily cap |
| **Why this number** | Every factor, the diminishing step and the cap are stored in the ledger row's `reason`. `GET /api/xp/ledger` returns them, so "why 37?" is answered by the row and not by re-running a formula that may since have changed |
| **Evidence** | Attempts recorded **since the quest was accepted**, counted from the tables that already existed. There is no "I did it" flag to set |

The four factors are all derived from state the system already keeps:

- **difficulty** — from the quest (`1 + 0.15 × (level − 1)`);
- **challenge** — `1 + 0.5 × (1 − mastery)`, so the same quest is worth more to a
  learner who has not learned the concept yet;
- **strategic value** — `1.2` when a goal the learner stated covers one of the quest's
  concepts, otherwise `1.0`;
- **evidence** — the mean `evidence_weight` of the attempts behind the claim, clamped
  to `[0.5, 1.0]`, so a server-graded answer is worth more than a self-graded one. This
  is the same weight the scheduler uses; the two cannot drift.

### Four rules that stop the ledger being a slot machine

1. **An idempotency key.** `POST /api/quests/{slug}/claim` requires an
   `Idempotency-Key` header. `uq_xp_entries_idempotency` is unique on
   `(user_id, idempotency_key)`, so a retried request returns the entry that already
   exists (`created: false`) instead of a second award — even if the retry arrives
   twice at once. The browser keeps one key per claim attempt, so "try again" after a
   timeout reuses it.
2. **One claim per quest per season.** `uq_xp_entries_quest_run` is unique on
   `(user_id, quest_id, season_id)`. The API checks the progress state first, but this
   is the row that makes two concurrent claims with two different keys fail instead of
   paying twice.
3. **Diminishing returns.** The same concept practised again in one day is worth 100%,
   then 60%, then 30%, then nothing. The factor is in the ledger row, so a learner can
   see that they earned less and why.
4. **A daily cap.** `TESSERA_XP_DAILY_CAP` (400) is the most XP a day can pay. Work
   past it still records an entry with `xp = 0` and the reason "daily cap reached;
   N XP not awarded" — the practice is not erased from the ledger, it just stops
   earning.

### Two rules that stop it being a compulsion

- **The day has a limit.** `TESSERA_MAX_DAILY_MINUTES` (120) is computed from recorded
  session minutes, including the elapsed part of a sitting still open. Past it, a claim
  answers **429** with a message that says nothing was lost and nothing was taken
  away — and the screen shows the pause before the learner hits it, not after.
- **There is no streak, and nothing is negative.** No table counts consecutive days;
  `ck_xp_entries_non_negative` refuses a negative row at the database; and every
  guardrails payload carries `absence_penalty: false` so no screen has to infer it.

### Seasons

Twelve weeks from a fixed anchor (`2026-01-05T00:00:00Z`). The season id is a pure
function of the clock — `s001`, `s002`, … — so two processes computing the same instant
agree, and creating the season twice is a no-op rather than a duplicate. Progress is
partitioned by season; **the ledger is never reset**, and an old entry still says which
season it belonged to and what it was worth at the time.

### What is pinned by tests

`tests/test_quests.py` (25 tests) covers: the replay returning the same entry and the
totals not moving; the database refusing a duplicate key *and* a second award for the
same quest; a claim before completion and a second claim in a season both answering
409 with an actionable sentence; a hand-edited `state` paying nothing because `claim`
re-counts the attempts; the evidence gate naming how many are missing; diminishing
returns at 0.6 and 0.3; the cap paying what fits and recording the rest as zero; the
time cap answering 429 with no penalty; one learner's ledger invisible to another; the
ledger having no update or delete route; and the season window being a pure function of
the clock. Frontend coverage is `src/quests.ui.test.tsx` (14 tests), including a
deliberately failing claim whose retry must reuse the same key.

### What this stage deliberately does not do

**No levels, badges, leaderboards, notifications or streak counters.** The level curve
in the design document is not applied anywhere, and nothing awards XP for a login or for
time spent — only quests, and only against evidence. Those features are listed as
missing rather than half-built, because a progress bar showing "level 4" would be a
claim that no code computes.

## Your data, and leaving

Two buttons under **Profile → Your data**, both of which do what they say:

- **Download my data** writes one JSON file, built on the server from the learner's
  own rows. The manifest lists a row count per table, so an empty table is visibly
  empty rather than missing, and the file names what it withheld and why — the
  password hash, the digests of access tokens, and `session_tokens` entirely. A
  downloaded file must never be a login.
- **Delete this account** shows the counts the server would remove *before* offering
  the button, keeps the destructive control behind an "I want to delete my account…"
  step, and requires the account email typed by hand plus the password. The delete is
  a hard delete, verified afterwards: if any table still holds a row the request
  fails loudly instead of reporting success.

The set of tables is derived from the schema (`app/account.py`), not listed: every
table with a foreign key to `users.id`, plus rows reached through a parent that
always names a learner (`assessment_scores` names an assessment, and nothing on it
names a learner). Tests fail if a table belongs to none of the three groups — owned,
indirectly owned, or shared catalogue — so a later stage cannot add a table that is
silently neither exported nor deleted. The shared curriculum (lessons, questions,
sources, openings, puzzles, quests, seasons, OAuth clients) is not learner data and
survives; the export says so in the same words the delete screen uses.

`GET /api/account/export`, `GET /api/account/delete-preview` and
`POST /api/account/delete` are the routes. `tests/test_account_data.py` (18 tests)
covers the format and manifest, the withheld credentials, one learner's rows only,
the preview matching the export, a wrong password and a mistyped email changing
nothing, and a deletion that leaves no row behind on either engine.

## Accessibility

The stage-6 pass is recorded in [`docs/a11y/tessera-2026-10.md`](../../docs/a11y/tessera-2026-10.md):
eleven screens and the app shell swept with axe (WCAG 2.2 A/AA plus best-practice
rules), contrast computed from the tokens that ship, and a list of what could not be
checked because this environment has no browser or assistive technology.

It found real defects, all fixed: form fields whose only boundary was 1.29:1 against
the card, no `h1` anywhere, a document title that never changed between screens,
keyboard focus left on the navigation button after a section change, chess-board
squares at 2.86:1, a legal-move marker at 1.51:1 on the dark squares, and two CSS
custom properties that did not exist (`--border`, `--danger`) — the first of which
made a whole bordered panel on the consent screen invisible.

## Production build and preflight

[`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) has the detail. In short: one image
(`apps/tessera/Dockerfile`) builds the frontend with Node, then runs the API on
Python, serving both from one origin; the start command runs `alembic upgrade head`
and then `python -m app.preflight`, and exits if the preflight fails. The preflight
checks the database, the schema revision, the seeded curriculum, the production
settings, the frontend build and the SQLite directory, and prints the command that
fixes each failure. `TESSERA_PRODUCTION=1` turns on a Secure cookie and HSTS, and
makes the preflight refuse SQLite or a localhost origin.

Neither the image nor `docker compose up` has been run: this environment has no
Docker daemon. The Dockerfile and the compose file are checked by tests that read
them, and the PostgreSQL path has been exercised with a real server.

## Storage: SQLite for one, PostgreSQL for a product

Every learner's profile, answers, review schedule and tutor threads live in one
database and are separated by `user_id` alone, so the database is the thing that
must not lose them. SQLite is the default because it is one file and needs no
server; PostgreSQL is the deployment target.

Schema changes are **Alembic migrations**, not `create_all()`. That distinction is
tested rather than assumed (`tests/test_migrations.py`):

- the history builds an empty database whose tables match the models exactly;
- `alembic check` finds no drift, so a model change cannot ship unwritten;
- running the history twice is a no-op rather than an error;
- `alembic upgrade head --sql` renders the PostgreSQL DDL without a server, which
  is how the Postgres path is checked in an environment with no PostgreSQL;
- a migrated database can be seeded and read.

```bash
docker compose up -d                                  # PostgreSQL 16 (see docker-compose.yml)
export DATABASE_URL=postgresql://tessera:tessera@127.0.0.1:5432/tessera
python3 -m alembic upgrade head
python3 -m app.seed
```

A bare `postgresql://` URL is rewritten to `postgresql+psycopg2://` in
`app/config.py`. That is not cosmetic: `requirements.txt` ships `psycopg2-binary`,
while SQLAlchemy 2.1 resolves an unqualified URL to **psycopg 3**, which is not
installed — the failure looks like the database is down.

### The PostgreSQL path has now been run

Up to stage 3 the PostgreSQL path was only *rendered*: `--sql` proved the history
would execute, which is not the same as executing it. Stage 4 installed a real
server (PostgreSQL **16.2**, via the `pgserver` wheel), and the whole path has now
been run against it:

- every revision applied to an empty database, in order (seven of them, head
  `b7d3e14f2c80`);
- `alembic check` — **no new upgrade operations detected** — on both PostgreSQL
  and SQLite, which is what makes drift a test failure rather than a surprise;
- `downgrade -1` and `upgrade head` round-tripped on both dialects;
- the seeder ran unchanged (10 concepts, 20 questions, 9 sources, 3 puzzles,
  10 openings);
- the **entire backend suite passed on PostgreSQL** as well as SQLite.

That last point is the one that matters: the tests use `create_all`, so the tables
come from the models, not from the migration history. Both paths produce a schema
the same tests accept — 399 passing on SQLite (7 skipped), 405 on PostgreSQL with the
live-database file included. Stage 6 added no migration: export, delete and the
response headers change no table.

```bash
export TESSERA_POSTGRES_URL='postgresql+psycopg2://postgres:@/scratch?host=/tmp/pgdata'
python3 -m pytest tests/test_postgres.py -q     # 7 tests: creates and drops its own database
```

`tests/test_postgres.py` **skips** (with a message saying what is not proved) when
that variable is unset, so a checkout without a server still runs green — it just
stops claiming more than it ran. When it is set, it creates a uniquely named
database, migrates it, inspects the result, refuses a bad write, round-trips the
last revision, and drops the database.

### What the database enforces, not just the API

Two revisions exist because inspecting the schema on that server found real gaps:

1. **`json` was not `jsonb`.** Every list column had been declared `JSON`, which
   PostgreSQL stores as text that is re-parsed on every read and cannot be indexed
   with containment operators. Five columns (`questions.choices`, `goals.concept_ids`,
   `chess_puzzles.solution_uci`, `chess_attempts.moves_uci`, `learning_sessions.activities`)
   are now `jsonb`; the model declares `JSON().with_variant(JSONB(), "postgresql")`,
   and the migration converts existing rows with `USING …::jsonb`.
2. **There were zero CHECK constraints.** Writing 0.0–1.0 ranges and vocabularies
   in Python is documentation; a constraint is a rule that holds against a seeder,
   a migration, a `psql` session, or a route that forgets to validate. There are now
   **21 named checks** across concepts, edges, questions, attempts, retrieval
   attempts, concept states, sessions and assessments — score ranges, the
   eight-relation vocabulary, the session-status vocabulary, the grading source,
   `reported_by`, scale order, and the self-supersede guard.

Five composite indexes were added for the queries the product actually runs —
`(user_id, next_review_at)` for the due queue, `(user_id, created_at)` for history
and competency rollups, `(user_id, started_at)` for sessions,
`(user_id, updated_at)` for notes. The existing single-column indexes stay: they
still serve foreign-key lookups.

`tests/test_schema_integrity.py` attacks the schema directly rather than trusting
the model declarations: it writes a mastery of 1.5, a self-graded score of 1.4, a
zero evidence weight, an unknown relation, an unknown grader, a reversed scale, a
self-superseding assessment and a two-successor fork, and requires the database to
refuse every one of them — on SQLite **and** on PostgreSQL. It also proves that
deleting a concept takes its `concept_states` with it, which only works because
`PRAGMA foreign_keys=ON` is set per connection on SQLite.

## One learner cannot see another

This is the commercially important property, so it gets its own test file
(`tests/test_isolation.py`) that goes through the public API rather than trusting
the handlers to look right. Two accounts are created; one is given a filled
profile, an answer, and a goal; the other then reads everything it can reach and
must find none of it. The direct-object attempts are covered too: a guessed
assessment id is a **404** rather than a confirmation that the record exists, a
guessed thread id is a 404, and a replayed session token fails after sign-out
because the token lives in the database rather than only in the browser.

Sign-in also does not distinguish "no such account" from "wrong password".

## The study planner connection (consent, not a shared session)

Tessera and the study planner are separate applications with separate accounts. The
planner is not given a password, a copied session cookie, or a service identity that
could read everyone. Instead the learner grants **one read-only scope** —
`learning-summary:read` — on Tessera's own consent screen, and the planner receives a
one-hour token bound to that grant.

- `GET  /api/v1/oauth/consent` (session) — the exact copy the screen will show.
- `POST /api/v1/oauth/authorize` (session) — grant or decline, returns a redirect URL.
- `POST /api/v1/oauth/token` — PKCE (S256) code exchange; single-use, 5-minute codes.
- `GET  /api/v1/me/learning-summary` (Bearer) — objectives, progress, due work,
  strengths and gaps, and when the data was last updated.
- `GET  /api/v1/me/consents` · `DELETE /api/v1/me/consents/{client_id}` (session) —
  connected apps and disconnection.
- `POST /api/v1/oauth/revoke` — the planner can revoke its own token.

Four properties are enforced, each with tests rather than assurances:

1. **Identity comes from the token.** There is no learner-id parameter; supplying one
   changes nothing (`test_the_summary_is_this_learners_and_no_one_elses`).
2. **Read-only.** There is no write route that accepts these tokens; POST, PUT and
   DELETE on the summary return 405, and three reads create no learning records.
3. **Missing stays missing.** A concept that has never been reviewed is absent from
   `strengths`/`needs_attention`, and `average_mastery` is `null`, not `0`.
4. **Revocation is immediate.** Disconnecting marks the grant and every token for
   that client, and the next request fails with 401.

Codes and tokens are stored as SHA-256 digests: a database dump contains no usable
credential. The full model, contract and acceptance table live in
`docs/integration/study-planner-tessera.md`.

## Named providers, so a key is enough

An operator should not have to transcribe a base URL and recall a model id. Set a
provider name and a key:

```bash
TESSERA_TUTOR_PROVIDER=huggingface   TESSERA_TUTOR_API_KEY=hf_...
TESSERA_TUTOR_PROVIDER=ollama-cloud  TESSERA_TUTOR_API_KEY=...
TESSERA_TUTOR_PROVIDER=ollama-local  # no key at all
```

`PROVIDER_PRESETS` (`backend/app/ai/agent.py`) supplies the endpoint and a default
model, and an explicit `TESSERA_TUTOR_BASE_URL` or `TESSERA_TUTOR_MODEL` still
overrides it. A misspelt provider name is a **failure that lists the valid names**,
not a silent fall back to a different backend — tested, because the silent version
would be invisible until a bill arrived.

A preset proves nothing about the provider. It is a URL and a model string; only a
completed request proves the connection, and none has been made from this
environment.

## Motion and imagery

The interface is allowed to be alive; it is not allowed to lie. Depth is CSS only —
perspective on the container, a small rotation on hover, transform and opacity
only, so it stays on the compositor. The profile header is a slow drifting field of
light behind the text, and cards rise in sequence rather than all at once.

The scores are drawn as rings, and the ring is the data: its stroke comes from the
reported value against that instrument's own scale. A missing score gets a dashed
empty track and the words *not supplied* — never a zero-length ring, which would
read as a measured 0%. The rings are `role="img"` with the value in their
accessible name, so the distinction survives for a screen reader.

`public/hero-tessera.png` was generated for this project (no third-party
photography, nothing misattributed). It is decorative, `alt=""`, inside an
`aria-hidden` wrapper.

All of it is switched off under `prefers-reduced-motion: reduce`.

## Known limitations (read this before trusting anything)

- **The study planner connection has not been run across two live deployments.**
  Both halves are tested against their own contract (21 backend tests, 16 planner
  tests), and the migration is covered by `alembic check`, but the browser redirect
  between the two apps has not been walked here. PostgreSQL was also unavailable in
  this build environment, so the new migration ran on SQLite only; see
  `docs/integration/study-planner-tessera.md` §10.
- **A cross-product 3D pass is deferred, deliberately.** An isolated prototype
  exists (`prototypes/tessera-3d/`) and an evidence-based readiness gate is written
  down (`docs/design/stage-4-readiness.md`): 0 of 6 conditions are fully met.
- **Small seeded catalogue.** 10 concepts, 20 questions, 3 chess puzzles, 10
  opening lines, 8 catalogue entries. This is a working engine with a
  demonstration curriculum, not a library of courses.
- **All seed material is original**, written for this project and licensed as
  such. Nothing is copied from Kinnu, Lotus Chess, Khan Academy or any other
  product. Their *mechanics* informed the design; their content did not.
- **Imports are operator-supplied files, not a live harvester.** The sandbox this
  was built in has no outbound access to OCW, OpenStax or the Lichess database, so
  the importers were tested against synthetic fixtures in the exact published
  formats. No external content is bundled, and no page was scraped.
- **The tutor has been run end to end, but never against a live model.** The whole
  path — HTTP request, store, agent, tool call, grounding, cited answer, error
  handling — is exercised against a local stub that speaks the same wire format
  as Hugging Face's router, Groq and Ollama. No real completion has been
  inspected, because every model provider is blocked from this sandbox. Treat
  answer quality, tone and refusal behaviour as unverified.
- **Retrieval is token overlap, not semantic search.** It is explainable and
  deterministic, and it will miss paraphrases. It is not embeddings and is not
  described as such.
- **There is no vendor chat SDK, deliberately.** An earlier version used OpenAI's
  ChatKit. Its useful ideas — threads stored server-side, token streaming,
  citations, retryable errors — are reimplemented in `app/ai/chat.py` and
  `src/tutor.tsx`; the parts that cost more than they gave (a vendor protocol, an
  iframe served from a third-party CDN, and a store interface that fought our
  database layer) are gone.
- **Chess has no engine.** Puzzles and the opening reference are here, but there
  is no evaluation of a game, no engine analysis and no game import. ChessScope in
  this repository covers game analysis separately.
- **The opening reference is 10 lines.** It covers common Sicilians, the Italian,
  the Ruy Lopez, the Queen's Gambit, the Indian and English openings. A line
  outside it returns an explicit "not in the reference" message rather than a
  wrong best guess. A full ECO table would come from an operator-supplied file.
- **The Profile and Competency screens have been rendered and asserted in jsdom,
  not seen.** They are driven by `src/profile.ui.test.tsx` (16 tests: the
  missing-vs-zero distinction, the caveats, the empty state, the baseline load, a
  rejected write, a blank field never becoming a zero, retiring a row, and four
  reassessment cases including a 409 and a missing-stays-missing diff) and
  `src/competency.ui.test.tsx` (11 tests: unmeasured is not zero, the two numbers
  stay separate, disagreement is shown, the observation log opens on request, the
  gaps carry reasons, calibration, an error state and an empty state). This
  environment has no browser, so layout, focus order and contrast are reasoned
  about rather than observed.
- **The competency thresholds are design choices, not validated ones.** 3.0
  weighted observations at 0.80 for `secure`, a 30-day half-life, and a 0.25
  disagreement band were chosen to be defensible and are exported as constants
  (`app/competency.py`), but no real learner's evidence has been used to calibrate
  them. They are a stated policy the screen shows, not a measured model.
- **Calibration rests on a 1–5 confidence the learner chose**, and only on
  multiple-choice answers. It says how well stated confidence matched accuracy; it
  is not a psychological measure.
- **A reassessment is still a self-report.** Successor rows, provenance and diffs
  make the history auditable; they do not make the numbers measured. Both sides of
  a diff say who supplied them, and neither is presented as a test result.
- **The evaluation is a simulation.** It compares two memory models; it is not a
  measurement of human memory, and no real learner's recall has been tracked yet.
- **Self-graded attempts are self-reported.** The half weight makes them weaker
  evidence, not honest evidence; a learner who over-ticks grows their own
  intervals.
- **XP exists for quests; levels do not.** The ledger, seasons, the four factors,
  diminishing returns, the daily cap and the rest pause are built and tested. Levels,
  badges and leaderboards are not built, and the level curve in the brief is not
  applied anywhere yet — a progress bar that says "level 4" would be a claim nothing
  computes.
- **The XP formula is a product rule, not a measurement.** `T(L) = 100·L·(L−1)/2`
  and the factors come from the design document, not from data about what motivates
  anyone. They are implemented exactly as specified and stored with every award, so
  if they are revised, the old rows still say what was applied at the time.
- **Sessions do not feed mastery.** Answering a question moves mastery; running a
  session does not. That is deliberate — self-reported activity is not evidence —
  but it does mean the session log is currently a diary rather than an input.
- **PostgreSQL is verified on one local server, not on a deployment.** The history,
  the seeder, `alembic check`, a downgrade round-trip and the full backend suite
  have run against PostgreSQL 16.2 started from the `pgserver` wheel on a unix
  socket. What has *not* been exercised: a network-reachable server, TLS, connection
  pooling under load, backups, or `docker-compose.yml` itself (no Docker here).
- **The PostgreSQL tests skip by default.** `tests/test_postgres.py` needs
  `TESSERA_POSTGRES_URL`. A green run without it proves the SQLite path only, and
  the skip message says so rather than being counted as a pass.
- **The transcribed baseline is off by default.** It belongs to the person who
  supplied it: `TESSERA_DEMO_BASELINE=1` exposes it for a demonstration, and
  without it a new account starts with every axis unscored, which is correct.
- **LIFESYSTEM is five slices deep.** Profile, knowledge and sessions, retrieval
  scheduling, competency/analytics, and quests with the XP ledger and seasons exist.
  The hardening pass (export, delete, a full accessibility audit) does not. The stage
  plan and its gates are in `docs/lifesystem/README.md` rather than implied by the
  screen.
- **No instructor or platform analytics** in this build; the schema supports
  attempts, but the dashboards are not implemented.
- **No offline mode, no audio, no notifications.** Audio and offline were in the
  original brief and are not built; they are listed rather than faked.
- **Rate limiting is not implemented** at the application layer. It belongs at
  the edge and is documented as a gap instead of pretended.
- **Accessibility**: keyboard-operable board (every square is a button), labelled
  forms, live regions for async results, reduced-motion support. Not audited
  against WCAG by an external reviewer.
- **Email delivery is not used by this app.** Contact for the two companies is
  handled by the company platform.

## Layout

```
backend/app/
  srs.py             memory model and scheduling
  mastery.py         mastery estimation and tiers
  recommend.py       scoring, gating, explanations
  content.py         provenance and the licence gate
  chess_modality.py  legal-move validation and puzzle progression
  learner.py         evidence → learner-model updates
  profile.py         supplied assessments: registry, validation, missing-vs-zero
  profile_baseline.py the diagnostic baseline transcribed from the brief
  library.py         concepts, relations, notes and sessions (one visibility rule)
  gamification.py    quests, the XP formula, seasons, caps and diminishing returns
  quest_routes.py    the quest and ledger endpoints
  practice.py        retrieval prompts, grading, evidence weights
  review.py          the due queue, recovery plan, predictions
  evals/recall_eval.py  simulated comparison against fixed intervals and a control
  ai/budget.py       the context-window estimate shown in the tutor trace
alembic/            the migration history (the schema's source of truth)
  routes.py          HTTP API
  models.py          domain model
  seed.py            the demonstration curriculum
  openings.py        position/transposition matching over catalogue lines
  lichess_import.py  streaming importer for the Lichess puzzle database
  open_content.py    licence-gated catalogue of external courses (linked only)
  ai/retrieval.py    grounded passage search, no model involved
  ai/agent.py        tutor instructions and the grounded search tool
  ai/chat.py         the SSE protocol and one streamed turn
  ai/store.py        owner-scoped conversation storage
frontend/src/
  board.tsx          click-to-move board
  pages.tsx          today, knowledge, map, concept, chess (tactics + openings)
  openings.tsx       opening reference and line matcher
  tutor.tsx          grounded search and the streamed conversation
  profile.tsx        the ten axes, assessment history and the add-assessment form
  hooks.ts           the shared async-loading hook
  rings.tsx          score rings and the profile header
  data.tsx           export, deletion preview and the delete flow
  library.tsx        the Library screen: own concepts, relations, notes, sessions
  review.tsx         the Review screen: queue, prompts, grading, progress
  quests.tsx         the Quests screen: evidence gates, claim, guardrails, ledger
  site.ts            the link to the umbrella site, or none
  utils.ts           FEN parsing, move lookup, UCI line parsing (unit-tested)
```
