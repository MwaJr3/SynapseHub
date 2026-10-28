/**
 * Design system studio — inspect the primitive→semantic→component token graph,
 * its integrity validation, the generated CSS/Tailwind artifacts, and run a
 * token-only restyle that never touches product logic.
 */
import { useMemo, useState } from 'react';
import {
  BASELINE_SCALES,
  REQUIRED_TOKEN_FAMILIES,
  TOKEN_GRAPH,
  generateCssCustomProperties,
  generateTailwindSnippet,
  planRestyle,
  validateTokenGraph,
  type RestyleDecision,
} from '@/features/ux-engine';
import { CodeBlock } from './presenters';

export function TokenSystemView() {
  const issues = useMemo(() => validateTokenGraph(TOKEN_GRAPH), []);
  const css = useMemo(() => generateCssCustomProperties(TOKEN_GRAPH), []);
  const tailwind = useMemo(() => generateTailwindSnippet(TOKEN_GRAPH), []);

  const [accent, setAccent] = useState('#0c766f');
  const [radius, setRadius] = useState(16);
  const [motion, setMotion] = useState(200);
  const decisions = useMemo(
    () =>
      planRestyle({ accentHex: accent, radiusPx: radius, motionMs: motion }),
    [accent, radius, motion],
  );

  const layerCounts = ['primitive', 'semantic', 'component'].map((layer) => ({
    layer,
    count: TOKEN_GRAPH.nodes.filter((node) => node.layer === layer).length,
  }));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {layerCounts.map((entry) => (
          <div
            key={entry.layer}
            className="rounded-card border border-line bg-panel p-5"
          >
            <p className="eyebrow">{entry.layer} tokens</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {entry.count}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`rounded-card border p-4 text-sm ${
          issues.length === 0
            ? 'border-emerald-500/40 bg-emerald-500/[0.07] text-ink'
            : 'border-red-500/40 bg-red-500/[0.07]'
        }`}
        role="status"
      >
        {issues.length === 0
          ? `Graph integrity verified — ${TOKEN_GRAPH.nodes.length} tokens resolve through primitive → semantic → component with no orphans, and all ${REQUIRED_TOKEN_FAMILIES.length} required families are present.`
          : issues
              .map((issue) => `${issue.node}: ${issue.problem}`)
              .join(' · ')}
      </div>

      <section aria-labelledby="ux-scales">
        <h3 id="ux-scales" className="mb-3 text-sm font-semibold text-ink">
          Baseline scales
        </h3>
        <dl className="grid gap-3 md:grid-cols-2">
          <ScaleRow
            term="Spacing"
            detail={`${BASELINE_SCALES.spacing.join(' / ')} px (4px base)`}
          />
          <ScaleRow
            term="Radius"
            detail={`${BASELINE_SCALES.radius.join(' / ')} px`}
          />
          <ScaleRow
            term="Motion"
            detail={`${BASELINE_SCALES.motion.min}–${BASELINE_SCALES.motion.max}ms shared vocabulary`}
          />
          <ScaleRow
            term="Touch / icon"
            detail={`${BASELINE_SCALES.icon.touchArea}px target · ${BASELINE_SCALES.icon.boundingBox}px icon box`}
          />
          <ScaleRow
            term="Grid"
            detail={`${BASELINE_SCALES.grid.columns} columns · gutters ${BASELINE_SCALES.grid.gutters.join(' / ')} px`}
          />
          <ScaleRow
            term="Stacking"
            detail={`named layers ${BASELINE_SCALES.stacking.join(' / ')}`}
          />
        </dl>
      </section>

      <section aria-labelledby="ux-restyle">
        <h3 id="ux-restyle" className="mb-1 text-sm font-semibold text-ink">
          /restyle — token-only changes
        </h3>
        <p className="mb-4 text-xs text-ink-muted">
          Adjust the semantic tokens; every consuming component re-themes
          automatically while component APIs and state models stay untouched.
        </p>
        <div className="grid gap-4 rounded-card border border-line bg-panel p-5 md:grid-cols-3">
          <label className="text-xs text-ink-muted">
            Accent token
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-2 py-1.5">
              <input
                type="color"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-0 p-0"
                aria-label="Accent colour"
              />
              <span className="font-mono text-ink">{accent}</span>
            </span>
          </label>
          <label className="text-xs text-ink-muted">
            Card radius ({radius}px)
            <input
              type="range"
              min={4}
              max={24}
              step={4}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="mt-3 w-full accent-[rgb(var(--accent))]"
            />
          </label>
          <label className="text-xs text-ink-muted">
            Fast motion ({motion}ms)
            <input
              type="range"
              min={50}
              max={700}
              step={10}
              value={motion}
              onChange={(event) => setMotion(Number(event.target.value))}
              className="mt-3 w-full accent-[rgb(var(--accent))]"
            />
          </label>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {decisions.map((decision: RestyleDecision) => (
            <li
              key={decision.token}
              className="rounded-card border border-line bg-panel p-4"
            >
              <p className="font-mono text-2xs uppercase tracking-wider text-accent">
                {decision.token}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                <span className="line-through">{decision.before}</span> →{' '}
                <span className="font-medium text-ink">{decision.after}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                {decision.reason}
              </p>
              <p className="mono-meta mt-2">
                {decision.patternIds.join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <CodeBlock label="tokens" language="css" content={css} />
        <CodeBlock label="tailwind.config" language="js" content={tailwind} />
      </div>
    </div>
  );
}

function ScaleRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-card border border-line bg-panel p-4">
      <dt className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
        {term}
      </dt>
      <dd className="mt-1 text-sm text-ink-muted">{detail}</dd>
    </div>
  );
}
