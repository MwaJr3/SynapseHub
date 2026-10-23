import type { DiagramFlow } from '@/types/project';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/**
 * Renders a case-study workflow as a numbered flow. Drawn with HTML/CSS rather
 * than an image so it stays sharp, themeable and readable on narrow screens
 * (where it becomes a vertical list).
 */
export function FlowDiagram({
  flow,
  orientation = 'horizontal',
  className,
}: {
  flow: DiagramFlow;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  const labelledById = `flow-${flow.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  return (
    <figure className={cn('not-italic', className)} aria-labelledby={labelledById}>
      <figcaption id={labelledById} className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-fg">{flow.title}</span>
        {flow.caption ? <span className="text-xs text-fg-subtle">{flow.caption}</span> : null}
      </figcaption>

      <ol
        className={cn(
          orientation === 'horizontal'
            ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7'
            : 'flex flex-col gap-2',
        )}
      >
        {flow.steps.map((step, index) => (
          <li
            key={step.label}
            className={cn(
              'relative rounded-lg border border-line bg-surface px-3 py-2.5',
              orientation === 'horizontal' && 'lg:mr-3',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--prj-soft)] font-mono text-[0.65rem] font-semibold text-[var(--prj)]"
              >
                {index + 1}
              </span>
              <span className="text-[0.82rem] font-semibold text-fg">{step.label}</span>
            </div>
            <p className="mt-1.5 text-[0.78rem] leading-snug text-fg-muted">{step.detail}</p>

            {orientation === 'horizontal' && index < flow.steps.length - 1 ? (
              <Icon
                name="chevron-right"
                size={14}
                aria-hidden
                className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-fg-subtle lg:block"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}

/**
 * Layered architecture diagram: one row per architectural layer with its
 * responsibilities. Deliberately plain — it communicates structure, not decor.
 */
export function ArchitectureDiagram({
  layers,
  className,
}: {
  layers: { layer: string; items: string[] }[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {layers.map((layer, index) => (
        <div key={layer.layer} className="relative">
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-5 items-center justify-center rounded bg-[var(--prj-soft)] font-mono text-[0.62rem] font-semibold text-[var(--prj)]"
              >
                {index + 1}
              </span>
              <h4 className="text-sm font-semibold text-fg">{layer.layer}</h4>
            </div>
            <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
              {layer.items.map((item) => (
                <li key={item} className="flex gap-2 text-[0.82rem] leading-snug text-fg-muted">
                  <span aria-hidden="true" className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-[var(--prj)] opacity-70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {index < layers.length - 1 ? (
            <div aria-hidden="true" className="flex justify-center py-0.5 text-fg-subtle">
              <Icon name="chevron-down" size={14} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
