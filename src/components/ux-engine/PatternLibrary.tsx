/**
 * Pattern Knowledge Layer browser — all 76 patterns with hybrid retrieval,
 * domain filters and a detail panel showing rules, do/don't guidance,
 * thresholds, accessibility and responsive implications plus evidence.
 */
import { useMemo, useState } from 'react';
import {
  PATTERNS,
  PATTERN_DOMAINS,
  getPattern,
  getRule,
  relationshipsFor,
  retrievePatterns,
  type PatternDomain,
  type UXPattern,
} from '@/features/ux-engine';
import { cn } from '@/lib/cn';

export function PatternLibrary() {
  const [query, setQuery] = useState('undo destructive error recovery');
  const [domain, setDomain] = useState<PatternDomain | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string>('P48');

  const results = useMemo(() => {
    if (query.trim().length === 0 && domain === 'all') {
      return PATTERNS.map((pattern) => ({
        pattern,
        score: 0,
        reasons: [] as string[],
        conflicts: [] as UXPattern[],
      }));
    }
    return retrievePatterns({
      text: query,
      domains: domain === 'all' ? undefined : [domain],
      limit: 76,
    });
  }, [query, domain]);

  const selected = getPattern(selectedId);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div>
        <label
          className="block text-sm font-medium text-ink"
          htmlFor="pattern-search"
        >
          Search the pattern library
        </label>
        <input
          id="pattern-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “skeleton loading”, “focus”, “offline queue”…"
          className="mt-2 w-full rounded-card border border-line-strong bg-surface-raised px-4 py-3 text-sm"
        />
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by domain"
        >
          <DomainChip
            active={domain === 'all'}
            onClick={() => setDomain('all')}
            label="all"
          />
          {PATTERN_DOMAINS.map((value) => (
            <DomainChip
              key={value}
              active={domain === value}
              onClick={() => setDomain(value)}
              label={value}
            />
          ))}
        </div>
        <p className="mono-meta mt-3" aria-live="polite">
          {results.length} of 76 patterns
        </p>

        <ul className="mt-4 grid max-h-[36rem] gap-2 overflow-auto pr-1">
          {results.map(({ pattern, score }) => (
            <li key={pattern.id}>
              <button
                type="button"
                onClick={() => setSelectedId(pattern.id)}
                aria-pressed={selectedId === pattern.id}
                className={cn(
                  'w-full rounded-card border p-3 text-left transition-colors',
                  selectedId === pattern.id
                    ? 'border-accent bg-accent/[0.07]'
                    : 'border-line bg-panel hover:border-line-strong',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
                    {pattern.id}
                  </span>
                  {score > 0 && (
                    <span className="font-mono text-2xs text-accent">
                      match {score}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm font-medium text-ink">
                  {pattern.title}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {pattern.summary}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="rounded-card border border-dashed border-line-strong p-4 text-sm text-ink-muted">
              No patterns match. Clear the domain filter or broaden the search.
            </li>
          )}
        </ul>
      </div>

      <PatternDetail pattern={selected} />
    </div>
  );
}

function DomainChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('chip chip-interactive', active && 'chip-active')}
    >
      {label}
    </button>
  );
}

function PatternDetail({ pattern }: { pattern: UXPattern }) {
  const groups = relationshipsFor(pattern.id);
  return (
    <article className="rounded-card border border-line bg-panel p-6 lg:sticky lg:top-24 lg:self-start">
      <p className="eyebrow">
        {pattern.id} · {pattern.domain}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">
        {pattern.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {pattern.summary}
      </p>
      <p className="mono-meta mt-3">
        Evidence: <span className="text-ink">{pattern.evidence}</span>
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <GuidanceList title="Do" items={pattern.do} tone="positive" />
        <GuidanceList title="Don't" items={pattern.dont} tone="negative" />
      </div>

      {pattern.thresholds.length > 0 && (
        <div className="mt-5">
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Thresholds
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pattern.thresholds.map((threshold) => (
              <li key={threshold} className="chip">
                {threshold}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
          Executable rules
        </h4>
        <ul className="mt-2 space-y-2">
          {pattern.ruleIds.map((ruleId) => {
            const rule = getRule(ruleId);
            return (
              <li
                key={ruleId}
                className="rounded-lg border border-line bg-surface-raised p-3"
              >
                <p className="font-mono text-2xs uppercase tracking-wider text-accent">
                  {ruleId} · {rule.family} · {rule.defaultSeverity}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {rule.statement}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Accessibility
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {pattern.accessibility.join(' ')}
          </p>
        </div>
        <div>
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Responsive
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {pattern.responsive.join(' ')}
          </p>
        </div>
      </div>

      {pattern.related.length > 0 && (
        <div className="mt-5">
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Composes with
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pattern.related.map((id) => (
              <li key={id} className="chip">
                {id} {getPattern(id).title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.conflicts.length > 0 && (
        <div className="mt-4">
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Trade-offs
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pattern.conflicts.map((id) => (
              <li key={id} className="chip border-caution/50 text-caution">
                {id} {getPattern(id).title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-surface-raised p-3">
          <h4 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-subtle">
            Composition group
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {groups.map((group) => group.interpretation).join(' ')}
          </p>
        </div>
      )}
    </article>
  );
}

function GuidanceList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'negative';
}) {
  return (
    <div>
      <h4
        className={cn(
          'font-mono text-2xs uppercase tracking-[0.14em]',
          tone === 'positive'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-500',
        )}
      >
        {title}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-xs leading-relaxed text-ink-muted"
          >
            <span aria-hidden="true">{tone === 'positive' ? '✓' : '✕'}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
