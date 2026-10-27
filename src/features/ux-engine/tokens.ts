/**
 * Design System Engine — tokens as executable policy.
 *
 * Implements the primitive → semantic → component token graph, the fourteen
 * required token families, the baseline scales, light/dark theme sets and the
 * graph integrity checks that keep component tokens from hard-coding values.
 * Adapters emit CSS custom properties and Tailwind theme entries from the same
 * graph, so code and documentation can never drift apart.
 */
import {
  MOTION_RANGE_MS,
  RADIUS_SCALE,
  SPACING_SCALE,
  STACKING_LAYERS,
} from './constraints';
import type {
  RestyleDecision,
  TokenFamily,
  TokenGraph,
  TokenNode,
} from './types';

// ---------------------------------------------------------------------------
// Baseline scales (design-system foundation)
// ---------------------------------------------------------------------------

export const BASELINE_SCALES = {
  spacing: [...SPACING_SCALE],
  grid: { columns: 12, gutters: [16, 24, 32] },
  icon: { boundingBox: 24, touchArea: 44 },
  radius: [...RADIUS_SCALE],
  motion: { min: MOTION_RANGE_MS.min, max: MOTION_RANGE_MS.max },
  focus: '3px solid rgb(var(--focus))',
  stacking: [...STACKING_LAYERS],
} as const;

export const REQUIRED_TOKEN_FAMILIES: TokenFamily[] = [
  'color',
  'typography',
  'spacing',
  'grid',
  'radius',
  'border',
  'elevation',
  'icons',
  'motion',
  'breakpoints',
  'touch',
  'stacking',
  'focus',
  'opacity',
];

// ---------------------------------------------------------------------------
// Primitive layer — raw values with no product meaning
// ---------------------------------------------------------------------------

