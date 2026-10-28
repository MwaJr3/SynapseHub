/**
 * Commands — the eight engine operations defined in the blueprint.
 *
 * Each command returns a structured `CommandResult`: human-readable sections,
 * optional generated code and always the pattern IDs behind its conclusions.
 * They are thin orchestrators over the knowledge, constraint, state-machine,
 * token, content, retrieval and audit layers — no rule lives here.
 */
import { generateAcceptanceChecks, generateReactComponent } from './adapters';
import { auditScreen } from './audit';
import {
  planRestyle,
  generateCssCustomProperties,
  generateTailwindSnippet,
  validateTokenGraph,
  TOKEN_GRAPH,
} from './tokens';
import {
  generateCta,
  generateEmptyState,
  generateErrorCopy,
} from './microcopy';
import { retrievePatterns } from './retrieval';
import { buildStateMatrix } from './stateMachine';
import { responsiveGuidance, planViewport } from './responsive';
import { getPattern } from './patterns';
import type {
  CommandName,
  CommandResult,
  ComponentDescriptor,
  ComponentKind,
  RetrievalQuery,
  ScreenDescriptor,
} from './types';

export const COMMAND_SUMMARIES: Record<CommandName, string> = {
  'ux-review':
    'Review changed UI files against state, hierarchy, affordance, copy, a11y and responsive rules.',
  'ux-design': 'Produce an implementation-ready UX specification before code.',
  'ux-audit':
    'Audit a screen or flow; rank issues by severity and prioritise the top three fixes.',
  restyle:
    'Apply the active token system without changing product logic; show before/after decisions.',
  'ux-pattern':
    'Retrieve relevant patterns, explain conflicts and generate a rule set.',
  'ux-states':
    'Generate a state matrix with entry conditions, semantics, recovery and persistence.',
  'ux-system':
    'Generate tokens, component contracts, responsive rules, motion scales and documentation.',
  'ux-test':
    'Generate executable UX acceptance checks for keyboard, a11y, contrast, loading, errors and undo.',
};

// ---------------------------------------------------------------------------
// /ux-review — must/should/nice findings with file/line references
// ---------------------------------------------------------------------------

export function uxReview(screen: ScreenDescriptor): CommandResult {
  const report = auditScreen(screen);
  const groups = {
    must: report.findings.filter((f) => f.priority === 'must'),
    should: report.findings.filter((f) => f.priority === 'should'),
    nice: report.findings.filter((f) => f.priority === 'nice'),
  };
  const format = (finding: (typeof report.findings)[number]) =>
    `- **${finding.ruleId}** — ${finding.evidence}${finding.location ? ` _(${finding.location})_` : ''}\n  → ${finding.remediation}`;

  return {
    command: 'ux-review',
    title: `UX review — ${screen.name}`,
    sections: [
      {
        heading: `Must fix (${groups.must.length})`,
        body: groups.must.map(format).join('\n') || 'No blocking findings.',
      },
      {
        heading: `Should fix (${groups.should.length})`,
        body: groups.should.map(format).join('\n') || 'None.',
      },
      {
        heading: `Nice to improve (${groups.nice.length})`,
        body: groups.nice.map(format).join('\n') || 'None.',
      },
      {
        heading: 'Traceability',
        body: `Every finding cites a rule; rules trace to patterns ${[...new Set(report.findings.flatMap((f) => f.patternIds))].join(', ') || '(none triggered)'}.`,
      },
    ],
    report,
    patternIds: [...new Set(report.findings.flatMap((f) => f.patternIds))],
  };
}

// ---------------------------------------------------------------------------
// /ux-audit — score, top fixes, what works, pattern mapping
// ---------------------------------------------------------------------------

