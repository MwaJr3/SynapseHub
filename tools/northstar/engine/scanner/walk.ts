/**
 * Filesystem walker and scan orchestrator.
 *
 * Node-only module (uses node:fs): the browser bundle imports the pure
 * detectors directly, while the CLI script and the node-environment tests use
 * this entry point.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { DETECTORS } from './detectors';
import { resetScanIds } from './builder';
import type { Confidence, ScanReport, Severity } from './types';

const SOURCE_EXTENSIONS = new Set(['.tsx', '.ts', '.css', '.html']);
const IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  '.venv',
  '__pycache__',
]);

async function walk(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (IGNORED_SEGMENTS.has(entry.name)) continue;
    const full = join(root, entry.name);
    // The scanner itself is tooling, not UI: its source contains detector
    // pattern literals that would otherwise trip the same detectors.
    if (full.includes(`${sep}${'northstar'}${sep}engine${sep}`)) continue;
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (
      SOURCE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))
    ) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx'))
        continue;
      files.push(full);
    }
  }
  return files;
}

export interface ScanTarget {
  label: string;
  root: string;
  /**
   * Individual files outside `root` that still belong to the target, e.g. the
   * package's `index.html` entry document one level above `src`.
   */
  extraFiles?: string[];
}

export async function scanRoot(
  target: ScanTarget,
  repoRoot: string,
): Promise<ScanReport> {
  resetScanIds();
  const walked = await walk(target.root);
  const seen = new Set(walked);
  const paths = walked;
  for (const extra of target.extraFiles ?? []) {
    if (!seen.has(extra)) {
      seen.add(extra);
      paths.push(extra);
    }
  }
  const findings = [];
  let filesScanned = 0;

  for (const filePath of paths) {
    const source = await readFile(filePath, 'utf8');
    filesScanned += 1;
    const relativePath = relative(repoRoot, filePath);
    const context = {
      filePath: relativePath,
      source,
      lines: source.split('\n'),
    };
    for (const detector of DETECTORS) {
      findings.push(...detector(context));
    }
  }

  const counts: Record<Severity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    nice: 0,
  };
  const confidenceCounts: Record<Confidence, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    confidenceCounts[finding.confidence] =
      (confidenceCounts[finding.confidence] ?? 0) + 1;
  }

  // Stable ordering: severity weight, then file and line.
  const weight: Record<Severity, number> = {
    critical: 4,
    major: 3,
    minor: 2,
    nice: 1,
  };
  findings.sort(
    (a, b) =>
      (weight[b.severity] ?? 0) - (weight[a.severity] ?? 0) ||
      a.filePath.localeCompare(b.filePath) ||
      a.line - b.line,
  );

  return {
    label: target.label,
    root: relative(repoRoot, target.root),
    filesScanned,
    findings,
    counts,
    confidenceCounts,
  };
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