const primitives: TokenNode[] = [
  // Color primitives (light theme values; dark remaps at the semantic layer)
  {
    name: 'blue-600',
    layer: 'primitive',
    family: 'color',
    value: '#2547d6',
    refs: [],
  },
  {
    name: 'teal-600',
    layer: 'primitive',
    family: 'color',
    value: '#0c766f',
    refs: [],
  },
  {
    name: 'amber-700',
    layer: 'primitive',
    family: 'color',
    value: '#96520c',
    refs: [],
  },
  {
    name: 'ink-900',
    layer: 'primitive',
    family: 'color',
    value: '#0e1523',
    refs: [],
  },
  {
    name: 'ink-600',
    layer: 'primitive',
    family: 'color',
    value: '#4f5b70',
    refs: [],
  },
  {
    name: 'ink-400',
    layer: 'primitive',
    family: 'color',
    value: '#79859a',
    refs: [],
  },
  {
    name: 'slate-0',
    layer: 'primitive',
    family: 'color',
    value: '#f7f9fc',
    refs: [],
  },
  {
    name: 'white',
    layer: 'primitive',
    family: 'color',
    value: '#ffffff',
    refs: [],
  },
  {
    name: 'slate-100',
    layer: 'primitive',
    family: 'color',
    value: '#f1f5fa',
    refs: [],
  },
  {
    name: 'slate-200',
    layer: 'primitive',
    family: 'color',
    value: '#dee4ee',
    refs: [],
  },
  {
    name: 'slate-300',
    layer: 'primitive',
    family: 'color',
    value: '#c5cfde',
    refs: [],
  },
  {
    name: 'navy-950',
    layer: 'primitive',
    family: 'color',
    value: '#080b12',
    refs: [],
  },
  {
    name: 'navy-900',
    layer: 'primitive',
    family: 'color',
    value: '#0d111a',
    refs: [],
  },
  {
    name: 'navy-800',
    layer: 'primitive',
    family: 'color',
    value: '#101520',
    refs: [],
  },
  {
    name: 'navy-700',
    layer: 'primitive',
    family: 'color',
    value: '#161c2a',
    refs: [],
  },
  {
    name: 'blue-300',
    layer: 'primitive',
    family: 'color',
    value: '#7ea2ff',
    refs: [],
  },
  {
    name: 'teal-300',
    layer: 'primitive',
    family: 'color',
    value: '#52cdba',
    refs: [],
  },
  // Typography primitives
  {
    name: 'font-sans',
    layer: 'primitive',
    family: 'typography',
    value: '"Inter Variable", Inter, system-ui, sans-serif',
    refs: [],
  },
  {
    name: 'font-mono',
    layer: 'primitive',
    family: 'typography',
    value: '"JetBrains Mono Variable", ui-monospace, monospace',
    refs: [],
  },
  {
    name: 'text-14',
    layer: 'primitive',
    family: 'typography',
    value: '0.875rem',
    refs: [],
  },
  {
    name: 'text-16',
    layer: 'primitive',
    family: 'typography',
    value: '1rem',
    refs: [],
  },
  {
    name: 'text-24',
    layer: 'primitive',
    family: 'typography',
    value: '1.5rem',
    refs: [],
  },
  {
    name: 'text-40',
    layer: 'primitive',
    family: 'typography',
    value: '2.5rem',
    refs: [],
  },
  // Radius, border, elevation, opacity, motion, focus, stacking, touch, grid, breakpoints
  ...RADIUS_SCALE.map((value) => ({
    name: `radius-${value}`,
    layer: 'primitive' as const,
    family: 'radius' as TokenFamily,
    value: `${value}px`,
    refs: [] as string[],
  })),
  ...SPACING_SCALE.map((value) => ({
    name: `space-${value}`,
    layer: 'primitive' as const,
    family: 'spacing' as TokenFamily,
    value: `${value}px`,
    refs: [] as string[],
  })),
  {
    name: 'border-1',
    layer: 'primitive',
    family: 'border',
    value: '1px solid rgb(var(--border))',
    refs: [],
  },
  {
    name: 'elevation-1',
    layer: 'primitive',
    family: 'elevation',
    value: '0 1px 2px rgb(15 22 36 / 0.06)',
    refs: [],
  },
  {
    name: 'elevation-2',
    layer: 'primitive',
    family: 'elevation',
    value: '0 8px 24px -12px rgb(15 22 36 / 0.18)',
    refs: [],
  },
  {
    name: 'elevation-3',
    layer: 'primitive',
    family: 'elevation',
    value: '0 24px 56px -20px rgb(15 22 36 / 0.32)',
    refs: [],
  },
  {
    name: 'opacity-45',
    layer: 'primitive',
    family: 'opacity',
    value: '0.45',
    refs: [],
  },
  {
    name: 'opacity-65',
    layer: 'primitive',
    family: 'opacity',
    value: '0.65',
    refs: [],
  },
  {
    name: 'opacity-85',
    layer: 'primitive',
    family: 'opacity',
    value: '0.85',
    refs: [],
  },
  {
    name: 'icon-24',
    layer: 'primitive',
    family: 'icons',
    value: '24px',
    refs: [],
  },
  {
    name: 'touch-44',
    layer: 'primitive',
    family: 'touch',
    value: '44px',
    refs: [],
  },
  {
    name: 'motion-150',
    layer: 'primitive',
    family: 'motion',
    value: '150ms',
    refs: [],
  },
  {
    name: 'motion-250',
    layer: 'primitive',
    family: 'motion',
    value: '250ms',
    refs: [],
  },
  {
    name: 'motion-400',
    layer: 'primitive',
    family: 'motion',
    value: '400ms',
    refs: [],
  },
  {
    name: 'ease-out-soft',
    layer: 'primitive',
    family: 'motion',
    value: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    refs: [],
  },
  {
    name: 'focus-ring',
    layer: 'primitive',
    family: 'focus',
    value: '3px solid rgb(var(--focus))',
    refs: [],
  },
  ...STACKING_LAYERS.map((value) => ({
    name: `layer-${value}`,
    layer: 'primitive' as const,
    family: 'stacking' as TokenFamily,
    value: `${value}`,
    refs: [] as string[],
  })),
  {
    name: 'grid-12',
    layer: 'primitive',
    family: 'grid',
    value: 'repeat(12, minmax(0, 1fr))',
    refs: [],
  },
  {
    name: 'bp-sm',
    layer: 'primitive',
    family: 'breakpoints',
    value: '640px',
    refs: [],
  },
  {
    name: 'bp-md',
    layer: 'primitive',
    family: 'breakpoints',
    value: '768px',
    refs: [],
  },
  {
    name: 'bp-lg',
    layer: 'primitive',
    family: 'breakpoints',
    value: '1024px',
    refs: [],
  },
  {
    name: 'bp-xl',
    layer: 'primitive',
    family: 'breakpoints',
    value: '1280px',
    refs: [],
  },
];

