---
description: Audit a screen, a project or a whole repository against the UX pattern library. Ranks by severity, reports the top three first, and only fixes when explicitly asked.
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(node:*), Bash(npm run:*)
---

# /ux-audit

Find the defects worth fixing, in the order worth fixing them.

Two modes, chosen by the user and never assumed:

- **Audit** (default) — report only. Nothing is edited.
- **Fix** — audit first, present the ranked list, and once the user has chosen what
  to fix, fix exactly that list. Fixing mode never silently widens its scope.

## Procedure

1. **Pick the target.** A screen, a component, a project, or everything. If the user
   did not say, audit the project they are working in and say which one.
2. **Run the engine.**
   `node northstar-ux-engine/bin/northstar.mjs audit <path> --out docs/ux/audit-<name>.md`
   Quote its counts exactly. If the path is the repository root, the report covers
   every project the engine can find and labels the kinds of UI it saw.
3. **Do the part the engine cannot.** For each screen in scope, walk the manual
   checklist in `skills/state-completeness` and `skills/responsive-design`:
   empty, loading, partial, error, blocked; heading order; focus after action; text
   at 320px; long content; zoom at 200%. Record what you looked at, from the source.
4. **Rank.** P0–P3 as defined in `docs/severity-and-confidence.md`. When two findings
   compete, the one that blocks a task outranks the one that annoys.
5. **Write the report** to `docs/ux/audit-<target>.md` and present the top three in
   the reply.

## Report contract

```
# UX audit — <target>
<count> defects across <occurrence count> occurrences · P0 n · P1 n · P2 n · P3 n

## Top three
1. <title> — <where>
   why it matters · fix · pattern
2. ...
3. ...

## P0 / P1 / P2 / P3
<table: project | where | defect | pattern | evidence | fix>

## Manual checks
What was inspected by reading the source, and what could not be.

## Not checked
Rendering, real devices, screen-reader output, performance, localisation.
```

The top three are a promise: they are the three things to do next, not the three
easiest. If a P0 exists it is always number one.

## Fix mode

Only after the user says which findings to fix:

1. State the list you are about to change, by id, with file and line.
2. Fix in that order, one concern at a time.
3. Preserve behaviour: no API changes, no routing changes, no auth changes, no test
   deletions. If a fix would require one, stop and say so instead.
4. After each group, run the project's own tests and type check. Report the actual
   output. If they fail, say what failed before continuing.
5. Re-run the engine and report the before/after counts. A claim that something is
   fixed needs the second number.

## Rules

- Severity inflation is the fastest way to lose the reader. "This could theoretically
  affect some users" is P3 until you can name the user and the task.
- One finding, one entry. Do not split a single defect across four rows to look
  thorough, and do not merge two defects to keep the list short.
- Never report a finding you have not located in a file.
- If the engine reports nothing at P0, say "no P0 found" in those words. A zero is a
  result.
