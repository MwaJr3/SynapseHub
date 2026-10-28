#!/usr/bin/env node
/**
 * PreToolUse guard for Bash.
 *
 * The engine's contract says no commit, no push, no deploy and no destructive
 * filesystem command without the user asking. A promise in a skill file is not a
 * mechanism; this hook is. It reads the hook payload from stdin, looks at the
 * command about to run, and blocks the ones that cannot be undone by a subsequent
 * edit.
 *
 * Deliberate design choices:
 *   - It blocks by exit code 2 and a message on stderr, which Claude Code feeds back
 *     to the model. It never silently rewrites the command.
 *   - It is a pure string check on an allow-list of patterns. No network, no state,
 *     no parsing of the shell. A hook that guesses is worse than no hook.
 *   - It can be bypassed on purpose (`NORTHSTAR_ALLOW_GIT=1`), because a safety net
 *     that cannot be removed gets removed entirely.
 *
 * Exit codes: 0 = allow, 2 = block with a reason.
 */

import fs from 'node:fs';

const BLOCKED = [
  {
    test: /\bgit\s+(commit|push|reset\s+--hard|clean\s+-[a-z]*f|rebase|merge|tag\s+-d|branch\s+-D)\b/,
    reason:
      'commits, pushes and history rewrites need explicit authorisation — ask the user first, then run it yourself',
  },
  {
    test: /\b(npm|pnpm|yarn)\s+(publish|version\s+\S+\s+--force)\b/,
    reason: 'publishing a package needs explicit authorisation',
  },
  {
    test: /\b(vercel|netlify|fly|railway|heroku)\s+(deploy|--prod)\b/,
    reason: 'deployments need explicit authorisation',
  },
  {
    test: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(\/|~|\$HOME|\.\.)/,
    reason: 'recursive force delete outside the working tree is never part of a UX fix',
  },
  {
    test: /\bgit\s+checkout\s+--\s+\.|git\s+restore\s+\.\s*$/,
    reason: 'discarding the whole working tree would destroy unreviewed changes',
  },
];

const ALLOW_OVERRIDE = process.env.NORTHSTAR_ALLOW_GIT === '1';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // A malformed payload is not a reason to block the user's work.
    return 0;
  }

  if (payload?.tool_name && payload.tool_name !== 'Bash') return 0;
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string' || !command.trim()) return 0;

  for (const rule of BLOCKED) {
    if (!rule.test.test(command)) continue;
    if (ALLOW_OVERRIDE) {
      process.stderr.write(`northstar: allowing "${command}" because NORTHSTAR_ALLOW_GIT=1\n`);
      return 0;
    }
    process.stderr.write(
      [
        'northstar-ux-engine blocked this command.',
        '',
        `  ${command}`,
        '',
        `Reason: ${rule.reason}.`,
        'Ask the user for authorisation and let them run it, or set',
        'NORTHSTAR_ALLOW_GIT=1 for the session if they have already approved it.',
      ].join('\n'),
    );
    return 2;
  }

  return 0;
}

process.exit(main());
