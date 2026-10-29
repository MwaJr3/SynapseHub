# PassForge — secure password & passphrase generator (CLI)

## 1. Project overview

Generates passwords and passphrases with cryptographically secure randomness
(`secrets`, never `random`), configurable rules, and optional restricted-permission
export. Serves Engineering catalogue Project 5 and Cybersecurity catalogue
Project 1. Target users: anyone who needs locally generated credentials without
sending them to a third party.

## 2. Learning objectives

Python strings/loops/functions/modules; configuration separation; validation;
security-sensitive randomness; file permissions; unit testing without asserting
random values.

## 3. Features (implemented)

- `generate` — N passwords, configurable length (8–128) and character groups.
- `passphrase` — N passphrases from a bundled 200+ word list (documented approach).
- `explain` — prints the configured rules and honest strength guidance.
- Optional `--out` export written with **0600** permissions (explicit request only).
- Policy validation: at least one character group; non-empty symbol set; length bounds.

## 4. Architecture

```
cli.py -> generator.py -> config.py (PasswordPolicy)
       -> export.py     -> policy_check.py (validation helper)
```

The generation engine is independent of command-line interaction (testable).

## 5. Technology stack

Python 3.10+ standard library only. `secrets` provides CSPRNG selection.

## 6–8. Prerequisites, installation, configuration

```bash
cd apps/passforge
python3 -m app.cli generate --length 20 --count 3
python3 -m app.cli passphrase --words 6
python3 -m app.cli explain
```

No configuration files or secrets are required. Rules are CLI flags.

## 9–10. Usage & examples

```text
$ python3 -m app.cli generate --length 16 --count 2
K7$mQ2...
$ python3 -m app.cli generate --count 1 --out passwords.txt
Saved 1 value(s) to passwords.txt (not displayed).
```

## 11. Testing

```bash
python3 -m pytest tests/ -q
```

Tests cover policy validation, group guarantees, disabled-group exclusion,
export permissions/overwrite, passphrase shape, and that generation routes
through `secrets` (injectable failure proof). Test results reported at the time
of each commit in this repository's history.

## 12. Security design

- **Protected asset:** generated secrets. Never logged, never written unless asked.
- `secrets.choice` / `secrets.randbelow` only; a test proves ordinary generation
  fails if `secrets` is replaced.
- Export uses `os.open(..., 0o600)` to avoid world-readable files.
- No network access, no analytics, no storage of generated values.

## 13. Limitations (honest)

- Generation is **not** storage or management — use a password manager for keeping.
- No strength *scoring* is claimed here (see `passmeter` for a separate analyzer,
  itself documented as heuristic).
- Entropy depends on configured rules; shrinking length/groups weakens output —
  the tool explains this rather than pretending otherwise.

## 14. Troubleshooting

- `error: At least one character group must be enabled.` — re-enable a group.
- `already exists; pass overwrite=True` — choose a new path or allow replacement.

## 15. Future improvements

Copy-to-clipboard with documented platform limits; configurable generation
policies as files; optional zxcvbn-style estimator behind an honest disclaimer.

## 16. References

Python `secrets` documentation (standard library).

## Modern features & performance notes (feature-candidate pass)
- **Presets** (`presets`, `generate --preset`): web/legacy/wifi/passphrase with
  explicit rules and stated trade-offs (e.g. legacy drops symbols and says why
  that weakens it). Presets never silently narrow generation options.
- **Property explanations** (`properties`): what length/classes/randomness/
  uniqueness contribute **and what they do NOT prove** (no absolute claims).
- No-logging posture retained (generation runs are never recorded).
- Deferred candidates (with reasons): site-rule adapters (would require
  per-site rule corpora); breach-check integrations (would require network
  access to external corpora — out of offline scope).