// ---------------------------------------------------------------------------
// Semantic layer — role-based names that remap per theme
// ---------------------------------------------------------------------------

function semanticColor(
  name: string,
  lightRef: string,
  darkRef: string,
): [TokenNode, TokenNode] {
  return [
    {
      name,
      layer: 'semantic',
      family: 'color',
      value: `var(--${name})`,
      refs: [lightRef],
      theme: 'light',
    },
    {
      name,
      layer: 'semantic',
      family: 'color',
      value: `var(--${name})`,
      refs: [darkRef],
      theme: 'dark',
    },
  ];
}

const semantics: TokenNode[] = [
  ...semanticColor('surface', 'slate-0', 'navy-950'),
  ...semanticColor('surface-raised', 'white', 'navy-900'),
  ...semanticColor('panel', 'white', 'navy-800'),
  ...semanticColor('panel-strong', 'slate-100', 'navy-700'),
  ...semanticColor('border', 'slate-200', 'navy-700'),
  ...semanticColor('border-strong', 'slate-300', 'slate-300'),
  ...semanticColor('text', 'ink-900', 'slate-0'),
  ...semanticColor('text-muted', 'ink-600', 'ink-400'),
  ...semanticColor('accent', 'blue-600', 'blue-300'),
  ...semanticColor('accent-soft', 'blue-600', 'blue-300'),
  ...semanticColor('signal', 'teal-600', 'teal-300'),
  ...semanticColor('caution', 'amber-700', 'amber-700'),
  ...semanticColor('focus', 'blue-600', 'blue-300'),
  {
    name: 'text-body',
    layer: 'semantic',
    family: 'typography',
    value: 'var(--text-body)',
    refs: ['text-16', 'font-sans'],
  },
  {
    name: 'text-meta',
    layer: 'semantic',
    family: 'typography',
    value: 'var(--text-meta)',
    refs: ['text-14', 'font-mono'],
  },
  {
    name: 'text-heading',
    layer: 'semantic',
    family: 'typography',
    value: 'var(--text-heading)',
    refs: ['text-40', 'font-sans'],
  },
  {
    name: 'space-group',
    layer: 'semantic',
    family: 'spacing',
    value: 'var(--space-group)',
    refs: ['space-16'],
  },
  {
    name: 'space-section',
    layer: 'semantic',
    family: 'spacing',
    value: 'var(--space-section)',
    refs: ['space-48'],
  },
  {
    name: 'radius-card',
    layer: 'semantic',
    family: 'radius',
    value: 'var(--radius-card)',
    refs: ['radius-12'],
  },
  {
    name: 'elevation-raised',
    layer: 'semantic',
    family: 'elevation',
    value: 'var(--elevation-raised)',
    refs: ['elevation-1', 'elevation-2'],
  },
  {
    name: 'elevation-overlay',
    layer: 'semantic',
    family: 'elevation',
    value: 'var(--elevation-overlay)',
    refs: ['elevation-3'],
  },
  {
    name: 'motion-fast',
    layer: 'semantic',
    family: 'motion',
    value: 'var(--motion-fast)',
    refs: ['motion-150', 'ease-out-soft'],
  },
  {
    name: 'motion-deliberate',
    layer: 'semantic',
    family: 'motion',
    value: 'var(--motion-deliberate)',
    refs: ['motion-400', 'ease-out-soft'],
  },
  {
    name: 'touch-target',
    layer: 'semantic',
    family: 'touch',
    value: 'var(--touch-target)',
    refs: ['touch-44'],
  },
  {
    name: 'ring-focus',
    layer: 'semantic',
    family: 'focus',
    value: 'var(--ring-focus)',
    refs: ['focus-ring'],
  },
  {
    name: 'layer-overlay',
    layer: 'semantic',
    family: 'stacking',
    value: 'var(--layer-overlay)',
    refs: ['layer-40'],
  },
  {
    name: 'layer-toast',
    layer: 'semantic',
    family: 'stacking',
    value: 'var(--layer-toast)',
    refs: ['layer-50'],
  },
  {
    name: 'icon-glyph',
    layer: 'semantic',
    family: 'icons',
    value: 'var(--icon-glyph)',
    refs: ['icon-24'],
  },
];

