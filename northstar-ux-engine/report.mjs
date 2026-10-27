/**
 * Markdown rendering.
 *
 * The shape is fixed by the `/ux-audit` contract: severity first, top three first,
 * and every finding carries the file, the line, the evidence and the pattern it
 * belongs to. A reader should be able to act on any line without running anything.
 */

import { SEVERITY_LABEL } from './engine.mjs';

const SEVERITIES = ['P0', 'P1', 'P2', 'P3'];

/** Escape pipes so a class list cannot break a table row. */
const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');

/** One-line summary of a project's findings. */
export function projectLine(project) {
  const { bySeverity, total } = project.summary;
  return `| [${project.name}](${project.name === '.' ? '.' : project.name}/) | ${project.kind} | ${project.filesScanned} | ${total} | ${SEVERITIES.map(
    (severity) => bySeverity[severity],
  ).join(' | ')} |`;
}

/**
 * Render the full report.
 * @param {ReturnType<import('./engine.mjs').scanRepository>} report
 * @param {{ title?: string, top?: number }} options
 */
export function renderReport(report, options = {}) {
  const { title = 'UX audit', top = 3 } = options;
  const all = report.projects.flatMap((project) =>
    project.findings.map((finding) => ({ ...finding, project: finding.project ?? project.name })),
  );
  const occurrenceTotal = all.reduce((sum, finding) => sum + (finding.occurrences ?? 1), 0);
  const ranked = [...all].sort(
    (a, b) =>
      SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
      (b.occurrences ?? 1) - (a.occurrences ?? 1) ||
      a.project.localeCompare(b.project) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );

  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of ranked) counts[finding.severity] += 1;

  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(
    `${report.projectCount} projects · ${ranked.length} defects across ${occurrenceTotal} occurrences · ${counts.P0} P0 · ${counts.P1} P1 · ${counts.P2} P2 · ${counts.P3} P3`,
  );
  lines.push('');
  lines.push('Produced by the Northstar UX Engine from source analysis. Every finding names a file and a line;');
  lines.push('nothing here was observed in a browser, and no screenshot is implied. Checks that need rendering');
  lines.push('are listed under “Not checked” in the project docs.');
  lines.push('');

  lines.push('## Top three');
  lines.push('');
  if (!ranked.length) {
    lines.push('No source-detectable defects. Rendering-level checks still apply — see the manual checklist.');
  }
  const top3 = ranked.slice(0, top);
  top3.forEach((finding, index) => {
    lines.push(`### ${index + 1}. ${finding.title} — ${finding.project}`);
    lines.push('');
    lines.push(`- **Severity:** ${SEVERITY_LABEL[finding.severity].split(' · ')[0]}`);
    lines.push(`- **Where:** \`${finding.file}:${finding.line}\`${finding.occurrences > 1 ? ` (${finding.occurrences} occurrences)` : ''}`);
    lines.push(`- **Pattern:** ${finding.pattern}`);
    lines.push(`- **Why it matters:** ${finding.why}`);
    lines.push(`- **Fix:** ${finding.fix}`);
    if (finding.detail) lines.push(`- **Measured:** ${finding.detail}`);
    lines.push(`- **Evidence:** \`${cell(finding.evidence)}\``);
    lines.push('');
  });

  lines.push('## Per project');
  lines.push('');
  lines.push('| Project | Kind | Files | Defects | P0 | P1 | P2 | P3 |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const project of [...report.projects].sort((a, b) => b.summary.total - a.summary.total)) {
    lines.push(projectLine(project));
  }
  lines.push('');

  for (const severity of SEVERITIES) {
    const group = ranked.filter((finding) => finding.severity === severity);
    lines.push(`## ${SEVERITY_LABEL[severity]} (${group.length})`);
    lines.push('');
    if (!group.length) {
      lines.push('None found from source.');
      lines.push('');
      continue;
    }
    lines.push('| Project | Where | Defect | Pattern | Evidence | Fix |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const finding of group) {
      lines.push(
        `| ${cell(finding.project)} | \`${cell(finding.file)}:${finding.line}\` | ${cell(finding.title)}${
          finding.occurrences > 1 ? ` ×${finding.occurrences}` : ''
        } | ${finding.pattern} | ${cell(finding.detail ?? finding.evidence)} | ${cell(finding.fix)} |`,
      );
    }
    lines.push('');
  }

  lines.push('## By pattern');
  lines.push('');
  const byPattern = {};
  for (const finding of ranked) byPattern[finding.pattern] = (byPattern[finding.pattern] ?? 0) + 1;
  lines.push('| Pattern | Defects |');
  lines.push('| --- | --- |');
  for (const [pattern, count] of Object.entries(byPattern).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${pattern} | ${count} |`);
  }
  lines.push('');
  return lines.join('\n');
}
