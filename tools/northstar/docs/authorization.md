# Authorization

The engine touches other people's code. Four rules, in order of importance, and one
mechanism for each.

## 1. No commits, pushes or deploys without being asked

**Mechanism:** `hooks/guard-writes.mjs` blocks `git commit`, `git push`,
`git reset --hard`, `git rebase`, `npm publish`, `vercel deploy` and recursive
deletes, before the command runs. The block is announced to the model with a reason,
so it becomes a question to the user rather than a failure to work around.

The override is `NORTHSTAR_ALLOW_GIT=1`, and it exists because a net that cannot be
removed gets removed wholesale. The hook prints that it was bypassed on every use.

## 2. `/ux-review` changes nothing; `/ux-audit` fixes only what was chosen

**Mechanism:** `ux-review.md` does not declare an edit tool. `ux-audit.md` declares
no write tool at all and requires the fix list to be stated before any change.
`/ux-design` declares a write scope limited to documentation paths, and stops at an
approval gate.

## 3. Preserve behaviour

A UX fix may change a class list, a label, an ARIA attribute, a state. It may not
change an API, a route, an auth rule, a database shape, or delete a test. If a fix
needs one of those, it is not a UX fix — it is a separate change with its own review.

**Mechanism:** stated in `ux-audit.md` and enforced by review discipline; the project's
own test suite is the check. Every fix ends with the tests and the type check run, and
the real output quoted.

## 4. No hidden telemetry, no credentials

**Mechanism:** `test/safety.test.mjs` walks the plugin source and fails if any file
imports a network module, contains a hard-coded API URL, or reads an environment
variable other than `NORTHSTAR_ALLOW_GIT`. The engine runs offline by construction:
Node's standard library, no install step.

## Applying a fix: the working agreement

1. The user says which findings to fix.
2. The list is restated with file and line, and nothing else is touched.
3. Each group is fixed, then the project's tests and type check run.
4. The engine is re-run and the before/after counts are reported.
5. Anything that could not be fixed is reported as still open, with the reason.

Step 4 is the one people skip. Without it, "fixed" is an assertion; with it, it is a
measurement.
