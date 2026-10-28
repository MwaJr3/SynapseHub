/**
 * Static code scanner types.
 *
 * The scanner turns real repository source into the same `Finding` shape the
 * interactive audit produces, plus the exact source location the evidence came
 * from. Every finding still traces finding → rule → pattern → evidence.
 */
import type { Confidence, Finding, Severity } from '../types';

export type { Confidence, Severity };

export interface ScanFinding extends Finding {
  /** Repo-relative path of the file containing the defect. */
  filePath: string;
  /** 1-based line number of the offending code. */
  line: number;
  /** The trimmed source line (or rule header) the finding was derived from. */
  snippet: string;
}

export interface ScanReport {
  /** Human-readable website/project name. */
  label: string;
  /** Scanned root, repo-relative. */
  root: string;
  filesScanned: number;
  findings: ScanFinding[];
  counts: Record<Severity, number>;
  confidenceCounts: Record<Confidence, number>;
}

export interface DetectorContext {
  filePath: string;
  source: string;
  lines: string[];
}
