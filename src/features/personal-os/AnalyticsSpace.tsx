import { useMemo, useState } from 'react';
import { analyticsEvidenceNote, monthlyTrend, quarterlyTrend, type TrendPoint } from './analytics';
import type { PersonalSystemData } from './types';

function MetricBars({
  title,
  points,
  value,
  format,
}: {
  title: string;
  points: TrendPoint[];
  value: (point: TrendPoint) => number;
  format: (number: number) => string;
}) {
  const maximum = Math.max(1, ...points.map(value));
  return (
    <article className="rounded-card border border-line bg-panel-strong p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid gap-3">
        {points.map((point) => {
          const amount = value(point);
          return <div key={point.period}><div className="flex justify-between gap-3 text-xs"><span className="font-mono text-ink-muted">{point.period}</span><span className="text-ink">{format(amount)}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-panel"><div className="h-full rounded-pill bg-accent" style={{ width: `${Math.round((amount / maximum) * 100)}%` }} /></div></div>;
        })}
      </div>
    </article>
  );
}

export function AnalyticsSpace({ data }: { data: PersonalSystemData }) {
  const [resolution, setResolution] = useState<'month' | 'quarter'>('month');
  const points = useMemo(
    () => (resolution === 'month' ? monthlyTrend(data) : quarterlyTrend(data)),
    [data, resolution],
  );
  const visible = points.slice(-6);
  const note = analyticsEvidenceNote(visible);

  return (
    <div id="system-panel-analytics" role="tabpanel" aria-labelledby="system-tab-analytics" className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow">Personal intelligence</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Observe trends without inventing a diagnosis</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">These charts summarize recorded behaviour. They do not claim that one domain caused another, and missing periods remain missing rather than becoming zero.</p></div>
          <div className="flex rounded-pill border border-line p-1"><button type="button" className={`rounded-pill px-3 py-1.5 text-xs font-medium ${resolution === 'month' ? 'bg-accent text-accent-ink' : 'text-ink-muted'}`} onClick={() => setResolution('month')}>Monthly</button><button type="button" className={`rounded-pill px-3 py-1.5 text-xs font-medium ${resolution === 'quarter' ? 'bg-accent text-accent-ink' : 'text-ink-muted'}`} onClick={() => setResolution('quarter')}>Quarterly</button></div>
        </div>
        <p className="mt-5 rounded-card border border-caution/30 bg-caution/10 p-3 text-sm text-ink-muted">{note}</p>
      </section>

      {visible.length ? <section className="grid gap-4 lg:grid-cols-2"><MetricBars title="Completed actions" points={visible} value={(point) => point.completedActions} format={(value) => `${value} complete`} /><MetricBars title="Planned action hours" points={visible} value={(point) => point.plannedHours} format={(value) => `${value.toFixed(1)} h`} /><MetricBars title="Average recorded energy" points={visible} value={(point) => point.averageEnergy ?? 0} format={(value) => value ? `${value.toFixed(1)} / 5` : 'No data'} /><MetricBars title="Blocker occurrences" points={visible} value={(point) => point.blockerCount} format={(value) => `${value} logged`} /></section> : <section className="card p-5 sm:p-6"><p className="eyebrow">No observation window</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Add a few dated records before interpreting a pattern</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">A completed action, energy check-in, blocker occurrence, or review will create evidence here. The application will not turn an absence of data into a negative score.</p></section>}

      {visible.length > 0 && <section className="card p-5 sm:p-6"><p className="eyebrow">Evidence table</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Inspect the observation behind each bar</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-[0.08em] text-ink-subtle"><tr><th className="p-3">Period</th><th className="p-3">Completed</th><th className="p-3">Planned hours</th><th className="p-3">Energy</th><th className="p-3">Blockers</th><th className="p-3">Reviews</th></tr></thead><tbody>{visible.map((point) => <tr key={point.period} className="border-b border-line/70"><td className="p-3 font-mono text-xs text-ink">{point.period}</td><td className="p-3 text-ink-muted">{point.completedActions}</td><td className="p-3 text-ink-muted">{point.plannedHours.toFixed(1)}</td><td className="p-3 text-ink-muted">{point.averageEnergy?.toFixed(1) ?? '—'}</td><td className="p-3 text-ink-muted">{point.blockerCount}{point.blockerIntensity ? ` (${point.blockerIntensity.toFixed(1)} / 5)` : ''}</td><td className="p-3 text-ink-muted">{point.reviewCount}</td></tr>)}</tbody></table></div></section>}
    </div>
  );
}