export function uxAudit(screen: ScreenDescriptor): CommandResult {
  const report = auditScreen(screen);
  const formatFix = (finding: (typeof report.findings)[number]) =>
    `### ${finding.severity.toUpperCase()} · ${finding.ruleId}\n**${finding.title}**\n- Evidence: ${finding.evidence}\n- Impacted: ${finding.impactedUsers}\n- Remediation: ${finding.remediation}\n- Verify: ${finding.verification}\n- Patterns: ${finding.patternIds.join(', ')}`;

  return {
    command: 'ux-audit',
    title: `UX audit — ${screen.name} (score ${report.score}/100, grade ${report.grade})`,
    sections: [
      {
        heading: 'Top three fixes',
        body:
          report.topFixes.map(formatFix).join('\n\n') || 'No fixes required.',
      },
      {
        heading: 'What works',
        body:
          report.passes
            .slice(0, 8)
            .map((pass) => `- **${pass.ruleId}** — ${pass.evidence}`)
            .join('\n') || 'No passing checks recorded.',
      },
      {
        heading: 'Pattern map',
        body: report.patternMatches
          .map(
            (match) =>
              `- ${getPattern(match.patternId).title} (${match.patternId}, relevance ${match.score})`,
          )
          .join('\n'),
      },
      {
        heading: 'Findings by severity',
        body: `critical ${report.counts.critical} · major ${report.counts.major} · minor ${report.counts.minor} · nice ${report.counts.nice}`,
      },
    ],
    report,
    patternIds: report.patternMatches.map((match) => match.patternId),
  };
}

// ---------------------------------------------------------------------------
// /ux-design — implementation-ready specification before code
// ---------------------------------------------------------------------------

export interface DesignIntent {
  name: string;
  route: string;
  user: string;
  goal: string;
  tasks: string[];
  componentKinds: ComponentKind[];
  pointer?: ScreenDescriptor['pointer'];
}

export function uxDesign(intent: DesignIntent): CommandResult {
  const components: ComponentDescriptor[] = intent.componentKinds.map(
    (kind, index) => ({
      id: `${kind}-${index + 1}`,
      kind,
      declaredStates: [],
    }),
  );
  const prototypeScreen: ScreenDescriptor = {
    id: slugify(intent.name),
    name: intent.name,
    route: intent.route,
    user: intent.user,
    goal: intent.goal,
    tasks: intent.tasks,
    pointer: intent.pointer ?? 'both',
    hover: 'both',
    reducedMotionSupported: true,
    viewports: ['mobile', 'tablet', 'desktop'],
    components,
    competingPrimaryActions: 1,
    urlState: true,
    offlineQueue: true,
  };

  const patternIds = new Set<string>();
  const componentSections = intent.componentKinds.map((kind) => {
    const matrix = buildStateMatrix(kind, [], { offlineQueue: true });
    const matches = retrievePatterns({
      text: kind,
      componentKinds: [kind],
      limit: 3,
    });
    matches.forEach((match) => patternIds.add(match.pattern.id));
    return [
      `#### ${kind}`,
      `- Required states: ${matrix.requiredStates.join(', ')}`,
      `- Patterns: ${matches.map((m) => `${m.pattern.id} ${m.pattern.title}`).join(' · ')}`,
      `- Responsive: ${responsiveGuidance(kind).join(' ')}`,
    ].join('\n');
  });

  const report = auditScreen(prototypeScreen);
  const mobile = planViewport('mobile', 'coarse');
  const desktop = planViewport('desktop', 'fine');
  const cta = generateCta({
    intent: 'create',
    object: 'account',
    outcome: 'start in under a minute',
  });

  return {
    command: 'ux-design',
    title: `UX specification — ${intent.name}`,
    sections: [
      {
        heading: 'User and goal',
        body: `**User:** ${intent.user}\n**Goal:** ${intent.goal}\n**Tasks:** ${intent.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}`,
      },
      {
        heading: 'Task flow',
        body: intent.tasks
          .map(
            (task, i) =>
              `${i + 1}. Entry → ${task} → truthful feedback → recovery available at every step`,
          )
          .join('\n'),
      },
      {
        heading: 'Component map and state contracts',
        body: componentSections.join('\n\n'),
      },
      {
        heading: 'Responsive behavior',
        body: `**Mobile (coarse pointer):** ${mobile.notes.join(' ')}\n**Desktop (fine pointer):** ${desktop.notes.join(' ')}`,
      },
      {
        heading: 'Accessibility architecture',
        body: 'Visible focus rings on every control, semantic roles per component contract, AA contrast in both themes, keyboard parity, announced loading/error states via aria-live.',
      },
      {
        heading: 'Motion',
        body: 'Shared 100–500ms vocabulary; exits faster than entrances; prefers-reduced-motion collapses animation to instant state changes.',
      },
      {
        heading: 'Microcopy',
        body: `Primary CTA: **“${cta.copy}”** — ${cta.rationale}\nEmpty states classified first-run/no-result/filtered/error; errors follow what happened / why it matters / next step.`,
      },
      {
        heading: 'Acceptance criteria',
        body:
          report.topFixes.length === 0
            ? 'All engine checks pass; see the generated acceptance tests.'
            : `Resolve before build:\n${report.findings
                .slice(0, 5)
                .map((f) => `- ${f.ruleId}: ${f.remediation}`)
                .join('\n')}`,
      },
    ],
    patternIds: [...patternIds],
  };
}

