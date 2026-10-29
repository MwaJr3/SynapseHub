import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { AccentName } from '@/types/project';

/**
 * Sets the `--prj*` custom properties for a subtree by applying the project's
 * accent attribute, so cards, diagrams and previews share one hue without any
 * component hardcoding a colour.
 */
export function AccentScope({
  accent,
  children,
  className,
  as: Tag = 'div',
  tone,
}: {
  accent: AccentName;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li' | 'aside' | 'span';
  tone?: 'light' | 'dark';
}) {
  return (
    <Tag
      data-accent={accent}
      data-panel={tone}
      className={cn(tone ? 'bg-canvas text-fg' : undefined, className)}
    >
      {children}
    </Tag>
  );
}
