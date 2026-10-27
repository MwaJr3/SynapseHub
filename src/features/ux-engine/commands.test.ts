import { describe, expect, it } from 'vitest';
import {
  componentCode,
  restyle,
  uxAudit,
  uxDesign,
  uxPattern,
  uxReview,
  uxStates,
  uxSystem,
  uxTest,
  COMMAND_SUMMARIES,
} from './commands';
import { FLAWED_CHECKOUT, POLISHED_CHECKOUT } from './fixtures';
import { generateAcceptanceChecks, generateReactComponent } from './adapters';
import type { CommandName } from './types';

describe('blueprint commands', () => {
  const allCommands: CommandName[] = [
    'ux-review',
    'ux-design',
    'ux-audit',
    'restyle',
    'ux-pattern',
    'ux-states',
    'ux-system',
    'ux-test',
  ];

  it('documents all eight commands from the blueprint', () => {
    expect(Object.keys(COMMAND_SUMMARIES).sort()).toEqual(
      [...allCommands].sort(),
    );
  });

  it('/ux-review groups findings into must / should / nice with locations', () => {
    const result = uxReview(FLAWED_CHECKOUT);
    const headings = result.sections.map((section) => section.heading);
    expect(headings.some((heading) => heading.startsWith('Must fix'))).toBe(
      true,
    );
    expect(
      result.sections.some((section) => section.body.includes('.tsx:')),
    ).toBe(true);
    expect(result.report).toBeDefined();
  });

  it('/ux-audit returns score, top fixes and what works', () => {
    const result = uxAudit(POLISHED_CHECKOUT);
    expect(result.title).toContain('100');
    expect(result.sections.map((s) => s.heading)).toContain('Top three fixes');
    expect(result.sections.map((s) => s.heading)).toContain('What works');
  });

  it('/ux-design produces a full pre-code specification', () => {
    const result = uxDesign({
      name: 'Team invite flow',
      route: '/invite',
      user: 'Workspace admin',
      goal: 'Invite teammates and confirm acceptance',
      tasks: ['Enter emails', 'Pick roles', 'Send invites'],
      componentKinds: ['form', 'button', 'toast'],
    });
    const headings = result.sections.map((section) => section.heading);
    expect(headings).toContain('User and goal');
    expect(headings).toContain('Component map and state contracts');
    expect(headings).toContain('Responsive behavior');
    expect(headings).toContain('Acceptance criteria');
    expect(result.patternIds.length).toBeGreaterThan(3);
  });

  it('/ux-pattern retrieves patterns with conflicts and a generated rule set', () => {
    const result = uxPattern({
      text: 'hover tooltip overlay placement',
      limit: 5,
    });
    expect(result.patternIds).toContain('P42');
    expect(result.sections.map((s) => s.heading)).toContain(
      'Generated rule set',
    );
  });

  it('/ux-states renders the matrix, transitions and coverage gap', () => {
    const result = uxStates('button', { declaredStates: ['default'] });
    expect(result.sections.map((s) => s.heading)).toContain('Transitions');
    expect(
      result.sections.some((s) =>
        s.body.includes('Missing from the descriptor'),
      ),
    ).toBe(true);
  });

  it('/ux-system validates the graph and emits CSS and Tailwind artifacts', () => {
    const result = uxSystem();
    expect(result.sections[0]?.body).toContain('no orphans');
    expect(result.code).toHaveLength(2);
    expect(result.code?.[0]?.content).toContain('--accent');
    expect(result.code?.[1]?.content).toContain('tailwind.config.js');
  });

  it('/restyle shows before/after token decisions without touching logic', () => {
    const result = restyle({
      accentHex: '#0c766f',
      radiusPx: 8,
      motionMs: 200,
    });
    expect(result.sections[0]?.body).toContain('Before');
    expect(result.sections[1]?.body).toContain('product logic');
  });

  it('/ux-test emits executable acceptance checks covering keyboard, contrast and undo', () => {
    const result = uxTest(POLISHED_CHECKOUT);
    const code = result.code?.[0]?.content ?? '';
    expect(code).toContain('AC-KEYBOARD');
    expect(code).toContain('contrastRatio');
    expect(code).toContain('AC-UNDO');
    expect(code).toContain('prefers-reduced-motion');
  });
});

describe('implementation adapter', () => {
  it('generates a React button preserving the loading and disabled state model', () => {
    const code = generateReactComponent({
      id: 'save-button',
      kind: 'button',
      declaredStates: ['default', 'loading', 'disabled', 'error'],
    });
    expect(code).toContain('aria-busy');
    expect(code).toContain('aria-disabled');
    expect(code).toContain('SaveButton');
  });

  it('generates undo scaffolding for destructive components', () => {
    const code = generateReactComponent({
      id: 'delete-project',
      kind: 'button',
      destructive: true,
      declaredStates: ['default', 'destructive'],
    });
    expect(code).toContain('Undo');
  });

  it('scales acceptance checks to the states and capabilities declared', () => {
    const minimal = generateAcceptanceChecks(POLISHED_CHECKOUT);
    const ids = minimal.map((check) => check.id);
    expect(ids).toContain('AC-KEYBOARD');
    expect(ids).toContain('AC-CONTRAST');
    expect(ids).toContain('AC-LOADING');
    expect(ids).toContain('AC-ERROR');
    expect(ids).toContain('AC-REDUCED-MOTION');
  });

  it('componentCode returns a command result usable by the studio', () => {
    const result = componentCode({
      id: 'cta',
      kind: 'button',
      declaredStates: ['default'],
    });
    expect(result.code?.[0]?.label).toContain('cta');
  });
});
