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
| AI tutor | Grounded retrieval works with no API key. The conversation (OpenAI ChatKit, self-hosted server) only appears when a key is configured. |
| Provenance | Every piece of material records source, author, licence, attribution and retrieval date; a licence gate decides full use / reference only / refuse. |

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
- **The conversation** (`POST /api/tutor/chatkit`) implements the ChatKit server
  protocol. If `OPENAI_API_KEY` is unset it returns **503** with
  `{"error": "tutor_not_configured", "missing": [...]}` and the interface does not
  render a chat box at all. An empty box that cannot answer would be a fake
  integration.
- **Instructions** constrain the model to retrieved material only, require a
  `(Concept: <title>)` citation for claims, forbid inventing mastery or progress,
  and refuse to hand over exam answers.
- **Provider failure is reported, not hidden** — an upstream error returns 502
  `tutor_upstream_failed` and nothing is generated.
- **Threads are per learner.** The ChatKit store is owner-scoped in the database;
  another learner's thread is a 404, not a read.

`TESSERA_TUTOR_MODEL` (default `gpt-4o-mini`) selects the model. The key lives in
the environment only and never reaches the bundle.

## Run it

```bash
cd backend
python3 -m pip install -r requirements-dev.txt
python3 -m app.seed            # idempotent: 10 concepts, 7 edges, 10 lessons, 20 questions, 3 puzzles, 10 openings, 9 sources
python3 -m uvicorn app.main:app --reload --port 8024

cd ../frontend
npm install
npm run dev                    # http://localhost:5197, proxies /api to :8024
```

Tests:

```bash
cd backend  && python3 -m pytest -q     # 114 tests
cd frontend && npm test && npm run build   # 18 tests, then typecheck + bundle
```

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
- **The tutor has never been run against a live model in this environment.** No
  API key was available, so the conversation path is tested at its boundaries —
  configuration gating, the 503, retrieval grounding, citation, thread isolation,
  upstream-failure handling — and not with a real completion. Treat the generated
  answer quality as unverified.
- **Retrieval is token overlap, not semantic search.** It is explainable and
  deterministic, and it will miss paraphrases. It is not embeddings and is not
  described as such.
- **The ChatKit UI comes from OpenAI's CDN.** `@openai/chatkit` ships types only,
  so the widget script is loaded at runtime from
  `cdn.platform.openai.com` and renders in an OpenAI-hosted iframe. That is a real
  third-party dependency: it will not work offline, and it should be reviewed
  before commercial use.
- **Chess has no engine.** Puzzles and the opening reference are here, but there
  is no evaluation of a game, no engine analysis and no game import. ChessScope in
  this repository covers game analysis separately.
- **The opening reference is 10 lines.** It covers common Sicilians, the Italian,
  the Ruy Lopez, the Queen's Gambit, the Indian and English openings. A line
  outside it returns an explicit "not in the reference" message rather than a
  wrong best guess. A full ECO table would come from an operator-supplied file.
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
  routes.py          HTTP API
  models.py          domain model
  seed.py            the demonstration curriculum
  openings.py        position/transposition matching over catalogue lines
  lichess_import.py  streaming importer for the Lichess puzzle database
  open_content.py    licence-gated catalogue of external courses (linked only)
  ai/retrieval.py    grounded passage search, no model involved
  ai/agent.py        tutor instructions and the grounded search tool
  ai/store.py        owner-scoped ChatKit thread storage
  ai/chatkit_server.py  ChatKit server protocol implementation
frontend/src/
  board.tsx          click-to-move board
  pages.tsx          today, knowledge, map, concept, chess (tactics + openings)
  openings.tsx       opening reference and line matcher
  tutor.tsx          grounded search and the ChatKit conversation
  utils.ts           FEN parsing, move lookup, UCI line parsing (unit-tested)
```