// ---------------------------------------------------------------------------
// Component layer — contracts that only reference semantic tokens
// ---------------------------------------------------------------------------

const components: TokenNode[] = [
  {
    name: 'button-primary-bg',
    layer: 'component',
    family: 'color',
    value: 'rgb(var(--accent))',
    refs: ['accent'],
  },
  {
    name: 'button-primary-ink',
    layer: 'component',
    family: 'color',
    value: 'rgb(var(--panel))',
    refs: ['panel'],
  },
  {
    name: 'button-min-target',
    layer: 'component',
    family: 'touch',
    value: 'var(--touch-target)',
    refs: ['touch-target'],
  },
  {
    name: 'button-radius',
    layer: 'component',
    family: 'radius',
    value: 'var(--radius-card)',
    refs: ['radius-card'],
  },
  {
    name: 'button-motion',
    layer: 'component',
    family: 'motion',
    value: 'var(--motion-fast)',
    refs: ['motion-fast'],
  },
  {
    name: 'card-padding',
    layer: 'component',
    family: 'spacing',
    value: 'var(--space-group)',
    refs: ['space-group'],
  },
  {
    name: 'card-radius',
    layer: 'component',
    family: 'radius',
    value: 'var(--radius-card)',
    refs: ['radius-card'],
  },
  {
    name: 'card-elevation',
    layer: 'component',
    family: 'elevation',
    value: 'var(--elevation-raised)',
    refs: ['elevation-raised'],
  },
  {
    name: 'input-focus-ring',
    layer: 'component',
    family: 'focus',
    value: 'var(--ring-focus)',
    refs: ['ring-focus'],
  },
  {
    name: 'overlay-layer',
    layer: 'component',
    family: 'stacking',
    value: 'var(--layer-overlay)',
    refs: ['layer-overlay'],
  },
  {
    name: 'toast-layer',
    layer: 'component',
    family: 'stacking',
    value: 'var(--layer-toast)',
    refs: ['layer-toast'],
  },
  {
    name: 'icon-size',
    layer: 'component',
    family: 'icons',
    value: 'var(--icon-glyph)',
    refs: ['icon-glyph'],
  },
];

export const TOKEN_GRAPH: TokenGraph = {
  nodes: [...primitives, ...semantics, ...components],
};

// ---------------------------------------------------------------------------
// Graph integrity
// ---------------------------------------------------------------------------

export interface TokenGraphIssue {
  node: string;
  problem: string;
}

/**
 * Every semantic token must resolve to at least one primitive, and every
 * component token must resolve through semantic tokens. Orphans and hard-coded
 * component values fail the graph (TOKEN-GRAPH-01).
 */
