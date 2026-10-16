import type { ProjectFeature } from '@/types';

interface FeatureListProps {
  features: ProjectFeature[];
}

/**
 * Core capabilities. Each card states what the feature does and why it matters,
 * which keeps the case study specific instead of a list of nouns.
 */
export function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {features.map((feature) => (
        <li key={feature.title} className="card flex h-full flex-col gap-3 p-5">
          <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
          <p className="prose-body text-sm">{feature.description}</p>
          {feature.importance && (
            <p className="mt-auto border-t border-line pt-3 text-xs text-ink-subtle">
              <span className="font-semibold uppercase tracking-[0.1em]">
                Why it matters{' '}
              </span>
              {feature.importance}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
