import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-start gap-3 p-6 sm:p-8">
      <p className="eyebrow">No results</p>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="prose-body max-w-prose text-sm">{description}</p>
      {action}
    </div>
  );
}