export function validateTokenGraph(
  graph: TokenGraph = TOKEN_GRAPH,
): TokenGraphIssue[] {
  const names = new Map(graph.nodes.map((node) => [node.name, node]));
  const issues: TokenGraphIssue[] = [];

  for (const node of graph.nodes) {
    if (node.layer === 'primitive') continue;

    if (node.refs.length === 0) {
      issues.push({
        node: node.name,
        problem: `${node.layer} token has no lower-layer reference (orphan).`,
      });
      continue;
    }
    for (const ref of node.refs) {
      const target = names.get(ref);
      if (!target) {
        issues.push({
          node: node.name,
          problem: `references missing token "${ref}".`,
        });
        continue;
      }
      if (node.layer === 'semantic' && target.layer !== 'primitive') {
        issues.push({
          node: node.name,
          problem: 'semantic tokens must reference primitives directly.',
        });
      }
      if (node.layer === 'component' && target.layer === 'primitive') {
        issues.push({
          node: node.name,
          problem: `component token hard-codes primitive "${ref}"; consume a semantic token instead.`,
        });
      }
    }
  }

  const families = new Set(graph.nodes.map((node) => node.family));
  for (const family of REQUIRED_TOKEN_FAMILIES) {
    if (!families.has(family)) {
      issues.push({
        node: `family:${family}`,
        problem: 'required token family is missing from the graph.',
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Adapters — emit implementation artifacts from the graph
// ---------------------------------------------------------------------------

export function generateCssCustomProperties(
  graph: TokenGraph = TOKEN_GRAPH,
): string {
  const lines: string[] = [':root {'];
  for (const node of graph.nodes) {
    if (node.layer === 'semantic' && node.theme === 'light') {
      const primitive = graph.nodes.find(
        (candidate) => candidate.name === node.refs[0],
      );
      lines.push(`  --${node.name}: ${primitive?.value ?? node.value};`);
    }
  }
  lines.push('}', '', '.dark {');
  for (const node of graph.nodes) {
    if (node.layer === 'semantic' && node.theme === 'dark') {
      const primitive = graph.nodes.find(
        (candidate) => candidate.name === node.refs[0],
      );
      lines.push(`  --${node.name}: ${primitive?.value ?? node.value};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

export function generateTailwindSnippet(
  graph: TokenGraph = TOKEN_GRAPH,
): string {
  const colorNames = graph.nodes
    .filter((node) => node.layer === 'semantic' && node.family === 'color')
    .map((node) => node.name)
    .filter((name, index, all) => all.indexOf(name) === index);
  const entries = colorNames.map(
    (name) => `      ${name}: 'rgb(var(--${name}) / <alpha-value>)'`,
  );
  return [
    '// tailwind.config.js — generated from the engine token graph',
    'export default {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    entries.join(',\n'),
    '      },',
    `      spacing: { ${SPACING_SCALE.map((v) => `${v}: '${v}px'`).join(', ')} },`,
    `      borderRadius: { ${RADIUS_SCALE.map((v) => `${v}: '${v}px'`).join(', ')} },`,
    `      transitionDuration: { fast: '${MOTION_RANGE_MS.min + 50}ms', deliberate: '400ms' },`,
    '    },',
    '  },',
    '};',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Restyle — token-level changes that never touch product logic
// ---------------------------------------------------------------------------

export function planRestyle(opts: {
  accentHex: string;
  radiusPx: number;
  motionMs: number;
}): RestyleDecision[] {
  const decisions: RestyleDecision[] = [];
  decisions.push({
    token: 'accent',
    before: '#2547d6',
    after: opts.accentHex,
    reason:
      'Re-themes every component consuming the accent semantic token; no component code changes.',
    patternIds: ['P69', 'P13'],
  });
  decisions.push({
    token: 'radius-card',
    before: '12px',
    after: `${opts.radiusPx}px`,
    reason:
      opts.radiusPx === 12
        ? 'Already on the radius scale; no change required.'
        : 'Applies the shared radius scale so nested corners stay concentric.',
    patternIds: ['P72', 'P13'],
  });
  decisions.push({
    token: 'motion-fast',
    before: '150ms',
    after: `${opts.motionMs}ms`,
    reason:
      opts.motionMs >= MOTION_RANGE_MS.min &&
      opts.motionMs <= MOTION_RANGE_MS.max
        ? 'Inside the 100–500ms shared motion vocabulary.'
        : 'Outside the shared vocabulary; clamp to 100–500ms before shipping.',
    patternIds: ['P9', 'P21'],
  });
  return decisions;
}
