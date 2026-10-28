import { describe, expect, it } from 'vitest';
import {
  checkTone,
  generateCta,
  generateEmptyState,
  generateErrorCopy,
} from './microcopy';

describe('content engine', () => {
  it('generates outcome-oriented CTAs and explicit destructive verbs', () => {
    const cta = generateCta({
      intent: 'create',
      object: 'workspace',
      outcome: 'invite your team',
    });
    expect(cta.copy).toContain('Create workspace');
    expect(cta.copy).toContain('invite your team');

    const destructive = generateCta({
      intent: 'delete',
      object: 'project',
      destructive: true,
    });
    expect(destructive.copy).toBe('Delete project');
    expect(destructive.patternIds).toContain('P11');
  });

  it('classifies the four empty-state families with next actions', () => {
    const firstRun = generateEmptyState('first-run', { object: 'invoice' });
    expect(firstRun.copy).toContain('Create your first invoice');

    const noResult = generateEmptyState('no-result', {
      object: 'invoice',
      query: 'laptop',
    });
    expect(noResult.copy).toContain('laptop');
    expect(noResult.copy).toContain('Clear search');

    const filtered = generateEmptyState('filtered', { object: 'invoice' });
    expect(filtered.copy).toContain('Clear filters');

    const error = generateEmptyState('error', { object: 'invoice' });
    expect(error.copy).toContain('Try again');
  });

  it('structures error copy as what happened / why / next step', () => {
    const result = generateErrorCopy({
      whatHappened: 'The payment did not reach the bank.',
      whyItMatters: 'Your order is not confirmed yet.',
      recoveryAction: 'Retry payment with the saved card.',
    });
    expect(result.copy).toContain('What happened');
    expect(result.copy).toContain('Next step');
    expect(result.patternIds).toContain('P23');
  });

  it('rejects blaming and fake-urgency copy', () => {
    expect(checkTone('You failed to enter a valid email').acceptable).toBe(
      false,
    );
    expect(checkTone('Last chance! Act now or lose your seat').acceptable).toBe(
      false,
    );
    expect(checkTone('Enter a valid email to continue').acceptable).toBe(true);
  });
});
