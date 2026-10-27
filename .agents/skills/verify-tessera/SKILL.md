---
name: verify-tessera
description: >
  Reproduce every claim Tessera's README makes, from a clean checkout, in the
  order that catches breakage earliest. Use before claiming a change is done,
  after touching the learner model, the scheduler or the migrations, or when a
  reviewer asks "does this actually run?".
---

# Verify Tessera

Three layers, cheapest first. Each command below has been run in this repository;
the expected output is what it produced, not what it should produce. If a number
here disagrees with the code, the skill is stale and the skill is wrong.

Do not report success from a layer you skipped. A green unit suite says nothing
about migrations, and a green build says nothing about the API.

## 1. Suites (about 60 s)

```sh
cd apps/tessera/backend  && python3 -m pytest -q          # 266 passed
cd apps/tessera/frontend && npm test && npm run build      # 70 passed, tsc + vite
```

`npm test` at `apps/` runs the whole workspace; run it from
`apps/tessera/frontend` to keep it scoped.

## 2. Schema (about 15 s)

The migration history, not `create_all()`, is the source of truth.

```sh
cd apps/tessera/backend
rm -f /tmp/verify.db
DATABASE_URL=sqlite:////tmp/verify.db python3 -m alembic upgrade head   # 3 revisions
DATABASE_URL=sqlite:////tmp/verify.db python3 -m alembic check          # "No new upgrade operations detected."
DATABASE_URL=postgresql://u:p@localhost/t python3 -m alembic upgrade head --sql | grep -c "CREATE TABLE"  # DDL without a server
```

`alembic check` failing means a model changed without a revision. Do not delete
the test that says so; write the revision.

A SQLite migration runs with foreign keys suspended, because Alembic's batch mode
rebuilds tables by dropping them and `ON DELETE CASCADE` would empty the children
first. The migration then checks `PRAGMA foreign_key_check` and commits. If you
see dangling keys reported, the migration is wrong, not the pragma.

## 3. A real server (about 60 s)

```sh
cd apps/tessera/backend
rm -rf /tmp/verify-data && mkdir -p /tmp/verify-data
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data \
  python3 -m alembic upgrade head
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data \
  python3 -m app.seed                       # 10 concepts, 20 questions, 9 sources
DATABASE_URL=sqlite:////tmp/verify-data/t.db TESSERA_DATA_DIR=/tmp/verify-data \
  python3 -m uvicorn app.main:app --port 8024
```

Then, with the cookie jar from registration:

| Check | Expected |
| --- | --- |
| `GET /api/review` as a new account | `overdue_count 0`, an `empty_state` sentence, `recovery.active false` |
| Answer one question, then `GET /api/review` | still nothing due; the concept appears in `upcoming` |
| `GET /api/review/py.variables/prompt?format=cloze` | `_____` in the prompt, **no** `expected` field |
| `GET .../prompt?format=free_recall` | `criteria` empty and `criteria_hidden true`; add `&reveal=true` and 5 criteria appear |
| `POST /api/review/attempts` with a wrong word | `score 0.0`, and the response *then* names the expected term |
| `POST /api/review/attempts` with `checked: []` | `201`, `score 0.0` — an honest zero is accepted, not blocked |
| Second account, same prompt id | `404` |

## 4. The scheduler claim

```sh
cd apps/tessera/backend && python3 -m app.evals.recall_eval
```

Expected, seed 7, 200 items, 90 days, 12 reviews per item allowed:

```
strategy    recall  reviews  per item
tessera      0.756     2200      11.0
fixed_7      0.430     2200      11.0
broken       0.073      200       1.0
```

The point is the equal `per item` column: placement, not frequency. `broken` must
stay below the threshold `tessera` passes; if it ever passes, the metric is wrong.

## What this does not verify

- **PostgreSQL has never been run against this code.** Only DDL rendering and
  SQLite. Saying otherwise would be false.
- **No model provider has ever been reached from the build environment.** The
  tutor's presets are configuration; a preset is not a connection.
- **The simulator is not a learner.** The eval compares two models; it does not
  measure human memory.
