import { describe, expect, it } from 'vitest';
import {
  BASELINE_SCALES,
  REQUIRED_TOKEN_FAMILIES,
  TOKEN_GRAPH,
  generateCssCustomProperties,
  generateTailwindSnippet,
  planRestyle,
  validateTokenGraph,
} from './tokens';

describe('token graph', () => {
  it('validates with no orphan or hard-coded component tokens', () => {
    expect(validateTokenGraph()).toEqual([]);
  });

  it('covers all fourteen required token families across three layers', () => {
    const families = new Set(TOKEN_GRAPH.nodes.map((node) => node.family));
    for (const family of REQUIRED_TOKEN_FAMILIES) {
      expect(families.has(family), `missing family ${family}`).toBe(true);
    }
    const layers = new Set(TOKEN_GRAPH.nodes.map((node) => node.layer));
    expect(layers).toEqual(new Set(['primitive', 'semantic', 'component']));
  });

  it('detects a component token that hard-codes a primitive', () => {
    const issues = validateTokenGraph({
      nodes: [
        ...TOKEN_GRAPH.nodes,
        {
          name: 'rogue-token',
          layer: 'component',
          family: 'color',
          value: '#fff',
          refs: ['white'],
        },
      ],
    });
    expect(issues.some((issue) => issue.node === 'rogue-token')).toBe(true);
  });

  it('detects orphan semantic tokens and missing families', () => {
    const issues = validateTokenGraph({
      nodes: [
        ...TOKEN_GRAPH.nodes,
        {
          name: 'orphan',
          layer: 'semantic',
          family: 'color',
          value: 'red',
          refs: [],
        },
      ],
    });
    expect(issues.some((issue) => issue.node === 'orphan')).toBe(true);
  });

  it('exposes the documented baseline scales', () => {
    expect(BASELINE_SCALES.spacing).toEqual([4, 8, 12, 16, 24, 32, 48, 64]);
    expect(BASELINE_SCALES.radius).toEqual([4, 8, 12, 16, 24]);
    expect(BASELINE_SCALES.icon.touchArea).toBe(44);
  });
});

describe('token adapters and restyle', () => {
  it('emits light and dark CSS custom properties', () => {
    const css = generateCssCustomProperties();
    expect(css).toContain(':root');
    expect(css).toContain('.dark');
    expect(css).toContain('--accent:');
  });

  it('emits a Tailwind snippet driven by semantic tokens', () => {
    const snippet = generateTailwindSnippet();
    expect(snippet).toContain('rgb(var(--accent)');
    expect(snippet).toContain('borderRadius');
  });

  it('plans token-only restyle decisions and warns on out-of-vocabulary motion', () => {
    const decisions = planRestyle({
      accentHex: '#7c3aed',
      radiusPx: 16,
      motionMs: 700,
    });
    expect(decisions[0]?.after).toBe('#7c3aed');
    expect(decisions.some((d) => d.reason.includes('clamp'))).toBe(true);
    expect(decisions.every((d) => d.patternIds.length > 0)).toBe(true);
  });
});
