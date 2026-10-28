import { describe, expect, it } from 'vitest';
import {
  buildStateMatrix,
  requiredStatesFor,
  validateTransitions,
  CANONICAL_TRANSITIONS,
  CORE_STATE_BEHAVIOR,
} from './stateMachine';

describe('core state matrix', () => {
  it('documents all 14 blueprint states with minimum behavior', () => {
    expect(Object.keys(CORE_STATE_BEHAVIOR)).toHaveLength(14);
    expect(CORE_STATE_BEHAVIOR['focus-visible']).toMatch(/high-contrast ring/i);
    expect(CORE_STATE_BEHAVIOR.destructive).toMatch(/undo/i);
  });

  it('requires loading and error states for async component kinds', () => {
    const buttonStates = requiredStatesFor('button');
    expect(buttonStates).toContain('loading');
    expect(buttonStates).toContain('error');
    expect(requiredStatesFor('upload')).toContain('offline');
  });

  it('adds capability states only when the descriptor opts in', () => {
    const plain = buildStateMatrix('toggle', [
      'default',
      'focus-visible',
      'pressed',
      'selected',
      'disabled',
      'error',
    ]);
    expect(plain.requiredStates).not.toContain('optimistic');

    const optimistic = buildStateMatrix(
      'toggle',
      [
        'default',
        'focus-visible',
        'pressed',
        'selected',
        'disabled',
        'optimistic',
        'error',
      ],
      { optimistic: true },
    );
    expect(optimistic.requiredStates).toContain('optimistic');
  });

  it('reports missing states against declared coverage', () => {
    const matrix = buildStateMatrix('button', ['default', 'hover']);
    expect(matrix.missing).toContain('loading');
    expect(matrix.missing).toContain('error');
    expect(matrix.rows).toHaveLength(matrix.requiredStates.length);
  });

  it('produces canonical transitions covering reconciliation and rollback', () => {
    const matrix = buildStateMatrix(
      'button',
      ['default', 'loading', 'success', 'error', 'optimistic'],
      { optimistic: true },
    );
    const paths = matrix.transitions.map((t) => `${t.from}->${t.to}`);
    expect(paths).toContain('loading->error');
    expect(paths).toContain('optimistic->error');
    expect(CANONICAL_TRANSITIONS.some((t) => t.to === 'offline')).toBe(true);
  });
});

describe('transition validation', () => {
  it('flags loading without an error recovery path', () => {
    const problems = validateTransitions('button', [
      'default',
      'loading',
      'success',
    ]);
    expect(problems.some((p) => p.ruleId === 'STATE-ERROR-01')).toBe(true);
  });

  it('flags optimism without rollback', () => {
    const problems = validateTransitions(
      'toggle',
      ['default', 'optimistic', 'success'],
      {
        optimistic: true,
        rollback: false,
      },
    );
    expect(problems.some((p) => p.ruleId === 'STATE-OPTIMISTIC-01')).toBe(true);
  });

  it('flags destructive work without undo or confirmation', () => {
    const problems = validateTransitions('button', ['default', 'destructive'], {
      destructive: true,
      undoAvailable: false,
    });
    expect(problems.some((p) => p.ruleId === 'STATE-DESTRUCTIVE-01')).toBe(
      true,
    );
  });

  it('returns no problems for a complete reversible flow', () => {
    const problems = validateTransitions(
      'button',
      ['default', 'loading', 'success', 'error', 'destructive'],
      { destructive: true, undoAvailable: true },
    );
    expect(problems).toEqual([]);
  });
});
