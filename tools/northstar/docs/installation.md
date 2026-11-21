# Installation

1. Copy or symlink this directory as a Claude Code plugin (`.claude-plugin/plugin.json`).
2. Node 20+. No dependencies to install for the CLI.
3. Optional, for `northstar page`: `npm i -g playwright && npx playwright install chromium`.
   Without it, `page` reports **Not measured** and exits 3.
4. Optional: `NORTHSTAR_ADVISORY=off` disables the advisory edit hook; the PreToolUse
   guard is enforced and bypassed only with `NORTHSTAR_ALLOW_GIT=1`.
5. Engine tests (optional): `npm i -D vitest typescript` in `engine/`'s project, then `npx vitest`.