// ---------------------------------------------------------------------------
// /ux-pattern — retrieval with conflicts and generated rule set
// ---------------------------------------------------------------------------

export function uxPattern(query: RetrievalQuery): CommandResult {
  const matches = retrievePatterns(query);
  const patternIds = matches.map((match) => match.pattern.id);
  return {
    command: 'ux-pattern',
    title: `Pattern retrieval — “${query.text}”`,
    sections: [
      {
        heading: `Ranked patterns (${matches.length})`,
        body: matches
          .map((match) => {
            const p = match.pattern;
            return `### ${p.id} — ${p.title} (score ${match.score})\n${p.summary}\n- Why: ${match.reasons.join('; ') || 'domain match'}\n- Rules: ${p.ruleIds.join(', ')}\n- Do: ${p.do[0]}\n- Don't: ${p.dont[0]}\n- Evidence: ${p.evidence}${match.conflicts.length ? `\n- Trade-offs: ${match.conflicts.map((c) => `${c.id} ${c.title}`).join('; ')}` : ''}`;
          })
          .join('\n\n'),
      },
      {
        heading: 'Generated rule set',
        body: [...new Set(matches.flatMap((match) => match.pattern.ruleIds))]
          .map(
            (ruleId) =>
              `- Enforce **${ruleId}** on anything implementing these patterns.`,
          )
          .join('\n'),
      },
    ],
    patternIds,
  };
}

// ---------------------------------------------------------------------------
// /ux-states — state matrix
// ---------------------------------------------------------------------------

export function uxStates(
  kind: ComponentKind,
  opts: {
    destructive?: boolean;
    optimistic?: boolean;
    offlineQueue?: boolean;
    declaredStates?: string[];
  } = {},
): CommandResult {
  const matrix = buildStateMatrix(kind, opts.declaredStates ?? [], opts);
  return {
    command: 'ux-states',
    title: `State matrix — ${kind}`,
    sections: [
      {
        heading: 'States and minimum behavior',
        body: matrix.rows
          .map(
            (row) =>
              `### ${row.state}\n- Behavior: ${row.minimumBehavior}\n- Entry: ${row.entryConditions}\n- Feedback: ${row.visibleFeedback}\n- ARIA: ${row.aria}\n- Recovery: ${row.recovery}\n- Persistence: ${row.persistence}`,
          )
          .join('\n\n'),
      },
      {
        heading: 'Transitions',
        body: matrix.transitions
          .map(
            (t) =>
              `- ${t.from} → ${t.to} on ${t.trigger}${t.guard ? ` (guard: ${t.guard})` : ''}`,
          )
          .join('\n'),
      },
      {
        heading: 'Coverage against declared states',
        body: matrix.missing.length
          ? `Missing from the descriptor: **${matrix.missing.join(', ')}**`
          : 'Every required state is declared.',
      },
    ],
    patternIds: ['P24', 'P28', 'P23'],
  };
}

// ---------------------------------------------------------------------------
// /ux-system — token system generation and validation
// ---------------------------------------------------------------------------

