import { describe, expect, it } from 'vitest';
import { retrievePatterns, patternsForComponent } from './retrieval';
import { PATTERNS } from './patterns';

describe('hybrid retrieval', () => {
  it('ranks undo and destructive-action patterns first for destructive work', () => {
    const results = retrievePatterns({
      text: 'destructive delete action with undo recovery',
      limit: 5,
    });
    const top = results.map((match) => match.pattern.id);
    expect(top).toContain('P48');
    expect(top).toContain('P11');
    expect(results[0]?.score).toBeGreaterThan(0);
    expect(results[0]?.reasons.length).toBeGreaterThan(0);
  });

  it('retrieves loading and skeleton patterns for pending-state questions', () => {
    const results = retrievePatterns({
      text: 'loading skeleton pending feedback',
      limit: 5,
    });
    const ids = results.map((match) => match.pattern.id);
    expect(ids).toContain('P28');
    expect(ids).toContain('P54');
  });

  it('applies domain hard constraints', () => {
    const results = retrievePatterns({
      text: 'focus keyboard accessibility',
      domains: ['accessibility'],
    });
    expect(
      results.every((match) => match.pattern.domain === 'accessibility'),
    ).toBe(true);
    expect(results.map((m) => m.pattern.id)).toContain('P46');
  });

  it('boosts patterns by component kind and state', () => {
    const results = patternsForComponent('toggle', ['optimistic']);
    expect(results.map((m) => m.pattern.id)).toContain('P41');
  });

  it('surfaces declared conflicts as trade-offs', () => {
    const results = retrievePatterns({
      text: 'card hover lift anatomy',
      limit: 8,
    });
    const cardHover = results.find((match) => match.pattern.id === 'P64');
    expect(cardHover?.conflicts.map((pattern) => pattern.id)).toContain('P6');
  });

  it('never returns zero-relevance results and respects the limit', () => {
    const results = retrievePatterns({
      text: 'zzzz unmatched gibberish qqq',
      limit: 3,
    });
    expect(results).toEqual([]);
    const many = retrievePatterns({ text: 'form validation state', limit: 2 });
    expect(many).toHaveLength(2);
    expect(PATTERNS.length).toBe(76);
  });
});
