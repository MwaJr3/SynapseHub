#!/usr/bin/env node
/**
 * PostToolUse advisory for Edit / Write / MultiEdit.
 *
 * After Claude writes a UI file, run the engine's rules over that one file and hand
 * the result back as context, so a defect is seen while the code is still in mind
 * rather than at review time.
 *
 * What this hook is, and is not:
 *   - ADVISORY. It always exits 0. It never blocks a tool call, never edits a file,
 *     never runs a fixer, never touches the network and keeps no state.
 *   - NARROW. It looks only at the file that was just written, only at UI file
 *     types, and reports at most five findings at P2 or above — a hook that talks
 *     all the time is a hook people uninstall.
 *   - HONEST. It says "found in source" and names the rule and the pattern. A clean
 *     result is silence, not "all good": most UX cannot be settled from source.
 *   - OPT-OUT. NORTHSTAR_ADVISORY=off silences it for the session.
 *
 * Only the PreToolUse guard (`guard-writes.mjs`) enforces anything. This is the
 * difference between enforced automation and advisory activation, and docs/
 * architecture.md states it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanView } from '../engine.mjs';

const UI_FILE = /\.(tsx|jsx|css|html)$/i;
const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const MAX_FINDINGS = 5;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Build the advisory text for one file, or null when there is nothing to say. */
export function adviseOnFile(absolute, minSeverity = 'P2') {
  if (!UI_FILE.test(absolute) || !fs.existsSync(absolute)) return null;
  if (absolute.split(path.sep).includes('node_modules')) return null;
  if (absolute.split(path.sep).includes('fixtures')) return null; // planted defects, on purpose
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch {
    return null;
  }
  const relPath = path.basename(absolute);
  const findings = scanView({ relPath, text }, { name: 'edited-file', surface: undefined })
    .filter((finding) => finding.id !== 'engine-error')
    .filter((finding) => SEVERITY_ORDER[finding.severity] <= SEVERITY_ORDER[minSeverity])
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.line - b.line);
  if (findings.length === 0) return null;

  const shown = findings.slice(0, MAX_FINDINGS);
  const lines = [
    `northstar (advisory, found in source) — ${findings.length} UX ${findings.length === 1 ? 'issue' : 'issues'} in ${relPath}:`,
    ...shown.map(
      (finding) =>
        `- ${finding.severity} ${finding.id} (${finding.pattern}) line ${finding.line}: ${finding.title}. Fix: ${finding.fix}`,
    ),
  ];
  if (findings.length > shown.length) lines.push(`…and ${findings.length - shown.length} more; run /ux-review for the full list.`);
  lines.push('This is a static check of one file. It does not replace /ux-review, and it did not render anything.');
  return lines.join('\n');
}

function main() {
  if (process.env.NORTHSTAR_ADVISORY === 'off') return 0;
  const raw = readStdin();
  if (!raw.trim()) return 0;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!['Edit', 'Write', 'MultiEdit'].includes(payload?.tool_name)) return 0;
  const target = payload?.tool_input?.file_path;
  if (typeof target !== 'string') return 0;
  const absolute = path.resolve(payload.cwd ?? process.cwd(), target);
  let advice = null;
  try {
    advice = adviseOnFile(absolute);
  } catch {
    return 0; // an advisory that crashes must never get in the way
  }
  if (!advice) return 0;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: advice } }),
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