export function uxSystem(): CommandResult {
  const issues = validateTokenGraph(TOKEN_GRAPH);
  return {
    command: 'ux-system',
    title: 'Design system — token graph',
    sections: [
      {
        heading: 'Graph integrity',
        body:
          issues.length === 0
            ? `All ${TOKEN_GRAPH.nodes.length} tokens resolve through primitive → semantic → component with no orphans; all 14 required families present.`
            : issues
                .map((issue) => `- ${issue.node}: ${issue.problem}`)
                .join('\n'),
      },
      {
        heading: 'Baseline scales',
        body: 'Spacing 4/8/12/16/24/32/48/64 · radius 4/8/12/16/24 · motion 100–500ms · touch 44px · icon 24px · 12-column grid.',
      },
    ],
    code: [
      {
        label: 'CSS custom properties',
        language: 'css',
        content: generateCssCustomProperties(TOKEN_GRAPH),
      },
      {
        label: 'Tailwind theme snippet',
        language: 'js',
        content: generateTailwindSnippet(TOKEN_GRAPH),
      },
    ],
    patternIds: ['P13', 'P69', 'P72', 'P73'],
  };
}

// ---------------------------------------------------------------------------
// /restyle — token-only changes with before/after decisions
// ---------------------------------------------------------------------------

export function restyle(opts: {
  accentHex: string;
  radiusPx: number;
  motionMs: number;
}): CommandResult {
  const decisions = planRestyle(opts);
  return {
    command: 'restyle',
    title: 'Restyle plan — tokens only, product logic untouched',
    sections: [
      {
        heading: 'Before / after decisions',
        body: decisions
          .map(
            (decision) =>
              `### ${decision.token}\n- Before: \`${decision.before}\`\n- After: \`${decision.after}\`\n- Why: ${decision.reason}\n- Patterns: ${decision.patternIds.join(', ')}`,
          )
          .join('\n\n'),
      },
      {
        heading: 'Scope guarantee',
        body: 'Only semantic token values change; component APIs, state models and product logic are untouched, and every consumer re-themes automatically.',
      },
    ],
    patternIds: [
      ...new Set(decisions.flatMap((decision) => decision.patternIds)),
    ],
  };
}

// ---------------------------------------------------------------------------
// /ux-test — executable acceptance checks
// ---------------------------------------------------------------------------

export function uxTest(screen: ScreenDescriptor): CommandResult {
  const primaryMatrix = buildStateMatrix(
    screen.components[0]?.kind ?? 'generic',
    screen.components[0]?.declaredStates ?? [],
  );
  const checks = generateAcceptanceChecks(screen, primaryMatrix);
  return {
    command: 'ux-test',
    title: `UX acceptance checks — ${screen.name}`,
    sections: [
      {
        heading: `Checklist (${checks.length})`,
        body: checks
          .map(
            (check) =>
              `- **${check.id}** — ${check.title} _(patterns ${check.patternIds.join(', ')})_`,
          )
          .join('\n'),
      },
    ],
    code: [
      {
        label: 'Vitest + Testing Library scaffold',
        language: 'ts',
        content: [
          `import { describe, it, expect } from 'vitest';`,
          ...checks.map(
            (check) => `\n// ${check.id}: ${check.title}\n${check.testCode}`,
          ),
        ].join('\n'),
      },
    ],
    patternIds: [...new Set(checks.flatMap((check) => check.patternIds))],
  };
}

// ---------------------------------------------------------------------------
// Convenience: component codegen used by the studio's implementation tab
// ---------------------------------------------------------------------------

export function componentCode(component: ComponentDescriptor): CommandResult {
  return {
    command: 'ux-design',
    title: `React + Tailwind implementation — ${component.id}`,
    sections: [],
    code: [
      {
        label: `${component.id}.tsx`,
        language: 'tsx',
        content: generateReactComponent(component),
      },
    ],
    patternIds: component.destructive ? ['P11', 'P48'] : ['P5', 'P24', 'P28'],
  };
}

export { generateEmptyState, generateErrorCopy };

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'screen'
  );
}
