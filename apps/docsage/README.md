# DocSage — team knowledge base (FastAPI + SQLite)

Engineering catalogue **Project 24** (Advanced).

## Overview
An internal knowledge base: pages with **sources/citations**, **review
status**, **version diffs**, **visibility rules** and **offline ranked search**.

## Citation discipline (tested)
- External citation URLs must match the **configured allowlist** (GitHub,
  docs.python.org prefixes in this build). Anything else is **rejected with an
  explanation** — never silently stored.
- Every page lists its recorded sources; the export carries them along.

## Search honesty
Ranking is **offline TF-IDF keyword search** (stdlib implementation with
documented complexity) — it is **not semantic embedding search**, and the UI
says so. Restricted pages are **absent** from non-admin results (not merely
blurred), enforced in the store layer and tested.

## DSA/performance note
Index build `O(total tokens)`; search accumulates sparse scores per query
term; memory is `O(total tokens)` for the bounded internal corpus.

## Run
```bash
uvicorn app.main:app --port 8021
```

## Testing
`python3 -m pytest tests/ -q` — ranking order, index removal, citation
allowlist, visibility filtering, version diffs, import rejection reporting.

## Limitations
Demo content simulated; query-param roles for demo purposes; no embeddings.

## Future improvements
Embedding-based retrieval as an optional adapter (with labels), page
templates, comment threads, retention policies.
