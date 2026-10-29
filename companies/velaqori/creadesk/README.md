# CreateDesk — content pipeline (FastAPI + SQLite)

Engineering catalogue **Project 20**.

## Overview
An editorial workspace enforcing **draft → in_review → approved → published →
archived**, with **role rights** (authors submit; reviewers approve; editors
publish), **pre-publish validation**, **version history with diffs**, and an
editorial **calendar**.

## Policies (tested)
- Illegal jumps (draft → published) are refused with the allowed set listed;
  published is forward-only; archived is terminal.
- Authors cannot approve their own content (role rights enforced in the
  state layer, not just the UI).
- Publishing is **gated on validation**: empty titles, too-short bodies,
  placeholder text and malformed schedule dates are rejected with reasons.
- **External links must be on the configured allowlist** — anything else is
  flagged for review; unconfigured links are never published silently.

## DSA/performance note
Transition validation is `O(1)` map lookups; version diffs walk consecutive
snapshots `O(v)` per post; calendar is an indexed ordered select.

## Run
```bash
uvicorn app.main:app --port 8020
```

## Testing
`python3 -m pytest tests/ -q` — transition matrix, role denials, validation
gates, publish blocking, version diffs, schedule validation.

## Limitations
Demo content simulated; scheduling does not auto-publish; no realtime
co-editing.

## Future improvements
Slack/email review notifications (configurable), markdown preview, bulk
operations, editorial analytics.
