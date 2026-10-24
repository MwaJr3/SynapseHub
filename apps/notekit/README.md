# NoteKit — personal knowledge management (CLI + SQLite)

Engineering catalogue **Project 15** (Intermediate 3/5).

## Overview
Record and organise notes by topic and tags, search titles and contents, link
related notes, track books/learning resources as **separate source records**, and
record lesson summaries.

## Design decisions (tested)
- **Notes vs sources are distinct entities** — a note is never confused with the
  external material it references.
- **Accidental loss prevention:** every edit snapshots the previous version into
  `note_versions` before applying changes.
- **Search ranking:** title matches rank above body matches (documented).
- Validation: non-empty titles/bodies/tags; links cannot be self-referential;
  missing IDs fail clearly.

## Usage
```bash
python3 -m app.cli add "Photosynthesis" "plants convert light..." --topic biology
python3 -m app.cli tag 1 biology
python3 -m app.cli link 1 2 --relation supports
python3 -m app.cli source "Clean Code" --note 1 --kind book
python3 -m app.cli lesson 1 "review drills improve recall"
python3 -m app.cli search photosynthesis
python3 -m app.cli versions 1
```

## Testing
`python3 -m pytest tests/ -q` — versioned edits, search ranking, tags/links
validation, source separation, lessons, input validation.

## Limitations
Substring search (no full-text index yet); no export/backup yet (roadmap).

## Future enhancements
Full-text search, graph-style note relationships, source citations in answers,
export/backup, optional AI-assisted summarisation (clearly labelled).
