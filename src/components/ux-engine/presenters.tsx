/**
 * Presentational primitives shared by every UX engine studio view:
 * severity badges, the score gauge, a copyable code block and a tiny
 * markdown renderer for the command layer's section bodies.
 */
import { useState, type ReactNode } from 'react';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/cn';
import type { Severity } from '@/features/ux-engine';

const severityStyles: Record<Severity, string> = {
  critical: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-300',
  major:
    'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  minor: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  nice: 'border-line-strong bg-panel text-ink-muted',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2.5 py-0.5 font-mono text-2xs uppercase tracking-[0.12em]',
        severityStyles[severity],
      )}
    >
      {severity}
    </span>
  );
}

const gradeColor: Record<string, string> = {
  A: 'text-emerald-500',
  B: 'text-lime-500',
  C: 'text-amber-500',
  D: 'text-red-500',
};

export function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  return (
    <div
      className="flex items-center gap-5"
      role="img"
      aria-label={`Audit score ${score} out of 100, grade ${grade}`}
    >
      <div className="relative grid h-24 w-24 place-items-center rounded-full border-4 border-line-strong">
        <div className="text-center">
          <div
            className={cn(
              'text-2xl font-semibold tracking-tight',
              gradeColor[grade],
            )}
          >
            {score}
          </div>
          <div className="font-mono text-2xs uppercase tracking-widest text-ink-subtle">
            / 100
          </div>
        </div>
      </div>
      <div>
        <div className={cn('text-4xl font-semibold', gradeColor[grade])}>
          {grade}
        </div>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-ink-muted">
          Weighted from critical, major, minor and nice findings against the
          pattern rule set.
        </p>
      </div>
    </div>
  );
}

export function CodeBlock({
  label,
  language,
  content,
}: {
  label: string;
  language: string;
  content: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = async () => {
    const result = await copyText(content);
    setStatus(result === 'copied' ? 'copied' : 'failed');
    window.setTimeout(() => setStatus('idle'), 1800);
  };

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-panel-strong px-4 py-2">
        <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-muted">
          {label} · {language}
        </span>
        <button type="button" onClick={onCopy} className="text-button text-xs">
          {status === 'copied'
            ? 'Copied'
            : status === 'failed'
              ? 'Copy failed'
              : 'Copy'}
        </button>
      </div>
      <pre className="max-h-[26rem] overflow-auto bg-panel p-4 text-xs leading-relaxed">
        <code className="font-mono text-ink">{content}</code>
      </pre>
    </div>
  );
}

/**
 * The command layer emits a constrained markdown subset (headings, bullets,
 * numbered lines, **bold** and `code`). This renderer keeps it readable without
 * pulling a markdown dependency into the bundle.
 */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split('\n\n');
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n');
        const heading = lines[0]?.startsWith('### ')
          ? lines.shift()?.slice(4)
          : undefined;
        const listItems = lines.filter((line) => line.trim().startsWith('- '));
        const paragraphs = lines.filter(
          (line) => line.trim() && !line.trim().startsWith('- '),
        );

        return (
          <div key={blockIndex}>
            {heading && (
              <h4 className="mb-2 text-sm font-semibold text-ink">
                {inline(heading)}
              </h4>
            )}
            {paragraphs.length > 0 && (
              <p>{paragraphs.map((line) => inline(line))}</p>
            )}
            {listItems.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {listItems.map((item, index) => (
                  <li key={index}>{inline(item.trim().slice(2))}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-panel-strong px-1 py-0.5 font-mono text-xs text-accent"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={index} className="text-ink-subtle">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-panel p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[rgb(var(--accent))]"
      />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs text-ink-subtle">{hint}</span>
        )}
      </span>
    </label>
  );
}
