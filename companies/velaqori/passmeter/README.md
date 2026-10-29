# PassMeter — password strength analyzer (CLI)

Cybersecurity catalogue **Project 3** (Beginner).

## Overview
Evaluates passwords **entirely locally** using transparent rules: length,
character variety, repetition, keyboard/alphabet sequences, common weak
patterns, and a small bundled weak-password list. Every signal is named and
explained; suggestions are actionable.

## Security design
- No network access. No analytics. Passwords are never stored or logged.
- Reports (`--json` or text) **never echo** the password (a test enforces this).
- Interactive mode reads input hidden via `getpass`.
- Honest framing (in-product): the score is a **heuristic estimate**; the small
  bundled weak list **cannot** establish whether a password appears in a real
  breach corpus. That requires an external service this tool deliberately does
  not use.

## Usage
```bash
python3 -m app.cli                    # hidden prompt
python3 -m app.cli --json
python3 -m app.cli --batch-file synthetic.txt
```

## Testing
`python3 -m pytest tests/ -q` — weak/common passwords, repetitive and sequential
patterns, length/variety effect, empty-input refusal, report redaction, labelled
entropy estimate.

## Limitations
Heuristics only; no breach-corpus checks; no password *generation* (see
`passforge`); scoring methodology documented in `app/rules.py`.

## Future improvements
Comparison with established estimators (e.g. zxcvbn) behind honest disclaimers;
configurable policies.
