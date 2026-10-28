// Regression for unanchored .vercelignore entries silently deleting src/apps or
// src/components/projects from a deployment payload. Git uses the same anchored
// gitignore-style patterns for the explicit exclusions covered here.
import { accessSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = [
  'src/apps/appRegistry.ts',
  'src/components/projects/ChallengeCard.tsx',
  'src/features/synapsehub/WorkspaceRoute.tsx',
  'packages/synapse-client/index.ts',
  'api/index.py',
  'backend/synapsehub/main.py',
  'backend/requirements.lock',
  'requirements.txt',
];
files.forEach((file) => accessSync(file));
const check = spawnSync(
  'git',
  [
    '-c',
    'core.excludesFile=.vercelignore',
    'check-ignore',
    '--no-index',
    '--stdin',
  ],
  { input: files.join('\n') + '\n', encoding: 'utf8' },
);
if (check.status !== 1 || check.stdout.trim()) {
  throw new Error(
    `Required deployment sources were excluded or the check failed: ${check.stdout || check.stderr}`,
  );
}
process.stdout.write(
  'Required Vercel web/API sources are retained by deployment exclusions.\n',
);
