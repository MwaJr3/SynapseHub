# IncidentFlow — digital forensics evidence analyzer (CLI + SQLite)

Cybersecurity catalogue **Project 14** (Advanced).

## Overview
Imports explicitly selected evidence files (streamed SHA-256, never modifying
sources), records chain-of-custody entries for every action, detects content
duplicates, verifies hashes over time, builds timelines, and exports
investigation reports.

## Honest-forensics requirements (enforced + tested)
- Source evidence is **read-only** during analysis (tested).
- A hash match proves **content integrity since collection only** — NOT the
  authenticity of the collection process (stated in every verification result).
- Timelines are **metadata-derived**; timestamps can be altered and are not
  proof of chronology (stated in every report).
- The tool states plainly that it does **not** satisfy forensic/legal
  admissibility requirements.

## Architecture
```
intake.py (streamed hashing, metadata, timeline building)
services.py (custody log, duplicates, verification, reports)
db.py (SQLite schema; parameterised queries)
cli.py (thin wrapper)
```

## Usage
```bash
python3 -m app.cli collect ./evidence/doc.txt --actor analyst-a
python3 -m app.cli verify 1 --actor analyst-a
python3 -m app.cli note 1 "opened in viewer" --actor analyst-a
python3 -m app.cli report
```

## Testing
`python3 -m pytest tests/ -q` — custody logging, content-duplicate detection,
verification match/mismatch records, source immutability, timeline labelling,
error handling.

## Limitations
Metadata-derived timelines only; single-machine SQLite storage; no disk imaging.

## Future improvements
Evidence-handling workflow (acquisition details), text extraction search,
exportable signed manifests.
