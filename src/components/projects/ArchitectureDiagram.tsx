import type { ArchitectureLayer, ArchitectureNode } from '@/types';
import { cn } from '@/lib/cn';

interface ArchitectureDiagramProps {
  nodes: ArchitectureNode[];
  projectName: string;
}

const layerOrder: ArchitectureLayer[] = [
  'client',
  'api',
  'domain',
  'ai',
  'integration',
  'worker',
  'data',
];

const layerLabels: Record<ArchitectureLayer, string> = {
  client: 'Client',
  api: 'API',
  domain: 'Domain logic',
  ai: 'AI provider',
  integration: 'Integration',
  worker: 'Background work',
  data: 'Data',
};

const layerAccent: Record<ArchitectureLayer, string> = {
  client: 'border-accent/50 text-accent',
  api: 'border-accent/50 text-accent',
  domain: 'border-signal/50 text-signal',
  ai: 'border-signal/50 text-signal',
  integration: 'border-caution/50 text-caution',
  worker: 'border-caution/50 text-caution',
  data: 'border-line-strong text-ink-muted',
};

/**
 * Architecture overview rendered as an ordered flow of components.
 *
 * Everything a reader needs is present as text — component names, layer,
 * description and connections — so the same information is available to a
 * screen reader, to a text browser and on a narrow phone screen. The layout is
 * a grid rather than a picture of boxes, which means nothing becomes
 * unreadable when it reflows.
 */
export function ArchitectureDiagram({
  nodes,
  projectName,
}: ArchitectureDiagramProps) {
  const ordered = [...nodes].sort(
    (a, b) => layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer),
  );
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <figure className="rounded-card border border-line bg-panel p-4 sm:p-6">
      <figcaption className="mb-5 flex flex-wrap items-center gap-3">
        <span className="chip">Architecture</span>
        <span className="prose-body text-sm">
          {projectName} components and how they connect. Described in text, in
          request order.
        </span>
      </figcaption>

      <ol className="grid gap-3 sm:grid-cols-2">
        {ordered.map((node, index) => (
          <li
            key={node.id}
            className="relative rounded-card border border-line bg-panel-strong p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mono-meta">
                  {String(index + 1).padStart(2, '0')} ·{' '}
                  {layerLabels[node.layer]}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {node.label}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-pill border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.1em]',
                  layerAccent[node.layer],
                )}
              >
                {layerLabels[node.layer]}
              </span>
            </div>

            {node.description && (
              <p className="prose-body mt-2 text-xs">{node.description}</p>
            )}

            {node.connectsTo && node.connectsTo.length > 0 && (
              <p className="mt-3 border-t border-line pt-3 text-xs text-ink-subtle">
                <span aria-hidden="true" className="font-mono">
                  →{' '}
                </span>
                Connects to{' '}
                {node.connectsTo
                  .map((target) => byId.get(target)?.label ?? target)
                  .join(', ')}
                .
              </p>
            )}
          </li>
        ))}
      </ol>

      <details className="mt-5 rounded-card border border-line bg-panel-strong p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Read the flow as a sequence
        </summary>
        <p className="prose-body mt-3 text-sm">
          A request starts in the {layerLabels.client.toLowerCase()} layer,
          passes through the API and domain logic, and reaches{' '}
          {ordered.filter((node) => node.layer === 'integration').length}{' '}
          configured integration
          {ordered.filter((node) => node.layer === 'integration').length === 1
            ? ''
            : 's'}{' '}
          plus the data layer. Components shown here are the ones this project
          actually uses; anything requiring external credentials is listed as an
          integration so it is clear where configuration is needed.
        </p>
      </details>
    </figure>
  );
}
