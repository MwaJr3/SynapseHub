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
| Learner profile | Diagnostic results are stored as reported, with instrument, reporter and date. A score that was never supplied stays missing and is never shown as zero; a supplied 0 stays a 0. Assessments are append-only and can be retired with a reason. Nothing here touches mastery. |
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
cd backend  && python3 -m pytest -q     # 233 tests
cd frontend && npm test && npm run build   # 60 tests, then typecheck + bundle
```

## Your material: concepts, relations, notes, sessions

The **Library** is where a learner stops consuming a fixed curriculum and starts
building their own. Four things live there:

| | What it is | What it changes |
| --- | --- | --- |
| **Concepts** | Ideas they name, with a subject and a 1–5 difficulty | Appear in the knowledge bank, the map, the daily plan and the tutor's retrieval — for them only |
| **Relations** | Eight typed links between two concepts | Only `prerequisite` gates recommendations; the rest describe their thinking |
| **Notes** | Material worth looking up again, with an optional source | Nothing. A note is not evidence and never touches mastery |
| **Sessions** | An objective, a stopping condition, what happened, one line of reflection | Nothing but the record — XP waits for stage 5 |

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

**What is verified and what is not.** The SQLite path has been run end to end,
including a fresh database built only from migrations. The PostgreSQL path has
been verified *as DDL* and by the migration tests above; it has **not** been run
against a live PostgreSQL server, because none exists in the environment this was
built in. `docker-compose.yml` is there for the first machine that has Docker.

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
- **The Profile screen has been rendered and asserted in jsdom, not seen.** It is
  driven by `src/profile.ui.test.tsx` (10 tests: the missing-vs-zero distinction,
  the caveats, the empty state, the baseline load, a rejected write, a blank field
  never becoming a zero, and retiring a row). This environment has no browser, so
  layout, focus order and contrast are reasoned about rather than observed.
- **No XP, levels or streaks yet.** Stage 2 records sessions; it does not reward
  them. Reward mechanics need the idempotent XP ledger and anti-farming rules
  described in the brief, and inventing them early would mean inventing those
  rules early too.
- **Sessions do not feed mastery.** Answering a question moves mastery; running a
  session does not. That is deliberate — self-reported activity is not evidence —
  but it does mean the session log is currently a diary rather than an input.
- **Never run against PostgreSQL.** Migrations render Postgres DDL and the schema
  tests pass, but no live PostgreSQL has been used. Treat the compose file and the
  deployment instructions as unproven until someone runs them.
- **The transcribed baseline is off by default.** It belongs to the person who
  supplied it: `TESSERA_DEMO_BASELINE=1` exposes it for a demonstration, and
  without it a new account starts with every axis unscored, which is correct.
- **LIFESYSTEM is one slice deep.** The profile exists; sessions, reference notes,
  retrieval scheduling, competency records, quests and XP do not yet. The stage plan
  and its gates are in `docs/lifesystem/README.md` rather than implied by the screen.
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
  library.tsx        the Library screen: own concepts, relations, notes, sessions
  site.ts            the link to the umbrella site, or none
  utils.ts           FEN parsing, move lookup, UCI line parsing (unit-tested)
```
