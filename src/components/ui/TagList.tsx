import { cn } from '@/lib/cn';

interface TagListProps {
  tags: string[];
  label: string;
  className?: string;
  limit?: number;
  tone?: 'chip' | 'plain';
}

/**
 * A labelled set of technology/feature tags. The list is announced as a list
 * with a descriptive `aria-label` so screen-reader users know what the tags
 * describe rather than hearing a string of nouns.
 */
export function TagList({
  tags,
  label,
  className,
  limit,
  tone = 'chip',
}: TagListProps) {
  const visible = typeof limit === 'number' ? tags.slice(0, limit) : tags;
  const hiddenCount = tags.length - visible.length;

  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label={label}>
      {visible.map((tag) => (
        <li key={tag} className={tone === 'chip' ? 'chip' : 'mono-meta'}>
          {tag}
        </li>
      ))}
      {hiddenCount > 0 && (
        <li className="chip" aria-label={`${hiddenCount} more technologies`}>
          +{hiddenCount}
        </li>
      )}
    </ul>
  );
}
