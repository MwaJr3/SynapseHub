import { describe, expect, it } from 'vitest';
import { PATTERNS, PATTERN_DOMAINS, getPattern } from './patterns';
import { RULES } from './rules';
import { PATTERN_RELATIONSHIPS } from './relationships';

const ruleIds = new Set(RULES.map((rule) => rule.id));
const patternIds = new Set(PATTERNS.map((pattern) => pattern.id));

describe('76-pattern knowledge layer', () => {
  it('contains exactly 76 uniquely numbered patterns P1–P76', () => {
    expect(PATTERNS).toHaveLength(76);
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(76);
    PATTERNS.forEach((pattern, index) => {
      expect(pattern.number).toBe(index + 1);
      expect(pattern.id).toBe(`P${index + 1}`);
    });
  });

  it('every pattern carries evidence, a slug matching the evidence, guidance and tags', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.evidence).toBe(`${pattern.slug}.mp4`);
      expect(pattern.summary.length).toBeGreaterThan(20);
      expect(pattern.do.length).toBeGreaterThanOrEqual(2);
      expect(pattern.dont.length).toBeGreaterThanOrEqual(1);
      expect(pattern.tags.length).toBeGreaterThanOrEqual(3);
      expect(pattern.accessibility.length).toBeGreaterThanOrEqual(1);
      expect(pattern.responsive.length).toBeGreaterThanOrEqual(1);
      expect(PATTERN_DOMAINS).toContain(pattern.domain);
    }
  });

  it('every pattern references at least one rule that exists in the catalog', () => {
    for (const pattern of PATTERNS) {
      expect(
        pattern.ruleIds.length,
        `${pattern.id} has no rules`,
      ).toBeGreaterThanOrEqual(1);
      for (const ruleId of pattern.ruleIds) {
        expect(
          ruleIds.has(ruleId),
          `${pattern.id} references unknown rule ${ruleId}`,
        ).toBe(true);
      }
    }
  });

  it('rule-to-pattern links are symmetric with the rule catalog', () => {
    for (const rule of RULES) {
      for (const patternId of rule.patternIds) {
        const pattern = getPattern(patternId);
        expect(
          pattern.ruleIds,
          `${rule.id} → ${patternId} is not reciprocated`,
        ).toContain(rule.id);
      }
    }
  });

  it('related and conflict links only point at existing patterns', () => {
    for (const pattern of PATTERNS) {
      for (const ref of [...pattern.related, ...pattern.conflicts]) {
        expect(
          patternIds.has(ref),
          `${pattern.id} references missing pattern ${ref}`,
        ).toBe(true);
      }
    }
  });

  it('relationship groups reference real patterns and carry an interpretation', () => {
    expect(PATTERN_RELATIONSHIPS.length).toBeGreaterThanOrEqual(10);
    for (const group of PATTERN_RELATIONSHIPS) {
      expect(group.members.length).toBeGreaterThanOrEqual(2);
      expect(group.interpretation.length).toBeGreaterThan(10);
      for (const member of group.members)
        expect(patternIds.has(member)).toBe(true);
    }
  });
});

describe('pattern write-ups are carried in full', () => {
  it('every record carries its own source write-up', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.knowledge.number).toBe(pattern.number);
      const squash = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
      // The write-up's title may carry a longer subtitle ("CSS :has() Selector").
      expect(squash(pattern.knowledge.title)).toContain(squash(pattern.title));
      expect(pattern.knowledge.insights.length).toBeGreaterThanOrEqual(4);
      expect(pattern.knowledge.do.length).toBeGreaterThanOrEqual(1);
      expect(pattern.knowledge.dont.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the specific numbers and techniques the write-ups state', () => {
    const text = (n: number) =>
      JSON.stringify(getPattern(`P${n}`).thresholds).toLowerCase();
    expect(text(9)).toContain('250ms'); // exits shorter than entrances
    expect(text(62)).toContain('grid-template-rows');
    expect(text(44)).toContain('isolation: isolate');
    expect(text(5)).toContain('4.5:1');
    expect(text(60)).toContain('one-time-code');
    expect(text(1)).toContain(':user-invalid');
  });

  it('has no markdown residue or doubled-percent typos in the write-ups', () => {
    for (const pattern of PATTERNS) {
      const all = [
        ...pattern.knowledge.insights,
        ...pattern.knowledge.do,
        ...pattern.knowledge.dont,
      ].join('\n');
      expect(all, `P${pattern.number}`).not.toMatch(/%%|\*\*\*|\*\*Do:\*\*/);
    }
  });
});
