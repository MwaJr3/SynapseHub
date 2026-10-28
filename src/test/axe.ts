/**
 * axe-core runtime accessibility helper.
 *
 * The static UX scanner reasons about source; axe runs against the rendered
 * DOM and catches defects only a browser can evaluate (computed ARIA roles,
 * form/label wiring, landmark structure, duplicate attributes). jsdom cannot
 * perform layout, so rules it can only partially evaluate come back as
 * `incomplete` rather than failures — callers surface those for manual review
 * instead of treating them as hard failures.
 */
import axe from 'axe-core';

export interface AxeSummary {
  violations: axe.Result[];
  incomplete: axe.Result[];
}

export async function runAxe(container: ParentNode): Promise<AxeSummary> {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'],
    },
    resultTypes: ['violations', 'incomplete'],
    // jsdom has no layout engine or viewport; these rules need a real browser.
    rules: {
      'color-contrast': { enabled: false },
      'target-size': { enabled: false },
      'scrollable-region-focusable': { enabled: false },
    },
  });
  return { violations: results.violations, incomplete: results.incomplete };
}

/** One-line description per violation, for assertion messages. */
export function describeViolations(violations: axe.Result[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join('; ');
      return `${violation.id} (${violation.help}) → ${targets}`;
    })
    .join('\n');
}
